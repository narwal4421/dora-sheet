<div align="center">

# 🧠 DORA SHEET

### The AI-Powered Collaborative Spreadsheet That Thinks With You

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

<br />

**Dora Sheet** is a production-grade, real-time collaborative spreadsheet with a built-in AI assistant that can write formulas, analyze data, generate dashboards, extract documents, and manipulate your sheet — all through natural conversation.

Not a toy. Not a prototype. **A full-stack SaaS platform.**

<br />

[Live Demo](#) · [Report Bug](https://github.com/narwal4421/dora-sheet/issues) · [Request Feature](https://github.com/narwal4421/dora-sheet/issues)

---

</div>

<br />

## ⚡ What Makes This Different

Most spreadsheet clones render a grid and call it a day. **Dora Sheet** is architecturally closer to Google Sheets than it is to any tutorial project:

| Capability | Implementation |
|---|---|
| **AI Assistant** | 9 autonomous tool functions (formulas, data fill, formatting, dashboards, search, structure, analysis, extraction, organization) powered by GPT-4o via OpenRouter |
| **Real-Time Collaboration** | Socket.IO with cell-level locking, live cursors, and team chat — all persisted through Redis |
| **Formula Engine** | HyperFormula running in a dedicated Web Worker — zero main-thread blocking |
| **Virtualized Grid** | TanStack Virtual rendering 1,000 × 26 cells with column/row resize, AutoFill handles, and multi-cell selection at 60fps |
| **Security** | 1-minute JWT rotation, Redis-backed token revocation, IP rate limiting, XSS sanitization, RBAC, and room-level access control |
| **Auto-Snapshots** | Server-side versioning every 5 minutes + manual save/restore from the UI |
| **Dashboard Generation** | AI generates cinematic KPI dashboards with ECharts — bar, line, area, and pie charts rendered from your data |
| **Document Intelligence** | Upload Excel, CSV, PDF, or images — the AI extracts structured data and maps it directly into your grid |

<br />

## 🏗️ Architecture

```
dora-sheet/
├── apps/
│   ├── api/                  # Express.js REST API + Socket.IO Server
│   │   ├── prisma/           # PostgreSQL schema & migrations
│   │   ├── src/
│   │   │   ├── config/       # env, logger, prisma, redis
│   │   │   ├── middleware/   # auth, RBAC, rate limiting, error handling
│   │   │   ├── modules/
│   │   │   │   ├── ai/       # GPT-4o integration with 9 tool functions
│   │   │   │   ├── auth/     # JWT auth with silent refresh rotation
│   │   │   │   ├── file/     # Excel/CSV upload & export
│   │   │   │   ├── workbook/ # CRUD + snapshot management
│   │   │   │   └── workspace/# Multi-tenant workspace management
│   │   │   └── sockets/      # Real-time engine (cursors, locks, sync)
│   │   └── tests/
│   │
│   └── web/                  # React 19 + Vite SPA
│       └── src/
│           ├── components/   # Grid, AI Panel, Dashboard, Toolbar, etc.
│           ├── hooks/        # Virtualization wrappers
│           ├── services/     # Socket & Auth service layers
│           └── store/        # Zustand state management
│
├── packages/
│   ├── formula-engine/       # HyperFormula Web Worker wrapper
│   └── types/                # Shared TypeScript interfaces
│
├── docker-compose.yml        # PostgreSQL 16 + Redis 7 (one command)
└── vercel.json               # SPA rewrite rules for deployment
```

This is an **npm workspaces monorepo** — shared types and the formula engine are consumed as local packages by both `apps/api` and `apps/web`.

<br />

## 🤖 AI Capabilities — "Dora Intelligence"

Dora's AI isn't a chatbot bolted onto a spreadsheet. It's a **tool-calling agent** with deep spreadsheet context awareness.

### How It Works

1. Your current sheet data (headers, cell values, formulas) is serialized and sent as context
2. The AI evaluates your intent against a **12-step decision hierarchy**
3. It selects the right tool function, generates structured arguments, and returns a **suggestion**
4. You review the suggestion and click **"Approve & Apply"** — nothing touches your data without consent

### Available Tools

| Tool | What It Does |
|---|---|
| `apply_formula` | Generates and places Excel-compatible formulas (SUM, VLOOKUP, IF, etc.) |
| `fill_data` | Parses messy natural language, pasted text, or inventory commands into structured rows |
| `extract_to_table` | Extracts tabular data from uploaded PDFs, images, Excel files, and CSVs |
| `format_cells` | Applies bold, italic, colors, alignment, and backgrounds to cell ranges |
| `organize_data` | Sorts columns A-Z/Z-A and toggles row filtering |
| `modify_structure` | Inserts or deletes rows and columns |
| `semantic_search` | Finds cells matching natural language queries and highlights them |
| `analyze_data` | Provides professional data analysis with actionable suggestions |
| `generate_dashboard` | Creates a full KPI + charts dashboard overlay from your data |

### Smart Behaviors

- **Multilingual normalization** — "veinte" → 20, "Rs. 500/-" → 500
- **Inventory mode** — "sold 3 chairs" → structured row with action, quantity, date
- **Zero fabrication** — will never guess or invent missing data
- **Approval flow** — every data mutation requires explicit user consent

<br />

## 🔐 Security Architecture

This isn't a weekend project with `localStorage` tokens. The security model is production-hardened:

### Authentication Layer
- **1-minute JWT access tokens** with silent background refresh every 50 seconds
- **7-day refresh tokens** with Redis-backed revocation and rotation
- **bcrypt** password hashing with 12 salt rounds
- Transactional user registration with automatic workspace provisioning

### Socket Bodyguard System
Every WebSocket event passes through a multi-layer defense:

```
┌─────────────────────────────────────────────┐
│             BODYGUARD LIMITS                │
├─────────────────────────────────────────────┤
│  Join Requests    │  5 per 10 minutes       │
│  Chat Messages    │  30 per minute          │
│  Grid Updates     │  100 per minute         │
│  Payload Size     │  5,000 bytes max        │
├─────────────────────────────────────────────┤
│  + XSS Sanitization on ALL string inputs    │
│  + Room Affinity checks on every event      │
│  + Cell-level locking with 5s auto-expiry   │
│  + Host-only room lock/unlock authority     │
│  + Automatic host handover on disconnect    │
└─────────────────────────────────────────────┘
```

### API Protection
- **Helmet** security headers
- **express-rate-limit** — 100 req/15min (API), 100 req/hr (auth)
- **Zod** input validation
- Role-based access control (ADMIN / EDITOR / VIEWER)

<br />

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Docker** & **Docker Compose** (for PostgreSQL + Redis)
- An **OpenRouter API key** ([get one here](https://openrouter.ai/))

### 1. Clone & Install

```bash
git clone https://github.com/narwal4421/dora-sheet.git
cd dora-sheet
npm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
```
This spins up **PostgreSQL 16** and **Redis 7** with persistent volumes.

### 3. Configure Environment

```bash
# apps/api/.env
DATABASE_URL="postgresql://postgres:password@localhost:5432/smartsheet"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="min-32-char-random-string-for-access-token"
JWT_REFRESH_SECRET="different-min-32-char-secret-for-refresh"
OPENAI_API_KEY="sk-or-..."   # Your OpenRouter API key
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"

# apps/web/.env
VITE_API_URL="http://localhost:3001"
VITE_WS_URL="ws://localhost:3001"
```

### 4. Initialize Database

```bash
cd apps/api
npx prisma db push
npx prisma generate
```

### 5. Launch

```bash
# From the root directory
npm run dev
```

The API starts on `http://localhost:3001` and the frontend on `http://localhost:5173`.

> **First launch?** The server auto-seeds a default workspace, workbook, and sheet — you'll land directly in a working spreadsheet.

<br />

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework with latest concurrent features |
| **Vite 8** | Lightning-fast HMR and build tooling |
| **Zustand 5** | Lightweight state management (sheet data, cursors, undo/redo) |
| **TanStack Virtual** | Virtualized rendering for 26,000+ cells |
| **ECharts** | AI-generated dashboard charts (bar, line, area, pie) |
| **GSAP** | Cinematic dashboard entrance animations |
| **Tailwind CSS 4** | Utility-first styling with dark/light mode |
| **Lucide React** | Consistent icon system |
| **Socket.IO Client** | Real-time bidirectional communication |
| **SheetJS (xlsx)** | Excel import/export |

### Backend
| Technology | Purpose |
|---|---|
| **Express.js** | REST API framework |
| **Socket.IO** | WebSocket server for real-time collaboration |
| **Prisma** | Type-safe ORM with PostgreSQL |
| **Redis (ioredis)** | Cell locks, room state, token revocation, rate limiting |
| **OpenAI SDK** | GPT-4o-mini via OpenRouter for AI tool-calling |
| **Winston** | Structured logging (combined + error logs) |
| **Helmet** | HTTP security headers |
| **Zod** | Runtime request validation |
| **Multer** | File upload handling |
| **Swagger** | Auto-generated API documentation at `/api/docs` |

### Shared Packages
| Package | Purpose |
|---|---|
| **@smartsheet-ai/types** | Shared TypeScript interfaces (cells, API, sockets) |
| **@smartsheet-ai/formula-engine** | HyperFormula wrapped in a Web Worker for off-thread calculation |

<br />

## 🧮 Formula Engine

The formula engine isn't a regex hack. It's built on [HyperFormula](https://hyperformula.handsontable.com/) — the same engine used by enterprise spreadsheet products — running inside a **dedicated Web Worker**.

```
Main Thread (React)           Web Worker
┌──────────────┐    postMessage    ┌──────────────────┐
│  User types  │ ───────────────► │  HyperFormula    │
│  "=SUM(A1:   │                  │  evaluates       │
│    A100)"    │ ◄─────────────── │  returns result  │
│  Cell shows  │    onmessage     │                  │
│  result: 450 │                  │  Supports 400+   │
└──────────────┘                  │  Excel functions │
                                  └──────────────────┘
```

**Why this matters:** Formula evaluation never blocks the UI. Type into cell A1 while A100 is computing a nested VLOOKUP — zero jank.

<br />

## 🌐 Real-Time Collaboration

Every edit is synchronized across all connected users in real-time:

- **Cell Updates** — individual and bulk, persisted to PostgreSQL on every keystroke
- **Live Cursors** — see where every collaborator is working, with unique colors
- **Cell Locking** — when someone edits a cell, it's locked for 5 seconds with auto-release
- **Team Chat** — built-in messaging panel alongside the AI assistant
- **Room Management** — host can lock/unlock the room, approve/deny join requests
- **Host Handover** — if the host disconnects, the next user is automatically promoted
- **Multi-Tab Safety** — Redis tracks individual socket connections per user, preventing premature cleanup

<br />

## 📊 Database Schema

```
User ──┬── WorkspaceMember ──── Workspace ──── Workbook ──┬── Sheet
       │                                                   │
       ├── Snapshot (version history)                      └── Comment (cell-level)
       │
       └── AIUsageLog (per-user daily tracking)
```

Six models covering multi-tenant workspaces, workbook management, cell-level comments, version snapshots, and AI usage tracking. See the full schema in [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma).

<br />

## 📦 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start all workspaces in development mode |
| `npm run build` | Build all workspaces for production |
| `npm run test` | Run tests across all workspaces |
| `cd apps/api && npm run db:push` | Push Prisma schema to database |
| `cd apps/api && npm run db:studio` | Open Prisma Studio (visual DB editor) |
| `cd apps/api && npm run db:generate` | Regenerate Prisma client |

<br />

## 🚢 Deployment

### Frontend → Vercel
The `vercel.json` includes SPA rewrite rules. Deploy directly from GitHub:
```bash
vercel --prod
```

### Backend → Render / Railway
The API is a standard Express.js server. Set environment variables and deploy:
```bash
cd apps/api
npm run build
npm start
```

### Infrastructure
- **PostgreSQL** → Supabase, Neon, or Railway
- **Redis** → Upstash (serverless) or Railway

<br />

## 🧪 API Documentation

Swagger UI is auto-generated and available at:
```
http://localhost:3001/api/docs
```

Health check endpoint:
```
GET /api/v1/health → { "status": "ok", "time": "..." }
```

<br />

## 🗺️ Feature Overview

- [x] AI-powered formula generation & data insertion
- [x] Real-time multi-user collaboration with live cursors
- [x] Cell-level locking with conflict prevention
- [x] AI cinematic dashboard generation (KPIs + charts)
- [x] Document extraction (PDF, images, Excel, CSV)
- [x] Semantic search across sheet data
- [x] AI-driven cell formatting and data organization
- [x] AI structural modifications (insert/delete rows & columns)
- [x] Excel export (.xlsx) with SheetJS
- [x] Excel/CSV file import
- [x] Version history with manual save & restore
- [x] Auto-snapshots every 5 minutes
- [x] Find & Replace with regex support
- [x] Undo/Redo (50-level deep history stack)
- [x] Dark mode & Light mode
- [x] Column resize + Auto-fit + Row resize
- [x] AutoFill drag handle (Excel-style)
- [x] Right-click context menu
- [x] Multi-cell range selection with Shift+Arrow
- [x] Team chat (integrated alongside AI panel)
- [x] Room locking with host authority
- [x] Join request approval/denial flow
- [x] Pre-built spreadsheet templates
- [x] Workbook sharing via URL
- [x] Editable user identity & display name
- [x] Swagger API documentation
- [x] Structured Winston logging
- [x] Production-grade JWT authentication with silent refresh
- [x] XSS sanitization on all socket payloads

<br />

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

<br />

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<br />

---

<div align="center">

**Built with obsessive attention to detail.**

If this project impressed you, consider giving it a ⭐

[⬆ Back to top](#-dora-sheet)

</div>
