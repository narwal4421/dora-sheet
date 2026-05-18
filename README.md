<p align="center">
  <img src="https://img.shields.io/badge/Dora_Sheet-AI_Powered_Spreadsheet-6366f1?style=for-the-badge&logo=googlesheets&logoColor=white" alt="Dora Sheet" />
</p>

<h1 align="center">📊 Dora Sheet</h1>

<p align="center">
  <strong>The AI-Powered Collaborative Spreadsheet Platform</strong><br/>
  <em>Real-time multiplayer editing • AI assistant • Voice & video calls • Cinematic dashboards</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/LiveKit-FF2D55?style=flat-square&logo=webrtc&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Swagger-85EA2D?style=flat-square&logo=swagger&logoColor=black" />
</p>

<p align="center">
  <a href="https://dora-sheet.vercel.app" target="_blank"><strong>🌐 Live Demo</strong></a> &nbsp;·&nbsp;
  <a href="#-features"><strong>✨ Features</strong></a> &nbsp;·&nbsp;
  <a href="#-architecture"><strong>🏗 Architecture</strong></a> &nbsp;·&nbsp;
  <a href="#-getting-started"><strong>🚀 Get Started</strong></a> &nbsp;·&nbsp;
  <a href="#-api-documentation"><strong>📚 API Docs</strong></a>
</p>

---

## 🎯 What is Dora Sheet?

**Dora Sheet** is a production-grade, AI-powered collaborative spreadsheet platform built from scratch — no third-party spreadsheet libraries. It combines the familiarity of Google Sheets with the power of an embedded AI assistant, real-time multiplayer collaboration via WebSockets, in-app voice & video calling powered by LiveKit SFU, and auto-generated cinematic dashboards.

Built as a **monorepo** with shared type safety across the entire stack, Dora Sheet demonstrates enterprise-level full-stack engineering with real-time systems, AI integration, and modern DevOps practices.

> **💡 This is not a wrapper around an existing spreadsheet engine.** Every component — the grid renderer, formula engine, cell formatting system, selection logic, and collaboration protocol — is hand-crafted from scratch.

---

## ✨ Features

### 📊 Spreadsheet Core
- **Custom Grid Engine** — Virtualized 1000×26 grid with sub-millisecond render performance using `@tanstack/virtual`
- **Formula Engine** — Dedicated Web Worker-based formula processor (`SUM`, `AVERAGE`, `IF`, `VLOOKUP`, and more)
- **Cell Formatting** — Bold, italic, strikethrough, text color, background color, text alignment, number formatting (currency, percentage)
- **Multi-Sheet Tabs** — Add, rename, delete, and switch between multiple sheets within a workbook
- **Undo / Redo** — 50-level deep history stack with instant state restoration
- **Find & Replace** — Regex-powered search across all cell values and formulas with navigate-to-match
- **Column & Row Resizing** — Drag-to-resize with auto-fit to content
- **Context Menu** — Right-click actions: copy, paste, insert row, delete row
- **Selection Range** — Click-and-drag multi-cell selection with visual overlay
- **Excel Export** — One-click `.xlsx` export via SheetJS

### 🤖 AI Assistant (Dora Intelligence)
- **Natural Language Interface** — Ask the AI anything: "Add a budget table", "Sum column B", "Make headers bold"
- **10 AI Tools** — `apply_formula` · `fill_data` · `format_cells` · `organize_data` · `modify_structure` · `semantic_search` · `extract_to_table` · `generate_dashboard` · `analyze_data` · `clear_data`
- **Document Intelligence** — Attach Excel, CSV, PDF, or image files and the AI extracts structured data directly into the grid
- **Approval Workflow** — AI suggests actions, you review and approve before they're applied
- **Multilingual Support** — Auto-detects language, translates data to English, responds in your language
- **Powered by GPT-4o-mini** via OpenRouter with function calling

### 👥 Real-Time Collaboration
- **Multiplayer Editing** — See other users' cursors, selections, and edits in real-time via Socket.IO
- **Live Presence** — Color-coded avatar indicators showing who's currently in the workbook
- **Cell Locking** — Automatic pessimistic locking prevents edit conflicts (auto-released on disconnect)
- **Room System** — Each workbook is a room with a unique 6-digit join code
- **Host Controls** — Room creator can lock/unlock the room, approve/deny join requests
- **Workbook Renaming** — Rename syncs instantly across all connected clients
- **Team Chat** — Built-in real-time messaging between collaborators (separate from AI chat)

### 📞 Voice & Video Calling
- **LiveKit SFU Integration** — Enterprise-grade WebRTC powered by LiveKit's Selective Forwarding Unit
- **Voice & Video Calls** — One-click call initiation from the Team Chat panel
- **Screen Sharing** — Share your screen with collaborators during calls
- **Floating Call Overlay** — Minimizable/expandable call UI with camera/mic/screen share toggles
- **Incoming Call Notifications** — Real-time call alerts with accept/decline actions
- **Call Duration Timer** — Live timer displayed in both minimized and expanded states

