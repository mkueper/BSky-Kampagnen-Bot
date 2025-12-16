# Bluesky Client Bedienungsanleitung

## Inhaltsverzeichnis
1. [Einleitung](#einleitung)
2. [Installation](#installation)
3. [Erste Schritte](#erste-schritte)
4. [Hauptfunktionen](#hauptfunktionen)
5. [Navigationsleiste](#navigationsleiste)
6. [Timeline](#timeline)
7. [Profilverwaltung](#profilverwaltung)
8. [Suche](#suche)
9. [Einstellungen](#einstellungen)
10. [Troubleshooting](#troubleshooting)

## Einleitung

Dieses Handbuch beschreibt die Bedienung des Bluesky Clients, einer React-basierten Anwendung zur Interaktion mit der Bluesky API.

## Installation

### Voraussetzungen
- Node.js (Version 16 oder höher)
- npm oder yarn

### Schritte
1. Repository klonen:
   ```bash
   git clone <repository-url>
   ```
2. Abhängigkeiten installieren:
   ```bash
   cd bsky-client
   npm install
   ```
3. Entwicklungsserver starten:
   ```bash
   npm run dev
   ```

## Erste Schritte

### Anmeldung
1. Öffnen Sie die Anwendung in Ihrem Browser
2. Klicken Sie auf "Anmelden"
3. Geben Sie Ihre Bluesky-Anmeldedaten ein
4. Bestätigen Sie die Anmeldung

### Erste Benutzeroberfläche
Nach der Anmeldung sehen Sie die Haupttimeline mit Ihren Posts und Beiträgen von Follows.

## Hauptfunktionen

### 1. Timeline
Die Timeline zeigt Ihre Posts sowie Beiträge von Accounts, denen Sie folgen.

### 2. Composer
Verwenden Sie den Composer zur Erstellung neuer Posts:
- Klicken Sie auf die "Schreiben"-Schaltfläche
- Geben Sie Ihren Text ein
- Fügen Sie Medien hinzu (Bilder/Videos)
- Veröffentlichen Sie den Post

### 3. Profile
Sehen und bearbeiten Sie Ihr Profil:
- Klicken Sie auf Ihren Avatar in der Navigationsleiste
- Bearbeiten Sie Ihre Profildaten
- Verwalten Sie Ihre Follows

### 4. Suche
Finden Sie Posts, Profile und Hashtags:
- Verwenden Sie das Suchfeld in der Navigationsleiste
- Filtern Sie Ergebnisse nach Typ (Posts, Profile, Hashtags)

## Navigationsleiste

Die Navigationsleiste befindet sich links und bietet Zugriff auf folgende Funktionen:

### Hauptnavigation
- **Timeline**: Hauptfeed mit Posts
- **Suche**: Suchfunktion für Posts und Profile
- **Profil**: Ihr Profil und Einstellungen
- **Einstellungen**: Anwendungseinstellungen

### Navigationspunkte
- **Home**: Haupttimeline
- **Notifications**: Benachrichtigungen
- **Messages**: Private Nachrichten
- **Bookmarks**: Gespeicherte Posts

## Timeline

### Anzeigeoptionen
- **Neueste Posts**: Aktuellste Beiträge zuerst
- **Beliebteste Posts**: Am meisten interagierte Beiträge
- **Gefolgt von**: Posts von Accounts, denen Sie folgen

### Interaktionen
- **Like**: Klicken Sie auf das Herz-Symbol
- **Repost**: Klicken Sie auf das Repost-Symbol
- **Kommentar**: Klicken Sie auf den Kommentar-Button
- **Teilen**: Verwenden Sie das Teilen-Menü

## Profilverwaltung

### Profildaten bearbeiten
1. Klicken Sie auf Ihr Profilbild in der Navigationsleiste
2. Wählen Sie "Profil bearbeiten"
3. Aktualisieren Sie Ihre:
   - Anzeigename
   - Bio
   - Profilbild
   - Hintergrundbild

### Follows verwalten
- Klicken Sie auf das "Follow"-Symbol neben einem Profil
- Verwenden Sie den "Following"-Bereich, um Follows zu verwalten

## Suche

### Suchbegriffe
- **Posts**: Suchen Sie nach Textinhalten
- **Profile**: Finden Sie Accounts nach Namen
- **Hashtags**: Durchsuchen Sie Posts mit bestimmten Hashtags

### Suchfilter
- **Zeitraum**: Letzte Stunde, heute, diese Woche, dieser Monat
- **Sortierung**: Neueste, Beliebteste, Relevanz

## Einstellungen

### Anwendungseinstellungen
- **Theme**: Hell/Dunkel-Modus
- **Sprache**: Sprache der Benutzeroberfläche
- **Benachrichtigungen**: Einstellungen für Push-Benachrichtigungen
- **Datenschutz**: Privatsphäre-Einstellungen

### Account-Einstellungen
- **Passwort ändern**: Sicherheitseinstellungen
- **Sitzungen verwalten**: Aktive Sitzungen auflisten
- **Kontodaten**: Kontoinformationen und Abrechnung

## Troubleshooting

### Häufige Probleme

#### 1. Anmeldung fehlgeschlagen
- Überprüfen Sie Ihre Internetverbindung
- Stellen Sie sicher, dass Ihre Anmeldedaten korrekt sind
- Prüfen Sie, ob Bluesky zurzeit untergeht

#### 2. Posts werden nicht veröffentlicht
- Überprüfen Sie die Netzwerkverbindung
- Prüfen Sie die Dateigröße der Medien (max. 50MB)
- Stellen Sie sicher, dass Ihre Inhalte den Richtlinien entsprechen

#### 3. Timeline lädt nicht
- Aktualisieren Sie die Seite (F5)
- Löschen Sie den Browser-Cache
- Prüfen Sie, ob Ihr Account gesperrt wurde

### Technischer Support
Wenn Probleme weiterbestehen:
1. Öffnen Sie die Entwicklertools (F12)
2. Überprüfen Sie die Konsolenmeldungen
3. Senden Sie einen Fehlerbericht mit den Logs an das Support-Team

## Feedback

Wir freuen uns über Ihr Feedback zur Verbesserung des Bluesky Clients:
- E-Mail: support@bluesky-client.de
- GitHub Issues: https://github.com/your-repo/issues