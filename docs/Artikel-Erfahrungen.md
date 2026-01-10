# Meine Erfahrungen bei der Entwicklung eines Programms nur durch Prompts für eine KI

## Ziel und Einordnung des Artikels

Dieser Artikel ist ein persönlicher, freier Erfahrungsbericht aus praktischer Entwicklungsarbeit. Er erhebt keinen Anspruch auf Vollständigkeit oder Allgemeingültigkeit, sondern beschreibt Beobachtungen, Entscheidungen und Schlussfolgerungen aus einem konkreten Projektkontext.

* keine Werbung für KI-Entwicklung
* keine Verteufelung von KI
* nüchterne Betrachtung von Chancen und Risiken

Der Text ist als freier Inhalt veröffentlicht und steht unter der **Creative Commons Attribution 4.0 International (CC BY 4.0)**. Nutzung, Weitergabe und Bearbeitung sind unter Nennung des Urhebers und der Lizenz erlaubt.

Geschrieben ist dieser Text aus Entwicklersicht – für alle, die selbst programmieren, mit KI experimentieren oder darüber entscheiden, ob und wie KI in Entwicklungsprozessen eingesetzt wird.

---

## 1. Einleitung: Was bedeutet „Programmieren nur per Prompt“?

Der Begriff „Programmieren nur per Prompt“ ist unscharf und missverständlich. Er suggeriert entweder eine radikale Vereinfachung von Softwareentwicklung oder eine Form automatisierter Code-Erzeugung ohne menschliche Verantwortung. Beides trifft auf die hier beschriebene Praxis nicht zu.

In der praktischen Arbeit zeigte sich schnell, dass eine solche Lesart in die Irre führt. Gemeint ist vielmehr ein Entwicklungsansatz, bei dem der überwiegende Teil des Codes durch eine KI erzeugt wird – gesteuert über textuelle Anweisungen (Prompts) –, während der Mensch die Rolle des konzeptionellen, prüfenden und verantwortlichen Akteurs behält.

### 1.1 Abgrenzung zu klassischer Entwicklung

In klassischer Softwareentwicklung schreibt der Mensch den Code selbst, nutzt Werkzeuge zur Unterstützung und greift bei Bedarf auf Dokumentation oder externe Quellen zurück. Die Kontrolle über Struktur, Logik und Detailentscheidungen liegt kontinuierlich beim Entwickler oder im Team.

Beim Prompt-basierten Programmieren verschiebt sich dieser Schwerpunkt spürbar:

* Der Mensch formuliert Anforderungen, beschreibt gewünschtes Verhalten und setzt Rahmenbedingungen.
* Die KI übernimmt große Teile der konkreten Implementierung.
* Der Entwicklungsprozess wird dialogisch statt schrittweise.

Der Unterschied liegt nicht im Ergebnis – es entsteht weiterhin Quellcode –, sondern im Weg dorthin. Spätestens im Projektverlauf wurde deutlich, dass dieser Unterschied tiefgreifende Folgen hat.

### 1.2 Rolle des Menschen

Auch bei intensiver Nutzung von KI bleibt der Mensch für zentrale Aufgaben unverzichtbar:

* Formulierung und Priorisierung der Anforderungen
* Entwurf und Bewertung der Architektur
* Einordnung der erzeugten Lösungen
* Tests, Abnahme und letztlich die Verantwortung für das Ergebnis

Der Mensch ist damit weniger klassischer Coder als Anforderungsgeber, Architekt und Prüfer. Diese Verschiebung fühlt sich zunächst effizient an, erfordert aber ein hohes Maß an Aufmerksamkeit.

### 1.3 Rolle der KI

Die KI agiert in diesem Ansatz als ausführender Coder und als eine Art Co-Designer:

* Übersetzung von Anforderungen in konkreten Code
* Vorschläge für Lösungswege und Varianten
* Erklärungen bestehenden Codes oder Dokumentation auf Anfrage

In der täglichen Arbeit zeigte sich jedoch klar: Die KI besitzt kein eigenes Verständnis von Projektzielen, langfristiger Wartbarkeit oder Verantwortung. Sie reagiert ausschließlich auf den jeweils gegebenen Kontext und die formulierten Anweisungen.

### 1.4 Das konkrete Projekt

Die folgenden Erfahrungen basieren auf einem realen Softwareprojekt, das über einen längeren Zeitraum nahezu vollständig auf diese Weise entwickelt wurde.

Es handelte sich um ein wachsendes Webprojekt mit zunehmender Komplexität, mehreren Funktionsbereichen und fortlaufenden Änderungen. Technische Details sind an dieser Stelle bewusst zweitrangig. Entscheidend ist: Es ging nicht um ein kurzes Experiment, sondern um ein Projekt mit realem Nutzwert und realen Konsequenzen.

Diese Einordnung ist notwendig, um die folgenden Kapitel richtig zu lesen – insbesondere dort, wo Vorteile und Risiken gegeneinander abgewogen werden.

---

## 2. Ausgangssituation und Motivation

Der Einstieg in dieses Experiment war weder von Euphorie noch von grundsätzlicher Skepsis geprägt. Ausgangspunkt war eine sehr persönliche Frage: *Was passiert, wenn ich die Versprechen KI-gestützter Entwicklung konsequent ernst nehme und sie nicht nur punktuell, sondern durchgängig einsetze?*

### 2.1 Ausgangslage

Zum Zeitpunkt des Experiments verfügte ich über langjährige Erfahrung in der Softwareentwicklung. Agile Vorgehensmodelle, Application-Lifecycle-Management (ALM), Reviews, Tests und inkrementelle Weiterentwicklung gehörten für mich zum normalen Arbeitsalltag.

Diese Erfahrungen waren kein Ballast, sondern eine wichtige Grundlage. Sie haben mir früh gezeigt, wie entscheidend klare Ziele, Rückkopplungsschleifen und bewusst gesetzte Qualitätsgrenzen sind – und dass man sich dieser Hilfsmittel auch bei der Arbeit mit KI nicht berauben sollte.

Gerade im Zusammenspiel mit KI wurde mir deutlich: Je unklarer das gewünschte Ergebnis ist, desto schwieriger wird es, sinnvolle Prompts zu formulieren. Umgekehrt hilft eine saubere Zieldefinition enorm – und genau dabei kann eine KI wiederum unterstützen, etwa beim Strukturieren von Anforderungen oder beim Durchdenken möglicher Varianten.

### 2.2 Motivation

Mehrere Motive spielten für mich eine Rolle:

* der Wunsch, Entwicklungsprozesse zu beschleunigen
* die Hoffnung, Routinearbeit stärker auslagern zu können
* die Neugier, ob sich komplexere Software über fortlaufenden Austausch stabil entwickeln lässt
* und die Frage, ob sich meine eigene Rolle als Entwickler spürbar verändern würde

Das Ziel war kein Show-Case und kein Beweis für oder gegen KI, sondern ein belastbarer Praxistest unter realen Bedingungen.

### 2.3 Annahmen und Erwartungen

Zu Beginn ging ich von mehreren Annahmen aus:

* dass die KI bei sauber formulierten Anforderungen konsistenten Code erzeugt
* dass sich Architekturentscheidungen zumindest teilweise über Prompts steuern lassen
* dass mein eigener Zeitaufwand trotz zusätzlicher Kommunikation insgesamt sinkt

Rückblickend waren diese Annahmen nicht unrealistisch. Sie entsprachen weitgehend dem öffentlichen Diskurs – und genau deshalb war es mir wichtig, sie in der Praxis zu überprüfen.

### 2.4 Rahmen des Experiments

Wichtig ist: Das Projekt war kein kurzlebiges Experiment. Es handelte sich um eine Software mit echtem Nutzwert, die weiterentwickelt, angepasst und gewartet werden sollte.

Viele der interessanten Effekte zeigen sich nicht in den ersten Tagen, sondern erst mit wachsender Codebasis, zunehmender Komplexität und zeitlichem Abstand.

---

## 3. Vorgehensweise und Rahmenbedingungen

