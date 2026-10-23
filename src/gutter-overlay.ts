import "obsidian";
import type { LinearisSide } from "./types";
import {
	cullToBand,
	dedupeMarkers,
	gutterDigits,
	type LineMarkerEntry,
} from "./line-marker-model";

export const GUTTER_CLASS = "linearis-gutter";
export const MARKER_CLASS = "linearis-marker";
export const ENABLED_CLASS = "linearis-enabled";
export const SIDE_LEFT_CLASS = "linearis-side-left";
export const SIDE_RIGHT_CLASS = "linearis-side-right";
const HIDDEN_CLASS = "is-hidden";
const PINNED_CLASS = "is-pinned";
const STRETCHED_CLASS = "is-stretched";

export interface GutterOverlayOptions {
	side: LinearisSide;
	enabled: boolean;
}

/**
 * Shared edge-pinned overlay used by editor and reading modes.
 * Accepts host-relative tops; never applies scroll-offset arithmetic itself.
 */
export class GutterOverlay {
	readonly el: HTMLElement;
	private host: HTMLElement | null = null;
	private options: GutterOverlayOptions = { enabled: true, side: "left" };

	constructor() {
		this.el = createDiv({ cls: GUTTER_CLASS, attr: { "aria-hidden": "true" } });
	}

	attach(host: HTMLElement): void {
		if (this.host === host && this.el.parentElement === host) {
			return;
		}
		this.detach();
		this.host = host;
		host.appendChild(this.el);
		this.applyClasses();
	}

	detach(): void {
		this.el.remove();
		if (this.host) {
			this.host.classList.remove(ENABLED_CLASS, SIDE_LEFT_CLASS, SIDE_RIGHT_CLASS);
		}
		this.host = null;
	}

	setOptions(options: GutterOverlayOptions): void {
		this.options = { ...options };
		this.applyClasses();
		if (!this.options.enabled) {
			this.el.replaceChildren();
		}
		this.el.toggleClass(HIDDEN_CLASS, !this.options.enabled);
	}

	/**
	 * @param entries Host-relative marker tops (one per candidate source line).
	 *               For scrollable hosts, pass tops relative to the visible viewport
	 *               (getBoundingClientRect delta); the overlay pins itself to scrollTop.
	 * @param bandTop Visible band top in the same coordinate space as entries.
	 * @param bandBottom Visible band bottom in the same coordinate space as entries.
	 */
	render(entries: LineMarkerEntry[], bandTop: number, bandBottom: number): void {
		if (!this.options.enabled) {
			this.el.replaceChildren();
			this.el.addClass(HIDDEN_CLASS);
			return;
		}

		this.el.removeClass(HIDDEN_CLASS);
		this.pinToVisibleBand();

		const markers = cullToBand(dedupeMarkers(entries), bandTop, bandBottom);
		const maxLine =
			markers.length > 0
				? markers.reduce((max, m) => Math.max(max, m.line), 1)
				: entries.reduce((max, m) => Math.max(max, m.line), 1);
		const digits = String(gutterDigits(maxLine));
		this.el.setCssProps({ "--linearis-digits": digits });
		this.host?.setCssProps({ "--linearis-digits": digits });

		const fragment = createFragment();
		for (const marker of markers) {
			const node = createDiv({ cls: MARKER_CLASS, text: String(marker.line) });
			node.setCssStyles({ top: `${marker.top}px` });
			fragment.appendChild(node);
		}
		this.el.replaceChildren(fragment);
	}

	destroy(): void {
		this.detach();
	}

	/**
	 * When the host itself scrolls (reading mode), pin the overlay to the
	 * visible scrollport so viewport-relative marker tops stay correct.
	 * Non-scrolling hosts (CM editor root) keep a stretched absolute gutter.
	 */
	private pinToVisibleBand(): void {
		if (!this.host) {
			return;
		}
		const scrolls = this.host.scrollHeight > this.host.clientHeight + 1;
		if (scrolls) {
			this.el.addClass(PINNED_CLASS);
			this.el.removeClass(STRETCHED_CLASS);
			this.el.setCssStyles({
				top: `${this.host.scrollTop}px`,
				height: `${this.host.clientHeight}px`,
			});
		} else {
			this.el.addClass(STRETCHED_CLASS);
			this.el.removeClass(PINNED_CLASS);
			this.el.setCssStyles({ top: "", height: "" });
		}
	}

	private applyClasses(): void {
		if (!this.host) {
			return;
		}
		this.host.classList.toggle(ENABLED_CLASS, this.options.enabled);
		this.host.classList.toggle(SIDE_LEFT_CLASS, this.options.side === "left");
		this.host.classList.toggle(SIDE_RIGHT_CLASS, this.options.side === "right");

		this.el.classList.toggle(SIDE_LEFT_CLASS, this.options.side === "left");
		this.el.classList.toggle(SIDE_RIGHT_CLASS, this.options.side === "right");
	}
}
