# Mundial Poker — Sprint 4 Brief

**Sprint:** April 4–11, 2026
**Sprint Goal:** Go from local to deployed. The game runs on a real server, accessible by URL, with CI/CD auto-deploying on every push to main.

---

## Hey team, Clodi here

Three sprints on localhost. The game is demo-ready. Now it needs to live somewhere real.

Sprint 4 has two tracks:

1. **Infrastructure (Devsi + Soni):** Deploy to AWS EC2 with Docker Compose, PostgreSQL, Redis. CI/CD auto-deploys on push to main. Database seeded and accessible.
2. **Frontend polish (Doni + Joni):** Custom chip designs per denomination, pot pill in table center, winner prize animation, mobile/desktop tweaks.

Plus Mark builds a QA plan for testing against the deployed dev environment.

### Task files

| Developer | File                                                 | Focus                                                                  |
| --------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| **Devsi** | [`devsi-tasks.md`](./devsi-tasks.md)                 | EC2 setup, Docker Compose, Nginx, SSL, CI/CD pipeline                  |
| **Soni**  | [`soni-tasks.md`](./soni-tasks.md)                   | Dockerize server, env config, Redis migration, DB seeding              |
| **Joni**  | [`joni-tasks.md`](./joni-tasks.md)                   | Custom chips, pot pill, winner animation, mobile polish                |
| **Doni**  | Design direction in Joni's task file + shared ticket | Chip denomination colors, pot pill design, animation specs             |
| **Mark**  | [`mark-tasks.md`](./mark-tasks.md)                   | Dev environment QA plan, DB cleanup strategy, E2E against deployed URL |

---

## Infrastructure Overview

**Target:** AWS EC2 (free tier, t2.micro or t3.micro)

```
EC2 Instance (t2.micro / t3.micro)
├── Docker Compose
│   ├── wpc-server    (Node.js + Socket.io, port 5174)
│   ├── wpc-web       (Nginx serving Vite build, port 80/443)
│   ├── postgres:16   (port 5432, persistent volume)
│   ├── redis:7       (port 6379)
│   └── nginx         (reverse proxy, SSL terminator)
├── GitHub Actions → SSH deploy on push to main
├── .env.production   (secrets, not in repo)
└── Access: http://<ec2-ip> or https://dev.mundialpoker.com
```

**Cost:** $0 (AWS free tier for 12 months)

---

## Sprint scope

### Devsi + Soni (Infrastructure Track)

**Devsi owns:**

- EC2 instance setup (security groups, SSH keys, Docker install)
- `docker-compose.production.yml` (all services configured for production)
- Nginx config (reverse proxy, WebSocket upgrade, SSL if domain available)
- GitHub Actions CD pipeline (build → push → SSH deploy)
- Monitoring (health check endpoint, basic uptime)

**Soni owns:**

- Dockerize the server (`Dockerfile` for apps/server)
- Dockerize the web build (`Dockerfile` for apps/web with Nginx)
- Environment config (`.env.production` template, DB connection, Redis, JWT secrets)
- Redis migration for in-memory Maps (activeBettingStates, roundBlindCache, roundPhaseMap)
- Database seeding script that runs on first deploy (32 teams)
- Drizzle migrations for production (currently using `drizzle-kit push`)

### Doni + Joni (Frontend Polish Track)

**Doni designs, Joni implements:**

- Custom chip denominations (different colors per value: 5, 10, 25, 50, 100, 200)
- Pot pill in center of table (replace the plain number with a styled chip-stack pill)
- Winner prize animation (chips animate from pot to winner's seat)
- Small desktop/mobile polish from Doni's mobile review

### Mark (QA Track)

- QA plan for testing against the deployed dev environment
- DB cleanup strategy (wipe test data after each QA session)
- E2E tests configured to run against deployed URL (not just localhost)
- Smoke test checklist for first deployment verification

---

## Dependency chart

```
DEVSI                          SONI                          JONI          MARK
─────                          ────                          ────          ────

D2: EC2 setup                  S12: Dockerfiles              Doni designs
    (day 1)                        (day 1)                   chips + pot
    │                              │                             │
D3: docker-compose.prod        S13: Env config + Redis       J16: Custom chips
    + Nginx                        migration                     (day 2-3)
    (day 2-3)                      (day 2-4)                     │
    │                              │                          J17: Pot pill
    └──────────┬───────────────────┘                              (day 3)
               │                                                  │
D4: GitHub Actions CD          S14: DB migrations            J18: Winner animation
    (day 3-4)                      + seeding                     (day 4)
    │                              (day 3-4)                     │
    ▼                              │                          J19: Mobile polish
FIRST DEPLOY ◄─────────────────────┘                              (day 5)
    (day 4-5)                                                     │
    │                                                         ────────────
    └────────────────────────────────────────────────────────> M8: Dev env QA
                                                                  (day 5-7)
```

---

## Definition of done

Same as Sprint 3, plus:

- [ ] The game is accessible via a real URL (EC2 IP or domain)
- [ ] CI/CD: push to main → auto-deploys within 5 minutes
- [ ] Database persists across deploys (volume-mounted)
- [ ] Redis persists game state across server restarts
- [ ] E2E tests can run against the deployed URL

---

## End-of-sprint target

1. Open a browser, go to `http://<ec2-ip>` (or domain)
2. Play Now → guest login → create table → add bots → play 3 rounds
3. Full flow works: betting → fixture reveals → inline score popups → winner
4. Custom colored chips visible in betting controls
5. Pot displayed as a styled pill in table center
6. Winner prize animation (chips moving from pot to winner)
7. Push a commit to main → watch it auto-deploy in ~3-5 minutes
8. Mark's smoke test passes against deployed URL

**The game is live. Not just on localhost anymore.**

— **Clodi**, PM @ Mundial Poker
