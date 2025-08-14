"use strict";
/**
 * Robuste Grapheme-Zählung:
 * 1) bevorzugt Intl.Segmenter
 * 2) Fallback: grapheme-splitter (NPM)
 * 3) Minimal-Fallback: [...text].length (ungenau, aber failsafe)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.countGraphemesSync = countGraphemesSync;
exports.countGraphemes = countGraphemes;
let splitter = null;
// Lazy-Load des Fallbacks (optional), damit Startzeit gering bleibt:
async function loadGraphemeSplitter() {
    if (splitter)
        return splitter;
    try {
        const mod = await import("grapheme-splitter");
        const GraphemeSplitter = mod.default ?? mod;
        const instance = new GraphemeSplitter();
        splitter = {
            countGraphemes: (s) => instance.countGraphemes(s)
        };
    }
    catch {
        splitter = { countGraphemes: (s) => [...s].length };
    }
    return splitter;
}
/** Sync-Variante mit bestmöglicher Genauigkeit ohne Async-Ladezeit. */
function countGraphemesSync(text) {
    // 1) Intl.Segmenter
    const AnyIntl = Intl;
    if (typeof AnyIntl?.Segmenter === "function") {
        const seg = new AnyIntl.Segmenter("en", { granularity: "grapheme" });
        // @ts-ignore TS kennt segment() nicht streng typisiert
        return Array.from(seg.segment(text)).length;
    }
    // 2) Kein Intl.Segmenter → best effort: einfache Approximation
    return [...text].length;
}
/** Async-Variante, die bei fehlendem Intl.Segmenter den NPM-Fallback lädt. */
async function countGraphemes(text) {
    const AnyIntl = Intl;
    if (typeof AnyIntl?.Segmenter === "function") {
        const seg = new AnyIntl.Segmenter("en", { granularity: "grapheme" });
        // @ts-ignore
        return Array.from(seg.segment(text)).length;
    }
    const s = await loadGraphemeSplitter();
    return s.countGraphemes(text);
}
