import { MarkdownView, Plugin, WorkspaceLeaf } from "obsidian";
import type { Extension } from "@codemirror/state";
import { buildEditorLinearisExtension } from "./editor-linearis";
import { ReadingLinearisManager } from "./reading-linearis";
import {
	LinearisSettingTab,
	DEFAULT_SETTINGS,
	cyclePlacement,
	normalizeSettings,
	placementToOptions,
	type LinearisSettings,
	type LinearisPlacement,
} from "./settings";

export default class LinearisPlugin extends Plugin {
	settings: LinearisSettings = { ...DEFAULT_SETTINGS };

	private editorExtensions: Extension[] = [];
	private readingManager = new ReadingLinearisManager();

	async onload(): Promise<void> {
		await this.loadSettings();

		this.readingManager.setLeafProvider(() => this.getMarkdownLeaves());

		this.registerEditorExtension(this.editorExtensions);
		this.applySettings();

		this.registerMarkdownPostProcessor((el, ctx) => {
			this.readingManager.registerPostProcessor(el, ctx);
		});

		this.addSettingTab(new LinearisSettingTab(this.app, this));
		this.registerCommands();

		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				this.syncOpenViews();
			}),
		);

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.syncOpenViews();
			}),
		);

		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				this.syncOpenViews();
			}),
		);

		this.app.workspace.onLayoutReady(() => {
			this.syncOpenViews();
			this.rerenderReadingPreviews();
		});
	}

	onunload(): void {
		this.readingManager.destroy();
		this.editorExtensions.length = 0;
	}

	async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	applySettings(): void {
		this.applyEditorExtensions();
		this.readingManager.setOptions(placementToOptions(this.settings.reading));
		this.syncOpenViews();
		this.rerenderReadingPreviews();
	}

	private registerCommands(): void {
		this.addCommand({
			id: "cycle-editing-linearis",
			name: "Cycle editing Linearis (left / right / off)",
			callback: async () => {
				this.settings.editing = cyclePlacement(this.settings.editing);
				await this.saveSettings();
				this.applySettings();
			},
		});

		this.addCommand({
			id: "cycle-reading-linearis",
			name: "Cycle reading Linearis (left / right / off)",
			callback: async () => {
				this.settings.reading = cyclePlacement(this.settings.reading);
				await this.saveSettings();
				this.applySettings();
			},
		});

		const modes: Array<{ key: keyof LinearisSettings; label: string }> = [
			{ key: "editing", label: "editing" },
			{ key: "reading", label: "reading" },
		];
		const placements: LinearisPlacement[] = ["left", "right", "off"];

		for (const mode of modes) {
			for (const placement of placements) {
				this.addCommand({
					id: `set-${mode.key}-linearis-${placement}`,
					name: `Set ${mode.label} Linearis: ${placement}`,
					callback: async () => {
						this.settings[mode.key] = placement;
						await this.saveSettings();
						this.applySettings();
					},
				});
			}
		}
	}

	private applyEditorExtensions(): void {
		this.editorExtensions.length = 0;
		const extension = buildEditorLinearisExtension(
			placementToOptions(this.settings.editing),
		);
		if (Array.isArray(extension)) {
			this.editorExtensions.push(...extension);
		} else {
			this.editorExtensions.push(extension);
		}
		this.app.workspace.updateOptions();
	}

	private syncOpenViews(): void {
		const views = this.getMarkdownLeaves().map((leaf) => leaf.view);
		this.readingManager.syncViews(views);
	}

	private rerenderReadingPreviews(): void {
		if (this.settings.reading === "off") {
			return;
		}
		const views = this.getMarkdownLeaves().map((leaf) => leaf.view);
		this.readingManager.rerenderPreviews(views);
	}

	private getMarkdownLeaves(): { containerEl: HTMLElement; view: MarkdownView }[] {
		const results: { containerEl: HTMLElement; view: MarkdownView }[] = [];
		this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
			if (leaf.view instanceof MarkdownView) {
				results.push({
					containerEl: leaf.view.containerEl,
					view: leaf.view,
				});
			}
		});
		return results;
	}
}
