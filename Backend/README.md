# Saaluvesa API

Copy `.env.example` to `.env`, add MySQL and SMTP credentials, then run `npm install`, `npm run db:sync`, and `npm run dev`.

This service exposes the public catalogue/contact endpoints and the protected Admin Panel endpoints. `db:sync` uses Sequelize's development sync/alter mode. Before production, replace it with versioned migrations generated from the models. Swagger UI is served at `/api/docs`.
