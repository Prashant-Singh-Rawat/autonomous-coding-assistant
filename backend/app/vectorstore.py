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
from .config import settings

_INTEGRITY_KEY = settings.vector_store_hmac_key
if not _INTEGRITY_KEY:
    raise RuntimeError("VECTOR_STORE_HMAC_KEY must be set for vector store integrity verification")

def _compute_content_hash(filepath: str) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def _compute_integrity_hash(repository_id: str, data_dir: str) -> str:
    manifest = {}
    for root, dirs, files in os.walk(data_dir):
        for fname in sorted(files):
            if fname in (".integrity", ".content_hashes"):
                continue
            fpath = os.path.join(root, fname)
            manifest[fname] = _compute_content_hash(fpath)
    payload = json.dumps(manifest, sort_keys=True)
    return hmac.new(
        _INTEGRITY_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

def create_vector_store(repository: models.Repository, files: List[models.RepositoryFile]):
    """
    Creates a FAISS vector store from the repository files and signs it.
    Uses native FAISS binary serialization (safe) + JSON docstore instead of pickle.
    """
    import faiss
    embeddings = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY", "dummy_key"), timeout=30)
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
        
        index = vectorstore.index
        faiss.write_index(index, os.path.join(save_path, "index.faiss"))
        
        docstore_items = {}
        for doc_id in vectorstore.index_to_docstore_id.values():
            doc = vectorstore.docstore.search(doc_id)
            if hasattr(doc, "page_content"):
                docstore_items[doc_id] = {
                    "page_content": doc.page_content,
                    "metadata": doc.metadata,
                }

        docstore_data = {
            "docstore": docstore_items,
            "index_to_docstore_id": {str(k): v for k, v in vectorstore.index_to_docstore_id.items()},
        }
        with open(os.path.join(save_path, "docstore.json"), "w") as f:
            json.dump(docstore_data, f)
        
        with open(os.path.join(save_path, "embeddings_config.json"), "w") as f:
            json.dump({"model": "text-embedding-ada-002"}, f)
        
        integrity_hash = _compute_integrity_hash(repository.id, save_path)
        with open(os.path.join(save_path, ".integrity"), "w") as f:
            f.write(integrity_hash)
            
        return save_path
    
    return None

def get_vector_store(repository_id: str) -> Optional[FAISS]:
    """
    Loads the FAISS vector store for a repository after verifying its HMAC integrity signature.
    Uses native FAISS binary deserialization (safe, no pickle) + JSON docstore.
    """
    import faiss
    from langchain.schema import Document as LCDocument
    from langchain_community.docstore.in_memory import InMemoryDocstore
    
    save_path = f"data/vector_stores/{repository_id}"
    if os.path.exists(save_path):
        integrity_path = os.path.join(save_path, ".integrity")
        if not os.path.exists(integrity_path):
            raise ValueError(f"Integrity signature file missing for vector store {repository_id}")
            
        with open(integrity_path, "r") as f:
            expected_hash = f.read().strip()
            
        computed_hash = _compute_integrity_hash(repository_id, save_path)
        
        if not hmac.compare_digest(expected_hash, computed_hash):
            raise ValueError(f"Vector store integrity check FAILED for {repository_id}")
        index_path = os.path.join(save_path, "index.faiss")
        docstore_path = os.path.join(save_path, "docstore.json")
        
        if not os.path.exists(index_path) or not os.path.exists(docstore_path):
            raise ValueError(f"Vector store files missing for {repository_id}")
        
        index = faiss.read_index(index_path)
        
        with open(docstore_path, "r") as f:
            docstore_data = json.load(f)
        
        docstore_dict = {}
        for k, v in docstore_data.get("docstore", {}).items():
            docstore_dict[k] = LCDocument(page_content=v.get("page_content", ""), metadata=v.get("metadata", {}))
        
        docstore = InMemoryDocstore(docstore_dict)
        index_to_docstore_id = {int(k): v for k, v in docstore_data.get("index_to_docstore_id", {}).items()}
        
        embeddings = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY", "dummy_key"), timeout=30)
        
        vectorstore = FAISS(
            embedding_function=embeddings,
            index=index,
            docstore=docstore,
            index_to_docstore_id=index_to_docstore_id,
        )
        return vectorstore
    return None
