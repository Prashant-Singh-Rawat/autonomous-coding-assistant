"""
LangGraph multi-agent workflow for repository analysis.

Nodes:
  retrieve    → Semantic FAISS retrieval
  architecture→ Real file-based architecture analysis
  security    → Pattern-based secret/vulnerability scanning
  synthesize  → LLM synthesis with citations
"""

import os
import re
from collections import Counter
from typing import List

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from .state import GraphState
from ..vectorstore import get_vector_store

# ─── LLM ──────────────────────────────────────────────────────────────────────

_api_key = os.getenv("OPENAI_API_KEY", "")
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.2,
    api_key=_api_key or "dummy_key"
)

# ─── Secret / vulnerability patterns ──────────────────────────────────────────

SECRET_PATTERNS = [
    (r"(?i)(password|passwd|pwd)\s*=\s*['\"][^'\"]{4,}['\"]",      "Hardcoded password"),
    (r"(?i)(api_key|apikey|secret_key)\s*=\s*['\"][^'\"]{8,}['\"]", "Hardcoded API key"),
    (r"(?i)Bearer\s+[A-Za-z0-9\-_\.]{20,}",                         "Hardcoded Bearer token"),
    (r"(?i)(private_key|rsa_key)\s*=",                              "Private key reference"),
    (r"sk-[A-Za-z0-9]{32,}",                                        "OpenAI API key pattern"),
    (r"(?i)os\.system\s*\(",                                         "Shell injection risk (os.system)"),
    (r"(?i)eval\s*\(",                                               "Dangerous eval() call"),
    (r"(?i)exec\s*\(",                                               "Dangerous exec() call"),
    (r"(?i)pickle\.load",                                            "Unsafe pickle.load (deserialization)"),
    (r"(?i)subprocess\.call\s*\(.*shell\s*=\s*True",                "Shell=True subprocess risk"),
    (r"(?i)allow_dangerous_deserialization\s*=\s*True",             "Dangerous deserialization flag"),
    (r"(?i)DEBUG\s*=\s*True",                                       "Debug mode enabled in code"),
    (r"(?i)verify\s*=\s*False",                                     "SSL verification disabled"),
]

# ─── Nodes ────────────────────────────────────────────────────────────────────

def retrieve_context(state: GraphState) -> GraphState:
    """Semantic retrieval from FAISS vector store."""
    print("--- NODE: retrieve_context ---")
    repo_id = state.get("repository_id", "")
    query   = state.get("user_query", "")

    context   = ""
    citations: List[str] = []

    try:
        vs = get_vector_store(repo_id)
        if vs and query:
            docs = vs.similarity_search(query, k=6)
            context   = "\n\n---\n\n".join(doc.page_content for doc in docs)
            citations = list({
                doc.metadata.get("source", "")
                for doc in docs
                if doc.metadata.get("source")
            })
    except ValueError as e:
        context = f"[Vector store unavailable: {e}]"
    except Exception as e:
        context = f"[Retrieval error: {e}]"

    return {"repository_context": context, "source_citations": citations}


