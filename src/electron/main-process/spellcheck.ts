import {readFileSync, existsSync} from 'fs';
import {Nodehun} from 'nodehun';
import path from 'path';
import {i18n} from './locales';
const {dialog} = require('electron');

/**
 * Class providing with spellchecking functions.
 * See ipc event that use it in './ipc.ts'.
 */
export class SpellCheck {
	/** Current spell checking operator. */
	static operator: any;
	/** Current selected language. Will be set to not-null when spell checking was required. */
	static language: any;
	/** Alphabets for all supported languages. */
	static readonly alphabets = new Map<string, string>([
		['en-US', 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'],
		[
			'ru',
			'абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'
		],
		['it', 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ']
	]);
	/** Percentage of letters in a word required for the word to be assigned to a specific language. */
	static readonly letters_threshold: number = 0.7;

	/**
	 * Init spell checking operator if it was not already initialized.
	 * If required language is not available, then show error message (once per session).
	 */
	static tryInit(locale: string) {
		if (SpellCheck.language !== locale) {
			const directoriesPath =
				process.env.NODE_ENV === 'development'
					? path.join(__dirname, '../../../../renderer/dictionaries')
					: path.join(process.resourcesPath, 'dictionaries');
			var aff_file_path = path.join(directoriesPath, locale, locale + '.aff');
			var dic_file_path = path.join(directoriesPath, locale, locale + '.dic');
			if (
				existsSync(aff_file_path) &&
				existsSync(dic_file_path) &&
				SpellCheck.alphabets.has(locale)
			) {
				var aff_data = readFileSync(aff_file_path);
				var dic_data = readFileSync(dic_file_path);
				SpellCheck.operator = new Nodehun(aff_data, dic_data);
			} else {
				SpellCheck.operator = null;
				dialog.showMessageBox({
					message:
						i18n.t('electron.errors.spellcheckLanguageUnavailable') + locale,
					type: 'warning'
				});
			}
			SpellCheck.language = locale;
		}
	}

	static checkWord(word: string) {
		return (
			!SpellCheck.operator ||
			!SpellCheck.isWordInLanguage(word) ||
			SpellCheck.operator.spellSync(word)
		);
	}

	/**
	 * Check that the word is in current language.
	 * CodeMirror can ask for every word, so we do not check
	 * english words, for example, while the selected spellcheck language is Russian.
	 * That is why we return 'word is ok' for all words not from current language in checkWord function.
	 * You must set SpellCheck.alphabets for your language to make this function work.
	 */
	static isWordInLanguage(word: string): boolean {
		if (!SpellCheck.language) {
			return true;
		}

		const alphabet: string =
			SpellCheck.alphabets.get(SpellCheck.language) ?? '';
		let correct_letters: number = 0;

		for (var i = 0; i < word.length; i++) {
			let is_correct: boolean = alphabet.indexOf(word.charAt(i)) !== -1;
			if ((i === 0 || i === word.length - 1) && !is_correct) {
				return false;
			}
			if (is_correct) {
				correct_letters += 1;
			}
		}
		return correct_letters / word.length >= SpellCheck.letters_threshold;
	}
}
