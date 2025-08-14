// Zentrale Registry, über die der Rest der App Profile holt.
// Neue Plattformen nur hier registrieren.

import type { PlatformProfile } from "./types";

// Placeholders – konkrete Profile später importieren (z. B. aus ./bluesky, ./mastodon)
const registry: Record<string, PlatformProfile> = {};

/** In Setup-Phase aufrufen, um Profile zu registrieren. */
export function registerProfile(profile: PlatformProfile): void {
  if (!profile?.id) throw new Error("Ungültiges Profil: fehlende id");
  if (registry[profile.id]) {
    throw new Error(`Profil bereits registriert: ${profile.id}`);
  }
  registry[profile.id] = profile;
}

/** Profil holen oder Fehler werfen, falls unbekannt. */
export function getProfile(id: string): PlatformProfile {
  const p = registry[id];
  if (!p) throw new Error(`Unbekanntes Plattformprofil: ${id}`);
  return p;
}

/** Alle registrierten Profile auflisten (für UI/Dropsdowns). */
export function listProfiles(): PlatformProfile[] {
  return Object.values(registry);
}
