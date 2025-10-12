// src/utils/graphemes.js
/**
 * Kleine Hilfsfunktionen rund um Unicode-Grapheme.
 *
 * Dient dazu, plattformspezifische Limits korrekt zu berechnen – normale
 * `string.length` würde zusammengesetzte Zeichen falsch behandeln.
 */
const GraphemeSplitter = require("grapheme-splitter");

function countGraphemesSync(text) {
  const splitter = new GraphemeSplitter();
  return splitter.countGraphemes(text);
}

module.exports = {
  countGraphemesSync,
};
