# YoursTruly V2 — Backend Team Onboarding & Scope

> **Last updated:** March 2026  
> **Owner:** Chuck (product + feature dev)  
> **Team role:** Infrastructure, security, reliability, and ops

---

## Overview

YoursTruly is a digital legacy platform. Users document their lives, build a digital version of themselves using AI, and schedule future messages and gifts for loved ones. The data users store here — memories, life stories, voice recordings — is **deeply personal and largely irreplaceable**. That shapes every decision this team makes.

Chuck owns product and feature development. This team owns the platform underneath it: infrastructure stability, security posture, observability, and scalability. The goal is to get the platform to a state where Chuck can ship features confidently without worrying about the ops layer.

---

## Architecture Snapshot

```
Users
  │
  ▼
CloudFront (CDN / edge)
  │
  ▼
AWS ECS (Docker containers)
  └── Next.js 14 (App Router)
        ├── API Routes (current backend layer)
        ├── Supabase JS client (auth + DB)
        └── Third-party integrations:
              ├── Stripe (payments)
              ├── Resend (email)
              └── Telnyx (SMS)

Database
  └── Supabase (PostgreSQL) → planned migration to AWS RDS

File Storage
  └── S3 (media, photos, videos)

AI / ML (currently on Zima home server — needs migration)
  ├── Ollama RAG pipeline (life story generation)
  └── PersonaPlex voice server (WebSocket, voice interviews)

Planned / In Scope
  └── Background job queue (BullMQ or Inngest)
  └── AWS RDS (PostgreSQL migration from Supabase)
  └── GPU cloud host (RunPod / Modal / Replicate)
```

**Known gaps (your mandate):**
- No background job queue — async work (voice interviews, AI generation, email scheduling) runs inline or ad hoc
- Secrets are .env files on ECS tasks — not managed
- Minimal observability beyond CloudWatch basics
- No structured error tracking
- AI inference running on a home server (Zima, 192.168.4.24) — single point of failure, not scalable
- No formal backup or DR plan

---

## Scope of Work

### P0 — Critical (Do These First)

These are risks that could cause data loss, downtime, or a security incident today.

---

#### P0.1 — Migrate AI Infra off Zima

**Problem:** Ollama RAG pipeline and PersonaPlex voice server run on a home server. If Zima goes down, core AI features break. No redundancy, no scaling.

**Work:**
- Evaluate RunPod, Modal, or Replicate for Ollama model hosting
- Deploy Ollama RAG pipeline to GPU cloud (containerized)
- Migrate PersonaPlex voice server (WebSocket `ws://100.x.x.x:8000/api/chat`) to a managed cloud host
- Update all service endpoints and connection strings
- Validate latency and quality match current behavior

**Done when:** Chuck can power off Zima and core AI features still work.

---

#### P0.2 — Secrets Management

**Problem:** Secrets live in `.env` files on ECS task definitions. Any ECS config exposure = credential leak.

**Work:**
- Audit all secrets in ECS task environment variables
- Migrate to AWS Secrets Manager (or Parameter Store for non-sensitive config)
- Update ECS task definitions to pull secrets at runtime
- Rotate any credentials that were previously in plaintext .env files

**Done when:** No plaintext secrets in ECS configs. Rotation is possible without redeployment.

---

#### P0.3 — Backup & Disaster Recovery

**Problem:** Users store irreplaceable personal data — life stories, voice recordings, memories. There is no formal backup or recovery plan.

**Work:**
- Automated daily backups of Supabase DB (point-in-time recovery if on RDS)
- S3 versioning and cross-region replication for media assets
- Documented recovery procedures (RTO/RPO targets defined)
- Test restore process — at minimum quarterly

**Done when:** Chuck could recover all user data after a catastrophic failure within a defined window.

---

#### P0.4 — Authentication & RLS Audit

**Problem:** Platform uses Supabase Auth + Row Level Security policies. Misconfigured RLS = users accessing each other's life stories.