### 📈 Cinematic Dashboards
- **AI-Generated Dashboards** — Ask the AI to "create a dashboard" and get auto-generated KPI cards + interactive charts
- **Chart Types** — Bar, line, area, and pie charts rendered via Apache ECharts (SVG renderer)
- **KPI Cards** — Animated cards with trend indicators (↑↓→) and change percentages
- **Collaborative Sharing** — Broadcast your dashboard to all connected users in real-time
- **GSAP Animations** — Staggered entrance animations for cards and charts

### 🛡️ Security & Infrastructure
- **Bodyguard™ Security Layer** — Rate limiting per IP (connections, grid updates, chat messages), XSS sanitization, payload size limits
- **JWT Authentication** — Access + refresh token rotation with bcrypt password hashing
- **Guest Mode** — Instant access without signup using stable guest identifiers
- **RBAC** — Role-based access control middleware (`ADMIN`, `EDITOR`, `VIEWER`)
- **Host Handover** — Automatic host reassignment when the room creator disconnects
- **Auto-Snapshots** — Server-side periodic snapshots every 5 minutes for data recovery
- **Helmet + CORS** — HTTP security headers and dynamic origin reflection

### 🎨 UI/UX
- **Dark & Light Mode** — Toggle themes with smooth CSS variable transitions
- **9 Starter Templates** — Monthly Budget, Project Planner, Invoice, Timesheet, Net Worth, Grade Calculator, Sales Pipeline, Marketing ROI, SaaS Metrics
- **GSAP Micro-Animations** — Premium entrance animations, toast notifications, modal transitions
- **Fully Responsive** — Mobile-optimized toolbar, navigation, and AI panel
- **Glassmorphism Design** — Backdrop blur, gradient accents, and layered transparency

---

## 🏗 Architecture

```
dora-sheet/
├── apps/
│   ├── api/                    # Express + Socket.IO backend
│   │   ├── src/
│   │   │   ├── config/         # Environment, Prisma, Redis, Logger (Winston)
│   │   │   ├── middleware/     # Auth, RBAC, Rate Limiting, Error Handler
│   │   │   ├── modules/
│   │   │   │   ├── ai/        # GPT-4o-mini with 10 function tools
│   │   │   │   ├── auth/      # JWT signup/login/refresh
│   │   │   │   ├── call/      # LiveKit token generation
│   │   │   │   ├── file/      # Excel/CSV/PDF/Image parsing (Multer + Puppeteer)
│   │   │   │   ├── workbook/  # CRUD + snapshot management
│   │   │   │   └── workspace/ # Multi-tenant workspace management
│   │   │   └── sockets/       # Real-time event engine (13+ event types)
│   │   └── prisma/            # PostgreSQL schema (7 models)
│   │
│   └── web/                    # React 19 + Vite frontend
│       └── src/
│           ├── components/
│           │   ├── Grid/       # Virtualized grid, headers, selection, remote cursors
│           │   ├── Collaboration/ # Join requests, room lock, identity modal
│           │   └── Modals/     # Share, Templates, Active Call, Incoming Call
│           ├── store/          # Zustand stores (Sheet, Call, Toast)
│           ├── services/       # Socket.IO client, Auth service
│           └── hooks/          # Virtualizer wrapper
│
└── packages/
    ├── formula-engine/         # Web Worker formula processor
    └── types/                  # Shared TypeScript interfaces
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, Vite, TypeScript | SPA with HMR |
| **State** | Zustand | High-performance immutable stores |
| **Styling** | Tailwind CSS v4, GSAP | Utility-first CSS + premium animations |
| **Grid** | @tanstack/virtual | DOM virtualization (1000 rows × 26 cols) |
| **Charts** | Apache ECharts | SVG-rendered interactive charts |
| **Backend** | Express.js, TypeScript | RESTful API server |
| **Real-Time** | Socket.IO | Bi-directional WebSocket communication |
| **Database** | PostgreSQL 16, Prisma ORM | Relational data with type-safe queries |
| **Cache** | Redis 7 | Session state, cell locks, rate limiting |
| **AI** | OpenRouter (GPT-4o-mini) | Function calling with 10 tools |
| **Calling** | LiveKit (WebRTC SFU) | Voice, video, and screen sharing |
| **File Parsing** | SheetJS, Multer, Puppeteer | Excel/CSV import + PDF/image OCR |
| **Auth** | JWT, bcrypt | Token-based auth with refresh rotation |
| **Logging** | Winston | Structured production logging |
| **API Docs** | Swagger/OpenAPI 3.0 | Auto-generated REST documentation |
| **DevOps** | Docker Compose, Vercel, Render | Container orchestration + cloud deploy |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Docker** (optional, for PostgreSQL + Redis)

### 1. Clone the Repository

```bash
git clone https://github.com/narwal4421/dora-sheet.git
cd dora-sheet
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
cp .env.example apps/api/.env
```

Edit `apps/api/.env` with your credentials:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/smartsheet"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-32-char-secret"
JWT_REFRESH_SECRET="different-32-char-secret"

# AI (OpenRouter)
OPENAI_API_KEY="sk-or-..."

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

Create `apps/web/.env`:

```env
VITE_API_URL="http://localhost:3001"
VITE_WS_URL="ws://localhost:3001"
VITE_LIVEKIT_URL="wss://your-livekit-instance.livekit.cloud"
```

### 4. Start Infrastructure

```bash
docker compose up -d
```

This starts **PostgreSQL 16** and **Redis 7** with persistent volumes.

### 5. Initialize Database

```bash
cd apps/api
npx prisma db push
npx prisma generate
cd ../..
```

### 6. Start Development Servers

```bash
npm run dev
```

This concurrently starts:
- **API** → `http://localhost:3001`
- **Web** → `http://localhost:5173`
- **Swagger Docs** → `http://localhost:3001/api/docs`

