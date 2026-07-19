# Portfolio- und Parallelitäts-IDR/Tribunal

**Status:** Entwurf für kontrollierten Betrieb (2026-07-19)  
**Scope:** Meta-Steuerung der bekannten Projektlinien. Dieser Bericht ist kein Nachweis, dass einzelne Agents oder Deployments aktuell laufen.

## 1. Ziel und Leitplanken

Die Organisation soll mehrere unabhängige Linien parallel bearbeiten können, ohne stille Stalls, doppelte Arbeit, unprüfbare Fortschrittsbehauptungen oder unkontrollierten Ressourcenverbrauch. Paperclip bleibt die Control Plane für Issues, Rollen, Freigaben und Timeline. Ein Worker darf nur über ein registriertes Projekt, einen begrenzten Auftrag und ein Evidence-Artefakt arbeiten.

Nicht erlaubt: Secrets in Git/Logs, automatisierte Fremd-Account-Erstellung, Reverse Engineering fremder geschützter APIs, ungeprüfte öffentliche Exposition, oder das Ausgeben eines Links/Status ohne aktuelle Probe.

## 2. Projektregister

| ID | Linie | Primäres Ergebnis | Evidence-Gate | Human Gate |
|---|---|---|---|---|
| `FUNDING-HINDSIGHT` | Weitgasser-Förderungen/Hindsight | Förderindex, Richtlinien-PDFs, extrahierte Anforderungen, Hindsight-Notizen | Quellen-URL, PDF-Hash, Extraktionsreport, Zitierprobe | Einreichbarkeit, Fristen und Unternehmensdaten bestätigen |
| `NIKLAS-CALRS` | Niklas + cal.rs | mobile Buchungs-UI mit lokaler/öffentlicher Demo | Build, HTTP-Probe, Screenshot, Booking-Smoke-Test | Kalenderzugänge, reale Buchung und Datenschutz |
| `EDV-ODOO` | EDV Hausleitner Odoo OSS | IDR/Tribunal und Pilotarchitektur | reproduzierbarer ADR, Feature-/Lizenzmatrix, Pilotplan | Prozess- und Lizenzentscheidung |
| `PAPERCLIP-ACCOUNTS` | Browser-/Account-Tracking | Skill-Spezifikation für Profil-, Proxy- und Session-Metadaten | Schema, Redaction-Test, RBAC-/Audit-Test | Vault, Einwilligung und ToS |
| `MOBILE-QA-IOS` | autorisierte Mobile-QA/iOS | Geräte-/Build-Matrix, UI- und Netzwerkobservability | XCTest/Appium-Run, redigierte Logs, API-Schema | Eigentum/Autorisierung der Apps und Geräte |
| `WILLHABEN-RESEARCH` | Willhaben-Recherche | öffentliche Listings, Preis-/Risiko-Report | URL, Zeitstempel, deduplizierte Treffer, Stichprobenprüfung | Kaufentscheidung; kein Account- oder Protected-API-Automatisieren |
| `CLOUDFLARE-DEMO` | öffentliche Demo | erreichbare, zeitlich begrenzte Demo-URL | `curl`/Browser-HTTP-Status, Ablaufzeit, Expositionsprüfung | Freigabe für öffentliche Veröffentlichung |

Jede Zeile besitzt in Paperclip genau ein Owner-Issue, einen aktuellen Status (`queued`, `running`, `blocked`, `review`, `done`, `cancelled`) und einen Link zu Evidence. „Running“ ohne frischen Heartbeat ist ungültig.

## 3. Heartbeat- und Evidence-Vertrag

Ein Worker schreibt mindestens alle 10 Minuten ein Heartbeat-Event mit:

```json
{
  "project_id": "NIKLAS-CALRS",
  "run_id": "uuid",
  "state": "running",
  "timestamp": "ISO-8601 UTC",
  "step": "build|qa|blocked|review",
  "artifact": "relative/path/or/url",
  "last_command": "redacted summary",
  "resource": {"cpu_pct": 0, "ram_mb": 0, "tokens_in": 0, "tokens_out": 0}
}
```

Keine Passwörter, Cookies, API-Keys, vollständigen Authorization-Header oder personenbezogenen Payloads. Evidence ist unveränderlich zu versionieren: Commit-SHA, Dateipfad, Hash oder Testlauf-ID. Ein Textbericht allein ist kein Proof.

## 4. Watchdog-Regeln

Der Watchdog läuft event-driven (Heartbeat, CI, Webhook) und führt zusätzlich alle fünf Minuten eine read-only Statusprobe aus.

| Regel | Schwelle | Aktion |
|---|---:|---|
| Frische | 15 min ohne Heartbeat | `stale`; Worker nicht neu starten, zuerst letzten Run/Exit prüfen |
| Blockade | 2 aufeinanderfolgende gleiche Fehler oder 30 min ohne Step-Fortschritt | `blocked`, Diagnose-Issue und Human-Gate anlegen |
| Fehlende Evidence | Step abgeschlossen, aber kein Artefakt innerhalb 10 min | `review`; keine Done-Markierung |
| Ressourcen | RAM >85 % für 5 min oder Swap wächst | neue Worker drosseln, laufende Jobs geordnet auslaufen lassen |
| Kosten | Token-/API-Budget >80 % | nur Priority-/Verifier-Läufe; >100 %: neue Runs sperren |
| Exposition | Dienst lauscht unerwartet auf `0.0.0.0` oder URL ohne Ablauf | sofort `blocked`, Netzfreigabe/Human Gate |
| Parallelitätslimit | mehr als 1 aktiver Owner je Projekt oder globale Obergrenze | zusätzliche Runs `queued`, nicht duplizieren |

