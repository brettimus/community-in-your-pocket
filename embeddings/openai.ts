import fs from "node:fs";
import OpenAI from "openai";
import { config } from 'dotenv';
import { neon } from "@neondatabase/serverless";
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema';

config({ path: '.dev.vars' });

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const { knowledge } = schema;
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

function readHonoIssues() {
  const issues = JSON.parse(fs.readFileSync('data/honojs-hono.json', 'utf8'));
  return issues;
}

async function createEmbedding(input: string) {
  // 
  const openai = new OpenAI();
  const embedding = await openai.embeddings.create({
    // length for small model: 1536
    // lacks knowledge of events that occurred after September 2021.
    // max tokens: 8191
    model: "text-embedding-3-small",
    input,
    encoding_format: "float",
  });

  console.log(embedding);
  const output = embedding.data[0].embedding;

  console.log(output);

  return output;
}

async function testCreateGitHubEmbeddings() {
  const issues = readHonoIssues();
  const testSlice = issues.slice(0, 10);

  for (const issue of testSlice) {
    const issueContent = transformIssue(issue);
    const embedding = await createEmbedding(issueContent);
    const { url } = issue;
    console.log(`
Issue: ${url}
Content: ${issueContent.slice(0, 20)}...
Embedding: ${embedding.slice(0, 5).join(', ')}...
===========================
    `.trim());
    const saveResult = await saveEmbedding(issueContent, "github", issue.html_url, embedding);
    console.log("Saved!", saveResult);
  }
}

function transformIssue(issue: { title: string, body: string }) {
  return `# ${issue.title}\n${issue.body}`;
}

function saveEmbedding(issueContent: string, contentType: "github" | "discord", link: string, embedding: number[]) {
  return db.insert(knowledge).values({
    content: issueContent,
    embedding,
    type: contentType,
    link,
  })
}

testCreateGitHubEmbeddings();