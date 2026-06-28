import os
import hashlib
import hmac
import json
from typing import List, Optional
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from . import models

_INTEGRITY_KEY = os.getenv("SECRET_KEY", "")
if not _INTEGRITY_KEY:
    raise RuntimeError("SECRET_KEY must be set for vector store integrity verification")

def _compute_integrity_hash(repository_id: str, data_dir: str) -> str:
    """Compute HMAC-SHA256 over the sorted list of pickle filenames and their sizes."""
    manifest = {}
    for root, dirs, files in os.walk(data_dir):
        for fname in sorted(files):
            fpath = os.path.join(root, fname)
            if fname == '.integrity':
                continue
            manifest[fname] = os.path.getsize(fpath)
    payload = json.dumps(manifest, sort_keys=True)
    return hmac.new(
        _INTEGRITY_KEY.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

def create_vector_store(repository: models.Repository, files: List[models.RepositoryFile]):
    """
    Creates a FAISS vector store from the repository files.
    """
    embeddings = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY", "dummy_key"))
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
    
    if split_docs:
        vectorstore = FAISS.from_documents(split_docs, embeddings)
        
        save_path = f"data/vector_stores/{repository.id}"
        os.makedirs(save_path, exist_ok=True)
        vectorstore.save_local(save_path)

        integrity_hash = _compute_integrity_hash(repository.id, save_path)
        with open(os.path.join(save_path, ".integrity"), "w") as f:
            f.write(integrity_hash)

        return save_path
    
    return None

def get_vector_store(repository_id: str) -> Optional[FAISS]:
    """
    Loads the FAISS vector store for a repository.
    """
    save_path = f"data/vector_stores/{repository_id}"
    if os.path.exists(save_path):
        integrity_path = os.path.join(save_path, ".integrity")
        if not os.path.exists(integrity_path):
            raise ValueError(f"Integrity file missing for vector store {repository_id}")

        with open(integrity_path, "r") as f:
            expected_hash = f.read().strip()
        computed_hash = _compute_integrity_hash(repository_id, save_path)

        if not hmac.compare_digest(expected_hash, computed_hash):
            raise ValueError(f"Vector store integrity check FAILED for {repository_id}")

        embeddings = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY", "dummy_key"))
        return FAISS.load_local(save_path, embeddings, allow_dangerous_deserialization=True)
    return None
