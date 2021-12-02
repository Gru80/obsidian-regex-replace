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

const logger = (logString: string): void => {console.log ("RegexFR: " + logString)};

export default class RegexFindReplacePlugin extends Plugin {
	async onload() {
		logger("Loading...");

		this.addCommand({
			id: "obsidian-regex-replace",
			name: "Find and Replace using regular expressions",
			editorCallback: (editor) => {
				new FindAndReplaceModal(this.app, editor).open();
			},
		});
	}

	onunload() {
		logger("Bye!");
	}
}

class FindAndReplaceModal extends Modal {
	constructor(app: App, editor: Editor) {
		super(app);
		this.shouldRestoreSelection = true;
		this.editor = editor;
	}

	editor: Editor;

	onOpen() {
		let { contentEl, titleEl, editor, modalEl } = this;

		modalEl.addClass("find-replace-modal");
		titleEl.setText("Regex Find/Replace");

		const rowClass = "row";
		const divClass = "div";

		const createInterfaceInputRow = (label: string,	placeholder: string,): TextComponent => {
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

		const findInputComponent = createInterfaceInputRow("Find:", "e.g. (.*)");
		const replaceWithInputComponent = createInterfaceInputRow("Replace:","e.g. $1",);

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
		});


		submitButtonComponent.setButtonText("Replace All");
		submitButtonComponent.setCta();
		submitButtonComponent.onClick(() => {
			let resultString = "";

			// Check if regular expressions should be used
			if(regToggleComponent.getValue()) {
				const search = new RegExp(findInputComponent.getValue(),"gm");
				logger("USING REGEXP");
				if(!selToggleComponent.getValue()) {
					logger(" SCOPE: Full document");
					let rresult = editor.getValue().match(search);
					if(rresult) {
						editor.setValue(editor.getValue().replace(search, replaceWithInputComponent.getValue()));
						resultString = "Made " + rresult.length + " replacement(s)";
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
						selectedText = selectedText.replace(search, replaceWithInputComponent.getValue());
						editor.replaceSelection(selectedText);
						resultString = "Made " + rresult.length + " replacement(s)";
					}
					else {
						resultString = "No match in current selection!";
					}					
				}
			}
			else {
				const search = findInputComponent.getValue();
				const replace = replaceWithInputComponent.getValue();

				logger("NOT using REGEXP");
				if(!selToggleComponent.getValue()) {
					logger(" SCOPE: Full document");
					editor.setValue(editor.getValue().split(search).join(replace));
					resultString = "Done.";
				}
				else {
					logger(" SCOPE: Selection");
					resultString = "Not implemented";
				}
			} 
			
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
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
