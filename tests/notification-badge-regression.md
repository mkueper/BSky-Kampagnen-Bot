# Notification Badge – Regressionstestliste

## BSky-Client / Notifications-System

Diese Datei dokumentiert alle Tests, die sicherstellen, dass der Notification-Badge korrekt funktioniert, nachdem folgende Fixes implementiert wurden:

- Fix 1: refreshListByKey() übernimmt page.unreadCount → updateUnread().
- Fix 2: Guard in Notifications.jsx synchronisiert bestehenden unreadCount, auch wenn kein Refresh ausgeführt wird.


## 🔍 Testfälle

### 1. Navigation: Home → Notifications → Search

**Erwartet:**  
notificationsUnread bleibt stabil; Badge zeigt unverändert den zuletzt bekannten Wert.

### 2. Erstes Laden der Notifications-Seite

**Erwartet:**  
notificationsUnread wird aus page.unreadCount gesetzt; Badge erscheint nur, wenn der Wert >0 ist.

### 3. Neue Benachrichtigungen treffen ein

**Erwartet:**  
Nach dem nächsten Refresh oder Polling übernimmt der globale State den neuen Wert; Badge aktualisiert sich sichtbar.

### 4. Manuelles Aktualisieren der Notifications-Liste

**Erwartet:**  
runListRefresh() setzt notificationsUnread aus page.unreadCount; Badge aktualisiert sich.

### 5. Polling-Ereignis (useNotificationPolling)

**Erwartet:**
Der vom Polling gelieferte unreadCount wird übernommen; globaler State und Badge stimmen überein.

### 6. Wechsel zwischen SidebarNav ↔ MobileNavBar

*Erwartet:*  
Beim Wechsel des Viewports (Desktop ↔ Mobile) zeigen beide Layouts denselben Badge-Status.

### 7. Hard Reload (Browser-Neuladen)

**Erwartet:**  
Beim initialen Laden wird notificationsUnread korrekt gesetzt (0 oder >0); Badge reflektiert diesen Wert.

### 8. Backend liefert 0 unread

**Erwartet:**  
State wird auf 0 gesetzt; Badge verschwindet zuverlässig.

### 9. Backend liefert >0 unread

**Erwartet:**  
State übernimmt den Wert; Badge zeigt die Zahl bzw. „30+“ bei Werten über 30.

### 10. Konsistenz des Globalen State-Kontexts

**Erwartet:**  
useAppState().notificationsUnread entspricht nach jedem Ereignis exakt dem erwarteten Wert und ändert sich nur, wenn neue Daten eintreffen.

### Hinweise
- Diese Testliste dient als Grundlage für spätere automatisierte Tests (Jest/Vitest/Playwright).
- Änderungen an Refresh- oder Navigation-Logik sollten zwingend gegen diese Tests geprüft werden.