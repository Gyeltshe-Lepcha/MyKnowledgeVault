# MyKnowledgeVault

MyKnowledgeVault is a responsive personal knowledge management dashboard built with Next.js, Tailwind CSS, and a Prisma-backed API.

The current implementation runs as a full-stack Next.js app. Route handlers provide the backend API, Prisma models the vault data, and SQLite is used as the local development database.

## Implemented

- Knowledge dashboard for notes, documents, images, and videos
- Prisma schema for vault items, tags, quizzes, quiz attempts, and assistant runs
- API routes for item search/filtering, creation, favorite updates, assistant replies, and quiz attempts
- Category, format, tag, and full-text search filters backed by the API
- Local file upload to `public/uploads`
- Selected item preview with metadata and favorite state
- AI-style vault assistant for summaries, tag suggestions, search, and quiz prompts
- Interactive quiz panel with database-persisted score
- Responsive desktop and mobile layout

## Backend Notes

The parent project README lists PostgreSQL as the intended production database. This repo currently uses SQLite so the backend can run locally without an external database server. To move to PostgreSQL, change `provider` in `prisma/schema.prisma`, update `DATABASE_URL`, and create a new Prisma migration.

The assistant is deterministic backend logic for now. It stores assistant runs and mirrors the intended AI workflows, but it does not call OpenAI yet.

## Getting Started

Install dependencies if needed:

```bash
pnpm install
```

Create `.env` from the example if it does not exist:

```bash
cp .env.example .env
# Windows PowerShell:
# Copy-Item .env.example .env
```

Generate Prisma Client, apply the schema, and seed sample vault data:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Run the development server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```
