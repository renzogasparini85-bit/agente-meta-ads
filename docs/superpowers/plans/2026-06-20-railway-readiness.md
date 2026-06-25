# Railway Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the identified production blockers and leave the monorepo ready to configure as separate Railway backend and frontend services.

**Architecture:** Let SQLAlchemy create the complete schema in the new Railway PostgreSQL database. Run notification dispatch hourly with per-client filtering, store the advertising account on new action logs, and require exact Meta entity matches for impact reports.

**Tech Stack:** FastAPI, SQLAlchemy 2, APScheduler, Python unittest, React, Vite, ESLint, Railway Nixpacks.

---

### Task 1: Per-client notification hour

**Files:**
- Create: `backend/tests/test_notification_schedule.py`
- Modify: `backend/main.py`

- [ ] Write failing tests for a helper that returns true only when `client.notif_hora` equals the supplied local hour.
- [ ] Run `python3 -m unittest backend/tests/test_notification_schedule.py -v` and verify the helper is missing.
- [ ] Add a pure `should_notify_client(client, local_hour)` helper.
- [ ] Change APScheduler to execute hourly and calculate local time with `zoneinfo.ZoneInfo(os.getenv("NOTIF_TIMEZONE", "America/Argentina/Buenos_Aires"))`.
- [ ] Filter notification clients with the helper before scanning and sending.
- [ ] Rerun the focused tests and verify they pass.

### Task 2: Exact action impact attribution

**Files:**
- Create: `backend/tests/test_action_impact.py`
- Modify: `backend/database.py`
- Modify: `backend/routers/action_log_router.py`
- Modify: `frontend/src/pages/Timeline.jsx`

- [ ] Write failing tests for a metric helper that returns `None` when no ad, ad set, or campaign matches `meta_id`.
- [ ] Run `python3 -m unittest backend/tests/test_action_impact.py -v` and verify the helper is missing.
- [ ] Extract `metrics_for_meta_entity(ads, meta_id)` and remove the account-wide fallback.
- [ ] Add nullable `account_id` to `ActionLog` and accept it in `ActionLogCreate`.
- [ ] Resolve the stored account for impact measurement; retain the first-active-account fallback only for legacy rows.
- [ ] Return `available: false` when either time window lacks an exact entity match.
- [ ] Send the selected account identifier from the manual action form.
- [ ] Rerun backend tests and targeted ESLint.

### Task 3: Creative variation account fix

**Files:**
- Modify: `frontend/src/pages/Creativos.jsx`

- [ ] Add a focused static regression check that ESLint no longer reports `account is not defined`.
- [ ] Pass `account` into `ModalVariacionPaid` and read the brand profile from that prop.
- [ ] Remove unused imports or variables in the touched component that prevent targeted ESLint from passing.
- [ ] Run `npx eslint src/pages/Creativos.jsx` and verify zero errors.

### Task 4: Railway configuration

**Files:**
- Delete: `railway.toml`
- Modify: `backend/railway.toml`
- Modify: `frontend/railway.toml`
- Modify: `README.md`

- [ ] Remove the ambiguous root configuration.
- [ ] Confirm backend commands are relative to `/backend`, listen on `$PORT`, and healthcheck `/health`.
- [ ] Confirm frontend commands are relative to `/frontend`, build with `npm ci`, and serve `dist` on `$PORT`.
- [ ] Add concise Railway setup instructions and required variables to the README.
- [ ] Run TOML parsing with Python 3.11+ `tomllib`.

### Task 5: Final verification

**Files:**
- Review all modified files.

- [ ] Run `python3 -m unittest discover -s backend/tests -v`.
- [ ] Run `python3 -m compileall -q backend api`.
- [ ] Run targeted ESLint for modified frontend files.
- [ ] Run `npm run build` from `frontend`.
- [ ] Run `git diff --check`.
- [ ] Review `git status` and ensure no unrelated user changes were modified.
