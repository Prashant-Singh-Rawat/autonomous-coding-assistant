from typing import TypedDict, List, Dict, Any, Sequence, Annotated
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
import operator

class GraphState(TypedDict):
    """
    State of the LangGraph workflow.
    All fields are passed between agents in the graph.
    """
    messages: Annotated[Sequence[BaseMessage], add_messages]
    repository_id: str
    user_query: str
    repository_context: str         # Semantic context from FAISS
    repository_files: List[Dict]    # Raw file metadata [{path, language, content_preview}]
    reports: Annotated[Dict[str, Any], operator.ior]  # Merged reports from all agents
    final_response: str
    source_citations: List[str]     # File paths cited in the response
