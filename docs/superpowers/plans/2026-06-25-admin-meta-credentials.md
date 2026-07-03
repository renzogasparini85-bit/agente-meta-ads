# Admin Meta Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated users configure Meta access token and default ad account from the app admin instead of relying on Railway environment variables after bootstrap.

**Architecture:** Store operational Meta credentials in the existing `clients` row, expose `GET/PUT /clients/me/meta`, and create an initial `ad_accounts` row when a default account is saved and none exists. The frontend `Configuracion` token tab becomes the admin surface for both token renewal and direct credential save.

**Tech Stack:** FastAPI, SQLAlchemy models, React, Axios, Railway CLI deploy.

---

### Task 1: Backend Endpoint

**Files:**
- Modify: `backend/routers/clients.py`
- Test: `backend/tests/test_client_meta_credentials.py`

- [x] Write tests for normalizing ad account IDs and creating a default `AdAccount`.
- [x] Implement `GET /clients/me/meta` and `PUT /clients/me/meta`.
- [x] Run backend tests.

### Task 2: Frontend Admin Form

**Files:**
- Modify: `frontend/src/services/api.js`
- Modify: `frontend/src/pages/Configuracion.jsx`

- [x] Add `clientsAPI.getMeta()` and `clientsAPI.updateMeta()`.
- [x] Load current Meta config into the Token tab.
- [x] Allow saving long token + default ad account ID directly.
- [x] Remove `.env` guidance from the UI.

### Task 3: Verify And Deploy

**Files:**
- Deploy: `backend`, `frontend`

- [x] Run backend tests, compile, targeted frontend lint, frontend build.
- [x] Deploy backend and frontend to Railway.
- [x] Verify public endpoints and service status.