**Work:**
- Full audit of all RLS policies against data model
- Test for policy bypass vectors (anon key misuse, edge cases)
- Review Supabase Auth configuration (JWT expiry, refresh token handling, MFA availability)
- Document any findings and remediate before new features ship

**Done when:** Written attestation that no user can read/write another user's data via any known path.

---

#### P0.5 — Error Tracking & Basic Observability

**Problem:** No structured error visibility. Chuck finds out about bugs when users complain.

**Work:**
- Deploy Sentry (or equivalent) in Next.js app and API routes
- Configure alerts for unhandled exceptions and 5xx spikes
- Set up uptime monitoring (Better Uptime, Checkly, or similar) on `app.yourstruly.love`
- Add structured logging (JSON logs from ECS → CloudWatch Logs Insights)

**Done when:** Chuck gets paged before users do.

---

### P1 — Important (Next 60 Days)

Infrastructure improvements that reduce risk and unblock scaling.

---

#### P1.1 — Background Job Queue

**Problem:** Voice interviews, AI generation tasks, email scheduling, and other async work run inline in API routes. This causes request timeouts, no retry logic, and no visibility into job state.

**Work:**
- Evaluate BullMQ (Redis-backed) vs Inngest (serverless, managed)
- Recommendation: **Inngest** for low ops overhead given team size; BullMQ if Redis already in stack
- Migrate async workloads: voice interview processing, AI story generation, Resend/Telnyx scheduling
- Add job status tracking (users should see "generating your story…" not timeouts)

**Done when:** No async work runs inline in HTTP request handlers.

---

#### P1.2 — Database Architecture Review & RDS Migration Plan

**Work:**
- Review current Supabase schema for normalization issues, missing indexes, N+1 patterns
- Produce a written Supabase → AWS RDS migration plan (timeline, risk, cutover strategy)
- Set up PgBouncer or Supabase pooler to manage connection limits under load
- Identify and add missing indexes based on query patterns

**Note:** Migration itself may be a later milestone; the plan and schema review are P1.

---

#### P1.3 — IAM Role Review

**Work:**
- Audit all IAM roles attached to ECS tasks, Lambda functions (if any), and developer accounts
- Apply principle of least privilege — ECS tasks should not have wildcard S3/RDS permissions
- Create separate roles per service
- Enable CloudTrail if not already active

---

#### P1.4 — Rate Limiting & Abuse Prevention

**Problem:** Next.js API routes are currently open to abuse — no rate limiting on AI generation endpoints (which have real cost per call).

**Work:**
- Implement rate limiting on all API routes (middleware layer — Upstash Redis or similar)
- Stricter limits on expensive endpoints (AI generation, voice interview start)
- Add AI API cost monitoring: set usage alerts on OpenAI and Gemini spend
- Implement per-user monthly caps on AI generation if costs warrant it

---

#### P1.5 — CI/CD Hardening

**Work:**
- Review current GitHub → ECS deploy pipeline
- Add: pre-deploy tests gate, environment-specific configs (staging vs prod), rollback procedure
- Set up a staging environment if one doesn't exist
- Document the deploy process in a runbook

---

#### P1.6 — Data Privacy Compliance (GDPR/CCPA)

**Problem:** Platform stores sensitive personal life stories, voice recordings, location history, personal memories. This is high-sensitivity PII.

**Work:**
- Map all user data stored and its retention period
- Implement data deletion pipeline (user account deletion should purge all associated data)
- Review data export capability (GDPR right to portability)
- Encryption at rest for sensitive fields (consider column-level encryption for life story content)
- Document data flows for any third-party processors (Stripe, Resend, Telnyx, OpenAI)

---

### P2 — Nice to Have (When Capacity Allows)

---

#### P2.1 — API Architecture Review

The current Next.js API routes work but blur the line between frontend and backend. As the platform grows, consider separating AI/processing workloads into a dedicated service (Node.js microservice or separate ECS service). Not urgent, but worth a written recommendation.

---

#### P2.2 — WebSocket Scaling

