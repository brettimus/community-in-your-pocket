import { Hono } from 'hono'
import { neon } from '@neondatabase/serverless';
import { eq, cosineDistance, desc, gt, sql as magicSql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http';
import { knowledge } from './db/schema';
import { createEmbedding } from './embeddings';
import OpenAI from 'openai';
import { Layout, SearchForm, SearchResults } from './component';

type Bindings = {
  OPENAI_API_KEY: string;
  DATABASE_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>()

// Basic UI

app.get('/', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);
  const results = await db.select({
    id: knowledge.id,
    content: knowledge.content,
    type: knowledge.type,
    link: knowledge.link,
  }).from(knowledge).limit(100);

  return c.html(
    <Layout>
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Knowledge</h1>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Search</h2>
          <SearchForm />
        </div>

        <h2 className="text-2xl font-semibold mb-4">Examples</h2>
        <SearchResults results={results} />
      </div>
    </Layout>
  )
});

app.get('/knowledge/search', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const query = c.req.query("query");
  const similarityStr = c.req.query("similarity");
  const similarityLimit = Number.parseFloat(similarityStr ?? "0.4") ?? 0.4;

  if (!query) {
    return c.text("No query provided");
  }

  const client = new OpenAI({
    apiKey: c.env.OPENAI_API_KEY,
  });
  const queryEmbedding = await createEmbedding(client, query);
  const similarityQuery = magicSql<number>`1 - (${cosineDistance(knowledge.embedding, queryEmbedding)})`;
  const results = await db.select({
    id: knowledge.id,
    content: knowledge.content,
    type: knowledge.type,
    link: knowledge.link,
    similarity: similarityQuery,
  }).from(knowledge).where(gt(similarityQuery, similarityLimit))
    .orderBy(desc(similarityQuery)).limit(10);

  return c.html(
    <Layout>
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Knowledge</h1>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Search</h2>
          <SearchForm query={query} similarity={similarityLimit} />
        </div>

        <SearchResults results={results} />
      </div>
    </Layout>
  )
});

// API - for future use

app.get('/api/knowledge', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const results = await db.select().from(knowledge);

  return c.json(results)
})

app.get('/api/knowledge/discord', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const results = await db.select().from(knowledge).where(eq(knowledge.type, 'discord')).limit(100);

  return c.json(results)
})

app.get('/api/knowledge/github', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const results = await db.select().from(knowledge).where(eq(knowledge.type, 'github')).limit(100);

  return c.json(results)
})

app.get('/api/knowledge/search', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const query = "getConnInfo not exported";

  const client = new OpenAI({
    apiKey: c.env.OPENAI_API_KEY,
  });

  const queryEmbedding = await createEmbedding(client, query);

  // https://orm.drizzle.team/learn/guides/vector-similarity-search
  const similarity = magicSql<number>`1 - (${cosineDistance(knowledge.embedding, queryEmbedding)})`;

  const results = await db.select({
    content: knowledge.content,
    type: knowledge.type,
    link: knowledge.link,
    similarity,
  }).from(knowledge)
    .where(gt(similarity, 0.4))
    .orderBy((t) => desc(t.similarity));

  return c.json(results)
});

export default app