Das Experiment war nicht als theoretische Übung angelegt, sondern als durchgängige Arbeitsweise im Projektalltag. Entsprechend wichtig war es für mich, klare – wenn auch anfangs noch grobe – Rahmenbedingungen zu setzen.

### 3.1 „Nur per Prompt“ – mit Einschränkungen

Der Anspruch, ausschließlich per Prompt zu entwickeln, war bewusst nicht dogmatisch gemeint. Es ging mir nicht darum, jeden manuellen Eingriff zu verbieten, sondern darum, die **primäre kreative und produktive Arbeit** konsequent der KI zu überlassen.

Konkret bedeutete das:

* neue Funktionen wurden grundsätzlich über Prompts entworfen und umgesetzt
* bestehender Code wurde von der KI erklärt oder gemeinsam mit ihr weiterentwickelt
* Änderungen, Erweiterungen und Refactorings wurden ebenfalls prompt-basiert angestoßen

Manuelle Eingriffe beschränkten sich auf Korrekturen, Zusammenführungen oder bewusste Eingriffe an kritischen Stellen. Der Kern der Arbeit blieb ein fortlaufendes Hin- und Her.

### 3.2 Arbeitsumgebung und Zusammenarbeit

Die Entwicklung fand weiterhin in einer klassischen Entwicklungsumgebung statt. IDE, Versionskontrolle und Tests blieben unverzichtbar. Neu war jedoch die Art der Zusammenarbeit mit der KI.

In der praktischen Arbeit spielte dabei ein agentenbasierter Ansatz die zentrale Rolle. Der überwiegende Teil der Entwicklung erfolgte über einen persistenten Agenten, der dauerhaft in den Projektkontext eingebunden war und die eigentliche Arbeitslast trug.

Eine externe KI nutzte ich ergänzend – vor allem dann, wenn sich Probleme festgefahren hatten, eine zweite Perspektive hilfreich war oder schlicht Abstand notwendig wurde. Sie war damit nicht Teil des laufenden Entwicklungsprozesses, sondern eine punktuelle Unterstützung.

Dabei zeigte sich für mich ein unerwarteter Effekt: Die vermeintlich engere Integration erhöhte die Komplexität der Zusammenarbeit.

Der Grund war weniger technisch als organisatorisch. Kontext, Zuständigkeiten und Rollen verschwammen stärker, Rückfragen wurden fragmentierter, und es wurde schwieriger, einen klaren mentalen Überblick zu behalten. Im Vergleich zur integrierten Agentenarbeit erwies sich die punktuelle Arbeit mit einer externen KI – bewusst getrennt vom Code – als klarer und kontrollierbarer.

### 3.3 Kommunikation mit der KI

Zentral für den Erfolg – und später auch für viele Probleme – war die Art der Kommunikation.

Gute Ergebnisse hingen weniger von einzelnen „perfekten“ Prompts ab als von der Bereitschaft:

* Anforderungen immer wieder nachzuschärfen
* Zwischenergebnisse kritisch zu hinterfragen
* Missverständnisse offen zu benennen

Der Arbeitsprozess bestand aus Beschreiben, Prüfen und Anpassen. Dieser Ablauf war leistungsfähig, aber auch anstrengend – und deutlich zeitintensiver, als es auf den ersten Blick wirkte.

### 3.4 Art des entwickelten Systems

Bei der entwickelten Software handelte es sich um ein wachsendes Webprojekt mit mehreren Funktionsbereichen und realen Abhängigkeiten.

Mit zunehmender Projektgröße verschoben sich die Herausforderungen spürbar: Weg von der reinen Umsetzung einzelner Features, hin zu Fragen von Struktur, Konsistenz und Wartbarkeit.

Gerade dieser Kontext ist entscheidend für die folgenden Kapitel. Viele Effekte – positive wie negative – treten erst dann auf, wenn ein Projekt nicht mehr überschaubar ist.

### 3.5 Erste Beobachtungen

Bereits in dieser frühen Phase zeigten sich für mich zwei gegensätzliche Tendenzen:

* einerseits beeindruckende Geschwindigkeit und Flexibilität
* andererseits ein wachsender Bedarf an Kontrolle, Dokumentation und bewusster Struktur

Diese Spannung zieht sich durch den gesamten weiteren Verlauf des Experiments.

---

## 4. Was wirklich gut funktioniert hat

Bevor die problematischen Seiten dieses Ansatzes sichtbar wurden, gab es eine Phase, in der sich die Arbeit mit der KI nahezu ideal anfühlte. Diese Beobachtungen sind wichtig, weil sie erklären, warum man geneigt ist, den eingeschlagenen Weg konsequent weiterzugehen.

### 4.1 Schnelle Umsetzung von Routinecode

Besonders überzeugend war die Geschwindigkeit bei Aufgaben, die in klassischen Projekten viel Zeit binden, ohne inhaltlich besonders anspruchsvoll zu sein:

* Anlegen von Grundstrukturen
* wiederkehrende CRUD-Logik
* Formular- und API-Anbindungen
* einfache Validierungen

Die KI erzeugte hier in kurzer Zeit funktionsfähigen Code, der sich meist ohne größere Anpassungen integrieren ließ. Der Zeitgewinn war real und spürbar.

### 4.2 Boilerplate, Setup und Konfigurationen

Ein weiterer klarer Vorteil lag im Umgang mit Boilerplate und Initial-Setup:

* Projektgrundlagen
* Konfigurationsdateien
* Build- und Tooling-Setup

Gerade in Webprojekten sind diese Arbeiten oft fehleranfällig und mental ermüdend. Die KI nahm einem hier einen großen Teil der Detailarbeit ab. Rückblickend war das einer der Punkte, an denen die Methode besonders überzeugend wirkte.

### 4.3 Prototyping und Ideenskizzen

Sehr stark war die KI im frühen Stadium neuer Funktionen:

* Skizzieren von Feature-Ideen
* schnelles Durchspielen alternativer Ansätze
* Erzeugen erster lauffähiger Prototypen

Der dialogische Charakter machte es leicht, Gedanken weiterzuentwickeln, ohne sich sofort auf eine Richtung festlegen zu müssen. Ideen konnten ausprobiert und verworfen werden, ohne dass zuvor viel eigene Implementierungsarbeit investiert werden musste.

### 4.4 Erklärungen, Tests und Dokumentation auf Zuruf

Ein nicht zu unterschätzender Vorteil war die Fähigkeit der KI, bestehenden Code zu erklären und daraus Tests oder Dokumentation abzuleiten:

* verständliche Erläuterungen komplexerer Codeabschnitte
* Vorschläge für Unit-Tests
* Zusammenfassungen von Funktionslogik

Das funktionierte besonders gut, solange der betrachtete Codeumfang überschaubar war und der Kontext klar abgegrenzt blieb.

### 4.5 Fehlersuche über verbale Beschreibung

Auch bei der Fehlersuche zeigte sich ein praktischer Nutzen. Statt sich ausschließlich durch Logs und Code zu arbeiten, konnte man Probleme zunächst beschreiben:

* Was funktioniert nicht?
* Unter welchen Bedingungen tritt der Fehler auf?
* Welche Änderungen gingen voraus?

Die KI lieferte daraufhin Hypothesen und mögliche Ursachen, die zumindest als Ausgangspunkt für weitere Analyse dienten. Das ersetzte kein Debugging, beschleunigte aber oft den Einstieg.

### 4.6 Warum diese Phase trügerisch ist

Diese positiven Erfahrungen sind kein Zufall und keine Einbildung. Sie erklären, warum KI-gestützte Entwicklung auf den ersten Blick so überzeugend wirkt.

Entscheidend ist jedoch: Die meisten dieser Vorteile entfalten sich in Situationen mit begrenztem Kontext, klaren Aufgaben und überschaubarer Komplexität. Genau hier liegt der Übergang zu den späteren Problemen – ein Übergang, der sich nicht abrupt, sondern schleichend vollzieht.

---

## 5. Welche Erwartungen sich NICHT erfüllt haben