PersonaPlex voice server is a single WebSocket server. Once migrated to cloud (P0.1), plan for horizontal scaling — sticky sessions, or a WebSocket-compatible load balancer (ALB with WebSocket support).

---

#### P2.3 — CDN Strategy for Media

Life photos and videos served via S3 + CloudFront. Review:
- Cache policies for user media
- Large video upload handling (S3 multipart upload, pre-signed URLs)
- Bandwidth cost optimization

---

#### P2.4 — ECS Auto-Scaling

Configure ECS service auto-scaling based on CPU/memory metrics. Define min/max task counts. Ensure app is stateless enough to scale horizontally (session state, WebSocket affinity).

---

#### P2.5 — OWASP Top 10 Review

Formal pen test or structured OWASP review of the API surface. Prioritize: injection, broken access control, security misconfiguration, sensitive data exposure. Chuck mentioned pen testing as a goal — this is the framework for it.

---

#### P2.6 — On-Call Runbook

Document: what breaks, how to detect it, how to fix it. Cover at minimum:
- ECS task failure / container crash
- DB connection exhaustion
- AI service unavailable (Ollama / PersonaPlex)
- Stripe webhook failures
- S3 access issues

---

## What We Own vs What Chuck Owns

| Area | Team | Chuck |
|------|------|-------|
| Feature development | — | ✅ |
| Product decisions | — | ✅ |
| UI / frontend | — | ✅ |
| Third-party integrations (Stripe, Resend, Telnyx) | advisory | ✅ |
| Infrastructure (ECS, RDS, S3, CloudFront) | ✅ | — |
| Security posture | ✅ | — |
| Observability & alerting | ✅ | — |
| AI infra (Ollama, PersonaPlex) | ✅ | — |
| Database schema (new features) | advisory | ✅ |
| Database performance & reliability | ✅ | — |
| CI/CD pipeline | ✅ | — |
| Secrets management | ✅ | — |
| Backup & DR | ✅ | — |
| On-call runbooks | ✅ | — |
| Cost monitoring | ✅ | reports to Chuck |

**Rule of thumb:** Chuck ships the product. The team keeps the lights on and the floors clean.

---

## Getting Started — Access Checklist

Before the team can do anything, Chuck needs to provision:

### AWS
- [ ] IAM user or SSO access for each team member (read-only to start, scoped up as needed)
- [ ] Access to ECS console (view task definitions, service logs)
- [ ] CloudWatch Logs read access
- [ ] S3 bucket names and access policy
- [ ] CloudFront distribution ID

### Supabase
- [ ] Project URL and anon/service key (read-only service role for audit)
- [ ] Access to Supabase dashboard (or SQL editor access)
- [ ] Current RLS policies exported

### GitHub
- [ ] Repo access (at minimum read; write for CI/CD work)
- [ ] GitHub Actions workflow files for review

### Zima (AI infra — for migration context)
- [ ] Current Ollama model list and RAG pipeline config
- [ ] PersonaPlex server config and WebSocket protocol docs
- [ ] Tailscale IP for Zima (`192.168.4.24` local / `100.x.x.x` Tailscale)

### Third-Party Services
- [ ] Stripe dashboard (read-only, for webhook config review)
- [ ] Resend account (email volume and template review)
- [ ] Telnyx account (SMS config review)
- [ ] OpenAI + Gemini — usage dashboard access (for cost monitoring)

### Comms
- [ ] Primary point of contact: Chuck
- [ ] Preferred channel for async updates: [TBD]
- [ ] Escalation path for production incidents: [TBD]

---

## Notes

- **User data sensitivity:** This platform stores memories, life stories, and voice recordings. Treat all user data as maximally sensitive. Err on the side of more encryption, stricter access, and longer retention of backups.
- **Zima is a dependency:** Until AI infra is migrated (P0.1), Zima being offline affects production. Treat migration as the first milestone.
- **Chuck is reachable:** He's active and responsive. Don't make infrastructure decisions in a vacuum — flag architectural choices before implementing.
- **Staging first:** Any change to prod should pass through staging. If staging doesn't exist, creating it is an early milestone.
