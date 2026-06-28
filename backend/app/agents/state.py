from typing import TypedDict, List, Dict, Any, Sequence, Annotated
from langchain_core.messages import BaseMessage
from langgraph.graph import add_messages
import operator

class GraphState(TypedDict):
    """
    State of the LangGraph workflow.
    """
    messages: Annotated[Sequence[BaseMessage], add_messages]
    repository_id: str
    user_query: str
    repository_context: str
    reports: Annotated[Dict[str, Any], operator.ior]
    final_response: str
