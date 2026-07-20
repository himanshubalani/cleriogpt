# ClerioGPT

ClerioGPT is an advanced AI assistant built with Next.js, featuring real-time web search and conversation branching (Claude-style timelines). 

**Live Demo:** [https://gpt.askclerio.dev](https://gpt.askclerio.dev)  

## ✨ Key Features

1. **Agentic Web Search (Tavily)**
   - The LLM can autonomously decide when a user query requires real-time information.
   - Streams tool invocation states to the UI (`Searching web...`).
   - Persists search queries and results natively into PostgreSQL using Prisma JSON fields.

2. **Conversation Branching (Alternate Timelines)**
   - Users can fork a conversation from any historical message.
   - Generates a new branch while inheriting the full context of the parent tree dynamically upon load.
   - Clean UI for dropping down and switching between alternate branches.

3. **Production-Ready Foundation**
   - **Auth:** Clerk
   - **Database:** PostgreSQL + Prisma (Edge ready)
   - **AI:** Vercel AI SDK (React Server Components, Streaming)
   - **Styling:** Tailwind CSS + Shadcn UI

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (e.g., Neon, Supabase)
- API Keys for OpenAI, Clerk, and Tavily

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/your-username/cleriogpt.git
   cd cleriogpt
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Setup Environment Variables
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgres://..."
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."
   CLERK_SECRET_KEY="..."
   OPENAI_API_KEY="..."
   TAVILY_API_KEY="..."
   ```

4. Initialize the Database
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Run the application
   ```bash
   npm run dev
   ```

## 🏗 Architecture & Code Quality
- **Type Safety:** Strict TypeScript rules enforced, coupled with `zod` for AI tool schemas.
- **Reusable Components:** Headless UI components abstracted cleanly in `@/components`.
- **Custom Hooks:** React Query handles local caching and optimistic UI updates for branches and chat mutations.
```

