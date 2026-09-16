import { MarkdownView, MarkdownPostProcessorContext } from "obsidian";
import { GutterOverlay } from "./gutter-overlay";
import {
	collapseStackedMarkers,
	frontmatterLineCount,
	type LineMarkerEntry,
} from "./line-marker-model";
import type { LinearisSide } from "./types";

export interface ReadingLinearisOptions {
	enabled: boolean;
	side: LinearisSide;
}

const DATA_ATTR = "data-linearis-line";

interface SectionStart {
	line: number;
	el: HTMLElement;
}

interface PreviewHandles {
	view: MarkdownView;
	container: HTMLElement;
	overlay: GutterOverlay;
	resizeObserver: ResizeObserver;
	mutationObserver: MutationObserver;
	raf: number | null;
	onScroll: () => void;
}

/**
 * Reading-mode gutters: one number per rendered section start line, positioned
 * at the section's first visual row. Interior source lines of multi-line blocks
 * are intentionally omitted.
 */
export class ReadingLinearisManager {
	private handles = new Map<MarkdownView, PreviewHandles>();
	private options: ReadingLinearisOptions = { enabled: true, side: "left" };
	private sectionStarts = new WeakMap<HTMLElement, number>();
	private leafProvider: (() => { containerEl: HTMLElement; view: MarkdownView }[]) | null =
		null;

	setLeafProvider(
		provider: () => { containerEl: HTMLElement; view: MarkdownView }[],
	): void {
		this.leafProvider = provider;
	}

	setOptions(options: ReadingLinearisOptions): void {
		this.options = { ...options };
		for (const handle of this.handles.values()) {
			handle.overlay.setOptions(this.options);
		}
		this.refreshAll();
	}

	registerPostProcessor(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
		const targets = [el, el.parentElement].filter(
			(node): node is HTMLElement => node instanceof HTMLElement,
		);

		for (const target of targets) {
			const info = ctx.getSectionInfo(target);
			if (info) {
				const line = info.lineStart + 1;
				this.sectionStarts.set(target, line);
				target.setAttribute(DATA_ATTR, String(line));
			}
		}

		const view = this.findMarkdownViewForElement(el);
		if (view) {
			this.ensureView(view);
			this.scheduleRefresh(view);
		}
	}

	syncViews(views: MarkdownView[]): void {
		const open = new Set(views);
		for (const view of views) {
			this.attachView(view);
		}
		for (const view of [...this.handles.keys()]) {
			if (!open.has(view)) {
				this.detachView(view);
			}
		}
	}

	attachView(view: MarkdownView): void {
		this.ensureView(view);
		this.scheduleRefresh(view);
	}

	/** Force preview rebuild so post-processors stamp data-linearis-line. */
	rerenderPreviews(views: MarkdownView[]): void {
		for (const view of views) {
			try {
				view.previewMode?.rerender(true);
			} catch {
				// Preview may be unavailable in some leaf states.
			}
			this.attachView(view);
		}
	}

	detachView(view: MarkdownView): void {
		const handle = this.handles.get(view);
		if (!handle) {
			return;
		}
		handle.resizeObserver.disconnect();
		handle.mutationObserver.disconnect();
		if (handle.raf !== null) {
			cancelAnimationFrame(handle.raf);
		}
		handle.container.removeEventListener("scroll", handle.onScroll);
		handle.overlay.destroy();
		this.handles.delete(view);
	}

	refreshAll(): void {
		for (const view of this.handles.keys()) {
			this.scheduleRefresh(view);
		}
	}

	destroy(): void {
		for (const view of [...this.handles.keys()]) {
			this.detachView(view);
		}
	}

