import OpenAI from "openai";
import { config } from 'dotenv';
import { neon } from "@neondatabase/serverless";
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema';
import { HONO_QUICK_QUESTIONS_APR24, HONO_QUICK_QUESTIONS_MAY24, HONO_QUICK_QUESTIONS_NOV23_APR24, prepareBasicDiscordMessages, prepareDiscordMessagesWithReplies } from "./prepare-discord";

import type { KnowledgeDatum } from "./types";
import { HONO_ISSUES, HONO_MIDDLEWARE_ISSUES, prepareGitHubIssues } from "./prepare-github";

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

// NOTE - My way of tracking what I've already put in the database
//        And conditionally skipping it if it's already been done
const alreadyProcessed = new Set<string>();

alreadyProcessed.add(HONO_ISSUES);
alreadyProcessed.add(HONO_MIDDLEWARE_ISSUES);

alreadyProcessed.add(HONO_QUICK_QUESTIONS_NOV23_APR24);
alreadyProcessed.add(HONO_QUICK_QUESTIONS_APR24);
alreadyProcessed.add(HONO_QUICK_QUESTIONS_MAY24);

// HACK - Extra hack to hopefully avoid double processing this.
const DISCORD_WITH_REPLIES = "blabhlabhlabhla"

async function main() {
  const start = Date.now();
  try {
    if (!alreadyProcessed.has(HONO_MIDDLEWARE_ISSUES)) {
      console.log("Processing GitHub middleware issues...")
      await createGitHubEmbeddings(HONO_MIDDLEWARE_ISSUES);
    } else {
      console.log("Skipping GitHub middleware issues, already processed");
    }
  } catch (error) {
    console.log("Failed to create GitHub embeddings", error);
  }
  const endGitHub = Date.now();
  console.log(`GitHub Took ${endGitHub - start}ms`);

  const startDiscord = Date.now();
  try {
    if (!alreadyProcessed.has(HONO_QUICK_QUESTIONS_NOV23_APR24)) {
      await createDiscordEmbeddingsMessageOnly(HONO_QUICK_QUESTIONS_NOV23_APR24);
    } else {
      console.log("Skipping discord embeddings message only, already processed");
    }
    if (!alreadyProcessed.has(DISCORD_WITH_REPLIES)) {
      console.log("Processing discord embeddings with replies baked in...")
      await createDiscordEmbeddingsWithReplies();
    } else {
      console.log("Skipping discord embeddings with replies, already processed");
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

async function createDiscordEmbeddingsWithReplies() {
  const messages = prepareDiscordMessagesWithReplies();

  for (const message of messages) {
    await createKnowledge(message);
  }
}


async function createDiscordEmbeddingsMessageOnly(filename?: string) {
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

function saveEmbedding(issueContent: string, knowledgeType: "github" | "discord", link: string, embedding: number[], meta?: object, sourceId?: string) {
  return db.insert(knowledge).values({
    content: issueContent,
    embedding,
    type: knowledgeType,
    link,
    meta,
    sourceId,
  })
}

/**
 * Add database record
 */
async function createKnowledge(datum: KnowledgeDatum, shouldLog = false) {
  const { content, link, type: knowledgeType, meta, sourceId } = datum;
  const embedding = await createEmbedding(content);
  if (shouldLog) {
    logKnowledge(datum, embedding);
  }
  const saveResult = await saveEmbedding(content, knowledgeType, link, embedding, meta, sourceId);
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