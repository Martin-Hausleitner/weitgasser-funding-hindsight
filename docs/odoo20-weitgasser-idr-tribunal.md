# Odoo 20 für Weitgasser Jagen & Fischen

**Artefakt:** IDR + Tribunal-Bericht  
**Stand:** 2026-07-19  
**Entscheidungstyp:** Architektur-/Einführungsentscheidung, noch keine produktive Installation

## 1. Executive Decision

Odoo 20 Community/Self-hosted ist als zentrale Geschäftsprozess-Plattform für Weitgasser grundsätzlich geeignet. Empfohlen wird ein **stufenweiser Pilot** mit CRM/Kontakten, Verkauf, Rechnungsentwürfen, Dokumenten und E-Mail. Buchhaltung, österreichische Steuerlogik, Zahlungsverkehr und produktive automatische Rechnungslegung werden erst nach Steuerberater- und UAT-Freigabe aktiviert.

Odoo ersetzt nicht automatisch eine österreichische, steuerlich geprüfte Kanzlei-/Buchhaltungslösung. Die Community-Edition reduziert Lizenzkosten, verschiebt aber Betrieb, Updates, Backup, Security und lokale Compliance in die Verantwortung von Weitgasser.

## 2. Business-Problembeschreibung

Weitgasser Jagen & Fischen benötigt einen nachvollziehbaren Ablauf von Interessent/Kontakt über Angebot und Auftrag bis Rechnung, Zahlung, Dokumentablage und Nachbetreuung. Heute drohen Medienbrüche: E-Mail, Telefon, Kalender, PDF-Rechnungen, Lagerinformationen und Förderungsunterlagen liegen getrennt. Ziel ist ein gemeinsamer Vorgang mit eindeutiger Kundennummer, Verantwortlichem, Status, Belegen und Audit-Spur.

**Nicht-Ziele des Piloten:** automatische Steuerberatung, ungenehmigte Massen-E-Mails, vollautomatische Zahlungen, Scraping fremder Konten oder Veröffentlichung personenbezogener Daten.

## 3. Zielprozess (Soll)

1. **Kontakt/Lead:** Website, Telefon oder E-Mail erzeugt Kontakt/Lead; Dublettenprüfung nach E-Mail, Telefon und Firmen-ID.
2. **Qualifizierung:** Aktivität, Verantwortlicher, Branche/Bedarf, Einwilligungsstatus und Quelle werden erfasst.
3. **Angebot:** Produkte/Leistungen, Preise, Steuerzuordnung, Gültigkeit und Freigabegrenze; PDF erst nach Freigabe.
4. **Auftrag:** Angebotsannahme erzeugt Auftrag; Liefer-/Abholtermin, Lagerreservierung und interne Aufgaben werden verknüpft.
5. **Rechnung:** Rechnung aus Auftrag/Lieferung; Nummernkreis, Steuerdaten, Zahlungsziel und Belegreferenz werden validiert. Versand nur durch freigegebenen Workflow.
6. **Zahlung/Abgleich:** Bank-/Zahlungsstatus wird importiert oder manuell bestätigt; Differenzen landen in einer Review-Queue.
7. **Service/Nachfassen:** Aktivitäten, Reklamationen, Wiederkäufe und Termine bleiben am Kontakt/Verkaufsauftrag.
8. **Dokument/Hindsight:** Original-PDF, strukturierte Metadaten und Quellen-Hash werden revisionssicher abgelegt; nur freigegebene, wichtige Erkenntnisse gehen in Hindsight, operative Details primär in der Odoo-Datenbank.

## 4. Odoo-Module und Automatisierung