Mit zunehmender Projektdauer zeigte sich, dass einige der anfänglichen Erwartungen zwar plausibel wirkten, sich in der Praxis jedoch nur eingeschränkt oder gar nicht erfüllten. Diese Diskrepanz wurde nicht sofort sichtbar, sondern entwickelte sich schleichend – oft erst dann, wenn das Projekt eine gewisse Größe erreicht hatte.

### 5.1 Produktivität versus tatsächlicher Aufwand

Eine zentrale Erwartung von mir war, dass die Produktivität dauerhaft steigt. In frühen Phasen traf das auch zu. Mit wachsender Codebasis kehrte sich dieser Effekt jedoch teilweise um.

Der Zeitgewinn bei der eigentlichen Code-Erzeugung wurde zunehmend durch andere Faktoren aufgezehrt:

* präzisere und längere Prompts
* häufigere Rückfragen und Korrekturschleifen
* steigender Aufwand für Review und Einordnung

Die Arbeit verlagerte sich – sie verschwand nicht. Produktivität ließ sich nicht mehr allein in geschriebenen Zeilen oder umgesetzten Features messen.

### 5.2 Stabilität und Wiederholbarkeit

Eine weitere Erwartung betraf die Stabilität der Ergebnisse. Es lag nahe anzunehmen, dass gut formulierte Prompts zu reproduzierbaren Resultaten führen.

In meiner praktischen Arbeit zeigte sich jedoch:

* ähnliche Prompts führten nicht immer zu vergleichbaren Lösungen
* kleine Kontextänderungen hatten teils große Auswirkungen
* spätere Anpassungen wirkten sich unerwartet auf bestehende Funktionalität aus

Damit ging ein schleichender Verlust an Planbarkeit einher, der in klassischen Entwicklungsprozessen so nicht auftritt.

### 5.3 Tests: Wenn Absicherung selbst zum Risiko wird

Besonders problematisch erwies sich eine Erwartung, die auf den ersten Blick sinnvoll erscheint: die Hoffnung, dass sich durch KI-generierte Tests Qualität und Sicherheit automatisch erhöhen.

In der Praxis zeigte sich ein gefährlicher Effekt. Wurde die KI aufgefordert, Tests für bereits implementierte Funktionalität zu schreiben, orientierten sich diese Tests häufig stark am vorhandenen Code – nicht an der ursprünglichen fachlichen Idee.

Das führte zu mehreren Problemen:

* Tests prüften, *dass der Code so funktioniert, wie er geschrieben wurde*, nicht ob er das fachlich Richtige tut
* implizite Designentscheidungen im Code wurden unkritisch verfestigt
* spätere Refactorings wurden erschwert, weil Tests eher den Ist-Zustand absicherten als das gewünschte Verhalten

Damit verloren Tests ihre eigentliche Rolle als Schutz der fachlichen Intention. Sie wurden zu einer Bestätigung der aktuellen Implementierung.

Gerade in Kombination mit KI-gestützter Entwicklung ist das gefährlich: Fehlerhafte Annahmen können sich doppelt verfestigen – im Code selbst und in den dazugehörigen Tests.

### 5.4 Ein trügerisches Sicherheitsgefühl

Diese Effekte führten zu einem subtilen, aber problematischen Zustand. Das Vorhandensein von Tests vermittelte Sicherheit, ohne sie tatsächlich zu gewährleisten.

Rückblickend wurde klar: Tests sind nur dann ein wirksames Instrument, wenn sie aus einer klar formulierten fachlichen Erwartung heraus entstehen – idealerweise *vor* oder zumindest unabhängig von der konkreten Implementierung.

Diese Erkenntnis spielte später eine zentrale Rolle bei der Neubewertung des gesamten Ansatzes.

---

## 6. Die größten Vorteile im Detail

Kapitel 4 beschreibt, *was* gut funktioniert hat. Hier geht es um das *warum* – und um die Bedingungen, unter denen diese Vorteile tatsächlich tragen. Ich schreibe das bewusst so, dass es weder wie Werbung klingt noch wie eine nachträgliche Relativierung. Es sind echte Stärken – nur eben nicht kostenlos.

### 6.1 Geschwindigkeit in frühen Entwicklungsphasen

Wenn man ein Projekt startet, ist Geschwindigkeit nicht nur ein Komfortfaktor, sondern oft der Unterschied zwischen „Idee bleibt Idee“ und „es gibt etwas, das man testen kann“. Genau hier war die KI beeindruckend.

* Aus einer groben Funktionsidee wurde in kurzer Zeit ein lauffähiger Stand.
* Man konnte Varianten durchspielen, ohne jedes Mal bei null zu beginnen.
* Der Weg von Problem zu erstem Prototyp wurde drastisch kürzer.

Dieser Vorteil ist real – aber er hängt stark davon ab, dass der Kontext noch überschaubar ist. In den ersten Wochen kann man vieles „einfach bauen“. Später wird das schwieriger, weil jede neue Entscheidung in vorhandene Strukturen greifen muss.

### 6.2 Reduktion geistiger Last bei Routineaufgaben

Ein unterschätzter Nutzen ist nicht die reine Zeitersparnis, sondern die Entlastung bei Aufgaben, die zwar notwendig sind, aber Energie fressen:

* Boilerplate
* wiederkehrende Patterns
* kleine Anpassungen in vielen Dateien
* Konfigurationsarbeit

Die KI nimmt einem diese Fleißarbeit ab – und das hat einen spürbaren Effekt auf Konzentration und Motivation. Man bleibt länger in der „eigentlichen“ Problemstellung.

Allerdings gilt auch hier: Die Entlastung funktioniert nur, wenn man den Output konsequent prüft. Sonst tauscht man geistige Last gegen spätere Reparaturarbeit.

### 6.3 Ideenweiterentwicklung durch Dialog mit der KI

Der dialogische Charakter war für mich einer der stärksten Punkte. Nicht, weil die KI „recht“ hat, sondern weil sie einen zwingt, das eigene Denken zu präzisieren.

* Unklare Anforderungen fallen schneller auf.
* Alternativen werden sichtbar, die man sonst nicht erwogen hätte.
* Man bekommt Reibung – und Reibung erzeugt Klarheit.

Dieser Effekt ist am größten, wenn man die KI als Sparringspartner nutzt und nicht als Autorität. Sobald man anfängt, Antworten als „Begründung“ zu akzeptieren, kippt das Verhältnis.

### 6.4 Bessere Dokumentation und Tests

Dokumentation war in klassischen Projekten für mich oft das Erste, was im Alltag zu kurz kam. Mit KI wurde sie plötzlich erreichbar.

* Erklärtexte ließen sich schnell erzeugen.
* Code konnte in verständliche Sprache übersetzt werden.
* Tests konnten als Ausgangspunkt generiert werden.

Aber: Genau hier liegt auch ein Fallstrick, der später noch wichtig wird. Dokumentation und Tests sind nur dann ein Gewinn, wenn sie nicht bloß den vorhandenen Code „beschreiben“, sondern die fachliche Intention tragen.

Gerade bei Tests zeigte sich: Wenn die KI Tests *aus dem bestehenden Code* ableitet, entsteht schnell ein trügerisches Sicherheitsnetz. Das ist hilfreich als Startpunkt – aber gefährlich, wenn man es mit echter Absicherung verwechselt.

---

## 7. Die größten Nachteile im Detail

### 7.1 Scheingenauigkeit und falsche Autorität

Mir fiel relativ früh auf, wie überzeugend sich viele Antworten der KI lasen. Formulierungen wirkten präzise, vollständig und selbstbewusst – oft genau so, wie man es von einer „guten“ technischen Erklärung erwartet.

Problematisch wurde das in dem Moment, in dem ich merkte, dass diese Überzeugungskraft nicht zuverlässig mit fachlicher Tiefe oder Korrektheit einherging. Aussagen klangen abgeschlossen, obwohl sie es nicht waren. Unsicherheiten waren sprachlich sauber geglättet, Widersprüche erst auf den zweiten Blick erkennbar.

