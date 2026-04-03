# Mundial Poker Cup (WPC)

A multiplayer poker game built on real-time football fixtures. Players bet on team cards whose scores are determined by live match results.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/oreloffir/mundial-poker.git
cd mundial-poker
pnpm install

# 2. Copy env and start infrastructure
cp .env.example apps/server/.env
pnpm docker:up        # starts postgres + redis

# 3. Set up database
pnpm db:migrate       # run migrations
pnpm db:seed          # seed 32 World Cup teams

# 4. Start dev servers
pnpm dev              # starts server (5174) + web (5173)
```

Open http://localhost:5173 to play.

## Project Structure

```
mundial-poker/
  apps/
    server/           Express + Socket.io game engine
      src/
        config.ts             env config with defaults
        app.ts                server entry point
        db/                   Drizzle schema, migrations, seeds
        lib/                  redis client, game-state-store
        modules/
          auth/               JWT auth (register, login, middleware)
          game/               game engine (core)
            game.service.ts     round lifecycle, betting flow
            betting.service.ts  betting state machine
            phase-tracker.ts    reconnect state (Redis-backed)
            blinds.service.ts   blind position calculation
            scoring.service.ts  card scoring after fixtures
            dealing.service.ts  card dealing
            demo.service.ts     demo fixture generation
            bot.service.ts      bot players
            game.socket.ts      Socket.io event handlers
          tables/             table CRUD + lobby
          test/               dev-only test seed endpoint
    web/              React 18 + Vite + Zustand + Tailwind
      src/
        pages/                landing, lobby, game table
        components/game/      poker table, seats, betting, fixtures
        hooks/                useGameSocket, useCountUp
        stores/               gameStore (Zustand)
  packages/
    shared/           TypeScript types shared by server + web
      types/
        game.types.ts         domain types (GameState, Team, Round)
        socket-events.ts      ServerToClientEvents, ClientToServerEvents
      utils/
        scoring.ts            card score calculation (pure logic)
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start postgres, redis, server, and web |
| `pnpm build` | Build shared, server, and web |
| `pnpm test` | Run all tests (43 server tests) |
| `pnpm typecheck` | Type-check all 3 workspaces |
| `pnpm lint` | ESLint across all workspaces |
| `pnpm format` | Prettier format all files |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed teams (idempotent) |

Server-specific (from `apps/server/`):

| Command | Description |
|---------|-------------|
| `pnpm db:reset` | Drop + migrate + seed (dev only) |
| `pnpm db:generate` | Generate new migration SQL |
| `pnpm test:coverage` | Run tests with coverage |

## Tech Stack

- **Server:** Node.js, Express, Socket.io, TypeScript
- **Database:** PostgreSQL (Drizzle ORM), Redis (game state)
- **Web:** React 18, Vite 6, Zustand, Tailwind CSS v4
- **Testing:** Vitest, Playwright (E2E)
- **Deployment:** Docker, Nginx, GitHub Actions CD

## Environment Variables

See `.env.example` for all required variables with defaults.

## Deployment

```bash
docker compose -f docker-compose.production.yml up --build
```

See `docs/ARCHITECTURE.md` for full deployment details.
