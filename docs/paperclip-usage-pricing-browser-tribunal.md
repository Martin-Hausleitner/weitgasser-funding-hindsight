# IDR / Tribunal: Paperclip Usage, Pricing und Browser-Worker

**Status:** Architekturentscheidung und sichere Pilot-Spezifikation  
**Datum:** 2026-07-20  
**Entscheidung:** Paperclip bleibt Control Plane. Ein schlankes Usage-/Pricing-Plugin sammelt belegte Nutzungsdaten, der Routing Manager wählt ein zulässiges Modell, und Browser-Worker liefern nachvollziehbare Evidence. Kontenhandel, Credential-Speicherung und Limitumgehung sind ausdrücklich außerhalb des Scopes.

## 1. Problem und Ziel

Die Timeline muss Agenten, Browser-Stationen und Worker gemeinsam sichtbar machen. Pro Ausführung sollen Input-, Output- und Cache-Tokens, Modell, Subscription, Zeit, Ergebnis, Fehler und belegte Kosten nachvollziehbar sein. Abo-Kosten, Gutschriften und genehmigte Erstattungen werden als Ledger erfasst; daraus entsteht ein **effektiver Preis** ohne erfundene API-Preise.

Der Browser-Teil benötigt isolierte Sessions, eine ressourcenschonende Multi-Window-Ansicht und optionales Live-Streaming für eigene bzw. ausdrücklich freigegebene Systeme. Codex Computer Use und andere Harnesses liefern nur über einen einheitlichen Worker-Vertrag. Hindsight erhält redigierte, signierte Zusammenfassungen statt Roh-Cookies, Passwörter oder vollständiger Chatverläufe.

## 2. Tribunal-Frage

| Option | Stärken | Risiken / Urteil |
|---|---|---|
| Paperclip + eigenes kleines Plugin | Timeline, Tickets, RBAC und bestehende Governance bleiben zentral | Entwicklungsaufwand, Schema-Disziplin nötig | **Sieger für Control Plane** |
| OpenTelemetry + Grafana | Standardisierte Traces/Metriken, sehr gute Dashboards und Alerts | Kein Subscription-/Refund-Ledger, keine Agenten-Governance | **Pflicht-Baustein für Telemetrie** |
| Langfuse | LLM-Traces, Kosten- und Prompt-Analysen | Zusätzliche Plattform und Datenkopie | **Optional als Experiment-Backend** |
| LiteLLM | Provider-Adapter und Routing-Metriken | Nur einsetzen, wenn Provider-/Budget-Routing wirklich benötigt wird; kein Ersatz für Paperclip | **Optional, hinter Adapter** |
| noVNC | Reife VNC-Webansicht, leicht zu pilotieren | Pixel-Streaming teuer, Sicherheits- und Skalierungsgrenzen | **Fallback für Debug-Sessions** |
| WebRTC (z. B. eigener Gateway) | Niedrige Latenz und bessere Bandbreite | Signaling, TURN, Authentisierung und Betrieb komplex | **Späterer Streaming-Pfad** |

**Tribunal-Entscheid:** OTel als Messstandard, Paperclip-Plugin als Ledger-/Timeline-Besitzer, Grafana als Dashboard. Langfuse/LiteLLM/noVNC/WebRTC nur über klar begrenzte Adapter und erst nach Pilot-Messung.

## 3. Zielarchitektur

```text
Agent/Browser Worker -> Usage SDK -> OTel Collector -> Paperclip Usage Plugin
          |                  |                 |             |
          |                  |                 +-> Grafana   +-> Timeline/Tickets
          |                  +-> redacted evidence -> Hindsight ingest
          +-> Browser Session Broker -> isolated profile/container -> stream gateway

Routing Manager liest Limits/Budgets und gibt ein signiertes ModelDecision-Event zurück.
```

### 3.1 Plugin-Schnittstellen

