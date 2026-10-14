import {
	collapseStackedMarkers,
	cullToBand,
	dedupeMarkers,
	frontmatterLineCount,
	gutterDigits,
} from "../src/line-marker-model";
import {
	cyclePlacement,
	isPlacement,
	normalizeSettings,
	placementToOptions,
} from "../src/types";

describe("line-marker-model", () => {
	it("dedupes markers per line keeping smallest top", () => {
		expect(
			dedupeMarkers([
				{ line: 2, top: 40 },
				{ line: 2, top: 10 },
				{ line: 1, top: 5 },
				{ line: 0, top: 1 },
			]),
		).toEqual([
			{ line: 1, top: 5 },
			{ line: 2, top: 10 },
		]);
	});

	it("culls to visible band", () => {
		expect(
			cullToBand(
				[
					{ line: 1, top: 0 },
					{ line: 2, top: 50 },
					{ line: 3, top: 100 },
				],
				10,
				60,
			),
		).toEqual([{ line: 2, top: 50 }]);
	});

	it("computes gutter digits", () => {
		expect(gutterDigits(9)).toBe(2);
		expect(gutterDigits(100)).toBe(3);
	});

	it("collapses stacked markers within gap", () => {
		expect(
			collapseStackedMarkers(
				[
					{ line: 1, top: 10 },
					{ line: 2, top: 12 },
					{ line: 3, top: 40 },
				],
				5,
			),
		).toEqual([
			{ line: 1, top: 10 },
			{ line: 3, top: 40 },
		]);
	});

	it("counts frontmatter lines", () => {
		expect(frontmatterLineCount("no frontmatter")).toBe(0);
		expect(
			frontmatterLineCount("---\ntitle: Hi\n---\n# Body\n"),
		).toBe(3);
	});
});

describe("settings helpers", () => {
	it("validates placements", () => {
		expect(isPlacement("left")).toBe(true);
		expect(isPlacement("nope")).toBe(false);
	});

	it("migrates legacy settings", () => {
		expect(normalizeSettings({ enabled: false, side: "right" })).toEqual({
			editing: "off",
			reading: "off",
		});
		expect(normalizeSettings({ enabled: true, side: "right" })).toEqual({
			editing: "right",
			reading: "right",
		});
	});

	it("cycles placement and maps to options", () => {
		expect(cyclePlacement("left")).toBe("right");
		expect(cyclePlacement("right")).toBe("off");
		expect(cyclePlacement("off")).toBe("left");
		expect(placementToOptions("off")).toEqual({ enabled: false, side: "left" });
		expect(placementToOptions("right")).toEqual({ enabled: true, side: "right" });
	});
});