Für mich hatte das konkrete Folgen:

* Ich hinterfragte Vorschläge später, als ich es bei eigenem Code getan hätte
* vermeintlich klare Antworten ersetzten gründliches Nachdenken
* Fehler fielen oft erst dann auf, wenn sie Nebenwirkungen erzeugten

Gerade unter Zeitdruck wirkte diese Scheingenauigkeit wie eine Abkürzung – und genau das machte sie gefährlich. Rückblickend musste ich lernen, jede Antwort der KI mit derselben Skepsis zu behandeln wie einen unausgereiften eigenen Entwurf.

Diese falsche Autorität entsteht nicht aus böser Absicht, sondern aus der Art, wie die KI Sprache produziert. Für mich war entscheidend zu erkennen: Überzeugender Ton ist kein Ersatz für Verständnis.

### 7.2 Kontextverlust über längere Zeiträume

Solange der betrachtete Code überschaubar war, hatte ich das Gefühl, die Kontrolle zu behalten. Ich wusste, warum Dinge so gelöst waren, wie sie gelöst waren – auch dann, wenn ich sie nicht selbst geschrieben hatte.

Mit zunehmender Projektlaufzeit änderte sich das schleichend. Frühere Entscheidungen gerieten aus dem Blick, Zusammenhänge zwischen weiter entfernten Codebereichen wurden unscharf. Vorschläge der KI wirkten für sich genommen sinnvoll, passten aber immer häufiger nicht mehr zum größeren Ganzen.

Das fiel mir vor allem in Situationen auf, in denen eine Änderung eigentlich harmlos erschien, aber an anderer Stelle unerwartete Effekte hatte. Mir wurde klar, dass nicht der einzelne Vorschlag das Problem war, sondern der Verlust eines gemeinsamen, stabilen Kontextes.

Je länger das Projekt lief, desto mehr Arbeit floss nicht mehr in Entwicklung, sondern in Rekonstruktion: Warum ist das hier so? Wovon hängt das eigentlich ab? Diese Fragen hätte ich mir früher leichter beantworten können.

### 7.3 Architektur ohne Gesamtplan

Rückblickend wurde mir bewusst, dass viele Architekturentscheidungen nicht aktiv getroffen wurden, sondern sich ergeben haben. Einzelne Lösungen wirkten jeweils plausibel, aber sie fügten sich nicht automatisch zu einem tragfähigen Ganzen zusammen.

Solange neue Anforderungen klein blieben, fiel das kaum auf. Erst als größere Umbauten nötig wurden, zeigte sich, dass ein übergreifender Plan fehlte. Strukturen waren gewachsen, nicht entworfen. Sie funktionierten – aber sie waren fragil.

Für mich bedeutete das: Jede größere Änderung fühlte sich riskanter an, als sie eigentlich hätte sein müssen. Nicht, weil das System extrem komplex war, sondern weil mir ein klares Bild davon fehlte, wie alles zusammenhängt.

### 7.4 Verlust des Überblicks über den eigenen Code

Das war für mich der gravierendste Effekt.

Mit fortschreitender Entwicklung wusste ich zwar, welche Funktionen das System erfüllte – aber immer seltener, wie es dazu gekommen war. Entscheidungen waren gefallen, ohne dass ich sie bewusst getroffen oder dauerhaft verankert hätte.

Das zeigte sich sehr konkret im Alltag:

* Ich zögerte, selbst Änderungen vorzunehmen
* kleinere Anpassungen fühlten sich riskant an
* Refactorings delegierte ich, statt sie wirklich zu durchdringen

Besonders ausgeprägt war das in größeren JavaScript- und TypeScript-Bereichen mit vielen Abhängigkeiten. Der Code funktionierte, aber er fühlte sich zunehmend fremd an.

Der Kontrollverlust entstand nicht plötzlich. Er war das Ergebnis vieler kleiner Delegationen, die für sich genommen sinnvoll erschienen, in der Summe aber eine Black Box erzeugten.

### 7.5 Zunahme technischer Schulden

Die beschriebenen Effekte blieben nicht folgenlos. Mit der Zeit sammelten sich technische Schulden an – nicht in Form spektakulärer Fehler, sondern als schleichende Erosion.

Ich bemerkte:

* inkonsistente Strukturen
* doppelte oder ähnliche Logik an verschiedenen Stellen
* Abhängigkeiten, deren Zweck nicht mehr klar war

Da das System insgesamt funktionierte, gab es selten einen akuten Anlass, grundlegend aufzuräumen. Die Kosten wurden immer wieder vertagt – bis klar wurde, dass sie sich nicht mehr ignorieren lassen.

### 7.6 Debugging über Symptome statt Ursachen

Auch mein Umgang mit Fehlern veränderte sich. Statt systematisch nach Ursachen zu suchen, beschrieb ich zunehmend Symptome und ließ mir Lösungsvorschläge liefern.

Kurzfristig funktionierte das für mich oft erstaunlich gut. Der Fehler war behoben, das System lief wieder. Langfristig blieb jedoch ein ungutes Gefühl: Ich verstand das Problem nicht wirklich – ich wusste nur, wie man es zum Verschwinden bringt.

Mit der Zeit zeigte sich der Preis dafür. Ähnliche Probleme tauchten erneut auf, manchmal in leicht veränderter Form. Ursachen blieben im System, während Symptome behandelt wurden.

### 7.7 Rechtliche und ethische Unsicherheiten

Neben den technischen Aspekten tauchten für mich auch Fragen auf, die sich nicht so leicht wegdelegieren ließen.

Woher stammen bestimmte Codefragmente? Welche Lizenzannahmen stecken implizit in Vorschlägen? Wer trägt im Zweifel die Verantwortung, wenn etwas schiefgeht?

Diese Fragen ließen sich theoretisch klären, spielten im Arbeitsalltag aber eine erstaunlich diffuse Rolle. Gerade weil vieles „einfach funktionierte“, bestand die Gefahr, diese Punkte zu lange auszublenden.

### 7.8 Psychologische Effekte

Neben allen technischen Fragen hatte der Ansatz auch spürbare Auswirkungen auf meine eigene Arbeitsweise und Stimmung.

Es gab Phasen, in denen sich ein Abhängigkeitsgefühl entwickelte: Je komplexer das System wurde, desto schwerer fiel es mir, ohne Unterstützung weiterzuarbeiten. Gleichzeitig wuchs die Frustration, wenn Vorschläge nicht passten oder unerwartet am Ziel vorbeigingen.

Besonders deutlich wurde das bei sehr präzise formulierten Anforderungen. Wenn ich viel Zeit investiert hatte, einen Prompt bis ins Detail auszuarbeiten, und das Ergebnis dennoch etwas grundlegend anderes tat, entstand spürbarer Ärger. Oft lag die Ursache in einer winzigen Mehrdeutigkeit – etwas, das in meinem Kopf klar war, sprachlich aber nicht eindeutig genug transportiert wurde.

Das Problem war weniger der einzelne Fehlversuch als die Wiederholung. Man investiert viel Sorgfalt, bekommt trotzdem ein unerwartetes Ergebnis und beginnt, gegen etwas anzukämpfen, das sich unberechenbar anfühlt.

Diese Effekte sind schwer zu messen, beeinflussten aber nachhaltig, wie ich arbeitete und Entscheidungen traf.

---

## 8. Konkrete Beispiele aus dem Projekt

Die folgenden Beispiele sind bewusst ausgewählt. Sie sollen keine Einzelfehler illustrieren, sondern typische Situationen, die sich im Projektverlauf wiederholt haben. Technische Details bleiben dabei im Hintergrund – entscheidend ist das Muster.

### 8.1 Funktion erfüllt – Code bleibt fremd

In mehreren Fällen war eine Funktion aus fachlicher Sicht korrekt umgesetzt. Sie tat, was sie sollte, bestand vorhandene Tests und ließ sich produktiv nutzen.

Trotzdem blieb ein ungutes Gefühl: Der Code war mir nicht mehr wirklich vertraut. Ich wusste, *dass* er funktioniert, aber nicht mehr zuverlässig, *warum* er so aufgebaut war.

