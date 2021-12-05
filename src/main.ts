import { notEqual } from "assert";
import {
	App,
	ButtonComponent,
	Editor,
	Modal,
	Notice,
	Plugin,
	TextComponent,
	ToggleComponent,
} from "obsidian";

interface RfrPluginSettings {
	findText: string;
	replaceText: string;
	regexFlags: string;
}

const DEFAULT_SETTINGS: RfrPluginSettings = {
	findText: '',
	replaceText: '',
	regexFlags: 'gm'
}

const logger = (logString: string): void => {console.log ("RegexFR: " + logString)};

export default class RegexFindReplacePlugin extends Plugin {
	settings: RfrPluginSettings;

	async onload() {
		logger("Loading Plugin...");
		await this.loadSettings();

		this.addCommand({
			id: "obsidian-regex-replace",
			name: "Find and Replace using regular expressions",
			editorCallback: (editor) => {
				new FindAndReplaceModal(this.app, editor, this.settings, this).open();
			},
		});
	}

	onunload() {
		logger("Bye!");
	}

	async loadSettings() {
		logger("   Loading Settings...");
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		logger("      findVal:     " + this.settings.findText);
		logger("      replaceText: " + this.settings.replaceText);
		logger("      regexFlags:  " + this.settings.regexFlags);
	}

}

class FindAndReplaceModal extends Modal {
	constructor(app: App, editor: Editor, settings: RfrPluginSettings, plugin: Plugin) {
		super(app);
		this.editor = editor;
		this.settings = settings;
		this.plugin = plugin;
	}

	settings: RfrPluginSettings;
	editor: Editor;
	plugin: Plugin;

	onOpen() {
		let { contentEl, titleEl, editor, modalEl } = this;

		modalEl.addClass("find-replace-modal");
		titleEl.setText("Regex Find/Replace");

		const rowClass = "row";
		const divClass = "div";

		const addTextComponent = (label: string, placeholder: string,): TextComponent => {
			const containerEl = document.createElement(divClass);
			containerEl.addClass(rowClass);

			const targetEl = document.createElement(divClass);
			targetEl.addClass("input-wrapper");

			const labelEl = document.createElement(divClass);
			labelEl.addClass("input-label");
			labelEl.setText(label);

			containerEl.appendChild(labelEl);
			containerEl.appendChild(targetEl);

			const component = new TextComponent(targetEl);
			component.setPlaceholder(placeholder);

			contentEl.append(containerEl);
			return component;
		};

		const findInputComponent = addTextComponent('Find:', 'e.g. (.*)');
		const replaceWithInputComponent = addTextComponent('Replace:', 'e.g. $1');

		// Create Button row
		const bcontainerEl = document.createElement(divClass);
		bcontainerEl.addClass(rowClass);

		const submitButtonTarget = document.createElement(divClass);
		submitButtonTarget.addClass("button-wrapper");
		submitButtonTarget.addClass(rowClass);

		const cancelButtonTarget = document.createElement(divClass);
		cancelButtonTarget.addClass("button-wrapper");
		cancelButtonTarget.addClass(rowClass);

		const submitButtonComponent = new ButtonComponent(submitButtonTarget);
		const cancelButtonComponent = new ButtonComponent(cancelButtonTarget);
		
		cancelButtonComponent.setButtonText("Cancel");
		cancelButtonComponent.onClick(() => {
			logger("Action cancelled.");
			this.close();
			new Notice('Nothing changed');
		});

		submitButtonComponent.setButtonText("Replace All");
		submitButtonComponent.setCta();
		submitButtonComponent.onClick(() => {
			let resultString = "";
			const replace = replaceWithInputComponent.getValue();

			// Check if regular expressions should be used
			if(regToggleComponent.getValue()) {
				const search = new RegExp(findInputComponent.getValue(),this.settings.regexFlags);
				logger("USING REGEXP with flags: " + this.settings.regexFlags);
				if(!selToggleComponent.getValue()) {
					logger(" SCOPE: Full document");
					let rresult = editor.getValue().match(search);
					if(rresult) {
						editor.setValue(editor.getValue().replace(search, replace));
						resultString = "Made " + rresult.length + " replacement(s) in document";
					}
					else {
						resultString = "No match in whole document!"
					}
				}
				else {
					logger(" SCOPE: Selection");
					let selectedText = editor.getSelection();
					let rresult = editor.getValue().match(search);
					if (rresult) {
						selectedText = selectedText.replace(search, replace);
						editor.replaceSelection(selectedText);
						resultString = "Made " + rresult.length + " replacement(s) in selection";
					}
					else {
						resultString = "No match in current selection!";
					}					
				}
			}
			else {
				const search = findInputComponent.getValue();

				logger("NOT using REGEXP");
				if(!selToggleComponent.getValue()) {
					logger(" SCOPE: Full document");
					editor.setValue(editor.getValue().split(search).join(replace));
					resultString = "Replace in full document finished.";
				}
				else {
					logger(" SCOPE: Selection");
					editor.replaceSelection(editor.getSelection().split(search).join(replace));
					resultString = "Replace in selection finished.";
				}
			} 		
			
			// Saving find and replace text
			this.settings.findText = findInputComponent.getValue();
			this.settings.replaceText = replace;
			this.plugin.saveData(this.settings);

			this.close();
			new Notice(resultString)
					
		});

		// Build toggle row for enable/disable regular expressions
		const toggleRegexContainerEl = document.createElement(divClass);
		toggleRegexContainerEl.addClass(rowClass);

		const toggleRegexTarget = document.createElement(divClass);
		toggleRegexTarget.addClass(rowClass);
		const regToggleComponent = new ToggleComponent(toggleRegexTarget);
		regToggleComponent.setTooltip("Enable/disable use of regular expressions");

		const toggleRegexLabel = document.createElement(divClass);
		toggleRegexLabel.addClass("check-label");
		toggleRegexLabel.setText("Use regular expressions");

		toggleRegexContainerEl.appendChild(toggleRegexLabel);
		toggleRegexContainerEl.appendChild(toggleRegexTarget);

		// Build toggle row for enable/disable replace in selection only
		const toggleSelContainerEl = document.createElement(divClass);
		toggleSelContainerEl.addClass(rowClass);

		const toggleSelTarget = document.createElement(divClass);
		toggleSelTarget.addClass(rowClass);
		const selToggleComponent = new ToggleComponent(toggleSelTarget);
		selToggleComponent.setTooltip("Replace only in occurances of the currently selected text");

		const toggleSelLabel = document.createElement(divClass);
		toggleSelLabel.addClass("check-label");
		toggleSelLabel.setText("Replace only in selection");

		// Set default to enable
		regToggleComponent.setValue(true);
		
		// Add childs
		toggleSelContainerEl.appendChild(toggleSelLabel);
		toggleSelContainerEl.appendChild(toggleSelTarget);

		bcontainerEl.appendChild(submitButtonTarget);
		bcontainerEl.appendChild(cancelButtonTarget);

		contentEl.appendChild(toggleRegexContainerEl);
		contentEl.appendChild(toggleSelContainerEl);
		contentEl.appendChild(bcontainerEl);

		findInputComponent.setValue(this.settings.findText);
		replaceWithInputComponent.setValue(this.settings.replaceText);
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
