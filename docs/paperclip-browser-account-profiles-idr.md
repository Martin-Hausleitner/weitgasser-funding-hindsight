# IDR / Tribunal: Paperclip Browser-Use Account & Profile Tracking

**Status:** Proposed architecture (not yet implemented)  
**Date:** 2026-07-19  
**Owner:** Paperclip platform team  
**Scope:** Browser-use agents, account/profile attribution, proxy/session observability, and secret-manager references.

## 1. Decision summary

Paperclip should track browser work through an explicit **Browser Run** record. Every run is bound to an agent, task, browser profile, account reference, proxy reference, and a short-lived session identifier. The system must show which account/profile was used and the health and provenance of the proxy, while never storing passwords, cookies, refresh tokens, API keys, or raw browser storage in Paperclip.

Credentials and session material remain in an approved password manager or secret vault. Paperclip stores only opaque secret references, lease metadata, and audit events. Agents receive a narrowly scoped, time-limited lease through a broker; the skill must not print, persist, or transmit secret values.

This design is preferred over browser-history scraping or a shared credential table because it gives deterministic attribution, least privilege, revocation, and an auditable boundary between orchestration and secrets.

## 2. Problem and goals

### Problem

Multiple Paperclip agents may use browser automation concurrently. Without explicit attribution, operators cannot answer: which task used which account, which browser profile and proxy were active, whether a session was reused, or whether a credential was exposed. Shared profiles also create cross-account leakage and unreliable audit trails.

### Goals

- Detect and register browser-use runs, including start/stop/failure state.
- Attribute each run to an agent, Paperclip task, account alias, browser profile, and proxy alias.
- Display safe metadata and current health without exposing secret values.
- Correlate browser events, proxy checks, token leases, and task timeline entries.
- Support immediate revocation, rotation, quarantine, and incident review.
- Enforce tenant/project separation and human approval for sensitive actions.

### Non-goals

- Reverse-engineering private website APIs or bypassing access controls.
- Creating accounts on third-party sites without explicit owner authorization.
- Storing raw cookies, passwords, MFA seeds, refresh tokens, or full browser profiles in Paperclip.
- Circumventing a website's terms, rate limits, bot controls, or regional restrictions.

## 3. Assumptions and evidence

| Label | Assumption / evidence |
|---|---|
| A1 | Paperclip remains the control plane for tasks, approvals, timeline, and RBAC. |
| A2 | Browser automation runs in isolated workers (container/VM/profile directory), not in the Paperclip API process. |
| A3 | A password manager or secret vault is available with versioned secret references and audit logging. |
| A4 | The browser runtime can emit lifecycle events or can be wrapped by a local sidecar. |
| A5 | Account identity is an operator-managed alias; it is not inferred from page content alone. |
| E1 | No implementation or live secret inventory was inspected for this document; all schema names below are proposed. |

## 4. Proposed data model

Use opaque IDs and aliases. IDs are UUID/ULID; timestamps are UTC; all records carry `tenant_id` and `created_at`.

### BrowserAccount (safe inventory)

```text
account_id, tenant_id, alias, provider, environment, status,
secret_ref, credential_version, owner_team, allowed_domains[],
last_verified_at, last_rotated_at, risk_level, created_at
```

`secret_ref` is a vault URI/version, never a secret value. `provider` may be `internal`, `google`, `github`, etc.; `environment` is `prod`, `staging`, or `test`.

### BrowserProfile

```text
profile_id, tenant_id, alias, runtime, storage_locator,
account_id, isolation_boundary, fingerprint_policy, status,
last_used_at, created_at
```

`storage_locator` points to an encrypted worker-local volume or ephemeral profile template. It must not be a public path or exported archive. A profile may bind to exactly one account at a time.

### ProxyEndpoint

```text
proxy_id, tenant_id, alias, provider, endpoint_ref,
egress_region, protocol, status, health_score, last_checked_at,
failure_count, allowed_domains[], created_at
```

`endpoint_ref` is a vault or proxy-service reference. Never store a proxy password or raw authenticated URL in logs. Health tests are allow-listed, rate-limited, and consented.

### BrowserRun

```text
run_id, tenant_id, paperclip_task_id, agent_id, skill_version,
account_id, profile_id, proxy_id, worker_id, session_id,
requested_scopes[], started_at, ended_at, state, reason_code,
approval_id, evidence_uri, correlation_id
```

`session_id` is an opaque handle. `evidence_uri` points to redacted screenshots/logs in controlled storage; it is not a cookie jar. State values: `requested`, `approved`, `leased`, `running`, `paused`, `completed`, `failed`, `revoked`, `quarantined`.

