import fs from 'fs';
import { pipeline } from '@xenova/transformers';
import { ChromaClient } from 'chromadb';

async function ingestDocument(filePath, docId, collectionName = 'docs') {
  const content = fs.readFileSync(filePath, 'utf8');

  const embedder = await pipeline('feature-extraction', 'jinaai/jina-embedding-s-en-v1');
  const embedding = await embedder(content, { pooling: 'mean', normalize: true });
  
  const chroma = new ChromaClient({ path: 'http://localhost:8000' });
  
  let collection;
  
  try {
    collection = await chroma.getCollection({ name: collectionName });
  } catch (err) {
    collection = await chroma.createCollection({ name: collectionName });
  }
  
  await collection.add({
    ids: [docId],
    embeddings: [embedding],
    documents: [content],
  });
  
  console.log(`Document "${docId}" ingested into collection "${collectionName}".`);
}

ingestDocument('linux.md', 'linux');
