# Mini Lead CRM

A REST API for managing leads through a sales pipeline. Built for the Superleap Backend Intern assessment.

## Tech stack

- **Node.js 20 + Express 4.** The API surface is a small REST resource with no shared state, no background work, and no rendered views — every request is I/O-bound on Mongo. Node's event loop fits that workload, and Express is unopinionated enough to map directly to the resource without imposing structure overhead.
- **MongoDB 7 + Mongoose 8.** The lead is one flat document with no relations, so the document model maps 1:1 to the API payload. Mongoose's `enum`, `match`, and `required` validators handle the field-level rules at the schema layer, and single-document atomic updates (`findOneAndUpdate` with a conditional filter) give the concurrent-transition guarantee in one round-trip without needing a transaction.
- **Zod** for request-body validation, **lru-cache** for in-process caching, **ioredis** as an optional cache backend.

## Setup

### With Docker (recommended)

```
cd backend
cp .env.example .env
docker compose up --build
```

App on http://localhost:3000, Mongo on :27017. The Mongo container has a healthcheck — the app only starts once Mongo is ready.

### Without Docker

You'll need Node 20+ and a reachable Mongo (local install or Atlas free tier).

```
cd backend
cp .env.example .env
# edit MONGODB_URI if needed
npm install
npm run seed     # optional, populates 15 sample leads
npm run dev
```

### Optional Redis

Set `REDIS_URL` in `backend/.env` to use Redis as the cache backend. If unset, or set but unreachable, the app falls back to an in-memory LRU cache. The boot log says which backend it picked.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | /leads | Create a lead |
| GET | /leads | List leads (filter by `?status=`, `?source=`, paginate with `?limit=&offset=`) |
| GET | /leads/:id | Get one lead (cached) |
| PUT | /leads/:id | Update non-status fields |
| DELETE | /leads/:id | Delete a lead |
| PATCH | /leads/:id/status | Transition to a new status |
| POST | /leads/bulk | Bulk create with per-record partial success |
| PUT | /leads/bulk | Bulk update with per-record partial success |
| GET | /health | Liveness check |

A Postman collection covering every endpoint and every documented failure mode lives at `backend/postman/lead-crm.postman_collection.json`.

## Status transitions

```
NEW -> CONTACTED -> QUALIFIED -> CONVERTED
  \         \          \
   --------- LOST <-----'
```

- `CONVERTED` and `LOST` are terminal — no transitions out.
- Any non-`CONVERTED` status can move to `LOST`.
- Transitions only happen via `PATCH /leads/:id/status`. `PUT /leads/:id` rejects a `status` field in the body with 400.

## Design decisions

- **Mongo over Postgres.** One flat resource, no joins, no foreign keys — a relational store's strengths would go unused here. Mongoose's schema validators cover everything the field-level rules need, and atomic single-document updates handle the one place we care about concurrency without needing transactions or row-level locking. If the model later grew an audit log or a contacts table with real relations, Postgres would become the right call.
- **ObjectId exposed as `id`, not UUID.** Mongo already gives me a unique, indexed, sortable-by-creation-time primary key for free. A separate UUID would mean an extra index and a second uniqueness constraint to keep in sync, for no real gain.
- **Concurrent status transitions.** To stop two concurrent transitions from overwriting each other, `PATCH /:id/status` uses `findOneAndUpdate` with `{ _id, status: fromStatus }` in the filter. Only one writer matches; the other returns 409. One atomic op, no transaction.
- **Bulk operations.** Per-record loop with `Promise.all` and try/catch, capped at 500 records. `insertMany({ ordered: false })` would also support partial success, but its error shapes don't map cleanly to the brief's `{ index, success, error }` rows. Response is always 200; per-record results are in the body.
- **Caching.** Cache-aside on `GET /leads/:id` only — list queries have too many filter permutations to invalidate. Mutations call `cache.del('lead:' + id)` after the DB write succeeds. Delete-on-write keeps one rule for every mutation (including bulk) and avoids two writers racing to `set` different values. A slow GET can still repopulate stale data; the 60s TTL bounds worst-case staleness.
- **Errors are typed classes.** `ValidationError`, `NotFoundError`, `TransitionError`, `ConflictError`, `BadRequestError` all extend `AppError` and carry their HTTP status. One central handler maps `err.status` to the response code and formats a single error envelope. Throwing the right class beats threading status codes through return values.
- **What I'd do differently at scale.** Bulk would move to a queued background job with a job-id polling endpoint instead of a synchronous cap. The cache layer would add singleflight on miss so a thundering herd doesn't all hit Mongo for the same key, short-TTL negative caching for repeated 404s, and the read-after-write race above would get fixed with a version stamp. Status transitions would write to an `audit_log` collection so we can answer "who moved this lead and when."

## Project structure

```
backend/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
├── postman/
│   └── lead-crm.postman_collection.json
└── src/
    ├── server.js         entry — boots app + db
    ├── app.js            express app, middleware, routes
    ├── config/           env, db connection
    ├── models/Lead.js    mongoose schema
    ├── routes/           route definitions
    ├── controllers/      thin handlers
    ├── services/         business logic
    ├── lib/              state machine, cache, error classes
    ├── middleware/       validate, error handler
    └── scripts/seed.js   idempotent seed
```
