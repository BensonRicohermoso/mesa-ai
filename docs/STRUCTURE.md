# MESA-AI Repository Structure

- `client/` contains the React + Vite application. Feature code belongs under `client/src/features`, while reusable UI, hooks, API helpers, layouts, and utilities belong under `client/src/shared`.
- `client/src/routes/` contains route definitions.
- `server/` contains the Node.js + Express ES module application. Runtime source is under `server/src`, and database scripts are under `server/scripts`.
- `server/src/config/` contains environment and external-service configuration.
- `server/src/middleware/` contains authentication, role guards, validation, and error handling.
- `server/src/modules/` contains backend feature modules. Each module uses `<module>.routes.js`, `<module>.controller.js`, and `<module>.service.js` files for route, HTTP handler, and business/service logic respectively.
- `server/src/realtime/` contains realtime server setup, `server/src/jobs/` contains scheduled or background jobs, and `server/src/utils/` contains server-only utilities.
- `supabase/migrations/` contains SQL migrations and `supabase/seed/` contains seed data and demo scenarios.
- `docs/` contains repository documentation, wireframes, and test cases.
- `docs/API.md` documents the tested API endpoints and `docs/DATABASE.md` documents the database design and migrations. `docs/PROGRESS.md` tracks implementation progress.
- `server/requests/` contains VS Code REST Client request files for manual API testing.

Keep changes inside the owning developer's area unless the change is shared or explicitly assigned to another owner. Use pull requests for shared folders.
