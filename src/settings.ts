import { App, PluginSettingTab, Setting } from "obsidian";
import type AddLineNumbersPlugin from "./main";
import {
	DEFAULT_SETTINGS,
	type AddLineNumbersSettings,
	type LineNumberPlacement,
	type LineNumberSide,
} from "./types";

export {
	DEFAULT_SETTINGS,
	normalizeSettings,
	placementToOptions,
	cyclePlacement,
	type AddLineNumbersSettings,
	type LineNumberPlacement,
	type LineNumberSide,
} from "./types";

function placementDropdown(
	containerEl: HTMLElement,
	plugin: AddLineNumbersPlugin,
	name: string,
	desc: string,
	key: keyof AddLineNumbersSettings,
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
					const placement: LineNumberPlacement =
						value === "right" ? "right" : value === "off" ? "off" : "left";
					plugin.settings[key] = placement;
					await plugin.saveSettings();
					plugin.applySettings();
				}),
		);
}

export class AddLineNumbersSettingTab extends PluginSettingTab {
	plugin: AddLineNumbersPlugin;

	constructor(app: App, plugin: AddLineNumbersPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Add Line Numbers" });

		placementDropdown(
			containerEl,
			this.plugin,
			"Editing mode",
			"Line numbers while editing (Live Preview / source).",
			"editing",
		);

		placementDropdown(
			containerEl,
			this.plugin,
			"Reading mode",
			"Line numbers while reading (preview).",
			"reading",
		);
	}
}
