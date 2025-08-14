// Zentrale Typen/Interfaces für alle Plattform-Profile

export type CountMethod = "graphemes" | "codepoints" | "bytes";

export interface ValidationResult {
  ok: boolean;
  remaining: number;           // negativ, wenn Limit überschritten
  errors?: string[];
}

export interface PostInput {
  content: string;
  // Platzhalter für spätere Felder (CW, Visibility, Media, Polls …)
  [key: string]: unknown;
}

export interface PostOutput {
  uri: string;                 // z. B. AT-URI (Bluesky) oder Permalink (Mastodon)
  postedAt: Date;
  raw?: unknown;               // optionale Originalantwort der API fürs Debugging
}

export interface PlatformEnv {
  serverUrl?: string;          // Instanz/Server der Plattform
  token?: string;              // App-Passwort/Bearer-Token
  [key: string]: unknown;      // plattformspezifische Extras
}

export interface PlatformProfile {
  /** Eindeutige ID, z. B. "bluesky", "mastodon" */
  id: string;
  /** Anzeigename für die UI */
  displayName: string;

  /** Maximale Zeichen nach der jeweiligen Zählmethode */
  maxChars: number;

  /** Welche Zählmethode die Plattform nutzt (i. d. R. "graphemes") */
  countMethod: CountMethod;

  /** Kurzbeschreibung für UI/Entwicklung */
  description?: string;

  // ---- Kernmethoden ----

  /** Inhalt prüfen (Länge, evtl. Regeln). */
  validate(input: PostInput): ValidationResult;

  /** App-spezifische Normalisierung (z. B. Zero-Width, Whitespace), optional. */
  normalizeContent?(text: string): string;

  /** Mapping vom generischen Input zur plattformspezifischen Payload. */
  toPostPayload(input: PostInput): unknown;

  /**
   * Tatsächlicher Post-Vorgang. Implementierung ruft die Plattform-API auf.
   * `env` enthält Secrets/Server-URL etc.
   */
  post(payload: unknown, env: PlatformEnv): Promise<PostOutput>;

  /** Optionale eigene Zählfunktion, falls die Plattform Spezialregeln hat. */
  countGraphemes?(text: string): number;
}
