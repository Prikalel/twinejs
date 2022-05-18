import CodeMirror, {Editor, Hint, Hints} from 'codemirror';
import {PrefsState} from '../store/prefs';

import {TwineElectronWindow} from '../electron/shared';

declare global {
	interface Window {
		require: any;
	}
}

require('codemirror/addon/mode/overlay.js'); // TODO: check if these lines are necessary.
require('codemirror/addon/hint/show-hint.js');

/** As specified in codemirror source, function may have a boolean property.
 */
type HintFunction = {
	(): Hints;
	supportsSelection?: boolean;
};

type IgnoreListChangeHandler = (newIgnoreList: string[]) => void;

export class CodeMirrorSpellCheck {
	private static ignoreWords: Set<string> = new Set<string>();

	/** Return tag if word is bad or null if word is ok.
	 */
	private static checkWord(word: string, language: string) {
		const {twineElectron} = window as TwineElectronWindow;
		return CodeMirrorSpellCheck.ignoreWords.has(word) ||
			twineElectron?.ipcRenderer.sendSync('spellcheck-word', word, language)
			? null
			: 'spell-error';
	}

	/** Looks into prefs and if spellcheck is enabled return new defined mode with spellcheck,
	 * otherwise return passed mode unchanged.
	 */
	static getModeByPrefs(mode: string, prefs: PrefsState): string {
		prefs.spellcheckIgnoreList.forEach((value: string) => {
			CodeMirrorSpellCheck.ignoreWords.add(value);
		});
		return prefs.spellchecking
			? CodeMirrorSpellCheck.createMode(mode, prefs.locale)
			: mode;
	}

	/** Define mode and return its name.
	 */
	private static createMode(original_mode: string, language: string): string {
		const new_mode_name: string = original_mode + '-with-spellcheck';

		CodeMirror.defineMode(
			new_mode_name,
			function codeMirrorSpellCheckMode(config: any, parserConfig: any) {
				// Define what separates a word.
				var rx_word = '!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~ 0123456789';

				// Create the overlay and such.
				var overlay = {
					token: function (stream: any) {
						var ch = stream.peek();
						var word: string = '';

						if (rx_word.includes(ch)) {
							stream.next();
							return null;
						}

						while ((ch = stream.peek()) != null && !rx_word.includes(ch)) {
							word += ch;
							stream.next();
						}
						return CodeMirrorSpellCheck.checkWord(word, language);
					}
				};

				return CodeMirror.overlayMode(
					CodeMirror.getMode(config, parserConfig.backdrop || original_mode),
					overlay
				);
			}
		);

		return new_mode_name;
	}

	/** Use hint as dialog for user to add or remove words from Ignore list.
	 * `onIgnoreListChange` should handle preferences saving to disk.
	 */
	private static createHint(
		onIgnoreListChange: IgnoreListChangeHandler,
		word: string
	): Hint {
		const isInIgnoreList: boolean = CodeMirrorSpellCheck.ignoreWords.has(word);
		return {
			text: '',
			displayText: isInIgnoreList
				? 'Delete from dictionary'
				: 'Add to dictionary',
			hint: function (cm: Editor, data: Hints, cur: Hint) {
				if (isInIgnoreList) {
					CodeMirrorSpellCheck.ignoreWords.delete(word);
				} else {
					CodeMirrorSpellCheck.ignoreWords.add(word);
				}
				onIgnoreListChange(
					Array.from(CodeMirrorSpellCheck.ignoreWords.values())
				);
				cm.getDoc().setSelection(cm.getCursor());
			}
		};
	}

	/** Context menu is shown when user wants to add selected word to the ignore list.
	 */
	static contextMenuFunction(onIgnoreListChange: IgnoreListChangeHandler) {
		return function contextMenuEvent(editor: Editor, event: any): void {
			if (CodeMirrorSpellCheck.badSelection(editor)) {
				return;
			}
			const word: string = editor.getSelection();

			var options = {
				completeSingle: false,
				hint: <HintFunction>(() => {
					// Actually, 'from' and 'to' can be any value you want.
					return <Hints>{
						list: [CodeMirrorSpellCheck.createHint(onIgnoreListChange, word)],
						from: editor.listSelections()[0].anchor,
						to: editor.listSelections()[0].head
					};
				})
			};
			options.hint.supportsSelection = true;
			editor.showHint(options);
		};
	}

	/** Check the selection is not ok.
	 * Do not allow multiline selections (see codemirror source).
	 */
	private static badSelection(editor: Editor): boolean {
		return (
			!editor.somethingSelected() ||
			editor.getSelections().length > 1 ||
			editor.listSelections()[0].anchor.line !=
				editor.listSelections()[0].head.line
		);
	}
}
