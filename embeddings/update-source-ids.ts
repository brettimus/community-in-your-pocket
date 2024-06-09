import { config } from 'dotenv';
import { neon } from "@neondatabase/serverless";
import { and, eq, inArray, isNull, sql as magicSql } from 'drizzle-orm';
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

async function updateSourceIds() {
  const dicordMessages = await db.select({ link: knowledge.link, sourceId: knowledge.sourceId })
    .from(knowledge)
    .where(
      and(
        isNull(knowledge.sourceId),
        eq(knowledge.type, 'discord')
      )
    );
  
  console.log("Updating sourceIds for discord messages:", dicordMessages.length);
  for (const { link } of dicordMessages) {
    if (!link) {
      continue;
    }
    const sourceId = link.split('/').pop();
    console.log(`Updating sourceId for link ${link} to ${sourceId}`);
    await db.update(knowledge).set({ sourceId }).where(
      eq(knowledge.link, link)
    );
  }

  console.log("Done!");
}

updateSourceIds().catch(error => console.error(error));