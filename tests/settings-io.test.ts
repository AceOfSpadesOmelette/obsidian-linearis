import { parseSettingsJson, settingsToJson } from "../src/settings-io";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/types";

describe("linearis settings import", () => {
	it("round-trips placements", () => {
		const settings = { ...DEFAULT_SETTINGS, editing: "off" as const, reading: "right" as const };
		const parsed = parseSettingsJson(settingsToJson(settings), normalizeSettings);
		expect(parsed.editing).toBe("off");
		expect(parsed.reading).toBe("right");
	});

	it("rejects non-objects", () => {
		expect(() => parseSettingsJson("null", normalizeSettings)).toThrow(/JSON object/);
	});
});
