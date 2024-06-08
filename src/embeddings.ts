import type OpenAI from "openai";

export async function createEmbedding(client: OpenAI, input: string) {
  const embedding = await client.embeddings.create({
    model: "text-embedding-3-small",
    input,
    encoding_format: "float",
  });

  const output = embedding.data[0].embedding;

  return output;
}
