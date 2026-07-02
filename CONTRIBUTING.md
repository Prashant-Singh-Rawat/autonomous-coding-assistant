# Contributing to Autonomous Coding Assistant

We welcome all contributions — bug fixes, features, docs improvements, and more!

Please read this guide before opening a PR.

---

## 📋 How to Contribute

```bash
# 1. Fork the repo on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/autonomous-coding-assistant.git
cd autonomous-coding-assistant

# 3. Create a feature branch (never commit directly to main)
git checkout -b feat/your-feature-name

# 4. Make your changes
# Follow conventional commits: feat:, fix:, docs:, refactor:, chore:, test:

# 5. Test your changes
cd backend && python -m pytest          # backend tests
cd frontend && npm run build            # frontend build check

# 6. Push and open a Pull Request
git push origin feat/your-feature-name
```

---

## ✅ Completed Issues (merged)

| # | Issue | Difficulty | Status |
|---|-------|-----------|--------|
| 1 | Local directory file ingestion (recursive scan) | Medium | ✅ Done |
| 2 | Real FAISS vector store with HMAC integrity signing | Medium | ✅ Done |
| 3 | UUID validation + path traversal protection | Easy | ✅ Done |
| 4 | Dashboard: real Add Repository modal (Local / URL) | Medium | ✅ Done |
| 5 | Real chat API integration (no more setTimeout mock) | Medium | ✅ Done |
| 6 | Real LangGraph multi-agent pipeline | Hard | ✅ Done |
| 7 | Architecture agent (framework/service detection) | Hard | ✅ Done |
| 8 | Security audit agent (12 regex patterns, severity) | Hard | ✅ Done |
| 9 | Smart fallback when OPENAI_API_KEY is not set | Medium | ✅ Done |
| 10 | Fetch and render real reports + files dynamically | Medium | ✅ Done |
| 11 | Source file citations in chat responses | Easy | ✅ Done |
| 12 | Quick-prompt buttons in repo chat panel | Easy | ✅ Done |
| 13 | Kanban board with 13 task label types | Medium | ✅ Done |

---

## 🔓 Open Issues — Help Wanted!

### 🟢 Good First Issue

#### [Frontend] User Authentication Pages
- **Issue:** The backend has full JWT auth (`/auth/signup`, `/auth/login`) but there are no frontend login/register pages.
- **Task:** Create `/login` and `/signup` Next.js pages, save the JWT token to `localStorage`, and pass it in `Authorization` headers on all API calls.
- **Component:** `frontend/src/app/login/page.tsx`, `frontend/src/app/signup/page.tsx`
- **Label:** `good first issue`, `frontend`, `authentication`

---

### 🟡 Medium

#### [Backend] HuggingFace / Offline Embeddings Fallback
- **Issue:** Currently, FAISS vector store creation requires `OPENAI_API_KEY`. Without it, the vector store is skipped entirely (only pattern-based analysis works).
- **Task:** Add a fallback to `sentence-transformers` (e.g., `all-MiniLM-L6-v2`) for generating embeddings locally when no OpenAI key is configured.
- **Component:** `backend/app/vectorstore.py`
- **Label:** `enhancement`, `backend`, `ai`

#### [Backend] GitHub Repository Cloning
- **Issue:** The "Remote URL" mode in Add Repository modal currently stores the URL but doesn't clone it.
- **Task:** Use `GitPython` or subprocess to clone a public GitHub repo to a temp directory, then run the existing `scan_local_directory` on it.
- **Component:** `backend/app/routers/repositories.py`
- **Label:** `enhancement`, `backend`

#### [Frontend] Repo Status Auto-Polling
- **Issue:** After adding a repository, the status shows "processing" but never auto-updates to "completed" without a page refresh.
- **Task:** Poll `GET /repositories/{id}` every 3 seconds until `status === "completed"`, then update the UI.
- **Component:** `frontend/src/app/dashboard/page.tsx`
- **Label:** `enhancement`, `frontend`

---

### 🔴 Hard

#### [Fullstack] Streaming Chat Responses (SSE)
- **Issue:** Chat responses arrive all at once after the full LangGraph pipeline finishes (~2-5s). This feels slow.
- **Task:** Implement Server-Sent Events (SSE) on the FastAPI side and a streaming `ReadableStream` consumer on the Next.js side for token-by-token streaming.
- **Component:** `backend/app/routers/chat.py`, `frontend/src/app/repo/[id]/page.tsx`
- **Label:** `enhancement`, `fullstack`, `performance`

#### [Backend] GitHub App OAuth Integration
- **Issue:** Users need to provide local paths or public URLs. A GitHub App would allow seamless access to private repositories.
- **Task:** Implement GitHub OAuth flow, store installation tokens, and use the GitHub API to clone private repos via a secure token exchange.
- **Component:** `backend/app/routers/auth.py`, new `backend/app/routers/github.py`
- **Label:** `enhancement`, `backend`, `auth`

#### [Fullstack] Multi-Repository Cross-Analysis
- **Issue:** Each repo is analysed in isolation. Cross-repo analysis (e.g., "find all repos using deprecated patterns") would be powerful.
- **Task:** Add a cross-repo query endpoint that runs the LangGraph pipeline across multiple vector stores.
- **Component:** `backend/app/routers/chat.py`, `backend/app/agents/graph.py`
- **Label:** `enhancement`, `fullstack`, `ai`

---

## 📐 Code Style Guidelines

### Python (Backend)
- Follow PEP 8
- Use type hints on all functions
- Write docstrings for all public functions
- Run `black` formatter before committing

### TypeScript (Frontend)
- Use `interface` over `type` for object shapes
- Prefer `async/await` over raw Promises
- Add `id` attributes to all interactive elements (for browser testing)
- Run `npm run build` to catch type errors before PRing

### Commits
Use [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add HuggingFace embedding fallback
fix: handle empty file list in security_audit node
docs: update API reference in README
refactor: extract scan_local_directory to ingestion.py
chore: bump langchain to 0.2.0
```

---

## 🔒 Security Vulnerabilities

Please **do not** open public GitHub issues for security vulnerabilities.  
Instead, email: **prashant@example.com** with the subject `[SECURITY] autonomous-coding-assistant`.

---

Thank you for contributing! 🙏
