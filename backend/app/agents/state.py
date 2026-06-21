from typing import TypedDict, List, Dict, Any, Sequence
from langchain_core.messages import BaseMessage

class GraphState(TypedDict):
    """
    State of the LangGraph workflow.
    """
    messages: Sequence[BaseMessage]
    repository_id: str
    user_query: str
    repository_context: str # Context gathered from vector DB
    reports: Dict[str, Any] # intermediate reports like security, arch
    final_response: str
