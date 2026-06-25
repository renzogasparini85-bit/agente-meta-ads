# Railway Readiness Design

## Goal

Prepare the application for a reliable Railway deployment while fixing the production blockers found in the June 12 review.

## Scope

The change covers four runtime defects and the deployment configuration:

1. Pass the selected account into the paid creative variation modal.
2. Respect each client's configured notification hour.
3. Prevent action impact reports from silently falling back to unrelated account-wide data.
4. Keep only service-specific Railway configuration files.

Alembic, repository history cleanup, and broad lint cleanup are explicitly out of scope.

## Database Initialization

Railway will use a new PostgreSQL database. `init_db()` will create the complete schema through SQLAlchemy metadata, including notification fields, hypotheses, and the new action-log account reference. Historical database migration tooling is not required for this deployment.

## Notification Scheduling

The scheduler will run once per hour. At each execution it will process only active clients whose `notif_hora` matches the current hour in the configured timezone. The default timezone is `America/Argentina/Buenos_Aires`, configurable through `NOTIF_TIMEZONE`.

This removes the mismatch between the per-client setting and the previous global `NOTIF_HORA_UTC`.

## Action Impact

Impact measurement will require an exact Meta entity match. If the selected account does not contain the stored `meta_id`, the endpoint will return `available: false` instead of substituting account-wide metrics.

Manual action creation will accept an optional `account_id`. The database model will store it so future measurements use the correct advertising account. Existing rows without `account_id` may use the first active account for backward compatibility, but they still require an exact entity match.

## Frontend Fix

`ModalVariacionPaid` will receive the selected account as a prop. Brand profile lookup will use that prop, eliminating the undefined identifier.

## Railway Configuration

The root `railway.toml` will be removed. Railway will use:

- `backend/railway.toml` with Nixpacks, backend dependency installation, `/health`, and `start.sh`.
- `frontend/railway.toml` with the Vite build and static file serving.

The frontend service requires `VITE_API_URL`; the backend requires `DATABASE_URL` and `FRONTEND_URL`.

## Testing

Backend regression tests use Python `unittest` so no new test dependency is required. They cover selecting clients by local notification hour and refusing action impact data when the Meta entity is absent.

Frontend verification consists of ESLint on the modified files and a production Vite build.
