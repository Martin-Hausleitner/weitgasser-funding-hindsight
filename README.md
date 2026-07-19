# Weitgasser Funding & Hindsight

Evidenzbasierter Förderungsindex und Hindsight-Wissensbasis für die Weitgasser GmbH (Weitgasser Jagen & Fischen, Leonding).

## Problem

Förderbedingungen liegen verteilt auf Behördenportalen und Richtlinien-PDFs. Für Weitgasser soll nachvollziehbar werden, welche Programme passen, welche Fristen und Bedingungen gelten und auf welche Originaldokumente jede Aussage zurückgeht. Ungeprüfte oder veraltete Zusammenfassungen dürfen nicht als Förderentscheidung verwendet werden.

## Repository-Inhalt

- `docs/funding/weitgasser-profile.md` – öffentlich belegtes Firmenprofil und Förderungs-Suchachsen
- `docs/adr/ADR-0001-funding-index-and-hindsight.md` – Architekturentscheidung für Index, PDF-Evidenz und Hindsight
- `funding/index.json` – kanonischer Förderindex
- `scripts/funding-qa-gate.mjs` – Vollständigkeits- und Hash-Prüfung

## QA-Regel

Der Gate ist nur PASS, wenn jedes Programm eine offizielle Quelle, alle relevanten Richtlinien-PDFs mit SHA-256, extrahierte Bedingungen und eine verknüpfte Hindsight-Notiz besitzt. Ein leerer Index ist absichtlich FAIL. Das System lädt keine geschützten Dokumente und speichert keine Zugangsdaten im Repository.

```sh
node scripts/funding-qa-gate.mjs
```

## Status

Die Repository-Struktur und das Weitgasser-Profil sind angelegt. Förderprogramme, Original-PDFs und Hindsight-Notizen fehlen noch; bis dahin darf keine Vollständigkeit behauptet werden.