Das zeigte sich spätestens dann, wenn kleine Anpassungen nötig wurden. Statt gezielt zu ändern, musste ich mich erst wieder einarbeiten – oder den Änderungswunsch erneut an die KI delegieren. Beides kostete Zeit und untergrub mein eigenes Sicherheitsgefühl.

### 8.2 Kleine Änderung, große Nebenwirkungen

Ein anderes wiederkehrendes Muster: scheinbar harmlose Anpassungen hatten unerwartete Folgen.

Ein zusätzlicher Parameter, eine leicht geänderte Logik oder ein neuer Sonderfall – Dinge, die in klassischer Entwicklung überschaubar sind – führten plötzlich zu Seiteneffekten an Stellen, die gedanklich längst abgeschlossen waren.

Die Ursache lag selten im einzelnen Fehler. Vielmehr fehlte ein klares mentales Modell der Gesamtstruktur. Ohne solch ein Modell lassen sich Nebenwirkungen kaum zuverlässig vorhersagen.

### 8.3 Repariert – aber strukturell schlechter

In mehreren Situationen konnte die KI Fehler beheben, die sich eingeschlichen hatten. Oberflächlich betrachtet war das ein Erfolg: Der Bug war weg, die Funktion lief wieder.

Bei genauerem Hinsehen zeigte sich jedoch ein Muster:

* zusätzliche Abzweigungen
* neue Sonderbehandlungen
* wachsende Komplexität an ohnehin fragilen Stellen

Das System wurde stabilisiert, aber nicht verbessert. Jeder Fix erhöhte die strukturelle Last. Ein Effekt, der erst mit zeitlichem Abstand wirklich sichtbar wurde.

### 8.4 Früher anders, heute nur noch „irgendwie“

Rückblickend gab es Punkte, an denen ich ein Feature heute anders angehen würde. Nicht, weil es falsch ist, sondern weil sich bessere, klarere Lösungen angeboten hätten.

Das Problem: Zu diesem Zeitpunkt war das System bereits so gewachsen, dass grundlegende Änderungen unverhältnismäßig erschienen. Man entscheidet sich dann nicht mehr für die beste Lösung, sondern für diejenige, die am wenigsten kaputt macht.

Dieses „Es funktioniert irgendwie“ ist kein sofortiges Scheitern – aber ein Warnsignal. Es markiert den Übergang von bewusstem Gestalten zu reaktivem Erhalten.

---

## 9. Was gut funktioniert – wofür KI wirklich geeignet ist

Nach den problematischen Aspekten ist mir wichtig, die Einordnung wieder stärker aus der eigenen Erfahrung heraus vorzunehmen. Die bisherigen Kapitel sollen nicht den Eindruck erwecken, KI-gestützte Entwicklung sei grundsätzlich ungeeignet. Das wäre zu einfach – und entspricht auch nicht dem, was ich erlebt habe.

Entscheidend war für mich nicht *ob* ich KI einsetze, sondern *wo* und *unter welchen Bedingungen* sie mir tatsächlich geholfen hat.

### 9.1 Prototyping und frühes ausprobieren

In frühen Phasen des Projekts habe ich die KI als besonders hilfreich erlebt. Wenn es darum ging, Ideen schnell sichtbar zu machen oder eine grobe Richtung zu testen, war sie ein echtes Beschleunigungsinstrument.

Ich konnte:

* erste Funktionsideen schnell ausprobieren
* verschiedene Ansätze gegeneinander abwägen
* fachliche Anforderungen grob prüfen, ohne mich sofort festzulegen

Gerade in dieser Phase sind Fehler billig und Richtungswechsel erwünscht. Dass Lösungen noch nicht ausgereift sind, ist kein Nachteil – im Gegenteil.

### 9.2 Ausprobieren verschiedener Lösungswege

Auch jenseits klassischer Prototypen habe ich die KI vor allem dann als hilfreich empfunden, wenn ich mich einem Problem zunächst annähern wollte.

Statt sofort eine „richtige“ Lösung zu bauen, konnte ich:

* mögliche Herangehensweisen durchspielen
* bekannte Muster und typische Fehler sichtbar machen
* mein eigenes Verständnis schärfen, bevor ich mich festlege

In diesen Momenten war die KI weniger Umsetzer als Denkstütze. Sie hat meinen Suchraum erweitert, nicht meine Entscheidungen ersetzt.

### 9.3 Dokumentation, Erklärungen und Übersetzungen

Ein Bereich, in dem mich der Einsatz der KI positiv überrascht hat, war die Dokumentation.

Ich habe sie genutzt, um:

* bestehenden Code in verständliche Sprache zu übersetzen
* Dokumentation nachzuziehen, die sonst liegen geblieben wäre
* Unterschiede zwischen Varianten oder Versionen nachvollziehbar zu machen

Solange klar blieb, dass die KI beschreibt und nicht bewertet, war das für mich ein echter Gewinn.

### 9.4 Tests als Ausgangspunkt, nicht als Absicherung

Auch bei Tests habe ich die KI nicht grundsätzlich als problematisch erlebt – aber nur unter einer klaren Einschränkung.

Als Ausgangspunkt für:

* erste Testideen
* grobe Struktur von Test-Suites
* offensichtliche Randfälle

war sie hilfreich.

Sobald ich jedoch begonnen hätte, diese Tests als vollständige fachliche Absicherung zu betrachten, wäre es kritisch geworden. Tests müssen die beabsichtigte Funktion prüfen, nicht nur bestätigen, dass vorhandener Code läuft.

### 9.5 Kleine Helfer und klar begrenzte Aufgaben

Am zuverlässigsten funktionierte der Einsatz der KI für mich dort, wo Aufgaben klar abgegrenzt waren:

* kleine Skripte
* einmalige Transformationen
* Anpassungen mit eindeutigem Ziel

Je enger der Rahmen, desto geringer das Risiko von Seiteneffekten und Fehlannahmen.

### 9.6 Einordnung

Zusammengefasst habe ich die KI dort als hilfreich erlebt, wo Unsicherheit erlaubt war, der Kontext überschaubar blieb und Ergebnisse gut überprüfbar waren.

Sobald jedoch langfristige Struktur, Wartbarkeit und Verantwortung in den Vordergrund rückten, stieß dieser Ansatz für mich an klare Grenzen.

---

## 10. Was schlecht funktioniert – wofür KI (noch) ungeeignet ist

Genauso wichtig wie die positiven Erfahrungen sind für mich die Bereiche, in denen der Einsatz der KI im Projektverlauf nicht mehr gut funktioniert hat. Diese Grenzen haben sich nicht theoretisch ergeben, sondern aus der täglichen Arbeit heraus.

### 10.1 Langfristige Architekturarbeit

Je länger das Projekt lief, desto deutlicher wurde für mich, dass die KI bei langfristiger Architekturarbeit an ihre Grenzen stößt.

Ich habe erlebt, dass:

* Zusammenhänge über viele Module hinweg nicht zuverlässig erhalten blieben
* frühe Architekturentscheidungen nicht konsequent fortgeführt wurden
* neue Vorschläge bestehende Strukturen unterliefen, ohne dies zu erkennen

Architektur erfordert bewusste Entscheidungen und das Tragen von Konsequenzen. Diese Rolle ließ sich für mich nicht sinnvoll auslagern.

### 10.2 Große, langlebige Codebasen

Mit wachsender Codebasis veränderte sich auch meine Wahrnehmung des KI-Einsatzes.

Was anfangs als Beschleunigung wirkte, führte später dazu, dass:

* Änderungen immer schwerer abzuschätzen waren
* lokale Verbesserungen globale Probleme erzeugten
* das eigene mentale Gesamtbild zunehmend brüchig wurde

In solchen Phasen wurde Verständnis wichtiger als Geschwindigkeit – und genau dort verlor die KI für mich ihren Vorteil.

### 10.3 Sicherheitskritische Systeme

