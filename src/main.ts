import {
	App,
	ButtonComponent,
	Editor,
	Modal,
	Notice,
	Plugin,
	TextComponent,
	ToggleComponent,
	PluginSettingTab,
	Setting
} from 'obsidian';

interface RfrPluginSettings {
	findText: string;
	replaceText: string;
	useRegEx: boolean;
	selOnly: boolean;
	caseInsensitive: boolean;
	processLineBreak: boolean;
	processTab: boolean;
	prefillFind: boolean;
}

const DEFAULT_SETTINGS: RfrPluginSettings = {
	findText: '',
	replaceText: '',
	useRegEx: true,
	selOnly: false,
	caseInsensitive: false,
	processLineBreak: false,
	processTab: false,
	prefillFind: false
}

// logThreshold: 0 ... only error messages
//               9 ... verbose output
const logThreshold = 9;
const logger = (logString: string, logLevel=0): void => {if (logLevel <= logThreshold) console.log ('RegexFR: ' + logString)};

export default class RegexFindReplacePlugin extends Plugin {
	settings: RfrPluginSettings;

	async onload() {
		logger('Loading Plugin...', 9);
		await this.loadSettings();

		this.addSettingTab(new RegexFindReplaceSettingTab(this.app, this));


		this.addCommand({
			id: 'obsidian-regex-replace',
			name: 'Find and Replace using regular expressions',
			editorCallback: (editor) => {
				new FindAndReplaceModal(this.app, editor, this.settings, this).open();
			},
		});
	}

	onunload() {
		logger('Bye!', 9);
	}

	async loadSettings() {
		logger('Loading Settings...', 6);
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		logger('   findVal:         ' + this.settings.findText, 6);
		logger('   replaceText:     ' + this.settings.replaceText, 6);
		logger('   caseInsensitive: ' + this.settings.caseInsensitive, 6);
		logger('   processLineBreak: ' + this.settings.processLineBreak, 6);

	}

