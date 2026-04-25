# Storybook + Puck Extension: Entwicklungsplan

## Zielbild

Eine Open-Source-Storybook-Erweiterung bauen, die den [Puck Editor](https://puckeditor.com/) in Storybook integriert. Nutzer sollen innerhalb von Storybook aus vorhandenen Komponenten visuelle Seiten bauen koennen, inklusive verschachtelter Strukturen wie:

- Pages
- Organisms
- Molecules
- Atoms
- Layout-Container
- Slots / Regions / Nested Areas

Die Erweiterung soll Storybook-Komponenten nicht duplizieren, sondern moeglichst direkt aus dem Storybook-Setup des Projekts nutzbar machen.

## Produktidee in einem Satz

`Storybook als Komponenten-Registry + Puck als visueller Editor + eigene Mapping-Schicht fuer verschachtelte Komponenten und Props`.

---

## 1. Problem sauber definieren

Bevor Code entsteht, sollte das Scope sehr klar sein.

### Fragen, die frueh beantwortet werden muessen

1. Soll die Erweiterung nur innerhalb von Storybook laufen, oder spaeter auch standalone?
2. Soll der Editor nur Mock-/Preview-Seiten bauen oder echte JSON/Page-Configs exportieren?
3. Soll das Ergebnis:
   - nur lokal im Browser leben,
   - als JSON gespeichert werden,
   - oder direkt in Dateien persistiert werden?
4. Wie werden Storybook-Stories zu Puck-Komponenten gemappt?
5. Wie tief soll das Nesting im MVP gehen?
6. Wie werden Slots abgebildet:
   - per `children`
   - per benannte Regionen wie `header`, `content`, `footer`
   - oder beides?

### Ergebnis dieser Phase

Ein kurzes RFC-/Vision-Dokument mit:

- Zielgruppe
- Nicht-Ziele
- MVP-Scope
- Datenmodell
- Einbindung in Storybook

---

## 2. MVP sehr klein schneiden

Der groesste Erfolgsfaktor ist ein kleiner, demo-faehiger erster Schnitt.

### Empfohlenes MVP

1. Storybook Addon mit eigenem Panel oder eigener Tool-Ansicht
2. Puck Editor innerhalb der Addon-UI rendern
3. Manuelle Registrierung von 3-5 Demo-Komponenten
4. Einfache Props-Bearbeitung
5. Ein verschachtelbarer Container-Block
6. JSON Import/Export
7. Live-Preview auf Basis der echten React-Komponenten

### Explizit nicht im MVP

- automatische Vollanalyse aller Stories
- perfektes Type-Inference fuer alle Props
- bidirektionale Synchronisation mit Storybook Controls
- Persistenz in Dateien per CLI/Codegen
- komplexe Responsive-/Theme-Editoren
- Multi-Framework-Support

---

## 3. Technische Architektur grob festlegen

Die Architektur sollte frueh in 4 Bereiche getrennt werden.

### A. Storybook Integration Layer

Verantwortlich fuer:

- Addon registrieren
- Panel / Toolbar / Route bereitstellen
- Kommunikation mit Storybook Preview/Manager
- Zugriff auf Story-Metadaten, falls moeglich

### B. Component Registry Layer

Verantwortlich fuer:

- Puck-Komponenten definieren
- Storybook-Komponenten registrieren
- Props-Schema ableiten oder manuell beschreiben
- Komponenten-Typen und Kategorien verwalten

Beispielhafte Kategorien:

- `layout`
- `page`
- `organism`
- `molecule`
- `atom`
- `content`

### C. Rendering / Mapping Layer

Verantwortlich fuer:

- Puck-JSON in React-Tree umsetzen
- Nested Components rendern
- Slots / Regions korrekt behandeln
- Default Props und Validierung

### D. Persistence Layer

Verantwortlich fuer:

- Draft im Local Storage
- JSON Export/Import
- spaeter optional File Persistence oder API Persistence

---

## 4. Datenmodell frueh entwerfen

Das Datenmodell ist der Kern des Projekts. Hier lohnt sich fruehes Design.

### Vorschlag fuer das Kernmodell

Eine Node repraesentiert eine platzierte Komponente:

```ts
type PageNode = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: PageNode[];
  slots?: Record<string, PageNode[]>;
};
```

### Warum das wichtig ist

- `children` deckt klassisches Nesting ab
- `slots` decken benannte Bereiche ab
- `type` mappt auf eine registrierte Storybook-/Puck-Komponente
- `props` bleiben serialisierbar

### Fruehe Regeln definieren

1. Nur serialisierbare Props erlauben
2. Functions nicht direkt speichern
3. Complex objects nur ueber kontrollierte Schemas
4. Jede Komponente beschreibt explizit:
   - editierbare Props
   - erlaubte Child-Typen
   - erlaubte Slots

---

## 5. Storybook-Komponentenmodell definieren

Hier entscheidet sich, wie praktikabel das Projekt wirklich wird.

### Realistische erste Strategie

Nicht versuchen, jede bestehende Story automatisch in Puck zu ueberfuehren.

Stattdessen:

1. Eine eigene `builder registry` einfuehren
2. Jede nutzbare Komponente explizit registrieren
3. Pro Komponente definieren:
   - React-Komponente
   - Label
   - Kategorie
   - Props-Schema
   - Nesting-Regeln
   - Default Props

### Beispielhafte Registry-Form

```ts
type BuilderComponentDefinition = {
  type: string;
  label: string;
  category: string;
  component: React.ComponentType<any>;
  fields: Record<string, unknown>;
  defaultProps?: Record<string, unknown>;
  allowsChildren?: boolean;
  allowedChildren?: string[];
  slots?: string[];
};
```

### Warum nicht direkt alle Storybook Stories?

- Stories sind Showcase-/Test-Artefakte, nicht automatisch Builder-Definitionen
- Viele Stories enthalten Decorators, Mocks oder Controls, die nicht editor-tauglich sind
- Props muessen fuer Drag-and-Drop-/Page-Building oft staerker eingeschraenkt werden

---

## 6. UI-Konzept fuer das Addon festlegen

### Empfohlene erste UX

Ein Storybook Addon Panel mit drei Bereichen:

1. Komponentenbibliothek
2. Puck Canvas / Editor
3. Eigenschaften / Inspector

### Sinnvolle Zusatzfunktionen fuer spaeter

- Komponenten nach Kategorie filtern
- Suche
- Undo/Redo
- Device Preview
- JSON Viewer
- Reset Draft

### Wichtige UX-Entscheidung

Der Nutzer arbeitet nicht auf einer einzelnen Story, sondern in einer Builder-Ansicht, die auf die registrierten Komponenten zugreift.

Das ist oft sauberer als zu versuchen, existierende Story-Seiten in einen WYSIWYG-Editor umzubauen.

---

## 7. Technischen Spike bauen

Bevor die eigentliche Architektur finalisiert wird, lohnt sich ein kurzer Spike.

### Ziel des Spikes

Beweisen, dass folgende Kette funktioniert:

1. Storybook Addon startet
2. Puck laeuft im Addon
3. Eine React-Komponente aus dem Projekt wird im Editor gerendert
4. Eine verschachtelte Komponente laesst sich speichern und wieder laden

### Spike-Deliverable

Ein Minimalbeispiel mit:

- `Text`
- `Card`
- `Section`
- `Page`

Und mindestens einem Nested-Use-Case:

- `Page > Section > Card > Text`

---

## 8. Schritt-fuer-Schritt Umsetzungsplan

## Phase 1: Repository und Grundsetup

1. Repo initialisieren
2. Ziel-Stack festlegen
   - wahrscheinlich `TypeScript`
   - `React`
   - `Storybook Addon API`
   - `Puck`
3. Monorepo ja/nein entscheiden
4. Linting, Formatting, Testing, Build aufsetzen
5. Demo-Storybook-App anlegen

### Ergebnis

Ein laufendes Entwicklungs-Setup mit Demo-Komponenten.

## Phase 2: Addon-Skelett bauen

1. Einfaches Storybook Addon registrieren
2. Panel rendern
3. State-Management fuer Editor-Daten aufsetzen
4. Basislayout fuer Addon-UI bauen

### Ergebnis

Ein sichtbares Addon-Panel mit Platzhaltern fuer Library, Canvas und Inspector.

## Phase 3: Puck einbetten

1. Puck in das Addon integrieren
2. Minimale Puck-Config anlegen
3. Eine statische Demo-Komponente anzeigen
4. Aenderungen im Editor-State halten

### Ergebnis

Puck laeuft innerhalb von Storybook.

## Phase 4: Component Registry einfuehren

1. Eigenes Registry-Format definieren
2. Demo-Komponenten registrieren
3. Kategorisierung einfuehren
4. Mapping von Registry zu Puck-Config bauen

### Ergebnis

Komponenten koennen strukturiert im Editor angeboten werden.

## Phase 5: Nesting-Modell implementieren

1. `children`-basiertes Nesting unterstuetzen
2. Container-Komponenten definieren
3. Validierung fuer erlaubte Child-Komponenten bauen
4. Renderpfad fuer verschachtelte Nodes testen

### Ergebnis

Komponenten koennen sinnvoll ineinander verschachtelt werden.

## Phase 6: Slots und Regions hinzufuegen

1. Benannte Slots spezifizieren
2. UI fuer Slot-Bearbeitung definieren
3. Datenmodell fuer `slots` integrieren
4. Rendering fuer Slot-Content bauen

### Ergebnis

Komplexere Layouts mit `header`, `sidebar`, `content`, `footer` werden moeglich.

## Phase 7: Props und Controls verfeinern

1. Einfaches Props-Schema definieren
2. Typen fuer Text, Number, Boolean, Select, Image etc. abbilden
3. Default Values unterstuetzen
4. Validierung und Fallbacks einfuehren

### Ergebnis

Komponenten lassen sich im Editor robust konfigurieren.

## Phase 8: Persistenz einfuehren

1. Local Storage Drafts
2. JSON Export
3. JSON Import
4. Versionierung des Schemas vorbereiten

### Ergebnis

Builder-Seiten koennen gespeichert und wieder geladen werden.

## Phase 9: Storybook-nahe Integration verbessern

1. Optional Story-Metadaten lesen
2. Optional Args/Controls teilweise uebernehmen
3. Preview-Sync pruefen
4. Entwickler-API fuer einfache Registrierung bauen

### Ergebnis

Die Erweiterung fuehlt sich nativer in Storybook an.

## Phase 10: Open-Source-Readiness

1. README schreiben
2. klares Getting Started liefern
3. Beispielprojekt beilegen
4. Architektur dokumentieren
5. Contribution Guide anlegen
6. Lizenz hinzufuegen
7. erste Releases vorbereiten

### Ergebnis

Das Projekt ist fuer externe Nutzer und Contributor verstaendlich.

---

## 9. Empfohlene Reihenfolge fuer Prototypen

Nicht alles gleichzeitig bauen. Diese Reihenfolge reduziert Risiko:

1. Addon Panel ohne Puck
2. Puck isoliert mit Demo-Komponenten
3. Puck im Storybook Addon
4. Registry fuer Komponenten
5. Children-Nesting
6. Slots
7. Persistenz
8. bessere DX / Dokumentation

---

## 10. Die groessten Risiken

### Risiko 1: Storybook Stories sind keine saubere Source of Truth

Viele Teams nutzen Stories nicht in einer Form, die direkt editorisierbar ist.

### Gegenmassnahme

Eine explizite Builder-Registry als Kernkonzept etablieren.

### Risiko 2: Beliebiges Nesting wird schnell chaotisch

Ohne Regeln entstehen ungueltige oder schwer bedienbare Seiten.

### Gegenmassnahme

Pro Komponente erlaubte Child-Typen und Slots definieren.

### Risiko 3: Props sind nicht immer serialisierbar

Callbacks, React Nodes oder komplexe Domain-Objekte passen schlecht in einen visuellen Builder.

### Gegenmassnahme

Nur editorgeeignete Props freigeben und transformieren.

### Risiko 4: Storybook Addon APIs und Preview/Manager-Grenzen

Die Trennung von Storybook-Manager und Preview kann die Integration komplizierter machen.

### Gegenmassnahme

Sehr frueh einen Addon-Spike bauen und die Kommunikationswege pruefen.

---

## 11. Empfohlene erste Deliverables

Wenn du das Projekt sauber aufziehen willst, wuerde ich diese ersten Artefakte bauen:

1. `docs/vision.md`
2. `docs/architecture.md`
3. `packages/storybook-addon-builder`
4. `packages/demo-app`
5. `examples/basic-page-builder`

Falls du erstmal klein starten willst, reicht auch:

1. ein Repo
2. ein Storybook mit 4 Demo-Komponenten
3. ein einfaches Addon-Panel
4. Puck integriert
5. JSON Export/Import

---

## 12. Milestone-Vorschlag

### Milestone 1: Technical Proof

- Puck laeuft in Storybook
- 3-5 Komponenten registriert
- einfaches Nesting funktioniert

### Milestone 2: Usable MVP

- Props bearbeitbar
- JSON speicherbar
- Slots teilweise unterstuetzt
- Demo-Projekt veroeffentlicht

### Milestone 3: Developer Product

- saubere API fuer Registrierung
- Dokumentation
- Tests
- npm-Paket / Open-Source-Release

### Milestone 4: Advanced Builder

- bessere Auto-Mappings
- Template-System
- Persistenz-Adapter
- evtl. kollaborative Features

---

## 13. Konkrete naechste Schritte fuer sofort

Wenn du heute anfangen willst, wuerde ich exakt so starten:

1. Ein leeres Repo fuer das Addon anlegen
2. Storybook mit React + TypeScript hochziehen
3. 4 einfache Demo-Komponenten bauen
4. Storybook Addon Panel registrieren
5. Puck testweise im Panel rendern
6. Eine manuelle Component Registry einfuehren
7. `Page -> Section -> Card -> Text` als erste End-to-End-Demo umsetzen
8. JSON Export/Import hinzufuegen
9. Erst danach ueber automatische Story-Integration nachdenken

---

## 14. Mein Architektur-Fazit

Die wahrscheinlich beste Richtung ist:

- **nicht** "alle Storybook Stories automatisch in einen Builder verwandeln"
- sondern "ein Storybook Addon bauen, das auf einer expliziten Builder-Registry basiert"

Das ist deutlich realistischer, robuster und open-source-tauglicher.

Wenn das spaeter gut funktioniert, kannst du immer noch eine zweite Schicht ergaenzen, die Storybook-Metadaten teilweise automatisch in Registry-Definitionen ueberfuehrt.

---

## 15. Gute Leitfrage fuer jede Phase

> Koennen wir mit echten Projektkomponenten in Storybook innerhalb von Puck verschachtelte Seiten bauen, speichern und wieder laden, ohne dass das Komponentenmodell unkontrollierbar wird?

Wenn jede Phase diese Frage ein Stueck besser beantwortet, bist du auf einem sehr guten Weg.
