#!/usr/bin/env bash

# Ziel: Ordnerstruktur für Requirements anlegen

BASE="./requirements"

mkdir -p "$BASE"/{_meta,functional,non-functional,constraints,system,business,use-cases,decisions}

# Optional: Beispiel-Templates erstellen (leer, nur zur Orientierung)
touch "$BASE/_meta"/{glossary.md,stakeholders.md,context-diagram.md,conventions.md}

echo "Requirements-Verzeichnisstruktur wurde erfolgreich angelegt."
