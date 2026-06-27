# Contributing to Autonomous Coding Assistant

We welcome contributions to help make this elite multi-agent repository intelligence platform advanced. Below are the open issues we need help with. 

If you'd like to work on one of these, please comment on the respective GitHub issue or open a Pull Request!

---

## Open Issues

### 1. [Backend] Implement Real Git/GitHub Repository Ingestion Flow
* **Difficulty:** Medium-Hard
* **Description:** Currently, file ingestion is simulated in the background task with mock files. We need a real cloning flow (using `GitPython` or shell commands), extracting code files, ignoring matches in `.gitignore`, and saving them to the DB.
* **Component:** `backend/app/routers/repositories.py` & `backend/app/ingestion.py`

### 2. [Frontend] Integrate Dashboard with Backend Repositories API
* **Difficulty:** Medium
* **Description:** The dashboard currently uses a static array of mock repositories. It needs to dynamically fetch repositories from `GET /repositories` and implement the "Add Repository" button to submit a form to `POST /repositories`.
* **Component:** `frontend/src/app/dashboard/page.tsx`

### 3. [Frontend] Connect Repository Chat to Backend Chat API
* **Difficulty:** Easy-Medium
* **Description:** The chat side is currently mocked using a `setTimeout` simulator. It should send requests to the `POST /chat/{repo_id}` API endpoint and display the real-time AI replies.
* **Component:** `frontend/src/app/repo/[id]/page.tsx`

### 4. [Frontend] Make AI Mentor Suggestion Buttons Functional
* **Difficulty:** Easy
* **Description:** The "AI Mentor Suggestions" panel buttons do nothing when clicked. They should populate the chat input box and trigger the submission event directly.
* **Component:** `frontend/src/app/repo/[id]/page.tsx`

### 5. [Backend] Implement Real LangGraph Multi-Agent Architecture
* **Difficulty:** Hard
* **Description:** The LangGraph architecture and security nodes return mock text. They should execute actual LLM prompts utilizing the retrieved codebase context to formulate detailed, structured reports.
* **Component:** `backend/app/agents/graph.py`

### 6. [Backend] Support Offline/Local Embeddings (Fallback from OpenAI)
* **Difficulty:** Medium
* **Description:** Currently, the FAISS vector store crashes without `OPENAI_API_KEY`. Add a fallback mechanism utilizing offline sentence-transformers/HuggingFace embeddings if the API key is not present.
* **Component:** `backend/app/vectorstore.py`

### 7. [Frontend] Fetch and Render Real Reports and Insights Dynamically
* **Difficulty:** Medium
* **Description:** The sidebars showing the Architecture Summary and Security Audit render hardcoded static components. Implement fetching and displaying from `GET /repositories/{repo_id}/reports`.
* **Component:** `frontend/src/app/repo/[id]/page.tsx`

### 8. [Fullstack] Implement User Authentication (JWT) on the Frontend
* **Difficulty:** Hard
* **Description:** The backend supports JWT token auth endpoints but the frontend lacks Login and Register screens. Create routes/pages for auth, save tokens, and attach them as Authorization headers.
* **Component:** `frontend/` & `backend/`
