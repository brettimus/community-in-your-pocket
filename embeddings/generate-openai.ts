import OpenAI from "openai";
import { config } from 'dotenv';
import { neon } from "@neondatabase/serverless";
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema';
import { prepareBasicDiscordMessages } from "./prepare-discord";

import type { KnowledgeDatum } from "./types";
import { prepareGitHubIssues } from "./prepare-github";

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

// === Main ===

// GitHub issues
const githubHonoIssues = 'data/honojs-hono.json';
const githubHonoMiddlewareIssues = 'data/honojs-middleware.json';

// Discord messages
const discordHonoQuickQuestionsApril = 'data/hono-help-quick-questions-april.json';
const discordHonoQuickQuestionsMay = 'data/hono-help-quick-questions-may.json';
const discordHonoQuickQuestionsNov2023April2024 = 'data/hono-help-quick-questions-nov2023-april2024.json';

const alreadyProcessed = new Set<string>();
alreadyProcessed.add(githubHonoIssues);
alreadyProcessed.add(githubHonoMiddlewareIssues);
alreadyProcessed.add(discordHonoQuickQuestionsApril);
alreadyProcessed.add(discordHonoQuickQuestionsMay);
alreadyProcessed.add(discordHonoQuickQuestionsNov2023April2024);

async function main() {
  const start = Date.now();
  try {
    if (!alreadyProcessed.has(githubHonoMiddlewareIssues)) {
      await createGitHubEmbeddings(githubHonoMiddlewareIssues);
    }
  } catch (error) {
    console.log("Failed to create GitHub embeddings", error);
  }
  const endGitHub = Date.now();
  console.log(`GitHub Took ${endGitHub - start}ms`);

  const startDiscord = Date.now();
  try {
    if (!alreadyProcessed.has(discordHonoQuickQuestionsApril)) {
      await createDiscordEmbeddings(discordHonoQuickQuestionsNov2023April2024);
    }
  } catch (error) {
    console.log("Failed to create Discord embeddings", error);
  }
  const end = Date.now();

  console.log(`Discord Took ${end - startDiscord}ms`);
  console.log(`All embeddings Took ${end - start}ms`);
}

main();

// Main guys

async function createGitHubEmbeddings(filename?: string) {
  if (!filename) {
    console.log("No github filename provided, skipping GitHub");
    return;
  }
  const issues = prepareGitHubIssues(filename);

  for (const issue of issues) {
    await createKnowledge(issue);
  }
}

async function createDiscordEmbeddings(filename?: string) {
  if (!filename) {
    console.log("No discord filename provided, skipping Discord");
    return;
  }

  const messages = prepareBasicDiscordMessages(filename);

  for (const message of messages) {
    await createKnowledge(message);
  }
}

// Helpers

async function createEmbedding(input: string) {
  const openai = new OpenAI();
  const embedding = await openai.embeddings.create({
    // length for small model: 1536
    // lacks knowledge of events that occurred after September 2021.
    // max tokens: 8191
    model: "text-embedding-3-small",
    input,
    encoding_format: "float",
  });
  const output = embedding.data[0].embedding;
  return output;
}

function saveEmbedding(issueContent: string, knowledgeType: "github" | "discord", link: string, embedding: number[]) {
  return db.insert(knowledge).values({
    content: issueContent,
    embedding,
    type: knowledgeType,
    link,
  })
}

/**
 * Add database record
 */
async function createKnowledge(datum: KnowledgeDatum, shouldLog = false) {
  const { content, link, type: knowledgeType } = datum;
  const embedding = await createEmbedding(content);
  if (shouldLog) {
    logKnowledge(datum, embedding);
  }
  const saveResult = await saveEmbedding(content, knowledgeType, link, embedding);
  if (shouldLog) {
    console.log("Saved!", saveResult);
  }
  return saveResult;
}

function logKnowledge(datum: KnowledgeDatum, embedding: Array<number>) {
  const { content, link, type: knowledgeType } = datum;
  console.log(`
Source: ${knowledgeType}
Issue URL: ${link}
Content: ${content.slice(0, 20)}...
Embedding: ${embedding.slice(0, 5).join(', ')}...
===========================
    `.trim());
}


// Quick tests before you try the whole shebang

async function testCreateGitHubEmbeddings(filename: string) {
  const issues = prepareGitHubIssues(filename);
  const testSlice = issues.slice(0, 10);

  for (const issue of testSlice) {
    await createKnowledge(issue, true);
  }
}

async function testCreateDiscordEmbeddings(filename: string) {
  const messages = prepareBasicDiscordMessages(filename);
  const testSlice = messages.slice(0, 10);

  for (const message of testSlice) {
    await createKnowledge(message, true);
  }
}