	private ensureView(view: MarkdownView): void {
		if (this.handles.has(view)) {
			// Container may appear only after switching to reading mode.
			const handle = this.handles.get(view)!;
			if (!handle.container.isConnected) {
				this.detachView(view);
			} else {
				return;
			}
		}

		const container = this.findPreviewContainer(view);
		if (!container) {
			return;
		}

		const overlay = new GutterOverlay();
		overlay.attach(container);
		overlay.setOptions(this.options);

		const onScroll = (): void => this.scheduleRefresh(view);
		const schedule = (): void => this.scheduleRefresh(view);

		const resizeObserver = new ResizeObserver(schedule);
		resizeObserver.observe(container);

		const sizer = container.querySelector(".markdown-preview-sizer");
		if (sizer instanceof HTMLElement) {
			resizeObserver.observe(sizer);
		}

		const mutationObserver = new MutationObserver((mutations) => {
			const relevant = mutations.some((mutation) => {
				const target = mutation.target;
				if (target instanceof Element && target.closest(".linearis-gutter")) {
					return false;
				}
				return true;
			});
			if (relevant) {
				schedule();
			}
		});
		mutationObserver.observe(container, {
			childList: true,
			subtree: true,
			characterData: true,
		});

		container.addEventListener("scroll", onScroll, { passive: true });

		this.handles.set(view, {
			view,
			container,
			overlay,
			resizeObserver,
			mutationObserver,
			raf: null,
			onScroll,
		});
	}

	private findPreviewContainer(view: MarkdownView): HTMLElement | null {
		return (
			(view.previewMode?.containerEl?.querySelector(
				".markdown-preview-view",
			) as HTMLElement | null) ??
			(view.contentEl.querySelector(".markdown-preview-view") as HTMLElement | null)
		);
	}

	private scheduleRefresh(view: MarkdownView): void {
		let handle = this.handles.get(view);
		if (!handle) {
			this.ensureView(view);
			handle = this.handles.get(view);
			if (!handle) {
				return;
			}
		}
		this.queue(handle);
	}

	private queue(handle: PreviewHandles): void {
		if (handle.raf !== null) {
			cancelAnimationFrame(handle.raf);
		}
		handle.raf = requestAnimationFrame(() => {
			handle.raf = null;
			this.render(handle);
		});
	}

	private render(handle: PreviewHandles): void {
		const { container, overlay, view } = handle;
		const enabled = this.options.enabled && view.getMode() === "preview";
		overlay.setOptions({ ...this.options, enabled });

		if (!enabled) {
			overlay.render([], 0, 0);
			return;
		}

		const sizer =
			(container.querySelector(".markdown-preview-sizer") as HTMLElement | null) ??
			container;
		const starts = this.collectSectionStarts(sizer);
		const hostRect = container.getBoundingClientRect();
		const docText = view.getViewData();
		const fmEnd = frontmatterLineCount(docText);
		const entries: LineMarkerEntry[] = [];

		for (const start of starts) {
			if (start.line <= fmEnd) {
				continue;
			}
			if (start.el.closest(".metadata-container")) {
				continue;
			}
			const rect = start.el.getBoundingClientRect();
			const top = rect.top - hostRect.top;
			entries.push({ line: start.line, top });
		}

		const minGap = 12;
		const collapsed = collapseStackedMarkers(entries, minGap);
		const bandTop = -8;
		const bandBottom = hostRect.height + 8;
		overlay.render(collapsed, bandTop, bandBottom);
	}

	private collectSectionStarts(sizer: HTMLElement): SectionStart[] {
		const starts: SectionStart[] = [];
		const candidates = sizer.querySelectorAll<HTMLElement>(":scope > div");
		const nodes =
			candidates.length > 0
				? Array.from(candidates)
				: Array.from(sizer.children).filter(
						(node): node is HTMLElement => node instanceof HTMLElement,
					);

		for (const el of nodes) {
			if (el.classList.contains("linearis-gutter")) {
				continue;
			}
			const line = this.resolveStartLine(el);
			if (line === null) {
				continue;
			}
			starts.push({ line, el });
		}

		return starts;
	}

	private resolveStartLine(el: HTMLElement): number | null {
		const stamped = el.getAttribute(DATA_ATTR);
		if (stamped && /^\d+$/.test(stamped)) {
			return Number(stamped);
		}

		const cached = this.sectionStarts.get(el);
		if (cached !== undefined) {
			return cached;
		}

		const dataLine = el.getAttribute("data-line") ?? el.getAttribute("data-source-line");
		if (dataLine && /^\d+$/.test(dataLine)) {
			return Number(dataLine) + 1;
		}

		return null;
	}

	private findMarkdownViewForElement(el: HTMLElement): MarkdownView | null {
		for (const leaf of this.getAllMarkdownLeaves()) {
			if (leaf.containerEl.contains(el)) {
				return leaf.view;
			}
		}
		return null;
	}

	private getAllMarkdownLeaves(): { containerEl: HTMLElement; view: MarkdownView }[] {
		return this.leafProvider ? this.leafProvider() : [];
	}
}
