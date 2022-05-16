import {readFileSync} from 'fs';
import {Nodehun} from 'nodehun';
import path from 'path';

/**
 * TODO: add more docs.
 */
export class SpellCheck {
	static nodehub: any;
	static nodehub_locale: any;

	static initNodehun(locale: string) {
		if (SpellCheck.nodehub_locale !== locale) {
			SpellCheck.nodehub_locale = locale;
			const directoriesPath =
				process.env.NODE_ENV === 'development'
					? path.join(__dirname, '../../../../renderer/dictionaries')
					: path.join(process.resourcesPath, 'dictionaries');
			var aff_data = readFileSync(
				path.join(directoriesPath, locale, locale + '.aff')
			);
			var dic_data = readFileSync(
				path.join(directoriesPath, locale, locale + '.dic')
			);
			SpellCheck.nodehub = new Nodehun(aff_data, dic_data);
		}
	}

	/** True if ok.
	 */
	static checkWord(word: string) {
		return SpellCheck.nodehub ? SpellCheck.nodehub.spellSync(word) : true;
	}
}
