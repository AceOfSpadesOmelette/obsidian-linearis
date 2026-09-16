export type LineNumberSide = "left" | "right";
export type LineNumberPlacement = "left" | "right" | "off";

export interface AddLineNumbersSettings {
	editing: LineNumberPlacement;
	reading: LineNumberPlacement;
}

export const DEFAULT_SETTINGS: AddLineNumbersSettings = {
	editing: "left",
	reading: "left",
};

const PLACEMENTS: LineNumberPlacement[] = ["left", "right", "off"];

export function isPlacement(value: unknown): value is LineNumberPlacement {
	return value === "left" || value === "right" || value === "off";
}

/** Migrate legacy `{ enabled, side }` and validate the new shape. */
export function normalizeSettings(raw: unknown): AddLineNumbersSettings {
	const base = { ...DEFAULT_SETTINGS };
	if (!raw || typeof raw !== "object") {
		return base;
	}

	const data = raw as Record<string, unknown>;

	// Legacy shape
	if ("enabled" in data || ("side" in data && !("editing" in data) && !("reading" in data))) {
		const side: LineNumberSide = data.side === "right" ? "right" : "left";
		const enabled = data.enabled !== false;
		const placement: LineNumberPlacement = enabled ? side : "off";
		return { editing: placement, reading: placement };
	}

	return {
		editing: isPlacement(data.editing) ? data.editing : base.editing,
		reading: isPlacement(data.reading) ? data.reading : base.reading,
	};
}

export function placementToOptions(placement: LineNumberPlacement): {
	enabled: boolean;
	side: LineNumberSide;
} {
	if (placement === "off") {
		return { enabled: false, side: "left" };
	}
	return { enabled: true, side: placement };
}

export function cyclePlacement(current: LineNumberPlacement): LineNumberPlacement {
	const index = PLACEMENTS.indexOf(current);
	return PLACEMENTS[(index + 1) % PLACEMENTS.length]!;
}
