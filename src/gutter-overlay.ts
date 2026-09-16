import type { LineNumberSide } from "./types";
import {
	cullToBand,
	dedupeMarkers,
	gutterDigits,
	type LineMarkerEntry,
} from "./line-marker-model";

export const GUTTER_CLASS = "aln-gutter";
export const LINE_NUMBER_CLASS = "aln-line-number";
export const ENABLED_CLASS = "aln-enabled";
export const SIDE_LEFT_CLASS = "aln-side-left";
export const SIDE_RIGHT_CLASS = "aln-side-right";

export interface GutterOverlayOptions {
	side: LineNumberSide;
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
		this.el = document.createElement("div");
		this.el.className = GUTTER_CLASS;
		this.el.setAttribute("aria-hidden", "true");
	}

	attach(host: HTMLElement): void {
		if (this.host === host && this.el.parentElement === host) {
			return;
		}
		this.detach();
		this.host = host;
		if (getComputedStyle(host).position === "static") {
			host.style.position = "relative";
		}
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
			this.el.style.display = "none";
		} else {
			this.el.style.display = "";
		}
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
			this.el.style.display = "none";
			return;
		}

		this.el.style.display = "";
		this.pinToVisibleBand();

		const markers = cullToBand(dedupeMarkers(entries), bandTop, bandBottom);
		const maxLine =
			markers.length > 0
				? markers.reduce((max, m) => Math.max(max, m.line), 1)
				: entries.reduce((max, m) => Math.max(max, m.line), 1);
		const digits = gutterDigits(maxLine);
		this.el.style.setProperty("--aln-digits", String(digits));
		if (this.host) {
			this.host.style.setProperty("--aln-digits", String(digits));
		}

		const fragment = document.createDocumentFragment();
		for (const marker of markers) {
			const node = document.createElement("div");
			node.className = LINE_NUMBER_CLASS;
			node.textContent = String(marker.line);
			node.style.top = `${marker.top}px`;
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
			this.el.style.top = `${this.host.scrollTop}px`;
			this.el.style.bottom = "auto";
			this.el.style.height = `${this.host.clientHeight}px`;
		} else {
			this.el.style.top = "0";
			this.el.style.bottom = "0";
			this.el.style.height = "";
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
