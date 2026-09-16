import { Extension, Facet } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { GutterOverlay } from "./gutter-overlay";
import {
	collapseStackedMarkers,
	frontmatterLineCount,
	type LineMarkerEntry,
} from "./line-marker-model";
import type { LinearisSide } from "./types";

export interface EditorLinearisOptions {
	enabled: boolean;
	side: LinearisSide;
}

const editorLinearisOptions = Facet.define<
	EditorLinearisOptions,
	EditorLinearisOptions
>({
	combine(values) {
		return values.length > 0
			? values[values.length - 1]!
			: { enabled: false, side: "left" };
	},
});

function pointInRect(x: number, y: number, rect: DOMRect): boolean {
	return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/**
 * Nested CM editors (Live Preview table cells, embeds) must not get a gutter.
 * Their documents start at line 1 and would paint numbers inside the cell.
 */
function isNestedCodeMirror(view: EditorView): boolean {
	return Boolean(view.dom.parentElement?.closest(".cm-editor"));
}

/**
 * One ViewPlugin for both left and right. Markers use CM6 line-block tops so a
 * wrapped logical line yields exactly one number at its first visual row.
 */
function createEditorOverlayPlugin(): Extension {
	return ViewPlugin.fromClass(
		class {
			overlay = new GutterOverlay();
			private host: HTMLElement;
			private raf: number | null = null;
			private onScroll: (() => void) | null = null;
			private nested: boolean;

			constructor(private readonly view: EditorView) {
				this.host = view.dom;
				this.nested = isNestedCodeMirror(view);
				if (this.nested) {
					return;
				}
				this.overlay.attach(this.host);
				this.onScroll = () => this.schedule();
				this.view.scrollDOM.addEventListener("scroll", this.onScroll, {
					passive: true,
				});
				this.applyOptions();
				this.schedule();
			}

			update(update: ViewUpdate): void {
				if (this.nested) {
					return;
				}
				if (
					update.docChanged ||
					update.viewportChanged ||
					update.geometryChanged ||
					update.heightChanged ||
					update.startState.facet(editorLinearisOptions) !==
						update.state.facet(editorLinearisOptions)
				) {
					this.applyOptions();
					this.schedule();
				}
			}

			destroy(): void {
				if (this.nested) {
					this.overlay.destroy();
					return;
				}
				if (this.raf !== null) {
					cancelAnimationFrame(this.raf);
				}
				if (this.onScroll) {
					this.view.scrollDOM.removeEventListener("scroll", this.onScroll);
				}
				this.overlay.destroy();
			}

			private applyOptions(): void {
				if (this.nested) {
					return;
				}
				const options = this.view.state.facet(editorLinearisOptions);
				this.overlay.setOptions(options);
			}

			private schedule(): void {
				if (this.nested) {
					return;
				}
				if (this.raf !== null) {
					cancelAnimationFrame(this.raf);
				}
				this.raf = requestAnimationFrame(() => {
					this.raf = null;
					this.sync();
				});
			}

			private sync(): void {
				if (this.nested) {
					return;
				}
				const options = this.view.state.facet(editorLinearisOptions);
				if (!options.enabled) {
					this.overlay.render([], 0, 0);
					return;
				}

				const { view } = this;
				const hostRect = this.host.getBoundingClientRect();
				const entries: LineMarkerEntry[] = [];
				const seen = new Set<number>();
				const fmEnd = frontmatterLineCount(view.state.doc.toString());

				const metadataRects = Array.from(
					this.host.querySelectorAll<HTMLElement>(".metadata-container"),
				).map((el) => el.getBoundingClientRect());

				for (const range of view.visibleRanges) {
					let pos = range.from;
					while (pos <= range.to) {
						const line = view.state.doc.lineAt(pos);
						if (!seen.has(line.number)) {
							seen.add(line.number);

							if (line.number <= fmEnd) {
								pos = line.to + 1;
								continue;
							}

							const coords = view.coordsAtPos(line.from);
							if (coords) {
								const midX = (coords.left + coords.right) / 2;
								const midY = (coords.top + coords.bottom) / 2;
								const inProperties = metadataRects.some((rect) =>
									pointInRect(midX, midY, rect),
								);
								if (!inProperties) {
									entries.push({
										line: line.number,
										top: coords.top - hostRect.top,
									});
								}
							}
						}
						pos = line.to + 1;
					}
				}

				const lineHeight = view.defaultLineHeight || 16;
				const minGap = Math.max(12, lineHeight * 0.7);
				const collapsed = collapseStackedMarkers(entries, minGap);

				const bandTop = -8;
				const bandBottom = hostRect.height + 8;
				this.overlay.render(collapsed, bandTop, bandBottom);
			}
		},
	);
}

export function buildEditorLinearisExtension(options: EditorLinearisOptions): Extension {
	if (!options.enabled) {
		return [];
	}

	return [editorLinearisOptions.of(options), createEditorOverlayPlugin()];
}
