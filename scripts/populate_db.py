# https://stackoverflow.com/questions/76958817/streamlit-your-system-has-an-unsupported-version-of-sqlite3-chroma-requires-sq
__import__('pysqlite3')
import sys
sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')

import os
import hashlib
import uuid
from pathlib import Path
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings

def chunk_text(text, max_chunk_size=1000):
    """Splits text into chunks of at most max_chunk_size characters.
    Tries to break on newlines or spaces for graceful chunking."""

    chunks = []
    start = 0
    while start < len(text):
        end = start + max_chunk_size
        if end < len(text):
            # try to break at the last newline, otherwise at the last space
            last_newline = text.rfind("\n", start, end)
            last_space = text.rfind(" ", start, end)
            if last_newline > start:
                end = last_newline
            elif last_space > start:
                end = last_space
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end
    return chunks

def compute_md5(text):
    """Compute MD5 hash for a given text string."""
    return hashlib.md5(text.encode("utf-8")).hexdigest()

def process_file(file_path):
    """Reads file content, splits into chunks, and returns a list of chunk dicts."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    chunks = chunk_text(content, max_chunk_size=1000)
    base_name = Path(file_path).stem
    chunk_objects = []
    for index, chunk in enumerate(chunks):
        chunk_id = str(uuid.uuid4())
        md_hash = compute_md5(chunk)
        chunk_filename = f"{base_name}_{index}.txt"
        chunk_objects.append({
            "id": chunk_id,
            "content": chunk,
            "md_hash": md_hash,
            "text_chunk_filename": chunk_filename,
            "source_file": str(file_path)
        })
    return chunk_objects

def load_and_process_files(directory):
    """Loads all .md and .txt files from directory and returns all chunk objects."""
    all_chunks = []
    for file in os.listdir(directory):
        if file.endswith(".md") or file.endswith(".txt"):
            file_path = os.path.join(directory, file)
            file_chunks = process_file(file_path)
            all_chunks.extend(file_chunks)
    return all_chunks

def main():
    # Define directory containing your plain text (or processed Markdown) files.
    data_dir = os.path.abspath("data/processed")
    chunks = load_and_process_files(data_dir)
    print(f"Processed {len(chunks)} chunks from files in {data_dir}")
    
    # Load the embedding model.
    # Here, we use mixedbread-ai/mxbai-embed-xsmall-v1 as an example.
    # (If this model isn't supported by SentenceTransformer, you might try an alternative.)
    print("Loading local embedding model...")
    # model = SentenceTransformer("mixedbread-ai/mxbai-embed-xsmall-v1")
    model = SentenceTransformer("Xenova/jina-embeddings-v2-base-en")
    
    # Generate embeddings for each chunk.
    for chunk in tqdm(chunks, desc="Generating embeddings"):
        # Pool with 'mean' and normalize the vector.
        embedding = model.encode(chunk["content"], show_progress_bar=False, normalize_embeddings=True)
        # Convert embedding (if numpy array) to list.
        chunk["embedding"] = embedding.tolist() if hasattr(embedding, "tolist") else embedding
    
    print("Embeddings generated for all chunks.")
    
    # Connect to local ChromaDB instance (ensure it is running, e.g., via Docker on http://localhost:8000)
    print("Connecting to local ChromaDB...")
    # client = chromadb.PersistentClient(
    #     settings=Settings(chroma_db_impl="duckdb+parquet", persist_directory="chroma_db")
    # )
    client = chromadb.HttpClient(host='localhost', port=8000)
    
    # Get or create a collection named "docs"
    try:
        collection = client.get_collection(name="docs")
        print("Using existing collection 'docs'.")
    except Exception as e:
        collection = client.create_collection(name="docs")
        print("Created collection 'docs'.")
    
    # Prepare arrays for ChromaDB.
    ids = [chunk["id"] for chunk in chunks]
    documents = [chunk["content"] for chunk in chunks]
    embeddings = [chunk["embedding"] for chunk in chunks]
    metadatas = [{
        "text_chunk_filename": chunk["text_chunk_filename"],
        "md_hash": chunk["md_hash"],
        "source_file": chunk["source_file"]
    } for chunk in chunks]
    
    # Add all chunks to the collection.
    print("Adding chunks to the collection...")
    # print(embeddings)
    collection.add(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)
    print("Successfully populated ChromaDB with document chunks.")

if __name__ == "__main__":
    main()