	async saveSettings() {
		await this.saveData(this.settings);
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

		modalEl.addClass('find-replace-modal');
		titleEl.setText('Regex Find/Replace');

		const rowClass = 'row';
		const divClass = 'div';
		const noSelection = editor.getSelection() === '';
		let regexFlags = 'gm';
		if (this.settings.caseInsensitive) regexFlags = regexFlags.concat('i');

		logger('No text selected?: ' + noSelection, 9);

		const addTextComponent = (label: string, placeholder: string): TextComponent => {
			const containerEl = document.createElement(divClass);
			containerEl.addClass(rowClass);

			const targetEl = document.createElement(divClass);
			targetEl.addClass('input-wrapper');

			const labelEl = document.createElement(divClass);
			labelEl.addClass('input-label');
			labelEl.setText(label);

			containerEl.appendChild(labelEl);
			containerEl.appendChild(targetEl);

			const component = new TextComponent(targetEl);
			component.setPlaceholder(placeholder);

			contentEl.append(containerEl);
			return component;
		};

		const addToggleComponent = (label: string, tooltip: string, hide = false): ToggleComponent => {
			const containerEl = document.createElement(divClass);
			containerEl.addClass(rowClass);
	
			const targetEl = document.createElement(divClass);
			targetEl.addClass(rowClass);

			const component = new ToggleComponent(targetEl);
			component.setTooltip(tooltip);
	
			const labelEl = document.createElement(divClass);
			labelEl.addClass('check-label');
			labelEl.setText(label);
	
			containerEl.appendChild(labelEl);
			containerEl.appendChild(targetEl);
			if (!hide) contentEl.appendChild(containerEl);
			return component;
		};

		// Create input fields
		const findInputComponent = addTextComponent('Find:', 'e.g. (.*)');
		const replaceWithInputComponent = addTextComponent('Replace:', 'e.g. $1');

		// Create and show regular expression toggle switch
		const regToggleComponent = addToggleComponent('Use regular expressions', 'If enabled, regular expressions in the find field are processed as such, and regex groups might be addressed in the replace field');
		
		// Create and show selection toggle switch only if any text is selected
		const selToggleComponent = addToggleComponent('Replace only in selection', 'If enabled, replaces only occurances in the currently selected text', noSelection);

		// Create Buttons
		const buttonContainerEl = document.createElement(divClass);
		buttonContainerEl.addClass(rowClass);

		const submitButtonTarget = document.createElement(divClass);
		submitButtonTarget.addClass('button-wrapper');
		submitButtonTarget.addClass(rowClass);

		const cancelButtonTarget = document.createElement(divClass);
		cancelButtonTarget.addClass('button-wrapper');
		cancelButtonTarget.addClass(rowClass);

		const submitButtonComponent = new ButtonComponent(submitButtonTarget);
		const cancelButtonComponent = new ButtonComponent(cancelButtonTarget);
		
		cancelButtonComponent.setButtonText('Cancel');
		cancelButtonComponent.onClick(() => {
			logger('Action cancelled.', 8);
			this.close();
		});

		submitButtonComponent.setButtonText('Replace All');
		submitButtonComponent.setCta();
		submitButtonComponent.onClick(() => {
			let resultString = 'No match';
			let scope = '';
			const searchString = findInputComponent.getValue();
			const replaceString = replaceWithInputComponent.getValue();
			const selectedText = editor.getSelection();

			if (searchString === '') {
				new Notice('Nothing to search for!');
				return;
			}

			// Check if regular expressions should be used
			if(regToggleComponent.getValue()) {
				logger('USING regex with flags: ' + regexFlags, 8);

				const searchRegex = new RegExp(searchString, regexFlags);
				if(!selToggleComponent.getValue()) {
					logger('   SCOPE: Full document', 9);
					const documentText = editor.getValue();
					const rresult = documentText.match(searchRegex);
					if (rresult) {
						editor.setValue(documentText.replace(searchRegex, replaceString));
						resultString = `Made ${rresult.length} replacement(s) in document`;			
					}
				}
				else {
					logger('   SCOPE: Selection', 9);
					const rresult = selectedText.match(searchRegex);
					if (rresult) {
						editor.replaceSelection(selectedText.replace(searchRegex, replaceString));	
						resultString = `Made ${rresult.length} replacement(s) in selection`;
					}
				}
			}
			else {
				logger('NOT using regex', 8);
				let nrOfHits = 0;
				if(!selToggleComponent.getValue()) {
					logger('   SCOPE: Full document', 9);
					scope = 'selection'
					const documentText = editor.getValue();
					nrOfHits = documentText.split(searchString).length - 1;
					editor.setValue(documentText.split(searchString).join(replaceString));
				}
				else {
					logger('   SCOPE: Selection', 9);
					scope = 'document';
					nrOfHits = selectedText.split(searchString).length - 1;
					editor.replaceSelection(selectedText.split(searchString).join(replaceString));
				}
				resultString = `Made ${nrOfHits} replacement(s) in ${scope}`;
			} 		
			
			// Saving settings (find/replace text and toggle switch states)
			this.settings.findText = searchString;
			this.settings.replaceText = replaceString;
			this.settings.useRegEx = regToggleComponent.getValue();
			this.settings.selOnly = selToggleComponent.getValue();
			this.plugin.saveData(this.settings);

			this.close();
			new Notice(resultString);					
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

		// If no text is selected, disable selection-toggle-switch
		if (noSelection) selToggleComponent.setValue(false);

	}

	
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class RegexFindReplaceSettingTab extends PluginSettingTab {
	plugin: RegexFindReplacePlugin;

	constructor(app: App, plugin: RegexFindReplacePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		containerEl.createEl('h4', {text: 'Regular Expression Settings'});

		new Setting(containerEl)
			.setName('Case Insensitive')
			.setDesc('When using regular expressions, apply the \'/i\' modifier for case insensitive search)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.caseInsensitive)
				.onChange(async (value) => {
					logger('Settings update: caseInsensitive: ' + value);
					this.plugin.settings.caseInsensitive = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Process \\n as line break')
			.setDesc('When \'\\n\' is used in the replace field, a \'line break\' will be inserted accordingly')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.processLineBreak)
				.setTooltip('Sorry - still to come')
				.onChange(async (value) => {
					logger('Settings update: processLineBreak: ' + value);
					this.plugin.settings.processLineBreak = value;
					await this.plugin.saveSettings();
				}))
			.setDisabled(true);;

		new Setting(containerEl)
			.setName('Process \\t as tab')
			.setDesc('When \'\\t\' is used in the replace field, a \'tab\' will be inserted accordingly')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.processTab)
				.setTooltip('Sorry - still to come')
				.onChange(async (value) => {
					logger('Settings update: processTab: ' + value);
					this.plugin.settings.processTab = value;
					await this.plugin.saveSettings();
				}))
			.setDisabled(true);

		containerEl.createEl('h4', {text: 'General Settings'});

		new Setting(containerEl)
			.setName('Prefill Find Field')
			.setDesc('Copy the currently selected text (if any) into the \'Find\' field')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.prefillFind)
				.setTooltip('Sorry - still to come')
				.onChange(async (value) => {
					logger('Settings update: prefillFind: ' + value);
					this.plugin.settings.prefillFind = value;
					await this.plugin.saveSettings();
				}))
			.setDisabled(true);

	}
}