In sicherheitsrelevanten Bereichen hätte ich den beschriebenen Ansatz nicht eingesetzt.

Die Gründe lagen für mich auf der Hand:

* Fehler können reale Schäden verursachen
* Verantwortung und Haftung bleiben beim Menschen
* vollständige Nachvollziehbarkeit ist zwingend erforderlich

Ein System, dessen Entstehung man nicht vollständig überblickt, ist für mich normalerweise nicht akzeptabel.

### 10.4 Performance-kritischer Code

Auch bei performancekritischen Teilen habe ich Grenzen gesehen.

Die Vorschläge der KI waren häufig funktional korrekt, aber:

* ineffizient
* wenig angepasst an den konkreten Kontext
* selten wirklich optimiert

Solche Bereiche erfordern tiefes Verständnis des Laufzeitverhaltens – etwas, das sich für mich nicht zuverlässig über Prompts erzwingen ließ.

### 10.5 Verantwortung und Haftung

Ein Punkt zog sich durch alle problematischen Bereiche: Verantwortung.

Die KI konnte Vorschläge machen und Code erzeugen, aber sie konnte keine Verantwortung übernehmen – weder technisch noch rechtlich.

Je kritischer ein System wurde, desto weniger tragfähig war es für mich, wesentliche Teile seiner Entstehung an ein nicht-verantwortliches System auszulagern.

### 10.6 Konsequenz im Projekt

Eine direkte Folge dieser Überlegungen war, dass ich mich bewusst gegen eine Mandantenfähigkeit entschieden habe, obwohl sie ursprünglich vorgesehen war.

Die zusätzliche Komplexität, die damit einhergeht – getrennte Datenräume, klare Verantwortlichkeiten, saubere Abgrenzungen – hätte ein Maß an strukturellem Überblick und formaler Sicherheit erfordert, das ich unter den gegebenen Bedingungen nicht mehr zuverlässig gewährleisten konnte.

Die Entscheidung war kein technisches Scheitern, sondern eine bewusste Begrenzung: lieber ein klar verstandenes System mit reduziertem Funktionsumfang als eine erweiterte Architektur, deren Konsequenzen ich nicht mehr vollständig überblicke.

### 10.7 Einordnung

Diese Grenzen sind für mich kein endgültiges Urteil über KI-Entwicklung. Sie beschreiben den Punkt, an dem der Einsatz für mich nicht mehr sinnvoll oder verantwortbar war.

Wer diese Grenzen ignoriert, riskiert aus meiner Sicht nicht nur technische Probleme, sondern auch einen schleichenden Verlust von Kontrolle und Verantwortung.

---

## 11. Lehren aus dem Experiment

Nach allem, was ich im Projekt erlebt habe, lassen sich die wichtigsten Lehren nicht auf einzelne technische Maßnahmen reduzieren. Sie betreffen vor allem Haltung, Arbeitsweise und die Frage, wie viel Verantwortung man bereit ist, selbst zu tragen – und wie viel man unbewusst abgibt.

### 11.1 KI braucht Leitplanken – nicht Vertrauen

Eine der zentralen Erkenntnisse für mich war, dass KI nicht dadurch besser wird, dass man ihr vertraut, sondern dadurch, dass man sie begrenzt.

Je offener und unregulierter der Einsatz, desto größer wurde die Gefahr von:

* schleichendem Kontrollverlust
* inkonsistenten Entscheidungen
* unbeabsichtigten Strukturbrüchen

Erst mit klaren Regeln wurde die Zusammenarbeit für mich stabiler. Diese Regeln waren kein Zeichen von Misstrauen, sondern eine notwendige Voraussetzung, um überhaupt sinnvoll arbeiten zu können.

### 11.2 AGENTS: Regeln als Antwort auf reale Probleme

Die Einführung von AGENTS-Dateien war keine theoretische Vorabentscheidung, sondern eine direkte Reaktion auf konkrete Schwierigkeiten im Projektverlauf. Erst beim gezielten Ausprobieren verschiedener KI-Systeme wurde mir klar, dass viele von ihnen projektbezogene Regeldateien automatisch zu Beginn einer Session einlesen, sofern solche Dateien vorhanden sind. Diese tragen unterschiedliche Namen und folgen keiner einheitlichen Struktur, haben aber eines gemeinsam: Sie beeinflussen das Verhalten der KI dauerhaft und oft ohne sichtbaren Hinweis.

Sie entstanden aus Situationen wie:
* zu große, unkontrollierte Änderungen
* fehlende Nachvollziehbarkeit von Entscheidungen
* wiederholte Kontextverluste

Die AGENTS-Dateien dienten mir dabei nicht nur als Reaktion auf diese Probleme, sondern auch als eine Art externes Gedächtnis und Disziplinierungsinstrument. Sie hielten fest, wie gearbeitet werden soll, nicht was das Ergebnis sein muss – und machten mir zugleich bewusst, dass ein vermeintlich „neutraler Start“ einer KI in der Praxis kaum existiert.

### 11.3 Verantwortung explizit beim Menschen halten

Ein Punkt wurde mir besonders deutlich: Verantwortung verschwindet nicht, nur weil man sie nicht aktiv wahrnimmt.

Auch wenn die KI den Code schreibt, bleibt der Mensch verantwortlich für:

* Architekturentscheidungen
* fachliche Korrektheit
* Wartbarkeit
* rechtliche Folgen

Je stärker ich mir diese Verantwortung bewusst gemacht habe, desto vorsichtiger und strukturierter wurde mein Umgang mit der KI.

### 11.4 Weniger delegieren, mehr verstehen

Rückblickend hätte ich an mehreren Stellen weniger delegieren und mehr selbst übernehmen sollen.

Nicht jeder funktionierende Code ist guter Code und nicht jede schnelle Lösung ist eine nachhaltige Lösung. Das klingt banal – wird aber im Alltag mit KI leicht vergessen.

Dort, wo ich mir die Zeit genommen habe, den Code wirklich zu verstehen, waren spätere Änderungen einfacher, nicht schwieriger.

### 11.5 Tests, Reviews und Gegenlesen neu denken

Das Experiment hat auch meinen Blick auf klassische Qualitätssicherungsmaßnahmen verändert.

Tests, Reviews und Gegenlesen sind nicht weniger wichtig geworden – im Gegenteil. Sie müssen aber anders verstanden werden:

* Tests müssen fachliche Erwartungen absichern, nicht nur vorhandenen Code
* Reviews müssen Struktur und Verständlichkeit bewerten, nicht nur Korrektheit
* Gegenlesen bedeutet, sich bewusst Zeit zum Verstehen zu nehmen

KI ersetzt diese Schritte nicht. Sie erhöht eher die Notwendigkeit, sie ernst zu nehmen.

### 11.6 Ein persönliches Fazit

Die wichtigste Lehre für mich ist vielleicht diese: KI verführt dazu, Verantwortung schleichend abzugeben – nicht durch Zwang, sondern durch Bequemlichkeit.

Dagegen helfen keine Tools und keine Prompts, sondern nur das Bewusstsein über die eigene Rolle im Entwicklungsprozess.

---

## 12. Empfehlungen aus meinen Erfahrungen

Dieses Kapitel ist bewusst persönlich formuliert. Es sind keine allgemeinen Regeln und keine Handlungsanweisungen, sondern Empfehlungen, die sich aus meinen eigenen Erfahrungen ergeben haben. Andere Projekte, andere Menschen oder andere Rahmenbedingungen können zu anderen Ergebnissen führen.

### 12.1 Erwartungen realistisch halten

Eine der wichtigsten Lehren für mich war, die Erwartungen an KI-gestützte Entwicklung bewusst zu begrenzen.

KI kann viel erleichtern, aber sie nimmt einem nicht die Verantwortung ab. Wer erwartet, dass sich komplexe Software weitgehend „von selbst“ entwickeln lässt, wird früher oder später enttäuscht werden.

### 12.2 Eigene Kompetenz nicht auslagern

Ich würde heute sehr viel bewusster darauf achten, meine eigene fachliche Kompetenz nicht schleichend auszulagern.