def analyze_architecture(state: GraphState) -> GraphState:
    """
    Real architecture analysis — counts files, detects languages,
    identifies key frameworks from file names and content patterns.
    """
    print("--- NODE: analyze_architecture ---")
    files: List[dict] = state.get("repository_files", [])

    if not files:
        report = {
            "summary": "No files were ingested for this repository.",
            "total_files": 0,
            "languages": [],
            "services": [],
            "frameworks": [],
        }
        return {"reports": {"architecture": report}}

    # Language breakdown
    lang_counter = Counter(f.get("language", "unknown") for f in files)
    total = len(files)

    # Framework / stack detection heuristics
    file_paths = [f.get("path", "") for f in files]
    path_blob  = " ".join(file_paths).lower()

    frameworks = []
    services   = []

    if any("requirements.txt" in p or ".py" in p for p in file_paths):
        frameworks.append("Python")
    if any("package.json" in p or ".ts" in p or ".tsx" in p for p in file_paths):
        frameworks.append("Node.js / TypeScript")
    if "next.config" in path_blob or ".next" in path_blob or "nextjs" in path_blob:
        frameworks.append("Next.js")
    if "fastapi" in path_blob or "main.py" in path_blob:
        frameworks.append("FastAPI")
    if "docker" in path_blob:
        services.append("Docker / Containerized")
    if "alembic" in path_blob or "migrations" in path_blob:
        services.append("Database Migrations (Alembic)")
    if "postgres" in path_blob or "postgresql" in path_blob:
        services.append("PostgreSQL")
    if "redis" in path_blob:
        services.append("Redis")
    if "langgraph" in path_blob or "graph.py" in path_blob:
        services.append("LangGraph Agent Orchestration")
    if "faiss" in path_blob or "vectorstore" in path_blob:
        services.append("FAISS Vector Store")

    top_langs = [lang for lang, _ in lang_counter.most_common(5)]

    report = {
        "summary": (
            f"Analysed {total} file(s) across {len(lang_counter)} language(s). "
            f"Primary stack: {', '.join(frameworks) if frameworks else 'Unknown'}."
        ),
        "total_files": total,
        "languages": dict(lang_counter.most_common()),
        "top_languages": top_langs,
        "frameworks": frameworks,
        "services": services,
    }

    return {"reports": {"architecture": report}}


def security_audit(state: GraphState) -> GraphState:
    """
    Pattern-based security scan over all ingested file contents.
    Flags hardcoded secrets, dangerous function calls, and insecure configs.
    """
    print("--- NODE: security_audit ---")
    files: List[dict] = state.get("repository_files", [])

    findings = []
    for file in files:
        content = file.get("content", "")
        path    = file.get("path", "unknown")
        if not content:
            continue
        for pattern, label in SECRET_PATTERNS:
            matches = re.findall(pattern, content)
            if matches:
                findings.append({
                    "file": path,
                    "issue": label,
                    "severity": _severity(label),
                    "occurrences": len(matches),
                })

    critical = [f for f in findings if f["severity"] == "critical"]
    high     = [f for f in findings if f["severity"] == "high"]

    if not findings:
        summary = "✓ No obvious security issues detected in scanned files."
    else:
        summary = (
            f"⚠ {len(findings)} potential issue(s) found — "
            f"{len(critical)} critical, {len(high)} high."
        )

    report = {
        "summary": summary,
        "total_issues": len(findings),
        "critical_count": len(critical),
        "high_count": len(high),
        "findings": findings[:20],  # cap at 20 for response size
    }

    return {"reports": {"security": report}}


def synthesize_response(state: GraphState) -> GraphState:
    """
    Uses GPT to synthesise a helpful, citation-rich response combining:
    - Semantic context from FAISS
    - Architecture + security reports
    - The user's query
    """
    print("--- NODE: synthesize_response ---")

    context   = state.get("repository_context", "")
    query     = state.get("user_query", "")
    reports   = state.get("reports", {})
    files     = state.get("repository_files", [])
    citations = state.get("source_citations", [])

    arch_report = reports.get("architecture", {})
    sec_report  = reports.get("security", {})

    # Build a rich system context
    file_list_str = "\n".join(
        f"  - {f['path']} ({f.get('language','?')})"
        for f in files[:40]
    ) or "  (No files ingested)"

    arch_summary = arch_report.get("summary", "No architecture data available.")
    frameworks   = ", ".join(arch_report.get("frameworks", [])) or "Unknown"
    services     = ", ".join(arch_report.get("services", [])) or "None detected"
    sec_summary  = sec_report.get("summary", "No security data available.")
    findings_str = ""
    if sec_report.get("findings"):
        findings_str = "\n".join(
            f"  ⚠ [{f['severity'].upper()}] {f['file']}: {f['issue']}"
            for f in sec_report["findings"][:5]
        )

    system_prompt = f"""You are an expert AI code assistant analysing a software repository.
You have access to the following repository context:

## Repository Overview
{arch_summary}
- Frameworks: {frameworks}
- Services: {services}

## Ingested Files ({arch_report.get('total_files', '?')} total)
{file_list_str}

## Security Scan
{sec_summary}
{findings_str}

## Relevant Code Snippets (from semantic search)
{context if context else "(No relevant snippets found — vector store may not be built yet)"}

## Citations
Files referenced: {', '.join(citations) if citations else 'None'}

---
Answer the user's question accurately and concisely.
- Reference specific file paths when relevant (e.g. `backend/app/main.py`)
- If the vector store is not built (no OpenAI key), still answer using the file list and reports above
- Be direct and technical
"""

    if not _api_key:
        # No OpenAI key — give a smart fallback based on actual file data
        response = _fallback_response(query, arch_report, sec_report, files, citations)
    else:
        try:
            result = llm.invoke([
                HumanMessage(content=system_prompt + f"\n\nUser question: {query}")
            ])
            response = result.content
        except Exception as e:
            response = _fallback_response(query, arch_report, sec_report, files, citations)
            response += f"\n\n_(Note: LLM unavailable — {e})_"

    return {"final_response": response, "source_citations": citations}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _severity(label: str) -> str:
    critical_labels = {"Hardcoded password", "Hardcoded API key", "Private key reference", "OpenAI API key pattern", "Hardcoded Bearer token"}
    high_labels     = {"Unsafe pickle.load (deserialization)", "Shell injection risk (os.system)", "Dangerous eval() call", "Shell=True subprocess risk"}
    if label in critical_labels:
        return "critical"
    if label in high_labels:
        return "high"
    return "medium"


