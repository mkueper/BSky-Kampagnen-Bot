// src/utils/graphemes.js
const GraphemeSplitter = require("grapheme-splitter");

function countGraphemesSync(text) {
  const splitter = new GraphemeSplitter();
  return splitter.countGraphemes(text);
}

module.exports = {
  countGraphemesSync,
};
