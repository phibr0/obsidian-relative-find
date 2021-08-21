import { App, Editor, Plugin, SuggestModal } from 'obsidian';

interface SearchResult {
	text: string;
	pos: CodeMirror.Position;
}

type SearchMode = "before" | "after";

export default class BetterFindPlugin extends Plugin {
	onload() {
		this.addCommand({
			id: 'relative-find',
			name: 'Find relative to Cursor Position',
			editorCallback: (editor: Editor) => {
					new SearchModal(this.app, editor, "after").open();
			}
		});
	}
}

class SearchModal extends SuggestModal<SearchResult> {
	editor: Editor;
	currentQuery: string;
	defaultMode: string;

	constructor(app: App, editor: Editor, mode: SearchMode) {
		super(app);
		this.editor = editor;
		this.defaultMode = mode;
		this.setPlaceholder("Search for something...");
		this.setInstructions([
			{
				command: "after:",
				purpose: "to find after cursor",
			},
			{
				command: "before:",
				purpose: "to find before cursor",
			},
			{
				command: "↑↓",
				purpose: "to navigate"
			},
			{
				command: "↵",
				purpose: "to jump to result",
			},
		]);
	}

	onOpen() {
		super.onOpen();
		this.inputEl.value = `${this.defaultMode}:`;
	}

	getSuggestions(query: string): SearchResult[] {
		const mode = query.split(":").first() as SearchMode;
		query = query.replace(mode + ":", "");
		if (query) {
			const results: SearchResult[] = [];
			this.currentQuery = query;
			for (let i = 0; i < this.editor.lineCount(); i++) {
				let line = this.editor.getLine(i);
				let intermediateResults = line.toLowerCase().split(query.toLowerCase());
				intermediateResults.remove(intermediateResults.first());
				intermediateResults.forEach((res) => {
					results.push({
						text: res,
						pos: {
							line: i,
							ch: line.toLowerCase().indexOf(res),
						},
					});
				});
			}
			return this.sortSuggestions(results, mode);
		}
		return [];
	}

	sortSuggestions(suggestions: SearchResult[], mode: SearchMode): SearchResult[] {
		const { line, ch } = this.editor.getCursor();
		switch (mode) {
			case "after":
				return suggestions.filter((s) => {
					if (s.pos.line < line) {
						return false;
					} else if (s.pos.line === line && s.pos.ch < ch) {
						return false;
					}
					return true;
				});
			case "before":
				return suggestions.filter((s) => {
					if (s.pos.line > line) {
						return false;
					} else if (s.pos.line === line && s.pos.ch > ch) {
						return false;
					}
					return true;
				}).reverse();
			default:
				return suggestions;
		}
	}

	renderSuggestion(suggestion: SearchResult, el: HTMLElement) {
		const queryEl = createEl("span", { text: this.currentQuery, cls: "RF-query" });
		queryEl.toggleClass("RF-has-space-end", this.currentQuery.endsWith(" "));

		const resultEl = createEl("span", { text: suggestion.text, cls: "RF-result" });
		resultEl.toggleClass("RF-has-space-beginning", suggestion.text.startsWith(" "));
		resultEl.prepend(queryEl);

		const infoEl = createEl("span", {
			text: `Line: ${suggestion.pos.line + 1} - Character: ${suggestion.pos.ch}`,
			cls: "RF-info"
		});

		el.addClass("RF-suggestion");
		el.append(resultEl, infoEl);
	}

	onNoSuggestion() {
		this.resultContainerEl.empty();
		this.resultContainerEl.appendChild(createDiv({
			text: "Nothing found.",
			cls: "suggestion-empty"
		}));
	}

	onChooseSuggestion(item: SearchResult) {
		console.log(item);
		this.editor.setCursor(item.pos);
		this.editor.setSelection({
			line: item.pos.line,
			ch: item.pos.ch - this.currentQuery.length,
		}, item.pos);
	}
}
