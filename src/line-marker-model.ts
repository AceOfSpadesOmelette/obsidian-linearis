export interface LineMarkerEntry {
	line: number;
	top: number;
}

/**
 * Keep exactly one marker per source line, preferring the smallest top
 * (the line's first visual row).
 */
export function dedupeMarkers(entries: LineMarkerEntry[]): LineMarkerEntry[] {
	const byLine = new Map<number, number>();

	for (const entry of entries) {
		if (!Number.isFinite(entry.line) || entry.line < 1) {
			continue;
		}
		const existing = byLine.get(entry.line);
		if (existing === undefined || entry.top < existing) {
			byLine.set(entry.line, entry.top);
		}
	}

	return [...byLine.entries()]
		.map(([line, top]) => ({ line, top }))
		.sort((a, b) => a.line - b.line);
}

/** Keep markers whose top falls inside the visible band (inclusive). */
export function cullToBand(
	markers: LineMarkerEntry[],
	bandTop: number,
	bandBottom: number,
): LineMarkerEntry[] {
	return markers.filter((marker) => marker.top >= bandTop && marker.top <= bandBottom);
}

/** Digits needed to display the largest line number (minimum 2). */
export function gutterDigits(maxLine: number): number {
	const safe = Math.max(1, Math.floor(maxLine) || 1);
	return Math.max(2, String(safe).length);
}

/**
 * Drop markers that share nearly the same Y (Live Preview widgets collapse
 * many source lines onto one visual row). Keeps the earliest line number in
 * each stacked cluster.
 */
export function collapseStackedMarkers(
	entries: LineMarkerEntry[],
	minGap: number,
): LineMarkerEntry[] {
	const gap = Math.max(0, minGap);
	const sorted = dedupeMarkers(entries).sort(
		(a, b) => a.top - b.top || a.line - b.line,
	);
	const kept: LineMarkerEntry[] = [];

	for (const entry of sorted) {
		const prev = kept[kept.length - 1];
		if (prev && Math.abs(entry.top - prev.top) < gap) {
			continue;
		}
		kept.push(entry);
	}

	return kept.sort((a, b) => a.line - b.line);
}

/**
 * Return the 1-based last line number of a leading YAML frontmatter block,
 * or 0 when the document has no closed `---` / `---` frontmatter.
 */
export function frontmatterLineCount(docText: string): number {
	const normalized = docText.replace(/^\uFEFF/, "");
	if (!normalized.startsWith("---")) {
		return 0;
	}

	// Opening fence must be the whole first line (optional trailing spaces).
	const openMatch = normalized.match(/^---[ \t]*\r?\n/);
	if (!openMatch) {
		// Single-line "---" alone is not closed frontmatter.
		return 0;
	}

	const afterOpen = normalized.slice(openMatch[0].length);
	const closeMatch = afterOpen.match(/\r?\n---[ \t]*(?:\r?\n|$)/);
	if (!closeMatch || closeMatch.index === undefined) {
		return 0;
	}

	const throughClose = normalized.slice(
		0,
		openMatch[0].length + closeMatch.index + closeMatch[0].length,
	);
	// Count lines up to and including the closing fence line.
	const lines = throughClose.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
	// If the match ended with a trailing newline, the last split entry is empty.
	const last = lines[lines.length - 1];
	const count = last === "" ? lines.length - 1 : lines.length;
	return Math.max(0, count);
}
