# The Story Machine

The Story Machine is intended to be a community platform for creating,
publishing, reading, and discussing interactive stories. Readers will be able to
shape stories through their choices, connecting authors and readers around
shared storytelling.

## Project overview

The backend is built with NestJS and TypeScript. It currently provides:

- A root greeting endpoint.
- A versioned user API scaffold with create, list, read, update, and delete
  routes.
- MongoDB connection configuration through `MONGO_URI`.
- Helmet security headers, CORS, and Pino-based application logging.

The user service is currently a scaffold: its methods return placeholder
messages rather than persisting user records. Interactive-story features are
part of the product vision but are not implemented in this API yet.

## Prerequisites

- Node.js 26 or newer
- npm
- A MongoDB instance for running the application (the app reads its connection
  string from `MONGO_URI`)

## Get started

Install dependencies:

```bash
npm ci
```

Create a `.env` file in the project root based on `.env.example`, then set the
values for your local environment:

```dotenv
PORT=3000
MONGO_URI=mongodb://localhost:27017/the-story-machine
```
values for the current enviroment
```dotenv
PORT=4563
MONGO_URI= mongodb+srv://tawojunife0000_db_user:hTdqMXsux7p1Xny7@the-story-machine.ouyvqbn.mongodb.net/?appName=the-story-machine
```

Start the app in watch mode:

```bash
npm run start:dev
```

The server listens on port `4563` by default, or on the port set in `PORT`.
Routes use the `/api` prefix and URI version `v1`; for example:

- `GET /api/v1` — root greeting
- `POST /api/v1/user` — create-user scaffold
- `GET /api/v1/user` — list-users scaffold
- `GET /api/v1/user/:id` — get-user scaffold
- `PATCH /api/v1/user/:id` — update-user scaffold
- `DELETE /api/v1/user/:id` — delete-user scaffold

## Common commands

| Task | Command |
| --- | --- |
| Start in watch mode | `npm run start:dev` |
| Start normally | `npm run start` |
| Start with debugger and watch mode | `npm run start:debug` |
| Build for production | `npm run build` |
| Run the production build | `npm run start:prod` |
| Run unit tests | `npm test` |
| Run unit tests in watch mode | `npm run test:watch` |
| Run end-to-end tests | `npm run test:e2e` |
| Run tests with coverage | `npm run test:cov` |
| Lint source and tests | `npm run lint` |
| Lint and fail on warnings | `npm run lint:ci` |
| Check TypeScript types | `npm run typecheck` |
| Format source and tests | `npm run format` |
| Check formatting without changing files | `npm run format:check` |

To prepare and run the production build:

```bash
npm ci
npm run build
npm run start:prod
```

## Project structure

```text
src/
  app.controller.ts       Root endpoint
  app.module.ts           Application, MongoDB, logging, and config setup
  app.service.ts          Root greeting service
  user/                   Versioned user API scaffold
test/                     End-to-end tests
```

## Documentation

- [Vision statement](./docs/vision.md)
- [Sprint 0 deliverables](./docs/sprint0.md)

## Group members

- Lara De Leon
- Carsten Kolynchuk
- Colin Leger
- Arthur McMullen
- Krupal Patel
- Adejare Taiwo
- Oluwanifemi Tawoju
