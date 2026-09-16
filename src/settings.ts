import { App, PluginSettingTab, Setting } from "obsidian";
import type LinearisPlugin from "./main";
import {
	DEFAULT_SETTINGS,
	type LinearisSettings,
	type LinearisPlacement,
	type LinearisSide,
} from "./types";

export {
	DEFAULT_SETTINGS,
	normalizeSettings,
	placementToOptions,
	cyclePlacement,
	type LinearisSettings,
	type LinearisPlacement,
	type LinearisSide,
} from "./types";

function placementDropdown(
	containerEl: HTMLElement,
	plugin: LinearisPlugin,
	name: string,
	desc: string,
	key: keyof LinearisSettings,
): void {
	new Setting(containerEl)
		.setName(name)
		.setDesc(desc)
		.addDropdown((dropdown) =>
			dropdown
				.addOption("left", "Left")
				.addOption("right", "Right")
				.addOption("off", "Off")
				.setValue(plugin.settings[key])
				.onChange(async (value: string) => {
					const placement: LinearisPlacement =
						value === "right" ? "right" : value === "off" ? "off" : "left";
					plugin.settings[key] = placement;
					await plugin.saveSettings();
					plugin.applySettings();
				}),
		);
}

export class LinearisSettingTab extends PluginSettingTab {
	plugin: LinearisPlugin;

	constructor(app: App, plugin: LinearisPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Linearis" });

		placementDropdown(
			containerEl,
			this.plugin,
			"Editing mode",
			"Linearis while editing (Live Preview / source).",
			"editing",
		);

		placementDropdown(
			containerEl,
			this.plugin,
			"Reading mode",
			"Linearis while reading (preview).",
			"reading",
		);
	}
}