| Bereich | Odoo-Basis | Pilot-Nutzung | Automatisierung |
|---|---|---|---|
| Kontakte/CRM | Contacts, CRM | Kunden, Lieferanten, Leads, Aktivitäten | E-Mail-Alias, Dubletten-Review, Follow-up-Aufgaben |
| Angebote/Aufträge | Sales | Angebotsvorlagen, Freigaben, Aufträge | server actions/webhooks nur nach Allowlist |
| Rechnungen | Invoicing/Accounting | zunächst Entwürfe und Testmandant | PDF-Entwurf, Versand erst nach Gate |
| Zahlungen | Accounting/Payment Providers | Statusimport, manuelle Freigabe | Bankabgleich/Import, keine autonomen Auszahlungen |
| Lager | Inventory, Purchase | Artikel, Bestand, Lieferanten, Reservierung | Mindestbestand als Aufgabe, nicht als ungenehmigte Bestellung |
| Termine/Kurse | Calendar, Events/Appointment (falls Edition/Modul verfügbar) | Beratung, Einschulung, Abholung | ICS/Reminder nach Einwilligung |
| Dokumente | Documents, Mail | PDFs, Verträge, Förderbelege | Klassifikation, OCR nur mit Review |
| E-Mail | Discuss/Mail | Vorlagen, Thread am Datensatz | Outbound-Queue, Bounce-/Opt-out-Verarbeitung |

### CLI/API- und Worker-Muster

- **Odoo CLI:** `odoo-bin -c /etc/odoo/odoo.conf -d <db> -u <module> --stop-after-init` für kontrollierte Migrationen/Module; niemals gegen Produktion ohne Backup und Wartungsfenster.
- **XML-RPC/JSON-RPC:** Service-Account mit minimalen Rechten; `search_read`, `create`, `write` und `action_*` nur über typisierte Adapter. Secrets ausschließlich in Secret Store/Umgebungsvariablen.
- **Queue-Worker:** Eingang (E-Mail/Webhook) → Validierung → Odoo-Datensatz → Review/Approval → Nebenwirkung (PDF/E-Mail/Payment). Idempotency-Key verhindert Doppelanlagen.
- **Webhooks:** signiert, replay-sicher und mit Allowlist für Events; eingehende Daten werden vor dem Schreiben normalisiert.
- **Paperclip/LangGraph:** Odoo bleibt System of Record für Geschäftsdaten. Paperclip orchestriert freigegebene Jobs; LangGraph führt Review-/Tribunal-Flows aus. Agenten dürfen Entwürfe und Aufgaben erstellen, aber keine endgültigen Rechnungen, Zahlungen oder Löschungen ohne Human Gate.

## 5. Datenmodell und Governance

Kernobjekte: `res.partner` (Kontakt), `crm.lead`, `sale.order`, `sale.order.line`, `stock.picking`, `account.move`, `account.payment`, `product.product`, `calendar.event`, `documents.document`, `mail.message`.

Pflichtfelder/Metadaten:

- externe Referenz und Quelle (CRM, E-Mail, Telefon, Import)
- Verantwortlicher und Freigabestatus
- Einwilligung/Opt-out für Marketing und E-Mail
- österreichische Steuerattribute (UID, Rechnungsadresse, Steuerposition) nach Steuerberater-Vorgabe
- `source_hash`, Dokumenttyp, Erfassungszeit, Bearbeiter und Korrekturgrund für importierte PDFs

Rollen: Verkauf, Lager, Buchhaltung, Dokument-Reviewer, Administrator, externer Steuerberater (read-only/limited). Segregation of duties verhindert, dass ein Agent seine eigene Rechnung freigibt.

## 6. Tribunal: Optionen

| Option | Nutzen | Kosten/Risiko | Urteil |
|---|---|---|---|
| Odoo 20 Community self-hosted | Ein integriertes Datenmodell, OSS-Kern, gute API, CRM/Sales/Inventory | Betrieb und lokale Steuer-/Localization-Verantwortung bei Weitgasser | **Sieger für Pilot** |
| Odoo Enterprise/Online | weniger Betriebsaufwand, zusätzliche offizielle Apps/Support | Lizenz-/Vendor-Kosten, weniger Kontrolle, Cloud-Datenprüfung | Fallback bei fehlender Betriebsfähigkeit |
| ERPNext/Frappe | OSS, ERP-/CRM-Grundlagen, flexible Framework-Entwicklung | Migration/österreichische Lokalisierung und Partnerverfügbarkeit prüfen | Vergleichs-PoC, nicht parallel produktiv |
| Separate Spezial-Apps + Paperclip | gute Einzellösungen | Daten-Silos, Rechnungs-/Lagerabgleich und Audit deutlich komplexer | nur für klar abgegrenzte Ergänzungen |