KI kann unterstützen, erklären und Vorschläge machen. Das eigene Verständnis für Architektur, Logik und Zusammenhänge darf sie aber nicht ersetzen. Sobald man merkt, dass man Änderungen nicht mehr selbst vornehmen möchte, ist aus meiner Sicht eine Grenze überschritten.

### 12.3 Leitplanken früh setzen

Rückblickend hätte ich mir viele Probleme ersparen können, wenn klare Leitplanken früher definiert worden wären.

Regeln für:

* Umfang von Änderungen
* Struktur von Ausgaben
* Umgang mit Unsicherheiten
* Pflicht zur Rückfrage bei Unklarheiten

haben sich für mich als unverzichtbar erwiesen. Nicht, um die KI einzuschränken, sondern um die eigene Kontrolle zu behalten.

### 12.4 Tests und Reviews bewusst einsetzen

Tests und Reviews würde ich heute noch gezielter einsetzen als früher.

* Tests sollten fachliche Erwartungen absichern, nicht nur bestehenden Code
* Reviews sollten Verständlichkeit und Struktur bewerten
* Gegenlesen sollte bewusst Zeit bekommen

Gerade mit KI wurde Qualitätssicherung für mich nicht weniger wichtig, sondern mehr.

### 12.5 Einsatzfelder klar begrenzen

Ich würde den Einsatz von KI heute klarer begrenzen:

* früh und explorativ: ja
* als dauerhafter Ersatz für eigenes Denken: nein
* bei kritischen oder langlebigen Strukturen: sehr zurückhaltend

Diese Abgrenzung hat für mich den Unterschied zwischen hilfreicher Unterstützung und schleichendem Kontrollverlust ausgemacht.

### 12.6 Eigene Reaktionen ernst nehmen

Ein Punkt, den ich anfangs unterschätzt habe, sind die eigenen emotionalen Reaktionen.

Frust, Aggression oder das Gefühl, gegen ein widerspenstiges System zu arbeiten, sind keine Nebensächlichkeiten. Sie sind Hinweise darauf, dass etwas im Prozess nicht stimmt – oft lange bevor es sich technisch zeigt.

---

## 13. Ausblick

Ein Ausblick auf KI-gestützte Entwicklung ist schwierig, ohne in Spekulationen abzurutschen. Zu schnell verändern sich Modelle, Werkzeuge und Erwartungen. Dennoch lassen sich aus meinen Erfahrungen einige vorsichtige Linien ziehen.

### 13.1 Werkzeuge werden besser – Verantwortung nicht kleiner

Ich gehe davon aus, dass sich KI-Werkzeuge weiter verbessern werden:

* stabilerer Umgang mit Kontext
* bessere Unterstützung bei Strukturfragen
* geringere Fehlerquoten bei Routineaufgaben

Was sich aus meiner Sicht jedoch nicht ändern wird, ist die grundlegende Asymmetrie: Die KI wird leistungsfähiger, aber nicht verantwortlicher. Entscheidungen, Prioritäten und Haftung bleiben beim Menschen – unabhängig davon, wie komfortabel die Werkzeuge werden.

### 13.2 Mehr Unterstützung beim Verstehen, weniger beim Ersetzen

Ein sinnvoller Entwicklungspfad wäre für mich weniger das vollständige Ersetzen menschlicher Arbeit, sondern eine stärkere Unterstützung beim Verstehen:

* bessere Erklärungen bestehender Systeme
* Hilfe beim Aufdecken von Zusammenhängen
* Unterstützung beim Refactoring *mit* Verständnis, nicht nur Ergebnis

Wenn KI dabei hilft, das eigene mentale Modell eines Systems zu stärken, statt es zu umgehen, würde sich ihr Nutzen deutlich erhöhen.

### 13.3 Klare Rollen statt verschwommener Erwartungen

Ein weiterer wichtiger Punkt ist die Rollenklarheit.

Solange KI als „fast gleichwertiger Entwickler“ vermarktet wird, entstehen falsche Erwartungen. Hilfreicher wäre eine klare Positionierung als Werkzeug mit besonderen Stärken – und ebenso klaren Grenzen.

Je klarer diese Rollen sind, desto geringer ist die Gefahr von Überforderung auf beiden Seiten: beim Werkzeug und beim Menschen.

### 13.4 Persönliche Erwartung

Für mich bleibt KI ein mächtiges Werkzeug, das ich auch künftig einsetzen werde – aber bewusster, begrenzter und mit klareren Leitplanken.

Der größte Fortschritt wäre für mich nicht mehr Autonomie der KI, sondern mehr Unterstützung dabei, selbst die Kontrolle zu behalten.

---

## 14. Fazit

Dieser Artikel ist aus einem praktischen Experiment entstanden – und aus dem Bedürfnis, dessen Ergebnisse ehrlich einzuordnen. Die Entwicklung eines Programms überwiegend per Prompt hat mir reale Vorteile gebracht, aber ebenso reale Probleme sichtbar gemacht.

KI-gestützte Entwicklung ist kein Ersatz für fachliche Kompetenz, sondern ein Verstärker bestehender Arbeitsweisen. Sie kann Tempo erhöhen, Denkprozesse anstoßen und Routine entlasten. Sie kann aber ebenso Kontrollverlust begünstigen, Verständnis verdrängen und Verantwortung unsichtbar machen.

Entscheidend ist deshalb nicht die Frage, *ob* man KI einsetzt, sondern *wie bewusst* man es tut. Ohne klare Leitplanken, ohne eigenes Verständnis und ohne die Bereitschaft, Verantwortung aktiv zu tragen, wird aus Unterstützung schnell Abhängigkeit.

Für mich bleibt KI ein wertvolles Werkzeug – nicht mehr, aber auch nicht weniger. Ihr sinnvoller Einsatz beginnt dort, wo man ihre Grenzen kennt und respektiert. Alles andere ist kein Fortschritt, sondern eine Verschiebung von Problemen.

## Anhänge

Die folgenden Anhänge dokumentieren zentrale Artefakte, die im Projektverlauf entstanden sind und meine Zusammenarbeit mit KI maßgeblich geprägt haben. Sie zeigen, wie ich allgemeine Arbeitsprinzipien, projektspezifische Regeln und dauerhaft relevantes Projektwissen bewusst voneinander getrennt und in eigenständigen Dateien festgehalten habe.

Die Anhänge dienen nicht als Anleitung oder Empfehlung, sondern als nachvollziehbare Beschreibung meines konkreten Vorgehens. Sie sollen verdeutlichen, welche Rolle persistente Regel- und Gedächtnisstrukturen in meiner praktischen Arbeit mit KI gespielt haben – und welche Konsequenzen sich daraus für Kontrolle, Nachvollziehbarkeit und Langfristigkeit ergeben haben.

---

## Anhang A.1 – Überblick

Der folgende Anhang beschreibt drei unterschiedliche Dateien, die im Verlauf des Projekts entstanden sind und die Zusammenarbeit mit KI dauerhaft geprägt haben. Sie wurden nicht im Vorfeld geplant, sondern schrittweise eingeführt, als Reaktion auf konkrete Probleme im Arbeitsprozess.

Allen drei Dateien ist gemeinsam, dass sie nicht das Ziel der Arbeit festlegen, sondern den Rahmen, in dem sie stattfindet. Sie dienen dazu, Arbeitsweise, Entscheidungslogik und Kontext über einzelne Sessions hinaus stabil zu halten – insbesondere in einem Projekt, das über einen längeren Zeitraum hinweg gemeinsam mit KI entwickelt wurde.

Dabei erwies sich eine klare Trennung der Verantwortlichkeiten als notwendig: Allgemeine Arbeitsprinzipien, projektspezifische Regeln und dauerhaft relevantes Projektwissen wurden bewusst in getrennten Dateien abgelegt. Diese Trennung entstand aus der Erfahrung, dass Vermischung zu Unschärfe führt – sowohl für den Menschen als auch für die KI.

