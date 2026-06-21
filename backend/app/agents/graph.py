from langgraph.graph import StateGraph, END
from .state import GraphState
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from ..vectorstore import get_vector_store
import os

# Initialize LLM with fallback so it doesn't crash on boot if the key is missing
llm = ChatOpenAI(temperature=0, api_key=os.getenv("OPENAI_API_KEY", "dummy_key"))

def retrieve_context(state: GraphState) -> GraphState:
    """Retrieves context from FAISS vector store based on user query."""
    print("---RETRIEVE CONTEXT---")
    repo_id = state.get("repository_id")
    query = state.get("user_query")
    
    vectorstore = get_vector_store(repo_id)
    context = ""
    if vectorstore and query:
        docs = vectorstore.similarity_search(query, k=5)
        context = "\n".join([doc.page_content for doc in docs])
        
    return {"repository_context": context}

def analyze_architecture(state: GraphState) -> GraphState:
    print("---ANALYZE ARCHITECTURE---")
    # In a full implementation, this agent would map the entire repo
    # using specific prompts and the LLM.
    return {"reports": {"architecture": "Scaffolded architecture report."}}

def security_audit(state: GraphState) -> GraphState:
    print("---SECURITY AUDIT---")
    # Security scanning logic here
    return {"reports": {"security": "Scaffolded security report."}}

def synthesize_response(state: GraphState) -> GraphState:
    print("---SYNTHESIZE RESPONSE---")
    context = state.get("repository_context", "")
    query = state.get("user_query", "")
    reports = state.get("reports", {})
    
    prompt = f"Context:\n{context}\n\nReports:\n{reports}\n\nUser Query: {query}\n\nAnswer:"
    response = llm.invoke([HumanMessage(content=prompt)])
    
    return {"final_response": response.content}

def create_workflow():
    workflow = StateGraph(GraphState)
    
    # Add nodes
    workflow.add_node("retrieve", retrieve_context)
    workflow.add_node("architecture", analyze_architecture)
    workflow.add_node("security", security_audit)
    workflow.add_node("synthesize", synthesize_response)
    
    # Add edges
    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "architecture")
    workflow.add_edge("architecture", "security")
    workflow.add_edge("security", "synthesize")
    workflow.add_edge("synthesize", END)
    
    return workflow.compile()

app_graph = create_workflow()
