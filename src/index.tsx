import { Hono } from 'hono'
import { neon } from '@neondatabase/serverless';
import { eq, cosineDistance, desc, gt, sql as magicSql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http';
import { users, knowledge } from './db/schema';
import { createEmbedding } from './embeddings';
import OpenAI from 'openai';
import { Layout } from './component';

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

app.get('/knowledge/search', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);
  const query = c.req.query("query");
  if (!query) {
    return c.text("No query provided");
  }
  const client = new OpenAI({
    apiKey: c.env.OPENAI_API_KEY,
  });
  const queryEmbedding = await createEmbedding(client, query);
  const similarity = magicSql<number>`1 - (${cosineDistance(knowledge.embedding, queryEmbedding)})`;
  const results = await db.select({
    id: knowledge.id,
    content: knowledge.content,
    type: knowledge.type,
    link: knowledge.link,
    similarity: similarity,
  }).from(knowledge).where(gt(similarity, 0.4))
    .orderBy(desc(similarity)).limit(10);

  return c.html(
    <Layout>
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-4xl font-bold mb-6">Knowledge</h1>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Search</h2>
          <form method="get" action="/knowledge/search" className="flex items-center space-x-4">
            <input
              type="text"
              name="query"
              className="flex-grow px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300"
              placeholder="Enter your query"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        <div className="space-y-6">
          {results.map((result) => (
            <div key={result.id} className="p-4 border rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-2">{result.type}</h3>
              <p className="mb-4">{result.content}</p>
              <a
                href={result.link ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline"
              >
                Read more
              </a>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
});

app.get('/knowledge', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);
  const results = await db.select({
    id: knowledge.id,
    content: knowledge.content,
    type: knowledge.type,
    link: knowledge.link,
  }).from(knowledge);

  return c.html(
    <Layout>
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-4xl font-bold mb-6">Knowledge</h1>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Search</h2>
          <form method="get" action="/knowledge/search" className="flex items-center space-x-4">
            <input
              type="text"
              name="query"
              className="flex-grow px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300"
              placeholder="Enter your query"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        <div className="space-y-6">
          {results.map((result) => (
            <div key={result.id} className="p-4 border rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-2">{result.type}</h3>
              <p className="mb-4">{result.content}</p>
              <a
                href={result.link ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline"
              >
                Read more
              </a>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
});

app.get('/api/knowledge', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const results = await db.select().from(knowledge);

  return c.json(results)
})

app.get('/api/knowledge/discord', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const results = await db.select().from(knowledge).where(eq(knowledge.type, 'discord'));

  return c.json(results)
})

app.get('/api/knowledge/github', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const db = drizzle(sql);

  const results = await db.select().from(knowledge).where(eq(knowledge.type, 'github'));

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