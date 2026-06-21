/*
 * One-off build helper: generates resources/lang/es.json and resources/lang/fr.json
 * from resources/lang/en.json. Translates a curated dictionary of common
 * business/accounting/UI terms exactly (case-sensitive key match); any key
 * not in the dictionary falls back to the English source string, matching
 * the existing resources/lang/{ne,ar}.json convention (LocalizationService
 * merges file translations with English fallback at runtime either way).
 *
 * Run with: node scripts/build-lang-translations.js
 */
const fs = require('fs');
const path = require('path');

const langDir = path.join(__dirname, '..', 'resources', 'lang');
const en = JSON.parse(fs.readFileSync(path.join(langDir, 'en.json'), 'utf8'));

const dict = require('./lang-dictionary.cjs');

function build(map) {
    const out = {};
    for (const key of Object.keys(en)) {
        out[key] = Object.prototype.hasOwnProperty.call(map, key) ? map[key] : en[key];
    }
    return out;
}

for (const [code, map] of Object.entries(dict)) {
    const translated = build(map);
    const file = path.join(langDir, `${code}.json`);
    fs.writeFileSync(file, JSON.stringify(translated, null, 4) + '\n');
    const count = Object.keys(map).length;
    console.log(`${code}.json written — ${count} translated keys, ${Object.keys(en).length - count} fallback to English`);
}
