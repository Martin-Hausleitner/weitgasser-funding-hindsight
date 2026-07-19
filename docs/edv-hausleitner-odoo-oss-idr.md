# EDV Hausleitner: Odoo OSS als Service- und Betriebsplattform

**Artefakt:** Kurz-IDR / Entscheidungsanalyse  
**Stand:** 2026-07-19  
**Scope:** IT-/EDV-Dienstleister; keine Matrix-/Beeper-Architektur

## Entscheidungsempfehlung

Odoo Community (self-hosted) eignet sich als gemeinsamer Prozesskern für Kunden, Helpdesk, Projekte, Zeiterfassung, Wartungsverträge, Angebote, Rechnungsentwürfe, Assets und Wissensbasis. Empfohlen wird ein Pilot mit **CRM + Helpdesk + Projekte + Timesheets + Sales + Documents/Knowledge**. Produktive Buchhaltung, Zahlungsverkehr, automatische Vertragsverlängerungen und Massenmailing bleiben hinter Freigabe- und Steuerberater-Gates.

Odoo ist dabei das System of Record für Kunden- und Servicedaten. Paperclip/LangGraph darf freigegebene Aufgaben orchestrieren, aber keine Rechnung, Zahlung, Vertragsänderung oder Löschung autonom finalisieren.

## Zielbild für EDV Hausleitner

1. **Kunden/CRM:** Firma, Ansprechpartner, Standorte, Geräte-/Servicekontext, Einwilligungen, Vertriebschance und nächste Aktivität.
2. **Helpdesk:** E-Mail/Webformular → Ticket; SLA, Priorität, Kategorie, Zuständiger, interne Notiz, Kundenantwort und Abschlussgrund.
3. **Projekt/Change:** Größere Aufträge werden zu Projekt, Meilensteinen, Abhängigkeiten und Abnahmeprotokoll.
4. **Zeit:** Techniker buchen Zeit auf Ticket/Projekt; Korrekturen brauchen Begründung und Freigabe.
5. **Wartungsvertrag:** Laufzeit, Leistungsumfang, Reaktionszeit, enthaltene Stunden, Abrechnungsturnus und Kündigungsdatum; Erinnerungen erzeugen Aufgaben, keine automatische Abbuchung.
6. **Angebot → Auftrag → Rechnung:** Angebot mit Vorlagen und Rabattgrenzen; Auftrag erzeugt abrechenbare Positionen aus Zeit, Material oder Pauschale; Rechnung zunächst als Entwurf.
7. **Assets:** Kunde, Standort, Gerät, Seriennummer, Garantie, Besitzer, Software-/Lizenzstatus und verknüpfte Tickets.
8. **Wissen/Dokumente:** Runbooks, Übergaben, Netzwerkpläne und Vertrags-PDFs mit Version, Berechtigung und Quelle.

## Geeignete Odoo-Bausteine

| Bedarf | Community-Basis | Pilot-Kontrolle |
|---|---|---|
| Kunden/Vertrieb | Contacts, CRM, Sales | Pflichtfelder, Dublettenprüfung, Aktivitäten |
| Tickets/SLA | Helpdesk (Edition/Modul-Verfügbarkeit vorab prüfen) | Testmandant, SLA- und E-Mail-Tests |
| Projekte/Zeit | Project, Timesheets | Timer/Import nur mit Benutzer und Korrekturgrund |
| Verträge | Sales + wiederkehrende Positionen; ggf. geprüfte Community-Erweiterung | Versionierte Vorlage, manuelle Freigabe |
| Angebote/Rechnungen | Sales, Invoicing/Accounting | Steuerberaterprüfung, Entwurf vor Versand |
| Assets | Maintenance/Assets bzw. geprüfte Community-Erweiterung | Seriennummern und Eigentümer validieren |
| Wissen/Dokumente | Knowledge/Documents (Verfügbarkeit je Edition prüfen) | ACL, Versionierung, Restore-Test |

Die Verfügbarkeit einzelner Apps in Odoo 20 Community muss vor Installation gegen die veröffentlichte Modulquelle geprüft werden. Fehlende Funktionen werden bevorzugt über kleine, getestete Module oder eine externe Integration ergänzt, nicht durch ungeprüfte Studio-/Agentenlogik.

## Automatisierung: API, CLI und Agenten

- **CLI/Migration:** `odoo-bin -c /etc/odoo/odoo.conf -d <db> -u <module> --stop-after-init`; vor jedem Update Backup und Restore-Test.
- **API-Adapter:** XML-RPC/JSON-RPC mit eigenem Service-Account, minimalen ACLs, typisierten Payloads und Idempotency-Key. Keine Tokens im Git.
- **Inbound:** Support-Mail/Webhook → Signaturprüfung → Ticket-Deduplizierung → SLA/Owner → Benachrichtigung.
- **Outbound:** Ticketstatus, Zeitbuchung und Angebotsentwurf → Review-Queue; E-Mail und PDF-Versand erst nach Freigabe.
- **Paperclip/LangGraph:** Routing, Priorisierung, Zusammenfassung, Wissensvorschlag und QA; Odoo bleibt die Quelle. Jeder Agentenlauf schreibt Run-ID, Eingangsquelle, Tool-Aktionen und Ergebnis.
- **Watchdog:** prüft Queue-Alter, fehlgeschlagene Webhooks, SLA-Verletzungen, Backup-Alter und API-Fehler; Alarm erzeugt ein Ticket statt selbst Produktionsdaten zu ändern.

