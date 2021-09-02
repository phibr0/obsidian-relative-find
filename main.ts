import { App, Editor, EditorPosition, Plugin, SuggestModal } from 'obsidian';

interface SearchResult {
	text: string;
	pos: EditorPosition;
}

type SearchMode = ("before" | "b") | ("after" | "a");

export default class BetterFindPlugin extends Plugin {
	onload() {
		this.addCommand({
			id: 'relative-find',
			name: 'Find relative to Cursor Position',
			editorCallback: (editor: Editor) => {
				new SearchModal(this.app, editor, "after").open();
			}
		});
		this.addCommand({
			id: 'relative-find-before',
			name: 'Find before the Cursor',
			editorCallback: (editor: Editor) => {
				new SearchModal(this.app, editor, "before").open();
			}
		});

		for (let i = 1; i < 10; i++) {
			this.addCommand({
				id: 'copy-search-result-' + i,
				name: 'Copy Search Result ' + i + ' to Clipboard',
				checkCallback: (check: boolean) => {
					const search = this.app.workspace.getLeavesOfType("search")[0]?.view;
					//@ts-ignore
					if (search && search.getQuery()) {
						if (!check) {
							//@ts-ignore
							const result = search.dom.children[i - 1].childrenEl.innerText;
							navigator.clipboard.writeText(result);
						}
						return true;
					}
					return false;
				}
			});
		}
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
				if (!line.endsWith(" ")) {
					line += " ";
				}
				let intermediateResults = line.toLowerCase().split(query.toLowerCase());
				intermediateResults.remove(intermediateResults.first());
				intermediateResults.forEach((res) => {
					results.push({
						text: res,
						pos: {
							line: i,
							ch: this.computeColumn(res, line),
						},
					});
				});
			}
			return this.sortSuggestions(results, mode);
		}
		return [];
	}

	computeColumn(res: string, line: string): number {
		if (res) {
			return line.toLowerCase().indexOf(this.currentQuery.toLowerCase() + res) + this.currentQuery.length;
		} else {
			return line.length;
		}
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
			case "a":
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
			case "b":
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

		const resultEl = el.createEl("span", { text: suggestion.text, cls: "RF-result" });
		resultEl.toggleClass("RF-has-space-beginning", suggestion.text.startsWith(" "));
		resultEl.prepend(queryEl);

		el.createEl("span", {
			text: `Line: ${suggestion.pos.line + 1} - Character: ${suggestion.pos.ch}`,
			cls: "RF-info"
		});
		el.addClass("RF-suggestion");
	}

	onNoSuggestion() {
		this.resultContainerEl.empty();
		this.resultContainerEl.appendChild(createDiv({
			text: "Nothing found.",
			cls: "suggestion-empty"
		}));
	}

	onChooseSuggestion(item: SearchResult) {
		this.editor.setCursor(item.pos);
		this.editor.setSelection({
			line: item.pos.line,
			ch: item.pos.ch - this.currentQuery.length,
		}, item.pos);
	}
}
