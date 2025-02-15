import { pipeline, env } from '@xenova/transformers';
import { ChromaClient } from 'chromadb';

env.backend = 'onnxruntime';
env.allowRemoteModels = false;
env.localModelPath = '/home/rey/Documents/ai-doc-assit/model_convert/models/';

async function answerQuery(query) {
  // 1. Generate the query embedding using a lightweight model.
  console.log("Generating query embedding...");
  const embedder = await pipeline('feature-extraction', 'mixedbread-ai/mxbai-embed-xsmall-v1');
  const queryEmbedding = await embedder(query, { pooling: 'mean', normalize: true });
  const queryEmbeddingArray = Array.from(queryEmbedding.data);

  // 2. Connect to the local ChromaDB instance.
  console.log("Connecting to ChromaDB...");
  const chroma = new ChromaClient({ path: "http://localhost:8000" });

  // 3. Retrieve the collection named "docs".
  let collection;
  try {
    collection = await chroma.getCollection({ name: "docs" });
    console.log("Using existing collection 'docs'.");
  } catch (err) {
    console.error("Collection 'docs' not found:", err);
    return "No documentation available.";
  }

  // 4. Query the collection to get the top 3 relevant chunks.
  console.log("Querying ChromaDB...");
  // console.log(queryEmbedding);
  const results = await collection.query({
    queryEmbeddings: [queryEmbeddingArray],
    nResults: 5
  });

  // Flatten the retrieved document array (each result is an array).
  const retrievedTexts = results.documents.flat();
  const context = retrievedTexts.join("\n");

  console.log("Retrieved context:\n", context);

  // Generate an answer using an instruct model.
  // google/flan-t5-small as a lightweight, instruct-tuned model.
  console.log("Generating answer from context...");
  // const generator = await pipeline('text2text-generation', 'google/flan-t5-small');
  // const generator = await pipeline('text2text-generation', 'google-t5/t5-small');
  const generator = await pipeline('text2text-generation', 'Xenova/t5-small');

  /* Creates short answer */
  const prompt = `Using the following documentation context, answer the question.
    Documentation:
    ${context}
    Question: ${query}
    Answer:`;

  /* Better results than before (without formatting) */
  // const prompt = `Provide a detailed, step-by-step guide. Include all necessary commands and explanations. Don't repeat sentences. 

  //       Documentation Context:
  //       ${context}

  //       Question:
  //       ${query}
        
  //       Answer:`;

  /* Trying Zero-shot */
  // const prompt = `
  //   DOCUMENT:
  //   ${context}
    
  //   QUESTION: 
  //   ${query}

  //   NONE:
  //   I don't know about that
    
  //   INSTRUCTIONS:
  //   Answer the users QUESTION using the DOCUMENT text above.
  //   Keep your answer ground in the facts of the DOCUMENT.
  //   If the DOCUMENT doesn't contain the facts to answer the QUESTION return NONE`;

  const output = await generator(prompt, { max_new_tokens: 512 });
  return output[0].generated_text;
}

async function main() {
  const query = "How do I set up a Rocket.Chat development server on Linux?";
  // const query = "How much RAM is needed to build a development server?" // hard
  // const query = "How to create a basic app using Apps-Engine?"
  const answer = await answerQuery(query);
  console.log("Answer:", answer);
}

// main().catch(err => {
//   console.error("Error in RAG pipeline:", err);
// });

export default answerQuery