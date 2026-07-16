import os
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app import models, vectorstore

class ContextBuilderService:
    @staticmethod
    def build_context_bundle(
        db: Session,
        repository_id: str,
        query: str,
        active_file_path: Optional[str] = None,
        active_lines: Optional[List[int]] = None,
        conversation_id: Optional[str] = None,
        k_chunks: int = 5
    ) -> Dict[str, Any]:
        """
        Assembles all relevant context for a query: semantic chunks, file highlights, dependencies, and memory conventions.
        """
        context_bundle = {
            "repository_id": repository_id,
            "query": query,
            "active_file_path": active_file_path,
            "active_lines": active_lines,
            "semantic_chunks": [],
            "relevant_memories": [],
            "dependency_context": [],
            "conversation_history": []
        }

        # 1. Fetch semantic chunks from FAISS vector store
        try:
            vs = vectorstore.get_vector_store(repository_id)
            if vs and query:
                docs = vs.similarity_search(query, k=k_chunks)
                context_bundle["semantic_chunks"] = [
                    {
                        "content": doc.page_content,
                        "source": doc.metadata.get("source", "unknown"),
                        "language": doc.metadata.get("language", "unknown")
                    }
                    for doc in docs
                ]
        except Exception as e:
            print(f"[Context Builder] FAISS retrieval failed: {e}")

        # 2. Fetch project memories matching repository and optional scope
        memories_query = db.query(models.ProjectMemory).filter(
            models.ProjectMemory.repository_id == repository_id
        )
        if active_file_path:
            # Match general scope or file-specific scope
            memories_query = memories_query.filter(
                (models.ProjectMemory.scope == None) | 
                (models.ProjectMemory.scope == active_file_path)
            )
        memories = memories_query.order_by(models.ProjectMemory.confidence.desc()).limit(10).all()
        context_bundle["relevant_memories"] = [
            {
                "scope": mem.scope,
                "memory_type": mem.memory_type,
                "content": mem.content,
                "confidence": mem.confidence
            }
            for mem in memories
        ]

        # 3. Fetch dependencies for active file
        if active_file_path:
            edges = db.query(models.DependencyEdge).filter(
                models.DependencyEdge.repository_id == repository_id,
                (models.DependencyEdge.source_file == active_file_path) | 
                (models.DependencyEdge.target_file == active_file_path)
            ).all()
            context_bundle["dependency_context"] = [
                {
                    "source": edge.source_file,
                    "target": edge.target_file,
                    "edge_type": edge.edge_type
                }
                for edge in edges
            ]

        # 4. Fetch conversation history (limit to last 10 messages)
        if conversation_id:
            messages = db.query(models.Message).filter(
                models.Message.conversation_id == conversation_id
            ).order_by(models.Message.created_at.desc()).limit(10).all()
            # Reverse to get chronological order
            messages.reverse()
            context_bundle["conversation_history"] = [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "agent_type": msg.agent_type
                }
                for msg in messages
            ]

        return context_bundle