**Tribunal-Fazit:** Odoo Community gewinnt für einen kontrollierten End-to-End-Pilot. Enterprise/Online gewinnt nur, wenn Support, SLA und Steuerlokalisierung höher gewichtet werden als Self-hosting und Datenhoheit. ERPNext ist ein sinnvoller adversarialer Vergleich, aber kein Grund, zwei ERP-Systeme gleichzeitig einzuführen.

## 7. Risiken und Kontrollen

- **Steuerrecht/GoBD/Österreich:** Rechnungsnummern, Storno, USt, UID, Aufbewahrung und Signatur mit Steuerberater prüfen. Keine Aussage im System gilt als Steuerberatung.
- **DSGVO:** Zweckbindung, Lösch-/Sperrkonzept, Auftragsverarbeiter, DPA, EU-Hosting, Export-/Auskunftsprozess und minimale Agent-Kontexte dokumentieren.
- **E-Mail/Marketing:** Double-Opt-in, Abmeldung, Bounce und Vorlagenfreigabe; keine Agenten-Massenkampagnen im Pilot.
- **Security:** MFA/SSO, getrennte Service-Accounts, Secrets nicht im Git, TLS, Backups verschlüsselt, Adminzugriffe protokolliert.
- **Datenqualität:** Dubletten, unvollständige Adressen und falsche Steuerpositionen blockieren die nächste Stufe.
- **Updates/Module:** Odoo-Module und Community-Add-ons auf Lizenz, Maintainer, Security-Historie und Upgradepfad prüfen.
- **Vendor-/Bus-Faktor:** Produktionsbetrieb braucht dokumentierten Restore-Test und einen benannten Owner.

## 8. Migrations- und Rolloutplan

**Gate 0 – Discovery:** aktuelle Quellen, Artikel, Kunden, Rechnungsnummern, Kalender und Rollen inventarisieren; Datenverantwortliche benennen.

**Gate 1 – Sandbox:** Odoo 20 Community in isolierter Umgebung mit PostgreSQL, TLS, Backup und Testmandant. Keine Echtzahlungen/Produktiv-E-Mails.

**Gate 2 – Pilot:** 20–50 repräsentative Kontakte, 10 Produkte, 5 Angebote, 3 Aufträge, 3 Rechnungsentwürfe, 2 Lagerbewegungen, 2 Dokument-PDFs; jede Nebenwirkung manuell bestätigt.

**Gate 3 – Reconciliation:** Summen, Steuern, Nummernkreise, Lagerbestand und PDF-Inhalte gegen Quelle abstimmen; Steuerberater signiert Testfallliste.

**Gate 4 – Limited Production:** nur CRM/Sales/Dokumente, tägliches Backup, Monitoring, Rollback-Plan. Buchhaltung/Zahlungen bleiben zunächst im bisherigen System.

**Gate 5 – Expansion:** erst nach zwei fehlerfreien Monatszyklen Rechnungen, Bankabgleich, Kalender- und Agentenautomatisierung erweitern.

Migration erfolgt append-only bzw. mit Quellreferenz; keine stillen Überschreibungen. Jede Importcharge erhält Manifest, Fehlerliste und Prüfsumme.

## 9. QA-Gate (Definition of Done)

Ein Release gilt nur als bestanden, wenn:

- Kontakt → Angebot → Auftrag → Rechnungsentwurf mit eindeutiger Referenz durchläuft;
- doppelte Webhook-Zustellung keinen zweiten Auftrag erzeugt;
- Rollen unberechtigte Preis-, Steuer- und Zahlungsaktionen blockieren;
- PDF-Original und Metadaten abrufbar, unverändert und hashbar sind;
- Backup-Restore in einer frischen Sandbox gelingt;
- DSGVO-Export, Opt-out und Lösch-/Sperrprozess getestet sind;
- Steuerberater die österreichischen Rechnungs-Testfälle abzeichnet;
- Agenten nur erlaubte Entwurfsaktionen ausführen und jede Entscheidung protokolliert ist;
- Last-/Fehlertest für E-Mail, RPC, Queue und Datenbank abgeschlossen ist.

## 10. Hindsight-Integration

