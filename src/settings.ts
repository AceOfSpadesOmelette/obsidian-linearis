import { App, Notice, PluginSettingTab, type SettingDefinitionItem } from "obsidian";
import type LinearisPlugin from "./main";
import {
	applyImportedSettings,
	downloadSettingsJson,
	parseSettingsJson,
	pickSettingsFile,
} from "./settings-io";
import { normalizeSettings, type LinearisPlacement } from "./types";

export {
	DEFAULT_SETTINGS,
	normalizeSettings,
	placementToOptions,
	cyclePlacement,
	type LinearisSettings,
	type LinearisPlacement,
	type LinearisSide,
} from "./types";

const PLACEMENT_OPTIONS: Record<string, string> = {
	left: "Left",
	right: "Right",
	off: "Off",
};

function asPlacement(value: unknown): LinearisPlacement {
	return value === "right" || value === "off" ? value : "left";
}

export class LinearisSettingTab extends PluginSettingTab {
	plugin: LinearisPlugin;

	constructor(app: App, plugin: LinearisPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	override async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === "editing" || key === "reading") {
			value = asPlacement(value);
		}
		await super.setControlValue(key, value);
		this.plugin.applySettings();
	}

	override getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Editing mode",
				desc: "Line numbers while editing (Live Preview / source).",
				control: {
					type: "dropdown",
					key: "editing",
					options: PLACEMENT_OPTIONS,
				},
			},
			{
				name: "Reading mode",
				desc: "Line numbers while reading (preview).",
				control: {
					type: "dropdown",
					key: "reading",
					options: PLACEMENT_OPTIONS,
				},
			},
			{
				type: "group",
				heading: "Backup",
				items: [
					{
						name: "Export settings",
						desc: "Download the current configuration as JSON.",
						action: () => {
							downloadSettingsJson(this.plugin.settings, "linearis-settings.json");
						},
					},
					{
						name: "Import settings",
						desc: "Replace the current configuration from a JSON file.",
						action: () => {
							this.importSettings();
						},
					},
				],
			},
		];
	}

	private importSettings(): void {
		pickSettingsFile((text) => {
			try {
				const next = parseSettingsJson(text, normalizeSettings);
				applyImportedSettings(this.plugin.settings, next);
				void this.plugin.saveSettings().then(
					() => {
						this.plugin.applySettings();
						this.update();
						new Notice("Linearis settings imported");
					},
					() => {
						new Notice("Could not import settings");
					},
				);
			} catch (err) {
				new Notice(err instanceof Error ? err.message : "Could not import settings");
			}
		});
	}
}