### SecretLease (broker-side metadata)

```text
lease_id, secret_ref, run_id, subject_agent_id, scopes[],
issued_at, expires_at, revoked_at, vault_audit_id, status
```

The broker returns a one-time handle or injects secrets directly into the worker process. Paperclip stores lease metadata only.

## 5. Agent skill and hook contract

Create a narrowly scoped skill, e.g. `paperclip-browser-account-tracker`:

1. `preflight`: require task ID, account alias, profile ID, allowed domains, proxy alias, and approval policy.
2. `acquire`: ask the broker for a lease; fail closed if scope, tenant, or approval is missing.
3. `start`: emit `browser.run.started` with metadata only.
4. `observe`: emit navigation/domain, proxy-health, checkpoint, and policy events. Redact URL query secrets, form values, cookies, and page text by default.
5. `checkpoint`: attach screenshots or traces only after local redaction and retention classification.
6. `release`: invalidate lease, close browser context, wipe ephemeral profile, and emit `browser.run.completed`.
7. `incident`: immediately revoke leases and mark run/profile `quarantined` on policy violation or suspected leakage.

Hooks should be idempotent and signed with the worker identity. They must include `correlation_id` so Paperclip, the vault, proxy checker, and observability backend can join events.

## 6. Session and profile lifecycle

1. **Provision:** operator registers account alias and vault reference; no secret is copied to repository or Paperclip.
2. **Approve:** policy engine checks task, domain, risk, and human gate where required.
3. **Lease:** broker issues a short TTL lease, ideally one run and one worker only.
4. **Run:** isolated profile and proxy are bound; events stream to Paperclip timeline.
5. **Close:** browser context closes, lease is revoked, temporary files are wiped, and evidence is retained according to policy.
6. **Rotate:** vault version changes invalidate prior leases; affected profiles are re-provisioned.
7. **Quarantine:** any mismatch (account/profile, unexpected domain, proxy drift, or secret in output) blocks new runs until reviewed.

Never reuse a persistent profile across accounts. Prefer ephemeral profiles cloned from a sanitized template. If a provider requires persistent state, encrypt it at rest and bind it to one account and one worker pool.

## 7. Proxy and session observability

The dashboard may show:

- account alias/provider/status and last verification;
- browser profile alias, runtime, isolation status, and last use;
- proxy alias, region, protocol, health score, latency, failure trend, and last check;
- active run state, lease expiry, worker, domain allow-list, and approval;
- redacted evidence and event timeline.

It must not show passwords, cookies, authorization headers, MFA seeds, raw proxy credentials, full local-storage dumps, or unredacted request bodies. Proxy tests must use approved endpoints and low frequency; they must not be used to evade provider controls.

## 8. Security, RBAC, and audit

Suggested roles:

- **Viewer:** read redacted status and metrics.
- **Operator:** start approved test runs and revoke own runs.
- **Approver:** approve sensitive domains, production accounts, or persistent profiles.
- **Security admin:** rotate/quarantine/review incidents; cannot read secret values by default.
- **Vault admin:** manage secret versions and vault policy; separate from Paperclip operator.

Enforce tenant/project scoping, default-deny domain policy, signed worker identity, mTLS/service tokens, short leases, replay protection, and append-only audit logs. Audit events include actor, task, account/profile/proxy IDs, decision, policy version, timestamp, and vault audit ID. Store no secret payloads in logs, traces, screenshots, Git, Notion, or chat.

## 9. Privacy, DSGVO, and terms-of-service risks

- Account aliases and activity can be personal data; define purpose, retention, access, and deletion procedures.
- Browser screenshots, page text, and support tickets may contain personal or financial data; redact/minimize before storage.
- Set a short default retention (for example 30 days for operational events, shorter for screenshots), subject to legal review.
- Obtain consent and a lawful basis for processing third-party data; document processor/subprocessor locations.
- Respect provider terms, robots/rate limits, authentication policies, and anti-automation restrictions. Use official APIs where available.
- Do not automate account creation, CAPTCHA solving, MFA interception, or circumvention of bans.

## 10. Tribunal: alternatives