Die hier gezeigten Dateien stellen keine Empfehlung und keinen Standard dar. Sie dokumentieren eine konkrete Lösung für ein konkretes Projekt. Ihr Zweck liegt nicht in der Nachahmung, sondern darin, nachvollziehbar zu machen, wie persistente Regel- und Gedächtnisstrukturen die Arbeit mit KI beeinflussen können.

---

## Anhang A.2 – AGENTS.md – Allgemeine Arbeitsprinzipien

Die Datei AGENTS.md entstand als Reaktion auf wiederkehrende Muster im Umgang mit KI, die sich projektübergreifend zeigten. Sie dient nicht der Steuerung einzelner Aufgaben, sondern beschreibt grundlegende Prinzipien, nach denen die Zusammenarbeit erfolgen soll.

Ihr Fokus liegt auf der Art des Arbeitens, nicht auf konkreten Ergebnissen. Festgehalten werden unter anderem Erwartungen an Nachvollziehbarkeit, Änderungsdisziplin und den Umgang mit Unsicherheit. Ziel war es, implizite Annahmen sichtbar zu machen und einen gemeinsamen Arbeitsrahmen zu schaffen, der über einzelne Sessions hinweg stabil bleibt.

Wichtig ist dabei die Abgrenzung: AGENTS.md enthält bewusst keine projektspezifischen Regeln und keine inhaltlichen Vorgaben. Sie ist allgemein gehalten und könnte – in angepasster Form – auch in anderen Projekten eingesetzt werden. Gleichzeitig erhebt sie keinen Anspruch auf Vollständigkeit oder Allgemeingültigkeit.

Im Projekt erfüllte diese Datei vor allem eine stabilisierende Funktion: Sie reduzierte die Notwendigkeit, grundlegende Arbeitsprinzipien immer wieder neu zu erklären, und machte Abweichungen davon früh erkennbar.

Eine besondere Rolle kam dieser Datei dadurch zu, dass sie als einzige Regeldatei zuverlässig automatisch zu Beginn jeder Session eingelesen wurde. Weitere projektbezogene Regel- oder Kontextdateien wurden nicht implizit berücksichtigt, sondern mussten ausdrücklich benannt und eingebunden werden. AGENTS.md fungierte damit als zentraler Einstiegspunkt, über den auch die übrigen Dateien wirksam gemacht wurden.

### Beispielauszug (gekürzt)

Der folgende Auszug zeigt exemplarisch die Art von Festlegungen, wie sie in der Datei enthalten sind:

* Änderungen sollen nachvollziehbar und begründet erfolgen, nicht implizit oder stillschweigend.
* Unsicherheiten sind offen zu benennen, statt sie durch plausible, aber unbelegte Annahmen zu überdecken.
* Entscheidungen sollen so dokumentiert werden, dass sie auch nach längerer Zeit noch verständlich sind.
* Bestehende Strukturen sind zu respektieren; grundlegende Umbauten erfordern explizite Abstimmung.
* Weitere projektbezogene Regel- und Kontextdateien (AGENTS.project.md und ai-project-memory.md) werden nicht automatisch berücksichtigt und sind explizit einzulesen.

Der Auszug ist unverändert aus dem Projekt übernommen, jedoch bewusst gekürzt, um den Charakter der Datei zu verdeutlichen, ohne sie vollständig abzubilden.

---

## Anhang A.3 – AGENTS.project.md – Projektspezifische Regeln

Die Datei AGENTS.project.md ergänzt die allgemeinen Arbeitsprinzipien um Regeln, die ausschließlich für dieses Projekt gelten. Sie entstand aus der Einsicht, dass projektbedingte Zwänge und Risiken nicht sinnvoll in einer allgemein gehaltenen Regeldatei abgebildet werden können, ohne deren Aussagekraft zu verwässern.
**Diese Datei wurde nicht automatisch berücksichtigt, sondern explizit über eine Regel in AGENTS.md eingebunden.**

Im Unterschied zu AGENTS.md bezieht sich diese Datei explizit auf die Struktur, den Umfang und die Langfristigkeit des konkreten Projekts. Sie formuliert verbindlichere Vorgaben für den Umgang mit Änderungen, Refactorings und strukturellen Eingriffen und adressiert typische Fehlerquellen, die sich im Projektverlauf wiederholt gezeigt haben.

Ein zentraler Zweck der Datei bestand darin, Verantwortung klar zuzuordnen. Sie machte sichtbar, welche Entscheidungen bewusst vom Menschen zu treffen sind und in welchen Bereichen die KI unterstützend, aber nicht eigenständig agieren soll. Dadurch wurde vermieden, dass projektkritische Weichenstellungen implizit oder schleichend vorgenommen werden.

Die Regeln in AGENTS.project.md waren nicht statisch. Sie wurden im Verlauf des Projekts angepasst, erweitert oder präzisiert, wenn neue Risiken oder Fehlentwicklungen sichtbar wurden. Die Datei verstand sich damit nicht als starres Regelwerk, sondern als lernendes Instrument.

### Beispielauszug (gekürzt)

Der folgende Auszug zeigt exemplarisch den projektspezifischen Charakter dieser Datei:

* Größere strukturelle Änderungen oder Refactorings dürfen nicht ohne vorherige explizite Zustimmung erfolgen.
* Änderungen mit Auswirkungen auf mehrere Module sind vorab in ihrer Reichweite zu beschreiben.
* Bestehende Entscheidungen gelten fort, solange sie nicht bewusst revidiert werden.
* Technische Schulden sind kenntlich zu machen und nicht implizit zu vergrößern.

Der Auszug ist unverändert aus dem Projekt übernommen, jedoch gekürzt, um den Charakter der Datei zu verdeutlichen, ohne sie vollständig abzubilden.

---

## Anhang A.4 – ai-project-memory.md – Projektgedächtnis

Die Datei ai-project-memory.md unterscheidet sich grundlegend von den zuvor beschriebenen Regeldateien. Sie enthält weder Arbeitsanweisungen noch verbindliche Vorgaben, sondern dient ausschließlich der Sammlung von dauerhaft relevantem Projektkontext.
**Diese Datei wurde nicht automatisch berücksichtigt, sondern explizit über eine Regel in AGENTS.md eingebunden.**

Ihr Zweck bestand darin, Informationen festzuhalten, die im laufenden Projektverlauf immer wieder benötigt wurden, sich aber nicht sinnvoll als Regeln formulieren ließen. Dazu zählten insbesondere getroffene Grundsatzentscheidungen, bewusst verworfene Lösungsansätze sowie Annahmen, die für das weitere Vorgehen maßgeblich waren.

Diese Datei entstand aus der Erfahrung, dass solche Informationen im Zusammenspiel mit KI leicht verloren gehen: Sie werden in einzelnen Sessions zwar erläutert, stehen aber später nicht mehr zuverlässig zur Verfügung. Das Projektgedächtnis fungierte daher als externer Referenzpunkt, der Kontext konserviert, ohne Verhalten direkt zu steuern.

Wichtig war dabei die klare Trennung von Regeln und Erinnerung. Inhalte der ai-project-memory.md sollten beschreibend bleiben und keine impliziten Handlungsanweisungen enthalten. Entscheidungen wurden dokumentiert, nicht erneut verhandelt.

### Beispielauszug (gekürzt)

Der folgende Auszug zeigt exemplarisch die Art von Inhalten, die in dieser Datei gesammelt wurden:

* Bestimmte Architekturentscheidungen wurden bewusst früh festgelegt, um spätere Umbauten zu vermeiden.
* Einige zunächst erwogene Funktionen wurden aus Gründen der Komplexität oder Wartbarkeit verworfen.
* Das Projekt ist auf langfristige Erweiterbarkeit ausgelegt, nicht auf kurzfristige Vollständigkeit.
* Bestimmte technische Grenzen wurden akzeptiert, statt sie durch zusätzliche Abstraktionen zu umgehen.

Der Auszug ist unverändert aus dem Projekt übernommen, jedoch gekürzt. Er dient ausschließlich der Illustration des Charakters dieser Datei, nicht als Vorlage oder Empfehlung.
