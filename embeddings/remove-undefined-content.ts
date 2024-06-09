import { config } from 'dotenv';
import { neon } from "@neondatabase/serverless";
import { and, eq, inArray, isNull, like, sql as magicSql } from 'drizzle-orm';
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

async function removeUndefinedContent() {
  const dicordMessages = await db.select({ id: knowledge.id, content: knowledge.content })
    .from(knowledge)
    .where(
      and(
        eq(knowledge.type, 'discord'),
        like(knowledge.content, '%undefined') // Match content ending with 'undefined'
      )
    );
  
  console.log("Updating content for discord messages:", dicordMessages.length);
  for (const { id, content } of dicordMessages) {

    const updatedContent = content?.replace(/undefined$/, '');
    console.log(`Updating content for id ${id}`);
    await db.update(knowledge).set({ content: updatedContent }).where(
      eq(knowledge.id, id)
    );
  }

  console.log("Done!");
}

removeUndefinedContent().catch(error => console.error(error));