import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { pipeline, env } from '@xenova/transformers';
import { ChromaClient } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';

env.backend = 'onnxruntime';
env.allowRemoteModels = false;
env.localModelPath = '/home/rey/Documents/ai-doc-assit/model_convert/models/';


/**
 * Splits text into chunks of at most maxChunkSize characters.
 * Attempts to break on newlines or spaces.
 */
function chunkText(text, maxChunkSize = 1000) {
  text = text.replace(/\n/g, " ");
  text = text.split(/\s+/).join(" ");
  
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxChunkSize;
    if (end < text.length) {
      const lastNewline = text.lastIndexOf('\n', end);
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastNewline > start) {
        end = lastNewline;
      } else if (lastSpace > start) {
        end = lastSpace;
      }
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks;
}

/**
 * Compute MD5 hash of a given text.
 */
function computeMD5(text) {
  return crypto.createHash('md5').update(text, 'utf8').digest('hex');
}

/**
 * Process a file: read its content, split into chunks,
 * and return an array of chunk objects with metadata.
 */
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(content);
  const chunks = chunkText(content, 1000); return chunks.map((chunk, index) => {
    const chunkId = uuidv4();
    const mdHash = computeMD5(chunk);
    const baseName = path.basename(filePath, path.extname(filePath));
    const chunkFilename = `${baseName}_${index}.txt`;
    return {
      id: chunkId,
      content: chunk,
      md_hash: mdHash,
      text_chunk_filename: chunkFilename,
      source_file: filePath,
    };
  });
}

/**
 * Loads all Markdown (or plain text) files from a directory,
 * processes them into chunks, and returns a flat array of chunk objects.
 */
async function loadAndProcessFiles(dir) {
  const files = await fs.readdir(dir);
  let allChunks = [];
  for (const file of files) {
    if (file.endsWith('.md') || file.endsWith('.txt')) {
      const filePath = path.join(dir, file);
      const chunks = processFile(filePath);
      allChunks = allChunks.concat(chunks);
    }
  }
  return allChunks;
}

async function main() {
  const dataDir = path.resolve('data/processed');
  const chunks = await loadAndProcessFiles(dataDir);
  console.log(`Processed ${chunks.length} chunks from files in ${dataDir}`);

  console.log("Loading local embedding model...");
  const embedder = await pipeline('feature-extraction', 'mixedbread-ai/mxbai-embed-xsmall-v1');

  for (const chunk of chunks) {
    const embedding = await embedder(chunk.content, { pooling: 'mean', normalize: true });
    chunk.embedding = Array.from(embedding.data);
  }
  console.log("Embeddings generated for all chunks.");

  console.log("Connecting to local ChromaDB...");
  const chroma = new ChromaClient({ path: "http://localhost:8000" });

  let collection;
  try {
    collection = await chroma.getCollection({ name: "docs" });
    console.log("Using existing collection 'docs'.");
  } catch (err) {
    collection = await chroma.createCollection({ name: "docs" });
    console.log("Created collection 'docs'.");
  }

  const ids = chunks.map(c => c.id);
  const documents = chunks.map(c => c.content);
  const embeddings = chunks.map(c => c.embedding);
  const metadatas = chunks.map(c => ({
    text_chunk_filename: c.text_chunk_filename,
    md_hash: c.md_hash,
    source_file: c.source_file,
  }));

  console.log("Adding chunks to the collection...");
  console.log({
    ids,
    documents,
    embeddings,
    metadatas,
  })

  console.log("Sample ID:", ids[0]);
console.log("Sample Document:", documents[0]);
console.log("Sample Embedding (length):", embeddings[0].length);
console.log("Sample Metadata:", metadatas[0]);


  await collection.add({
    ids,
    documents,
    embeddings,
    metadatas,
  });
  console.log("Successfully populated ChromaDB with document chunks.");
}

main().catch(err => {
  console.error("Error populating ChromaDB:", err);
});
