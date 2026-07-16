import os
import re
from typing import List, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from .state import GraphState
from ..vectorstore import get_vector_store

_api_key = os.getenv("OPENAI_API_KEY", "")
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.2,
    api_key=_api_key or "dummy_key"
)

# ─── Specialized Agent Nodes ──────────────────────────────────────────────────

def classify_intent_node(state: GraphState) -> Dict[str, Any]:
    """
    Decides which agent node should process the user query.
    """
    query = state.get("user_query", "").lower()
    
    # Simple intent routing heuristics
    if any(w in query for w in ["explain", "describe", "what is", "how does"]):
        intent = "explain"
    elif any(w in query for w in ["write", "create", "generate code", "refactor", "modify"]):
        intent = "coder"
    elif any(w in query for w in ["bug", "error", "traceback", "stack trace", "fail"]):
        intent = "debug"
    elif any(w in query for w in ["security", "credential", "leak", "secret", "vulnerability"]):
        intent = "security"
    elif any(w in query for w in ["smell", "duplicate", "clean", "smells", "quality"]):
        intent = "quality"
    elif any(w in query for w in ["doc", "readme", "documentation", "swagger", "openapi"]):
        intent = "docs"
    elif any(w in query for w in ["diagram", "graph", "chart", "uml", "flowchart"]):
        intent = "diagram"
    elif any(w in query for w in ["search", "find", "locate"]):
        intent = "search"
    else:
        intent = "explain" # Default to explanation/general assistance
        
    return {"reports": {"intent": intent}}

def explain_agent(state: GraphState) -> Dict[str, Any]:
    """Handles folder, file, and architecture explanations."""
    query = state.get("user_query", "")
    context = state.get("repository_context", "")
    
    prompt = f"""You are the Explainer Agent. Explain the selected codebase files clearly and concisely.
Context:
{context}

Query: {query}
"""
    if not _api_key:
        reply = "Fallback explanation based on codebase metadata."
    else:
        reply = llm.invoke([HumanMessage(content=prompt)]).content
        
    return {"final_response": reply}

def coder_agent(state: GraphState) -> Dict[str, Any]:
    """Handles code generation, scaffolding, and refactoring."""
    query = state.get("user_query", "")
    context = state.get("repository_context", "")
    
    prompt = f"""You are the Coder Agent. Write/refactor high-performance, clean code satisfying the query.
Context:
{context}

Query: {query}
"""
    if not _api_key:
        reply = "Fallback: Code snippet generation requires OPENAI_API_KEY."
    else:
        reply = llm.invoke([HumanMessage(content=prompt)]).content
        
    return {"final_response": reply}

def debug_agent(state: GraphState) -> Dict[str, Any]:
    """Analyzes tracebacks, errors, and proposes local fixes."""
    query = state.get("user_query", "")
    context = state.get("repository_context", "")
    
    prompt = f"""You are the Debugger Agent. Trace the traceback details, locate files, and provide patch recommendations.
Context:
{context}

Query/Error: {query}
"""
    if not _api_key:
        reply = "Fallback debugger analysis."
    else:
        reply = llm.invoke([HumanMessage(content=prompt)]).content
        
    return {"final_response": reply}

def security_agent(state: GraphState) -> Dict[str, Any]:
    """Scans code for vulnerability patterns."""
    query = state.get("user_query", "")
    context = state.get("repository_context", "")
    
    prompt = f"""You are the Security Agent. Audit the codebase snippets for secrets, private keys, or injection vulnerabilities.
Context:
{context}

Query: {query}
"""
    if not _api_key:
        reply = "Fallback security audit results."
    else:
        reply = llm.invoke([HumanMessage(content=prompt)]).content
        
    return {"final_response": reply}

def quality_agent(state: GraphState) -> Dict[str, Any]:
    """Detects smells and technical debt metrics."""
    query = state.get("user_query", "")
    context = state.get("repository_context", "")
    
    prompt = f"""You are the Quality Agent. Scan for code duplication, cyclomatic complexity, and code smells.
Context:
{context}

Query: {query}
"""
    if not _api_key:
        reply = "Fallback code smell report."
    else:
        reply = llm.invoke([HumanMessage(content=prompt)]).content
        
    return {"final_response": reply}