- `POST /usage/events`: idempotentes Event mit `run_id`, `agent_id`, `worker_id`, `provider`, `model`, `input_tokens`, `output_tokens`, `cached_tokens`, `latency_ms`, `status`, `trace_id`, `started_at`, `ended_at`.
- `POST /subscriptions`: genehmigte Subscription mit Währung, Zeitraum, Listenpreis, tatsächlich bezahltem Preis, Quelle/Beleg-Hash und Verantwortlichem.
- `POST /adjustments`: signierte Gutschrift/Erstattung mit Referenz und Approval; keine stillen Korrekturen.
- `GET /accounts/:id/weekly-usage`: aggregierte Nutzung und Limitstatus; niemals Secrets.
- `POST /routing/decisions`: dokumentiert Budget-, Qualitäts- und Limitentscheidung inklusive Fallback-Grund.
- `POST /browser/sessions`: kurzlebige Session-Lease, erlaubte Ziel-URL, Worker, TTL und Audit-Korrelation.
- `POST /evidence`: Screenshot-/Log-Referenz, Hash, Redaction-Status und Retention-Klasse.

### 3.2 Datenmodell (Minimalumfang)

- `usage_event`: append-only; Tokenwerte dürfen unbekannt sein, dann `null` plus `measurement_status`.
- `subscription_ledger`: `account_ref`, `period`, `currency`, `list_price`, `paid_price`, `refund_amount`, `effective_price`, `receipt_ref`, `approval_ref`.
- `model_decision`: `task_class`, `quality_floor`, `budget_remaining`, `weekly_remaining`, `selected_model`, `fallback_chain`, `reason`.
- `browser_session`: zufällige ID, Worker, profile_ref (Vault-Referenz), target_allowlist, created/expired, stream_mode, audit_ref.
- `timeline_span`: Parent/child-Beziehungen für Manager, Projektmanager, Agent und Browser-Station.

Effektiver Preis: `(paid_price - approved_refunds) / billable_units`; die Einheit (Token, Minute oder Run) muss je Subscription festgelegt werden. Keine Schätzung als Fakt ausgeben.

## 4. Routing und Limits

Der Routing Manager prüft vor jedem Run: Aufgabe, Mindestqualität, verbleibendes Wochenlimit, Budget, Latenzklasse und Provider-Verfügbarkeit. Er darf auf ein günstigeres Modell wechseln, wenn die Qualitätsuntergrenze erfüllt bleibt. Bei unbekannten Zählerständen wird `unknown` gemeldet und kein vermeintlicher Sparwert berechnet. Circuit-Breaker stoppen Runs bei widersprüchlichen Limits, fehlendem Approval oder wiederholten Fehlern.

## 5. Sichere Browser-Harness- und Multi-Window-Ansicht

- Jede Session erhält einen isolierten Browser-Worker/Container, Allowlist, TTL und maximale Parallelität.
- Profile enthalten keine exportierbaren Passwörter, Cookies oder Session-Tokens. Zugang erfolgt ausschließlich über einen zugelassenen Vault-Connector mit kurzlebiger Lease.
- Favicon/Account-Übersichten zeigen nur pseudonymisierte `account_ref`, Status, Modell und Limit; niemals Passwörter.
- Multi-Window rendert Metadaten und Thumbnails standardmäßig; Live-Stream wird nur explizit pro Session aktiviert. Adaptive FPS/Qualität, Backpressure und harte Bandbreitenlimits verhindern Hänger.
- noVNC dient als begrenzter Debug-Fallback; WebRTC wird erst nach Auth-, TURN- und Lasttests aktiviert.
- Codex Computer Use und andere Harnesses verwenden denselben `BrowserWorker`-Vertrag und schreiben jede Aktion als redigierte Evidence.

## 6. Hindsight und Datenschutz