Recovery ist gestuft: (1) Probe und Logs lesen, (2) Checkpoint/Retry desselben Runs, (3) Ersatz-Worker mit identischem Input, (4) Human Gate. Kein blindes Endlos-Restart.

## 5. Parallelitätsregeln

- Globale Obergrenze wird aus RAM/CPU berechnet; Standard: `max(1, floor((RAM_free - 2 GB) / 1.5 GB))`, niemals bis zum Swap ausreizen.
- Pro Projekt genau ein mutierender Worker; Verifier und Researcher dürfen parallel lesen.
- Gemeinsamer Zustand ausschließlich über Paperclip-Issue, Git-Branch/Artifact und Status-Events; keine stillen Dateien zwischen Workern.
- Jede neue Projektanforderung durchläuft `intake -> risk/license -> plan -> execute -> verify -> human approval -> publish`.
- Verifier arbeiten auf einem unveränderlichen Commit/Artifact. Erst danach darf ein Synthesizer zusammenführen.

## 6. Tribunal: Orchestrierungsvarianten

| Variante | Stärken | Risiken | Urteil |
|---|---|---|---|
| Zentrale Paperclip-Orchestrierung | Governance, Rollen, Timeline, Approvals, ein Auditpunkt | benötigt saubere Worker-Adapter | **Basis/empfohlen** |
| Paperclip + LangGraph | explizite Zustandsgraphen, Tribunal-/Retry-Pfade, Checkpoints | zusätzlicher State und Betrieb | **für komplexe IDRs** |
| Cron-only | einfach, transparent | verpasst Events, stale-Erkennung spät, unnötige Polls | **nur Fallback** |
| Event-driven (Webhook/CI/Watchdog) | schnelle Reaktion, weniger Leerlauf | Event-Duplikate und Idempotenz nötig | **ergänzend empfohlen** |
| freier Agent-Swarm | hohe Parallelität | keine Ownership/Evidence, Kosten- und Sicherheitsrisiko | **ablehnen** |

**Tribunal-Entscheidung:** Paperclip bleibt Control Plane; LangGraph wird nur für mehrstufige IDR-/Tribunal-Workflows eingesetzt; Webhooks/CI liefern Ereignisse; ein schlanker Watchdog erzwingt Frische, Budgets und Evidence. Cron dient ausschließlich als Sicherheitsnetz.

## 7. QA-Gate pro Projekt

Ein Projekt gilt erst als `done`, wenn alle folgenden Nachweise vorhanden sind:

1. reproduzierbarer Build oder Research-Lauf;
2. mindestens eine unabhängige Funktionsprobe (HTTP, Test, CLI oder Quellen-Stichprobe);
3. Evidence mit Commit/Hash/Zeitstempel;
4. Sicherheits-/Lizenzprüfung und redigierte Logs;
5. Verifier-Bericht mit Gegenargumenten und offenen Risiken;
6. bei externer Veröffentlichung: Human-Freigabe und Ablauf-/Rollback-Plan.

Fehlt ein Punkt, bleibt der Zustand `review` oder `blocked`. Öffentliche URLs sind nur mit aktueller Probe zu melden; temporäre Tunnels müssen Ablauf und Reichweite ausweisen.

## 8. Hindsight- und Review-Loop

Nach jedem größeren Run liest ein dedizierter Reflection-Agent ausschließlich Transcript-Metadaten und Evidence (nicht Secrets), klassifiziert Fehler in `process`, `skill`, `tooling`, `data` und schreibt maximal drei priorisierte Verbesserungen. Ein Review-Agent prüft die Änderung gegen dieses IDR. Änderungen an Skills/CLAUDE.md werden separat committed und dürfen keine unbestätigten Tatsachen als Wissen aufnehmen.

Priorisierung: (P0) Sicherheit, falsche Done-/Running-Claims, Datenverlust; (P1) stale/duplicate orchestration, fehlende Evidence; (P2) Kosten, UX und Komfort.

## 9. Offene Human Gates

- Zugang zu Notion, Signal, Beeper, WhatsApp, GitHub-Remotes und Kalendern muss ausdrücklich autorisiert und als Connector vorhanden sein.
- Reale Willhaben-Käufe, Fremd-App-Tests und private API-Beobachtung benötigen Eigentümer-/ToS-Freigabe.
- Odoo/Cal.rs-Produktivbetrieb benötigt Datenmigration, Backup, Rollenmodell und Datenschutzfreigabe.
- Cloudflare/Tailscale/Funnel-Exposition benötigt Reichweitenfreigabe; ein Tailnet-Link ist nicht automatisch öffentliches Internet.

## 10. Minimaler Implementierungsplan

1. Projektregister und Statusschema in Paperclip anlegen.
2. Heartbeat-/Evidence-Adapter und Watchdog read-only ausrollen.
3. Budget-/Ressourcen-Gates aktivieren, zunächst nur warnend.
4. Einen Pilotlauf mit `NIKLAS-CALRS` und einen Researchlauf mit `FUNDING-HINDSIGHT` end-to-end verifizieren.
5. Erst nach zwei grünen Läufen die übrigen Linien anschließen.

**Stop-Kriterium:** Kein Projekt wird als parallel laufend oder fertig berichtet, solange sein aktueller Heartbeat und ein QA-Evidence-Link nicht vorliegen.
