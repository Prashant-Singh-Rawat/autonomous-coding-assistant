import os
from typing import Optional, List
from sqlalchemy.orm import Session
from app import models
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

class MemoryService:
    @staticmethod
    def add_project_memory(
        db: Session,
        repository_id: str,
        content: str,
        scope: Optional[str] = None,
        memory_type: str = "fact",
        source: str = "user_confirmed",
        confidence: float = 1.0
    ) -> models.ProjectMemory:
        memory = models.ProjectMemory(
            repository_id=repository_id,
            scope=scope,
            memory_type=memory_type,
            content=content,
            confidence=confidence,
            source=source
        )
        db.add(memory)
        db.commit()
        db.refresh(memory)
        return memory

    @staticmethod
    def revalidate_memories_on_sync(db: Session, repository_id: str, changed_files: List[str]):
        """
        Flags or updates memories associated with modified files after sync.
        """
        for filepath in changed_files:
            db.query(models.ProjectMemory).filter(
                models.ProjectMemory.repository_id == repository_id,
                models.ProjectMemory.scope == filepath
            ).delete()
        db.commit()

    @staticmethod
    def compact_conversation_history(db: Session, conversation_id: str, limit: int = 15):
        """
        Compacts long conversation logs when message count exceeds limit.
        Summarizes old messages into a summary prompt system memory block.
        """
        messages = db.query(models.Message).filter(
            models.Message.conversation_id == conversation_id
        ).order_by(models.Message.created_at.asc()).all()

        if len(messages) <= limit:
            return

        # Split messages to compact
        to_compact = messages[:-5] # Keep last 5 messages intact
        keep_intact = messages[-5:]

        # Call OpenAI to summarize conversation
        _api_key = os.getenv("OPENAI_API_KEY", "")
        if not _api_key:
            return # Skip if API key is not present
            
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.2,
            api_key=_api_key
        )

        chat_history_str = "\n".join([f"{msg.role}: {msg.content}" for msg in to_compact])
        summary_prompt = (
            "Summarize the following developer discussion thread concisely. "
            "Highlight developer intentions, preferences, files discussed, and decisions made:\n\n"
            f"{chat_history_str}"
        )

        try:
            res = llm.invoke([HumanMessage(content=summary_prompt)])
            summary = res.content

            # Delete compacted messages from DB
            for msg in to_compact:
                db.delete(msg)
            db.commit()

            # Insert compacted summary as system message at the beginning
            system_msg = models.Message(
                conversation_id=conversation_id,
                role="system",
                content=f"Summary of previous discussion: {summary}",
                agent_type="compaction"
            )
            db.add(system_msg)
            db.commit()

        except Exception as e:
            print(f"[Memory Service] History compaction failed: {e}")
