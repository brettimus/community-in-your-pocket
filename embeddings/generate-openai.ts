import fs from "node:fs";
import OpenAI from "openai";
import { config } from 'dotenv';
import { neon } from "@neondatabase/serverless";
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema';

type KnowledgeDatum = { content: string, link: string, type: "github" | "discord" }

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

// Main

async function main() {
  // await testCreateDiscordEmbeddings();
  // await testCreateGitHubEmbeddings();
  const start = Date.now();
  try {
    await createGitHubEmbeddings();
  } catch (error) {
    console.log("Failed to create GitHub embeddings", error);
  }
  const endGitHub = Date.now();
  console.log(`GitHub Took ${endGitHub - start}ms`);
  const startDiscord = Date.now();
  try {
    await createDiscordEmbeddings();
  } catch (error) {
    console.log("Failed to create Discord embeddings", error);
  }
  const end = Date.now();

  console.log(`GitHub Took ${endGitHub - start}ms`);
  console.log(`Discord Took ${end - startDiscord}ms`);
  console.log(`All embeddings Took ${end - start}ms`);
}

main();

// Main guys

async function createGitHubEmbeddings() {
  const issues = prepareGitHubIssues();

  for (const issue of issues) {
    await createKnowledge(issue);
  }
}

async function createDiscordEmbeddings() {
  const messages = prepareDiscordMessages();

  for (const message of messages) {
    await createKnowledge(message);
  }
}

// Helpers

function readHonoIssues() {
  const issues = JSON.parse(fs.readFileSync('data/honojs-hono.json', 'utf8'));
  return issues;
}

function transformIssue(issue: { title: string, body: string, html_url: string }) {
  const link = issue.html_url;
  const content = `# ${issue.title}\n${issue.body}`;

  return {
    content,
    link,
    type: "github",
  }
}

function prepareGitHubIssues() {
  const issues = readHonoIssues();
  return issues.map(transformIssue) // as { content: string, link: string, type: "github" }[];
}

function readDiscordMessages() {
  const discordExport = JSON.parse(fs.readFileSync('data/hono-help-quick-questions.json', 'utf8'));
  const channelId = discordExport.channel.id;
  const messages = discordExport.messages;
  const basicMessages = messages.filter(message => message?.type === "Default");
  const guildId = discordExport.guild.id;
  return { channelId, guildId, basicMessages };
}

function transformDiscordMessage({ channelId, guildId, }: { channelId: string, guildId: string }, message: { id: string; content: string }) {
  return {
    link: `https://discord.com/channels/${guildId}/${channelId}/${message.id}`,
    content: message.content,
    type: "discord",
  }
}

function prepareDiscordMessages() {
  const { channelId, guildId, basicMessages } = readDiscordMessages();
  return basicMessages.map(m => transformDiscordMessage({channelId, guildId}, m)) as Array<{ content: string; link: string; type: "discord" }>;
}

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


// Quick Tests

async function testCreateGitHubEmbeddings() {
  const issues = prepareGitHubIssues();
  const testSlice = issues.slice(0, 10);

  for (const issue of testSlice) {
    await createKnowledge(issue, true);
  }
}

async function testCreateDiscordEmbeddings() {
  const messages = prepareDiscordMessages();
  const testSlice = messages.slice(0, 10);

  for (const message of testSlice) {
    await createKnowledge(message, true);
  }
}