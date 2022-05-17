import CodeMirror from 'codemirror';
import {PrefsState} from '../store/prefs';

import {TwineElectronWindow} from '../electron/shared';

declare global {
	interface Window {
		require: any;
	}
}

require('codemirror/addon/mode/overlay.js');

export class CodeMirrorSpellCheck {
	/** Return tag or null if word is ok.
	 */
	static checkWord(word: string) {
		const {twineElectron} = window as TwineElectronWindow;
		return twineElectron?.ipcRenderer.sendSync('spellcheck-word', word)
			? null
			: 'spell-error';
	}

	/** Looks into prefs and if spellcheck is enabled return new defined mode with spellcheck,
	 * otherwise return passed mode unchanged.
	 */
	static getModeByPrefs(mode: string, prefs: PrefsState): string {
		return prefs.spellchecking ? CodeMirrorSpellCheck.createMode(mode) : mode;
	}

	/** Define mode and return its name.
	 */
	static createMode(original_mode: string): string {
		const new_mode_name: string = original_mode + '-with-spellcheck';

		// Create function
		CodeMirror.defineMode(
			new_mode_name,
			function codeMirrorSpellCheckMode(config: any, parserConfig: any) {
				// Define what separates a word
				var rx_word = '!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~ 0123456789';

				// Create the overlay and such
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
						return CodeMirrorSpellCheck.checkWord(word);
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
}