## Rollen und Berechtigungen

Support (Tickets/Kundenantwort), Technik (Assets/Arbeitszeit), Projektleitung (Plan/Abnahme), Vertrieb (Leads/Angebote), Buchhaltung (Rechnungen/Zahlungen), Wissens-Owner (Runbooks), Administrator (technisch), Steuerberater (eingeschränkte Prüfung). Segregation of duties verhindert eigene Freigabe von Rabatten, Rechnungen und Zahlungsstatus.

## Tribunal: OSS-Alternativen

| Option | Stärken | Bedenken | Urteil |
|---|---|---|---|
| Odoo Community self-hosted | integrierte CRM-/Sales-/Projekt-/Dokumentbasis, API, großes Ökosystem | Betrieb, Edition-/Modulgrenzen, österreichische Finanzlokalisierung prüfen | **Pilot-Sieger** |
| ERPNext/Frappe | OSS, Helpdesk/Assets/Projekte im Kern, flexible Erweiterung | geringere lokale Odoo-Erfahrung im Team prüfen; Migrationsevidenz nötig | Gegen-PoC |
| GLPI + separate CRM/ERP | stark bei IT-Assets/Helpdesk | mehrere Systeme, Abrechnung/CRM-Integration komplexer | sinnvoll bei asset-lastigem Support |
| Zammad + ERP/CRM | sehr gutes Ticketing | keine integrierte Auftrags-/Rechnungsbasis | Ergänzung, nicht alleiniger Kern |

## Risiken und Kontrollen

- **DSGVO:** Auftragsverarbeitung, EU-Hosting, Datenminimierung, Auskunft/Export/Löschung und Mandantentrennung dokumentieren.
- **Steuer/Belegwesen:** österreichische USt, Nummernkreise, Storno, Aufbewahrung und Rechnungsfelder vom Steuerberater abnehmen lassen.
- **Kundensicherheit:** keine Passwörter/privaten Schlüssel in Tickets oder Knowledge; Secrets in Secret Store, MFA und TLS verpflichtend.
- **SLA-/Vertragsrisiko:** Fristen aus Verträgen werden als überprüfbare Aufgaben geführt; automatische Eskalation ohne Vertragsprüfung ist verboten.
- **Datenqualität:** Seriennummer, Kunde, Standort und Ticketbezug sind Pflicht für abrechenbare Arbeit.
- **Betrieb:** verschlüsselte Backups, Restore-Test, Update-Fenster, Monitoring und dokumentierter Rollback.

## Pilot- und QA-Gates

**Gate 0 – Discovery:** aktuelle Kunden-, Ticket-, Vertrags-, Geräte- und Rechnungsquellen sowie Rollen inventarisieren.

**Gate 1 – Sandbox:** Odoo 20 Community isoliert mit PostgreSQL, TLS, Backup und Test-Mail; keine echten Kundennachrichten.

**Gate 2 – Service-Szenarien:** mindestens fünf Kunden, zehn Tickets, zwei SLA-Stufen, drei Assets, zwei Zeitbuchungen, ein Wartungsvertrag, ein Angebot und eine Rechnungsentwurfsroute.

**Gate 3 – E2E-QA:** Ticket → Zeit → Projekt/Material → Angebots-/Rechnungsentwurf; Dubletten-Webhooks, Berechtigungen, PDF, Audit-Log, Backup-Restore und Fehler-Queues bestanden.

**Gate 4 – Limited Production:** CRM/Helpdesk/Projekt zuerst; Rechnungsversand, Zahlungen und Vertragsverlängerungen erst nach Steuerberater- und Owner-Freigabe.

## Offene Human Gates

1. EDV Hausleitner benennt Prozess-, Daten- und Security-Owner.
2. Steuerberater bestätigt Rechnungs- und österreichische Steueranforderungen.
3. Entscheidung zu Hostingstandort, Backup-Aufbewahrung, SLA und Support.
4. Freigabe der Ticket-SLAs, Vertragslogik, E-Mail-Vorlagen und Kundeneinwilligungen.
5. Auswahl der Asset-/Helpdesk-Quelle und Migrationsumfang.
6. Entscheidung, ob ERPNext bzw. GLPI/Zammad als begrenzter Gegen-PoC evaluiert werden.

## Quellen und Annahmen

- Odoo-Dokumentation: <https://www.odoo.com/documentation/>
- Odoo Community Repository: <https://github.com/odoo/odoo>
- ERPNext: <https://docs.frappe.io/erpnext/>
- GLPI: <https://glpi-project.org/documentation/>
- Zammad: <https://admin-docs.zammad.org/>
- DSGVO: <https://eur-lex.europa.eu/eli/reg/2016/679/oj>

Edition-/Versionsdetails, Österreich-Lokalisierung und Community-Module sind vor dem Pilot reproduzierbar zu verifizieren. Dieser Bericht ist eine technische Entscheidungsvorlage und keine Steuer- oder Rechtsberatung.
