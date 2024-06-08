import { Hono } from 'hono'
import { neon } from '@neondatabase/serverless';
import { cosineDistance, desc, gt, sql as magicSql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http';
import { users, knowledge } from './db/schema';
import { createEmbedding } from './embeddings';
import OpenAI from 'openai';

type Bindings = {
  OPENAI_API_KEY: string;
  DATABASE_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/api/users', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  return c.json({
    users: await db.select().from(users)
  })
})

app.get('/api/knowledge', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const results = await db.select().from(knowledge);

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