Hindsight erhält keine vollständige Rohdatenbank. Ein Konsolidierungsjob extrahiert nur freigegebene, geschäftlich wichtige Fakten (z. B. bestätigte Kundenpräferenzen, Prozessentscheidungen, Förderfristen) mit Quelle, Zeitstempel, Confidence und Löschfrist. Rechnungen, personenbezogene Roh-PDFs und vollständige E-Mail-Threads bleiben in Odoo/Documents bzw. im Archiv. Jeder Hindsight-Eintrag muss auf den Odoo-Datensatz und den Dokument-Hash zurückverweisen.

## 11. Lizenz-, Hosting- und API-Tribunal (präzisiert)

| Variante | OSS-Status / Lizenz | Hosting und Betrieb | Support/Upgrades | Integrationsfolgen | Tribunal-Urteil |
|---|---|---|---|---|---|
| **Odoo Community (self-hosted)** | Odoo bezeichnet Community als Open Source; der Community-Kern liegt im öffentlichen Repository. Drittanbieter-Module können eigene Lizenzen haben und müssen einzeln geprüft werden. | Weitgasser oder Dienstleister betreibt Linux, PostgreSQL, TLS, Backups, Monitoring, Updates und Restore-Tests. | Kein automatischer Odoo-Cloud-SLA; Support über Community/Partner oder selbst organisieren. | Vollständige Kontrolle über interne Module und Netzwerk; API-/Upgrade-Kompatibilität muss pro Zielversion geprüft werden. | **Empfohlene Pilotbasis**, wenn ein Betriebs-Owner vorhanden ist. |
| **Odoo Enterprise on-premise** | Proprietäre Enterprise-Anwendungen und Odoo-Subscription; nicht als OSS-Angebot kalkulieren. | Eigener Server, aber Enterprise-Code/Subscription und Odoo-Bedingungen erforderlich. | Odoo-Subscription/Partner kann Support und Upgrades abdecken; Vertragsumfang prüfen. | Zusätzliche offizielle Apps können Integrationsaufwand reduzieren, aber Vendor-Bindung erhöhen. | Fallback für produktive Finance-/Localization-Anforderungen. |
| **Odoo Online (SaaS)** | Nur Enterprise-SaaS-Angebot; nicht self-hosted und nicht Community. | Odoo betreibt Plattform; keine freie Server-/Systempaket-Kontrolle. | Odoo betreibt Updates/Hosting nach SaaS-Modell; Datenexport und Vertrags-/Regionsthemen prüfen. | Custom-Code, Systempakete und bestimmte Integrationen sind eingeschränkt; externe API-Freigaben und Planabhängigkeit beachten. | Geeignet für schnellen Pilot ohne Infrastruktur, nicht für maximale Daten-/Runtime-Kontrolle. |
| **Odoo.sh** | Hosting/PaaS für Odoo-Projekte, keine eigene OSS-Edition; die offizielle Projektdokumentation verlangt für Kundenprojekte einen Enterprise-Plan mit Odoo.sh-Hosting. | Odoo verwaltet Container/Builds/Backups; Ressourcen, Prozesse, Systempakete und langlebige Worker sind beschränkt. | Plattform-Backups und Odoo-Versionslebenszyklus nach Odoo.sh-Policy; SLA/Region vertraglich prüfen. | Git-basierte Builds und Custom-Module möglich, aber keine beliebigen Daemons; externe Integrationen über HTTP/Queues designen. | Nur wählen, wenn Enterprise-Subscription und PaaS-Grenzen akzeptiert sind. |

### API- und Automationshinweis für Odoo 20

Die offizielle Odoo-19-Dokumentation weist darauf hin, dass die bisherigen XML-RPC-/JSON-RPC-Endpunkte für Odoo 20 zur Ablösung vorgesehen sind und eine JSON-2-API als Ersatz beschrieben wird. Das ist ein **Versions-/Zeitpunkt-Risiko** für den Pilot: Adapter dürfen nicht fest auf alte RPC-Endpunkte verdrahtet werden. Vor Implementierung muss die veröffentlichte Odoo-20-Dokumentation, der gewählte Tarif und die aktivierte API-Funktion gemeinsam verifiziert werden. Kein API-Schlüssel und kein Secret gehört in Git, README oder Hindsight.