| Option | Strengths | Weaknesses | Verdict |
|---|---|---|---|
| A. Paperclip + custom broker/skill (recommended) | Exact attribution, least privilege, fits existing timeline/RBAC, vault-neutral | Requires event contract and sidecar work | **Select for pilot** |
| B. Browser-use framework telemetry only | Fast to adopt, rich browser events | Weak account/secret governance; profile leakage risk | Use only as event source, not system of record |
| C. Browser fleet platform (Browserless/Browserbase-like) | Managed isolation, recordings, scaling | Vendor lock-in, cost, data residency and secret boundary concerns | Evaluate after pilot |
| D. Vault-centric workflow (HCP Vault/1Password/Bitwarden + scripts) | Strong secret lifecycle and rotation | No native Paperclip task correlation or browser timeline | Use as secret backend |
| E. Shared browser profile table in Paperclip | Simple initial UI | Violates separation, encourages secret copying, poor auditability | **Reject** |
| F. Browser-history/API scraping to infer accounts | No instrumentation effort | Unreliable, privacy/ToS risk, cannot prove identity | **Reject** |

The tribunal selects Option A with Option D as a required dependency. Option C may be a later worker implementation behind the same broker contract.

## 11. IDR decisions

### ADR-01: Explicit run attribution

**Decision:** every browser run must reference one task, one agent, one account alias, one profile, and at most one active proxy binding.  
**Reason:** prevents ambiguous ownership and enables incident reconstruction.  
**Trade-off:** callers must provide metadata before starting.

### ADR-02: Vault-only credentials

**Decision:** Paperclip stores opaque `secret_ref` and lease metadata only.  
**Reason:** reduces blast radius and satisfies least-privilege requirements.  
**Trade-off:** requires broker integration and vault availability.

### ADR-03: Ephemeral profile default

**Decision:** use a fresh worker-local profile per run unless an approved persistent profile is required.  
**Reason:** avoids cookie/account cross-contamination.  
**Trade-off:** more login/setup time and provider verification prompts.

### ADR-04: Fail-closed policy hooks

**Decision:** missing approval, unknown domain, expired lease, profile mismatch, or proxy drift blocks execution.  
**Reason:** safe failure is preferable to an untraceable browser action.  
**Trade-off:** more human gates for exceptional tasks.

## 12. QA gates and acceptance criteria

### Automated gates

- Schema validation rejects records containing secret-shaped fields (`password`, `cookie`, `authorization`, token patterns).
- Unit tests cover tenant/RBAC checks, account-profile one-to-one binding, lease expiry/revocation, domain allow-list, and event idempotency.
- Integration test starts a disposable browser worker with a mock vault and mock proxy; asserts Paperclip receives correlated events.
- Rotation test proves old lease/profile cannot start after secret version changes.
- Redaction test checks screenshots, URLs, logs, and traces for known canaries.
- Failure-injection test covers worker crash, proxy outage, duplicate events, clock skew, and broker timeout.

### Manual QA gate

1. Create two test aliases and two isolated profiles.
2. Run two agents concurrently against an allowed test domain.
3. Confirm the timeline and dashboard show the correct account/profile/proxy for each run.
4. Attempt cross-account profile reuse and an unapproved domain; both must block.
5. Revoke a lease during execution; the worker must stop and the run become `revoked`.
6. Inspect logs/evidence and confirm no credentials, cookies, or raw authorization values appear.
7. Rotate the test secret and confirm a new lease is required.

**Release gate:** all automated gates pass, manual evidence is attached, and security/privacy owner signs off. Until then this design remains `PROPOSED`.

## 13. Implementation sequence

1. Freeze the event/schema contract and policy vocabulary.
2. Implement a mock vault broker and local browser sidecar; no production secrets.
3. Add Paperclip timeline/dashboard views for redacted metadata.
4. Add RBAC, approvals, revocation, and audit persistence.
5. Integrate one approved browser runtime and one test proxy provider.
6. Execute QA gates, security review, and data-protection review.
7. Pilot with non-production accounts; only then consider production scopes or a managed browser fleet.

## 14. Open questions / human gates

- Which vault is approved (1Password, Bitwarden, Vault, cloud secret manager) and who owns it?
- Which browser runtime and worker isolation are supported on VCVM/Mac?
- Which domains and account types are explicitly authorized?
- What retention and data-residency policy applies to screenshots and browser traces?
- Is a managed browser provider acceptable, or must all sessions remain self-hosted?
- Who is the security/privacy approver for production credentials?

## 15. Conclusion

Paperclip should show **metadata and accountability**, not become a credential store. The smallest safe path is an explicit Browser Run contract, a vault broker, isolated profiles, allow-listed proxies/domains, and fail-closed hooks. This produces the requested account/profile/proxy/session visibility while preserving security, auditability, and compliance boundaries.
