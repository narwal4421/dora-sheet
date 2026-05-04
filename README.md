<div align="center">

<img src="https://img.shields.io/badge/Dora%20Sheet-AI%20Powered%20Spreadsheet-6366f1?style=for-the-badge&logo=googlesheets&logoColor=white" alt="Dora Sheet" />

# ✦ Dora Sheet

### *The AI-Native Spreadsheet. Built for the Modern Web.*

**Dora Sheet** is a real-time, collaborative spreadsheet platform powered by a proactive AI assistant that doesn't just answer questions — it *acts*. Format cells, restructure your data, sort columns, and run formulas — all from a single chat command.

<br/>

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-Visit%20App-6366f1?style=for-the-badge)](https://dora-sheet.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)

</div>

---

## ⚡ What Makes Dora Sheet Different?

Most AI tools give you *suggestions*. Dora gives you *results*.

> **"Make the header row bold and blue"** → Done.  
> **"Delete the last row"** → Done.  
> **"Sort column B alphabetically"** → Done.  
> **"Calculate total revenue with a SUM formula"** → Done.

Dora Sheet combines the power of a real-time collaboration engine with a multi-tool AI that has **direct authority** over your spreadsheet. No copy-paste. No friction. Just results.

---

## 🌟 Core Features

### 🤖 Dora AI — Your Spreadsheet Co-Pilot
- **Formula Engine** — Ask for any calculation and it applies it directly to the correct cell
- **Data Insertion** — Describe what you need and Dora fills it in, row by row
- **Style Power** — Bold, color, align — any cell range, any format, one command
- **Structural Power** — Insert or delete rows and columns on demand
- **Data Power** — Sort and filter any column instantly
- **Deep Analysis** — Get professional insights and proactive suggestions on your data

### 🔴 Real-Time Collaboration
- Live multi-user presence with cursor tracking
- Invitation-only rooms with 6-digit room codes
- Host approval/denial for join requests
- All AI actions are synced across all connected users instantly

### 📊 Spreadsheet Engine
- Full formula support (`=SUM`, `=AVERAGE`, `=IF`, `=VLOOKUP`, and more)
- Excel (`.xlsx`) file import
- Cell formatting toolbar (bold, italic, color, alignment, font size)
- Undo/Redo history
- Version snapshots
- Find & Replace
- Row filtering and column sorting

### 🎨 Premium UI
- Dark-mode first, cinematic design
- Glassmorphism and smooth micro-animations
- Responsive layout with a slide-out AI chat panel
- Built with Vite + React for near-instant load times

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Zustand, Tailwind CSS |
| **Backend** | Node.js, NestJS, Prisma ORM |
| **Real-Time** | Socket.IO (WebSockets) |
| **AI** | OpenRouter API (GPT-4o-mini) with multi-tool function calling |
| **Database** | PostgreSQL (via Prisma) |
| **Cache** | Redis (cell locking & session management) |
| **Deployment** | Vercel (Frontend) + Render (API) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v18+`
- PostgreSQL database
- Redis instance
- OpenRouter API Key → [Get one here](https://openrouter.ai)

### 1. Clone the Repository

```bash
git clone https://github.com/narwal4421/dora-sheet.git
cd dora-sheet
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in `apps/api/`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dorasheet"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-key"
OPENROUTER_API_KEY="sk-or-..."
```

Create a `.env` file in `apps/web/`:

```env
VITE_API_URL="http://localhost:3002"
```

### 4. Set Up the Database

```bash
cd apps/api
npx prisma migrate dev
```

### 5. Run the Development Servers

```bash
# From the root directory — starts both frontend and backend
npm run dev
```

- **Frontend** → `http://localhost:3000`
- **Backend API** → `http://localhost:3002`

---

## 🤖 How Dora AI Works

Dora uses a **Decision Hierarchy** to evaluate every message and choose the right action:

```
1. Bug report / complaint?          → Error Handling
2. Casual talk / greeting?          → Conversation Mode
3. Math or formula intent?          → apply_formula tool
4. Data to insert?                  → fill_data tool
5. Style or format request?         → format_cells tool
6. Sort, filter, or organize?       → organize_data tool
7. Add/remove rows or columns?      → modify_structure tool
8. Inventory/stock command?         → Inventory Mode
9. None of the above?               → Conversational Response
```

All AI actions appear as **"Approve & Apply"** suggestions in the chat — giving you full control before anything changes.

---

## 📁 Project Structure

```
dora-sheet/
├── apps/
│   ├── web/                    # React Frontend (Vite)
│   │   └── src/
│   │       ├── components/     # UI Components (Grid, Toolbar, AIChatPanel...)
│   │       ├── store/          # Zustand state management
│   │       └── services/       # Socket & API services
│   └── api/                    # NestJS Backend
│       └── src/
│           ├── modules/ai/     # AI Service & OpenRouter integration
│           ├── sockets/        # Socket.IO gateway
│           └── config/         # DB, Redis, Env config
└── packages/                   # Shared types & utilities
```

---

## 🌍 Deployment

The project is configured for a split deployment:

- **Frontend** → [Vercel](https://vercel.com) (deploy `apps/web`, build command: `npm run build`)
- **Backend** → [Render](https://render.com) (deploy `apps/api`, start command: `npm run start:prod`)

A `vercel.json` rewrite rule handles SPA routing to ensure direct URL access works correctly.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feat/your-feature-name`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ and a lot of ☕

**[⭐ Star this repo if you found it useful!](https://github.com/narwal4421/dora-sheet)**

</div>
