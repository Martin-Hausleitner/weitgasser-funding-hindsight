# Notion-Import: Weitgasser Odoo-/OSS-Angebot

**Zweck:** Entscheidungsgrundlage für Weitgasser Jagen & Fischen. Dieses Dokument enthält keine Zugangsdaten und ist kein Steuer- oder Rechtsgutachten.

## 1. Kurzangebot

**Empfohlener Einstieg:** 7-Tage-Sandbox mit Odoo Community self-hosted.

**Pilotumfang:** Kontakte/CRM, Angebote, Aufträge, Rechnungsentwürfe, Dokumente, E-Mail-Vorlagen, einfache Lagerbewegungen und ein Paperclip/LangGraph-Review-Workflow.

**Nicht im Pilot:** echte Zahlungen, automatische produktive Rechnungen, Massenmailing, autonome Bestellungen, Steuerberatung oder ungeprüfte Übernahme historischer Daten.

## 2. Variantenentscheidung

| Variante | Lizenz-/Kostenannahme | Betrieb | Geeignet wenn | Hauptnachteil |
|---|---|---|---|---|
| Community self-hosted | Keine Odoo-Enterprise-Subscription im Basismodell; Infrastruktur, Implementierung, Updates und Support sind eigene Kosten | Weitgasser/Partner | Datenhoheit, kontrollierbare Kosten und technische Betreuung vorhanden | Betriebs- und Compliance-Aufwand liegt beim Betreiber |
| Enterprise on-premise | Subscription/Benutzer/App- und Partnerkosten nach Odoo-Angebot | Eigene Infrastruktur oder Partner | Offizielle Apps, Support und Lokalisierung höher gewichtet werden | Proprietärer Anteil und laufende Vendor-Kosten |
| Odoo Online | SaaS-Subscription; genaue Nutzer-/App-/API-Konditionen schriftlich bestätigen | Odoo | Schnellster Start ohne Serverbetrieb | Weniger Runtime-/Customizing-Kontrolle |
| Odoo.sh | Enterprise-Plan plus Odoo.sh-Hosting; genaue Quota/Backup/SLA schriftlich bestätigen | Odoo PaaS | Git-/Custom-Modul-Workflow mit verwaltetem Hosting gewünscht | Container-/Worker-/Systempaket-Grenzen |
| ERPNext, Dolibarr oder Tryton | OSS-Kern, aber Implementierung, Hosting, Module und Support budgetieren | self-hosted/Partner | Adversarialer Preis-/Funktionsvergleich | Migration, lokalisierte Buchhaltung und Partnernetz noch unbewiesen |

**Vorläufige Empfehlung:** Community-Pilot; Enterprise/Online/Odoo.sh nur als Alternativangebot mit konkretem Preisblatt und Datenverarbeitungsvertrag. Kein paralleler Produktivbetrieb zweier ERP-Systeme.

## 3. Angebotspakete

### Paket A – Discovery und Sandbox

- Prozess-/Dateninventur, Rollen und Freigaben
- isolierte Odoo-Instanz, PostgreSQL, TLS, Backup und Restore-Test
- 20–50 Kontakte, 10 Produkte, 5 Angebote, 3 Aufträge, 3 Rechnungsentwürfe, 2 PDFs
- Ergebnis: Prozesskarte, Fehlerliste, belastbarer Aufwand für Paket B

### Paket B – Kontrollierter Pilot

- CRM → Angebot → Auftrag → Rechnungsentwurf
- Dokumentenablage mit Quellreferenz und Hash
- E-Mail-Entwürfe, Review-Queue und Paperclip-Orchestrierung
- UAT mit Weitgasser und Steuerberater

### Paket C – Erweiterung

- Lager-/Einkaufsabläufe, Kalender, genehmigte API-Integrationen
- erst nach erfolgreichem Monatszyklus und Restore-Test
- Zahlungen und produktive Rechnungen nur mit separatem Human Gate

## 4. Kostenmodell (Annahmen, keine Preise)

| Kostenblock | Community self-hosted | Enterprise/Online/Odoo.sh |
|---|---|---|
| Softwarelizenz | Odoo-Enterprise-Lizenz nicht eingerechnet; Drittmodule separat prüfen | Offizielles Odoo-Angebot erforderlich |
| Hosting | VCVM/Cloud, PostgreSQL, Storage, Backups, Monitoring | Odoo SaaS/PaaS laut Angebot |
| Einrichtung | Discovery, Datenmodell, Rollen, Module, Tests | ebenfalls erforderlich |
| Laufend | Updates, Security, Restore-Tests, Support | Subscription/Partner plus Integrationspflege |
| Compliance | Steuerberater, DSGVO, Aufbewahrung, DPA | Vertrags-/Region-/Exportprüfung zusätzlich |

**Kalkulationsregel:** Kein Betrag wird als verbindlich ausgegeben, bevor Nutzerzahl, Apps, Hostingregion, Supportlevel, Migration und österreichische Lokalisierung schriftlich bestätigt sind.

## 5. Human Gates

1. Steuerberater bestätigt österreichische USt-/Rechnungsanforderungen.
2. Weitgasser benennt Prozess- und Daten-Owner.
3. Entscheidung für self-hosted, Odoo Online oder Odoo.sh nach Preisblatt und DPA.
4. Freigabe von Datenfeldern, Aufbewahrungs- und Löschfristen.
5. Freigabe der E-Mail-Domäne, Vorlagen und Opt-in-Regeln.
6. UAT bestätigt Kontakte, Angebote, Aufträge, Rechnungsentwürfe und PDF-Originale.
7. Keine produktive Rechnung/Zahlung ohne signiertes Gate-3-Protokoll.

## 6. Hindsight- und Wissensablage

- Odoo/Documents bleibt System of Record für Geschäftsdaten und Original-PDFs.
- Hindsight erhält ausschließlich freigegebene, wichtige Fakten mit Quelle, Zeitstempel, Confidence, Odoo-Referenz und Löschfrist.
- Roh-PDFs, vollständige E-Mail-Threads und Zahlungsdaten werden nicht automatisch in Hindsight gespiegelt.
- Jede Importcharge erhält Manifest, Fehlerliste und Prüfsumme.

## 7. Entscheidungsvorlage für das Tribunal

**Gewinner für den Pilot:** Odoo Community self-hosted, sofern Betriebs-Owner und Steuerberater-Gate vorhanden sind.

**Fallback:** Enterprise/Odoo.sh oder Online, wenn offizieller Support, lokalisierte Finance-Apps und geringerer Eigenbetrieb höher gewichtet werden.

**Adversarialer Vergleich:** ERPNext als nächster vollständiger OSS-Kandidat; Dolibarr als schlanke Kostenalternative; Tryton als technisch kontrollierte, aber aufwändigere Option.

## 8. Quellen

- Odoo Editions: https://www.odoo.com/page/editions
- Odoo Community: https://github.com/odoo/odoo
- Odoo.sh FAQ: https://www.odoo.sh/faq
- Odoo External API / JSON-2-Hinweis: https://www.odoo.com/documentation/19.0/developer/reference/external_rpc_api.html
- ERPNext/Frappe: https://github.com/frappe/erpnext
- Dolibarr: https://github.com/Dolibarr/dolibarr
- Tryton: https://www.tryton.org/

**Stand:** 2026-07-19. Odoo-20-Details, Preise, API-Verfügbarkeit, App-Edition und Österreich-Lokalisierung sind vor Vertragsabschluss gegen die dann veröffentlichte Primärdokumentation zu verifizieren.
