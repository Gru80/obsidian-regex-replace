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
	useRegEx: boolean;
	selOnly: boolean;
}

const DEFAULT_SETTINGS: RfrPluginSettings = {
	findText: '',
	replaceText: '',
	regexFlags: 'gm',
	useRegEx: true,
	selOnly: false
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
		const { contentEl, titleEl, editor, modalEl } = this;

		modalEl.addClass("find-replace-modal");
		titleEl.setText("Regex Find/Replace");

		const rowClass = "row";
		const divClass = "div";

		const addTextComponent = (label: string, placeholder: string): TextComponent => {
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

		const addToggleComponent = (label: string, tooltip: string): ToggleComponent => {
			const containerEl = document.createElement(divClass);
			containerEl.addClass(rowClass);
	
			const targetEl = document.createElement(divClass);
			targetEl.addClass(rowClass);

			const component = new ToggleComponent(targetEl);
			component.setTooltip(tooltip);
	
			const labelEl = document.createElement(divClass);
			labelEl.addClass("check-label");
			labelEl.setText(label);
	
			containerEl.appendChild(labelEl);
			containerEl.appendChild(targetEl);
			contentEl.appendChild(containerEl);
			return component;
		};

		// Create input fields
		const findInputComponent = addTextComponent('Find:', 'e.g. (.*)');
		const replaceWithInputComponent = addTextComponent('Replace:', 'e.g. $1');

		// Create toggle switches
		const regToggleComponent = addToggleComponent('Use regular expressions', 'If enabled, regular expressions in the find field are processed as such, and regex groups might be addressed in the replace field');
		const selToggleComponent = addToggleComponent('Replace only in selection', 'If enabled, replaces only occurances in the currently selected text');

		// Create Buttons
		const buttonContainerEl = document.createElement(divClass);
		buttonContainerEl.addClass(rowClass);

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
			let resultString = "No match";
			const replace = replaceWithInputComponent.getValue();

			// Check if regular expressions should be used
			if(regToggleComponent.getValue()) {
				logger("USING regex with flags: " + this.settings.regexFlags);
				const search = new RegExp(findInputComponent.getValue(),this.settings.regexFlags);
				if(!selToggleComponent.getValue()) {
					logger("   SCOPE: Full document");
					const rresult = editor.getValue().match(search);
					if (rresult) {
						editor.setValue(editor.getValue().replace(search, replace));
						resultString = `Made ${rresult.length} replacement(s) in document`;			
					}
				}
				else {
					logger("   SCOPE: Selection");
					let selectedText = editor.getSelection();
					const rresult = selectedText.match(search);
					if (rresult) {
						editor.replaceSelection(selectedText.replace(search, replace));	
						resultString = `Made ${rresult.length} replacement(s) in selection`;
					}
				}
			}
			else {
				const search = findInputComponent.getValue();

				logger("NOT using regex");
				if(!selToggleComponent.getValue()) {
					logger("   SCOPE: Full document");
					const nrOfHits = editor.getValue().split(search).length - 1;
					editor.setValue(editor.getValue().split(search).join(replace));
					resultString = `Made ${nrOfHits} replacement(s) in document`;
				}
				else {
					logger("   SCOPE: Selection");
					const nrOfHits = editor.getSelection().split(search).length - 1;
					editor.replaceSelection(editor.getSelection().split(search).join(replace));
					resultString = `Made ${nrOfHits} replacement(s) in selection`;
				}
			} 		
			
			// Saving settings (find/replace text and toggle switch states)
			this.settings.findText = findInputComponent.getValue();
			this.settings.replaceText = replace;
			this.settings.useRegEx = regToggleComponent.getValue();
			this.settings.selOnly = selToggleComponent.getValue();
			this.plugin.saveData(this.settings);

			this.close();
			new Notice(resultString)					
		});

		// Apply settings
		regToggleComponent.setValue(this.settings.useRegEx);
		selToggleComponent.setValue(this.settings.selOnly);
		findInputComponent.setValue(this.settings.findText);
		replaceWithInputComponent.setValue(this.settings.replaceText);
		
		// Add button row to dialog
		buttonContainerEl.appendChild(submitButtonTarget);
		buttonContainerEl.appendChild(cancelButtonTarget);
		contentEl.appendChild(buttonContainerEl);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
