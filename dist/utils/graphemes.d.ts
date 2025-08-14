/**
 * Robuste Grapheme-Zählung:
 * 1) bevorzugt Intl.Segmenter
 * 2) Fallback: grapheme-splitter (NPM)
 * 3) Minimal-Fallback: [...text].length (ungenau, aber failsafe)
 */
/** Sync-Variante mit bestmöglicher Genauigkeit ohne Async-Ladezeit. */
export declare function countGraphemesSync(text: string): number;
/** Async-Variante, die bei fehlendem Intl.Segmenter den NPM-Fallback lädt. */
export declare function countGraphemes(text: string): Promise<number>;
