from typing import TypedDict, List, Dict, Any, Sequence, Annotated
from langchain_core.messages import BaseMessage
import operator

class GraphState(TypedDict):
    """
    State of the LangGraph workflow.
    """
    messages: Annotated[Sequence[BaseMessage], add_messages]
    repository_id: str
    user_query: str
    repository_context: str # Context gathered from vector DB
    reports: Annotated[Dict[str, Any], operator.ior] # merge reducer — prevents agent clobbering
    final_response: str