### OSS-/Open-Core-Alternativen für den adversarialen Vergleich

| System | Einordnung | Stärken | Risiken für Weitgasser | Entscheidung |
|---|---|---|---|---|
| **ERPNext/Frappe** | Open Source, self-hosted | CRM, Verkauf, Einkauf, Lager, Rechnungen; flexible Framework-Erweiterung | Österreichische Steuer-/Partnerabdeckung und Migration müssen nachgewiesen werden | **Vergleichs-PoC**, nicht parallel produktiv |
| **Dolibarr** | Open Source, modular, leichter Betrieb | CRM, Angebote, Rechnungen, Produkte/Lager; niedrige Einstiegshürde | Tiefe End-to-End-Prozesse und lokale Finance-Anforderungen ggf. weniger integriert | Kandidat für schlanken Kostenvergleich |
| **Tryton** | Open Source, modular, ERP-orientiert | Saubere Kernmodelle, langfristig kontrollierbarer self-hosted Betrieb | Höherer Implementierungs-/Partneraufwand und weniger sofortige UI-/App-Breite | Nur bei starkem technischen Owner prüfen |

Diese Alternativen sind keine Lizenz- oder Funktionsgleichheit mit Odoo. Für jedes Angebot müssen Release, Module, Maintainer, Lizenz, österreichische Lokalisierung, Backup/Restore und Support separat belegt werden.

- Odoo-Dokumentation (Apps, External API, CLI/Administration): <https://www.odoo.com/documentation/>
- Odoo Community Repository/Lizenzhinweise: <https://github.com/odoo/odoo>
- Odoo Editions-Vergleich (Community vs. Enterprise): <https://www.odoo.com/page/editions>
- Odoo.sh FAQ und technische Grenzen: <https://www.odoo.sh/faq>
- Odoo External RPC/API-Hinweis (inkl. JSON-2-Migration): <https://www.odoo.com/documentation/19.0/developer/reference/external_rpc_api.html>
- ERPNext/Frappe: <https://github.com/frappe/erpnext> und <https://github.com/frappe/frappe>
- Dolibarr: <https://github.com/Dolibarr/dolibarr>
- Tryton: <https://www.tryton.org/>
- DSGVO-Grundlagen: <https://eur-lex.europa.eu/eli/reg/2016/679/oj>

Die genaue Verfügbarkeit einzelner Apps und der Österreich-Lokalisierung in Odoo 20 ist vor Installation gegen die zum Zeitpunkt des Piloten veröffentlichte Dokumentation und Paketquelle zu verifizieren. Aussagen zu Steuer- und Aufbewahrungspflichten sind Prüfaufträge, keine Rechts- oder Steuerberatung.

## 12. Quellen und Annahmen

Die Quellen für Lizenz-, Hosting- und API-Aussagen sind oben verlinkt. Die genaue Verfügbarkeit einzelner Apps und der Österreich-Lokalisierung in Odoo 20 ist vor Installation gegen die zum Zeitpunkt des Piloten veröffentlichte Dokumentation und Paketquelle zu verifizieren. Aussagen zu Steuer- und Aufbewahrungspflichten sind Prüfaufträge, keine Rechts- oder Steuerberatung.

## 13. Offene Human Gates

1. Steuerberater bestätigt österreichische Rechnungs-/USt-Anforderungen und Nummernkreis.
2. Weitgasser bestimmt Daten- und Prozess-Owner sowie genehmigte Benutzerrollen.
3. Entscheidung für Self-hosting (VCVM/Cloud, Backupstandort, SLA) und Budget.
4. Freigabe der zu importierenden Datenfelder und Aufbewahrungs-/Löschfristen.
5. Freigabe der E-Mail-Domäne, Templates, Opt-in und erlaubten Automatisierungen.
6. Entscheidung, ob Odoo zunächst parallel zum Bestandssystem oder als schrittweiser Ersatz läuft.

**Empfohlener nächster Schritt:** Gate-0-Workshop und ein sieben-Tage-Sandbox-Pilot; keine produktive Rechnung oder Zahlung, bevor Gate 3 und der Steuerberater-Check bestanden sind.