Hindsight bekommt nur strukturierte Run-Summary, Entscheidungen, Fehlerursachen, Artefakt-Hashes und priorisierte Learnings. Vor Ingestion: Secret-/PII-Redaction, Tenant-Tag, Retention-Klasse, Hash und Herkunft. Rohtraces und Bildschirmdaten bleiben mit kurzer TTL im isolierten Store. Jede Ingestion ist löschbar und auditierbar; private Chatverläufe werden nicht automatisch gesammelt.

## 7. IDR-Watchdog

Der Watchdog prüft alle 60 Sekunden Heartbeats und Evidence-Fortschritt. Zustände: `RUNNING`, `IDLE_EXPECTED`, `STALE`, `BLOCKED`, `FAILED`. Nach zwei verpassten Heartbeats erstellt er ein Paperclip-Ticket; nach drei wird der Manager geweckt. Ein Wake-up darf nur Status prüfen, Logs anhängen und einen begrenzten Retry auslösen. Kein unkontrolliertes Hochskalieren und keine Umgehung von Wochenlimits. Watchdog selbst sendet OTel-Metriken und besitzt einen Circuit-Breaker.

## 8. QA-Gates

1. **Schema-Gate:** Events sind idempotent, signiert und ohne Secrets; Replay-Test besteht.
2. **Cost-Gate:** Rechnung, Gutschrift und effektiver Preis sind anhand eines Test-Ledgers reproduzierbar.
3. **Routing-Gate:** Budget-/Weekly-Limit-Fälle, unbekannte Werte und Fallbacks werden korrekt gestoppt bzw. begründet.
4. **Timeline-Gate:** Manager → Worker → Browser-Session ist im Paperclip-Timelinebaum sichtbar.
5. **Browser-Gate:** Allowlist, TTL, Vault-Lease, Redaction und Session-Ablauf werden E2E geprüft.
6. **Streaming-Gate:** 1/4/8 Fenster, Backpressure und Disconnect-Recovery ohne Browser-Hänger.
7. **Hindsight-Gate:** Nur redigierte Summary ingestiert; Lösch- und Retention-Test besteht.
8. **Watchdog-Gate:** simulierte Heartbeat-Ausfälle erzeugen genau ein Ticket und begrenzten Wake-up.
9. **Human Gate:** Produktion, externe Accounts, neue Datenquellen, Refunds und öffentliches Streaming benötigen ausdrückliche Freigabe.

## 9. Rollout

**Phase 0:** Read-only OTel/Timeline-Spans und Test-Ledger mit synthetischen Daten.  
**Phase 1:** Paperclip Usage Plugin, Grafana-Dashboard, Routing-Simulation, kein Live-Switching.  
**Phase 2:** Ein Browser-Worker mit Allowlist, Vault-Lease und noVNC-Debugstream; E2E-QA.  
**Phase 3:** Hindsight-Summary, Watchdog und begrenztes Modell-Fallback.  
**Phase 4:** Multi-Window/WebRTC-Pilot nach Last-, Datenschutz- und Human-Gates.

## 10. Ausdrückliche Grenzen und offene Punkte

- Keine Automatisierung von G2G-Käufen, Account-Handel, Refund-Missbrauch oder Preis-/Limitumgehung.
- Keine Passwort-, Cookie- oder Session-Speicherung in Git, Paperclip-Timeline, Hindsight oder Favicon.
- Provider- und Subscription-Datenquellen, Aufbewahrung, Währungen und verantwortliche Freigaben müssen vor Phase 1 festgelegt werden.
- Zu klären: existierende Paperclip-Plugin-API, OTel-Collector-Standort, Hindsight-Schnittstelle, gewünschte Browser-Allowlist und maximale parallele Fenster.

**Ergebnis:** Diese Architektur liefert zentrale, überprüfbare Kosten- und Agenten-Telemetrie sowie sichere Browser-Evidence. Sie vermeidet Credential-Leaks und Limitumgehung und lässt sich schrittweise mit vorhandener OSS-Software validieren.
