export type LinearisSide = "left" | "right";
export type LinearisPlacement = "left" | "right" | "off";

export interface LinearisSettings {
	editing: LinearisPlacement;
	reading: LinearisPlacement;
}

export const DEFAULT_SETTINGS: LinearisSettings = {
	editing: "left",
	reading: "left",
};

const PLACEMENTS: LinearisPlacement[] = ["left", "right", "off"];

export function isPlacement(value: unknown): value is LinearisPlacement {
	return value === "left" || value === "right" || value === "off";
}

/** Migrate legacy `{ enabled, side }` and validate the new shape. */
export function normalizeSettings(raw: unknown): LinearisSettings {
	const base = { ...DEFAULT_SETTINGS };
	if (!raw || typeof raw !== "object") {
		return base;
	}

	const data = raw as Record<string, unknown>;

	// Legacy shape
	if ("enabled" in data || ("side" in data && !("editing" in data) && !("reading" in data))) {
		const side: LinearisSide = data.side === "right" ? "right" : "left";
		const enabled = data.enabled !== false;
		const placement: LinearisPlacement = enabled ? side : "off";
		return { editing: placement, reading: placement };
	}

	return {
		editing: isPlacement(data.editing) ? data.editing : base.editing,
		reading: isPlacement(data.reading) ? data.reading : base.reading,
	};
}

export function placementToOptions(placement: LinearisPlacement): {
	enabled: boolean;
	side: LinearisSide;
} {
	if (placement === "off") {
		return { enabled: false, side: "left" };
	}
	return { enabled: true, side: placement };
}

export function cyclePlacement(current: LinearisPlacement): LinearisPlacement {
	const index = PLACEMENTS.indexOf(current);
	return PLACEMENTS[(index + 1) % PLACEMENTS.length]!;
}