def _fallback_response(
    query: str,
    arch: dict,
    sec: dict,
    files: list,
    citations: list,
) -> str:
    """
    Intelligent fallback when no OpenAI key is configured.
    Uses the real analysed data to give a useful answer.
    """
    q = query.lower()
    lines = []

    if any(w in q for w in ["file", "list", "what", "show", "content"]):
        lines.append(f"**Repository contains {arch.get('total_files', 0)} file(s):**")
        for f in files[:20]:
            lines.append(f"- `{f['path']}` _{f.get('language', 'unknown')}_")
        if len(files) > 20:
            lines.append(f"_…and {len(files) - 20} more files._")

    elif any(w in q for w in ["language", "stack", "framework", "tech"]):
        langs = arch.get("languages", {})
        fw    = arch.get("frameworks", [])
        lines.append("**Technology Stack:**")
        for lang, count in langs.items():
            lines.append(f"- {lang}: {count} file(s)")
        if fw:
            lines.append(f"\n**Frameworks detected:** {', '.join(fw)}")

    elif any(w in q for w in ["security", "vuln", "risk", "secret", "issue"]):
        lines.append(f"**Security Audit:** {sec.get('summary', 'No data')}")
        for f in sec.get("findings", [])[:10]:
            lines.append(f"- `{f['file']}` — [{f['severity'].upper()}] {f['issue']}")

    elif any(w in q for w in ["architecture", "structure", "overview", "how"]):
        lines.append(f"**Architecture Overview:** {arch.get('summary', 'No data')}")
        svcs = arch.get("services", [])
        if svcs:
            lines.append(f"\n**Services:** {', '.join(svcs)}")

    else:
        lines.append(f"**Repository Analysis:**")
        lines.append(arch.get("summary", "No summary available."))
        lines.append(f"\n**Security:** {sec.get('summary', 'No data')}")
        if citations:
            lines.append(f"\n**Relevant files:** {', '.join(f'`{c}`' for c in citations)}")

    lines.append(
        "\n\n> 💡 **To enable full AI responses**, set the `OPENAI_API_KEY` environment variable in your backend."
    )
    return "\n".join(lines)


# ─── Graph ────────────────────────────────────────────────────────────────────

def create_workflow():
    workflow = StateGraph(GraphState)

    workflow.add_node("retrieve",     retrieve_context)
    workflow.add_node("architecture", analyze_architecture)
    workflow.add_node("security",     security_audit)
    workflow.add_node("synthesize",   synthesize_response)

    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve",     "architecture")
    workflow.add_edge("architecture", "security")
    workflow.add_edge("security",     "synthesize")
    workflow.add_edge("synthesize",   END)

    return workflow.compile()


app_graph = create_workflow()