---

## 📚 API Documentation

Interactive Swagger documentation is available at `/api/docs` when the server is running.

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Create a new account |
| `POST` | `/api/v1/auth/login` | Authenticate and receive JWT |
| `POST` | `/api/v1/auth/refresh` | Rotate access token |
| `GET` | `/api/v1/workbooks/:id` | Fetch workbook with sheets |
| `POST` | `/api/v1/ai/chat` | Send prompt to AI assistant |
| `POST` | `/api/v1/upload` | Upload Excel/CSV/PDF/Image |
| `GET` | `/api/v1/call/token` | Generate LiveKit room token |
| `GET` | `/api/v1/workbooks/:id/snapshots` | List version history |
| `POST` | `/api/v1/workbooks/:id/snapshots` | Create manual snapshot |
| `GET` | `/api/v1/health` | Server health check |

### Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_workbook` | Client → Server | Join a workbook room |
| `cell_update` | Bi-directional | Single cell change sync |
| `bulk_cell_update` | Bi-directional | Multi-cell batch sync |
| `cursor_move` | Bi-directional | Live cursor position broadcast |
| `cell_lock` / `cell_locked` | Bi-directional | Pessimistic cell locking |
| `chat_message` | Bi-directional | Team chat messaging |
| `sheet_action` | Bi-directional | Structural mutations (insert/delete rows/cols) |
| `toggle_room_lock` | Client → Server | Host lock/unlock room |
| `request_to_join` | Client → Server | Request access to locked room |
| `start_call` | Bi-directional | Initiate voice/video call |
| `user_joined` / `user_left` | Server → Client | Presence tracking |
| `host_changed` | Server → Client | Automatic host handover |

---

## 📐 Database Schema

```prisma
User ──< WorkspaceMember >── Workspace ──< Workbook ──< Sheet
                                              │           │
                                              ├── Snapshot ├── Comment
                                              │
User ──< AIUsageLog
User ──< Comment
User ──< Snapshot
```

**7 Models:** `User` · `Workspace` · `WorkspaceMember` · `Workbook` · `Sheet` · `Snapshot` · `Comment` · `AIUsageLog`

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run API tests
cd apps/api && npm test

# Run formula engine tests
cd packages/formula-engine && npm test
```

Testing stack: **Jest** + **Supertest** + **ts-jest**

---

## 🚢 Deployment

### Frontend (Vercel)

```bash
# Deployed automatically via Vercel Git integration
# vercel.json handles SPA rewrites
```

### Backend (Render)

```bash
# Build: prisma generate && tsc
# Start: node dist/index.js
# Environment: Set all .env variables in Render dashboard
```

### Infrastructure

| Service | Provider | Notes |
|---------|----------|-------|
| Frontend | Vercel | Auto-deploy from `main` branch |
| API | Render | Free-tier with auto-sleep |
| Database | Render PostgreSQL | Managed instance |
| Redis | Render Redis | Session + lock store |
| LiveKit | LiveKit Cloud | WebRTC SFU for calls |
| AI | OpenRouter | GPT-4o-mini endpoint |

---

## 🧩 Monorepo Structure

This project uses **npm workspaces** for dependency management across packages:

```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

| Package | Description |
|---------|-------------|
| `apps/web` | React frontend application |
| `apps/api` | Express backend server |
| `packages/formula-engine` | Web Worker-based formula processor |
| `packages/types` | Shared TypeScript interfaces (`CellData`, `SocketEvent`, `ApiResponse`) |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

<p align="center">
  <strong>Built with ❤️ by <a href="https://github.com/narwal4421">Pranjal Narwal</a></strong><br/>
  <em>Full-Stack Engineer • AI Enthusiast • Open Source Contributor</em>
</p>

<p align="center">
  <a href="https://dora-sheet.vercel.app">
    <img src="https://img.shields.io/badge/Try_Dora_Sheet-Live_Demo-6366f1?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
</p>