def docs_agent(state: GraphState) -> Dict[str, Any]:
    """Generates README, Sphinx, or Swagger specifications."""
    query = state.get("user_query", "")
    context = state.get("repository_context", "")
    
    prompt = f"""You are the Docs Agent. Generate structured markdown documentation or Swagger files based on input.
Context:
{context}

Query: {query}
"""
    if not _api_key:
        reply = "Fallback generated documentation."
    else:
        reply = llm.invoke([HumanMessage(content=prompt)]).content
        
    return {"final_response": reply}

def diagram_agent(state: GraphState) -> Dict[str, Any]:
    """Produces structured diagram node configuration payloads (JSON) dynamically from repository files."""
    files = state.get("repository_files", [])
    
    nodes = []
    edges = []
    
    file_map = {}
    # Create nodes for the first 15 files to keep the graph readable and clean
    for idx, f in enumerate(files[:15]):
        node_id = f"f_{idx}"
        path = f["path"]
        name = path.split("/")[-1]
        file_map[name] = node_id
        file_map[path] = node_id
        nodes.append({
            "id": node_id,
            "label": name,
            "type": "file",
            "path": path
        })
        
    # Analyze imports/dependencies
    for idx, f in enumerate(files[:15]):
        source_id = f"f_{idx}"
        content = f.get("content", "")
        # Find imports matching file names
        for name, target_id in file_map.items():
            if target_id == source_id:
                continue
            # Simple check if target file name/path is referenced in import statements of source file
            if name in content:
                edges.append({
                    "source": source_id,
                    "target": target_id,
                    "relationship": "imports"
                })
                
    # If no files found, add default entry nodes
    if not nodes:
        nodes = [
            {"id": "entry", "label": "main.py", "type": "file"},
            {"id": "db", "label": "database.py", "type": "file"},
            {"id": "auth", "label": "auth.py", "type": "file"}
        ]
        edges = [
            {"source": "entry", "target": "db", "relationship": "imports"},
            {"source": "entry", "target": "auth", "relationship": "imports"}
        ]
        
    reply_json = {
        "nodes": nodes,
        "edges": edges
    }
    
    return {
        "final_response": "Codebase dependency architecture diagram generated dynamically.",
        "reports": {"diagram_data": reply_json}
    }

def search_agent(state: GraphState) -> Dict[str, Any]:
    """Performs semantic search query routing."""
    query = state.get("user_query", "")
    context = state.get("repository_context", "")
    
    reply = f"Semantic search snippet results found in context:\n\n{context}"
    return {"final_response": reply}

def synthesize_node(state: GraphState) -> Dict[str, Any]:
    """Formats final responses, merging results and citations."""
    final_response = state.get("final_response", "Sorry, no response could be generated.")
    citations = state.get("source_citations", [])
    
    if citations:
        final_response += "\n\n### Scoped Sources Citations:\n" + "\n".join([f"- `{c}`" for c in citations])
        
    return {"final_response": final_response}

# ─── Graph Builder ────────────────────────────────────────────────────────────

def route_intent(state: GraphState) -> str:
    """Dynamic conditional router mapping intent to specialized node."""
    return state.get("reports", {}).get("intent", "explain")

def create_workflow():
    workflow = StateGraph(GraphState)

    workflow.add_node("classify", classify_intent_node)
    
    # Specialist nodes
    workflow.add_node("explain", explain_agent)
    workflow.add_node("coder", coder_agent)
    workflow.add_node("debug", debug_agent)
    workflow.add_node("security", security_agent)
    workflow.add_node("quality", quality_agent)
    workflow.add_node("docs", docs_agent)
    workflow.add_node("diagram", diagram_agent)
    workflow.add_node("search", search_agent)
    
    workflow.add_node("synthesize", synthesize_node)

    # Set entrance
    workflow.set_entry_point("classify")

    # Conditional branching
    workflow.add_conditional_edges(
        "classify",
        route_intent,
        {
            "explain": "explain",
            "coder": "coder",
            "debug": "debug",
            "security": "security",
            "quality": "quality",
            "docs": "docs",
            "diagram": "diagram",
            "search": "search"
        }
    )

    # Bridge back to synthesize
    for node in ["explain", "coder", "debug", "security", "quality", "docs", "diagram", "search"]:
        workflow.add_edge(node, "synthesize")
        
    workflow.add_edge("synthesize", END)

    return workflow.compile()

app_graph = create_workflow()
