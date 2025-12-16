# Refactoring Prompt

## Ziel
Refaktorisierung von Code zur Verbesserung der Qualität, Lesbarkeit und Wartbarkeit.

## Anforderungen

### 1. Code-Qualität
- **Struktur**: Klare, logische Struktur mit sinnvollen Abstraktionen
- **Konsistenz**: Einheitliche Namenskonventionen und Programmierstile
- **Redundanz**: Entfernung von doppeltem Code und unnötigen Wiederholungen
- **Komplexität**: Reduzierung der Komplexität durch Aufteilung großer Funktionen

### 2. Lesbarkeit
- **Variablennamen**: Beschreibende, aussagekräftige Variablennamen
- **Funktionen**: Kleine, einheitliche Funktionen mit klarer Verantwortung
- **Dokumentation**: Kommentare und Dokumentation zur Erklärung komplexer Logik
- **Formatierung**: Konsistente Formatierung und Einrückung

### 3. Wartbarkeit
- **Testbarkeit**: Erleichterung der Unit-Tests und Integrationstests
- **Erweiterbarkeit**: Einfache Erweiterung neuer Funktionen
- **Fehleranfälligkeit**: Reduzierung von Fehlerquellen durch bessere Struktur

## Schritte zur Refaktorisierung

1. **Analyse**:
   - Identifizieren von Code-Smells (z.B. Long Method, Duplicated Code)
   - Bewertung der aktuellen Struktur und Komplexität

2. **Planung**:
   - Bestimmen der zu refaktorisierenden Bereiche
   - Erstellen eines Refaktorierungsplans mit Prioritäten

3. **Implementierung**:
   - Durchführen der Änderungen schrittweise
   - Sicherstellen, dass alle Tests weiterhin erfolgreich sind

4. **Überprüfung**:
   - Code-Review durch Kollegen
   - Ausführung aller relevanten Tests
   - Bewertung der Verbesserungen

## Wichtige Prinzipien

- **Sichere Refaktorisierung**: Jede Änderung sollte die Funktionalität nicht beeinträchtigen
- **Kleine Schritte**: Refaktorisierung in kleinen, sicheren Schritten durchführen
- **Automatisierte Tests**: Vollständige Testabdeckung vor der Refaktorisierung
- **Dokumentation**: Dokumentation der getätigten Änderungen und deren Gründe

## Beispiele für Refaktorierungsmaßnahmen

- Funktionen aufteilen in kleinere, spezifischere Funktionen
- Variablen umbenennen zu aussagekräftigeren Namen
- Kommentare hinzufügen zur Erklärung komplexer Logik
- Duplikate entfernen und in gemeinsame Funktionen auslagern
- Klasse oder Modul aufteilen, wenn sie zu groß wird
- Verwenden von Designmustern, wenn sinnvoll

## Bewertungskriterien

- Verbesserung der Lesbarkeit
- Reduzierung der Komplexität
- Erhöhung der Wartbarkeit
- Keine Änderung der Funktionalität
- Vollständige Testabdeckung nach der Refaktorisierung