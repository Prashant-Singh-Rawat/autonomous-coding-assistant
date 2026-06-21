import os
from typing import List
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document
from . import models

# In a real app, you would configure the embedding model to be OpenAI, local HuggingFace, etc.
# Defaulting to OpenAI embeddings for simplicity, requiring OPENAI_API_KEY.

def create_vector_store(repository: models.Repository, files: List[models.RepositoryFile]):
    """
    Creates a FAISS vector store from the repository files.
    """
    embeddings = OpenAIEmbeddings()
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )

    documents = []
    for file in files:
        if file.content:
            doc = Document(
                page_content=file.content,
                metadata={"source": file.file_path, "language": file.language}
            )
            documents.append(doc)

    split_docs = text_splitter.split_documents(documents)
    
    # Create the FAISS index
    if split_docs:
        vectorstore = FAISS.from_documents(split_docs, embeddings)
        
        # Save locally in a structured directory
        save_path = f"data/vector_stores/{repository.id}"
        os.makedirs(save_path, exist_ok=True)
        vectorstore.save_local(save_path)
        return save_path
    
    return None

def get_vector_store(repository_id: str):
    """
    Loads the FAISS vector store for a repository.
    """
    save_path = f"data/vector_stores/{repository_id}"
    if os.path.exists(save_path):
        embeddings = OpenAIEmbeddings()
        return FAISS.load_local(save_path, embeddings, allow_dangerous_deserialization=True)
    return None
