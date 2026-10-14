/** Minimal Obsidian API stubs for unit tests. */

export class Plugin {
	async loadData(): Promise<unknown> {
		return {};
	}
	async saveData(_data: unknown): Promise<void> {}
	addCommand(_cmd: unknown): void {}
	addSettingTab(_tab: unknown): void {}
	registerEditorExtension(_ext: unknown): void {}
	registerMarkdownPostProcessor(_cb: unknown): void {}
	registerEvent(_ref: unknown): void {}
}

export class PluginSettingTab {
	containerEl: HTMLElement;
	constructor(_app: unknown, _plugin: unknown) {
		this.containerEl = document.createElement("div");
	}
	display(): void {}
}

export class Setting {
	constructor(_containerEl: HTMLElement) {}
	setName(_name: string): this {
		return this;
	}
	setDesc(_desc: string): this {
		return this;
	}
	addDropdown(_cb: unknown): this {
		return this;
	}
	addToggle(_cb: unknown): this {
		return this;
	}
}

export class Notice {
	constructor(_message: string | DocumentFragment, _timeout?: number) {}
}

export class MarkdownRenderChild {
	containerEl: HTMLElement;
	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}
}
