import { config } from 'dotenv';
import { neon } from "@neondatabase/serverless";
import { eq, sql as magicSql } from 'drizzle-orm';
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

async function findAndDeleteDuplicates() {
  // Find duplicate links
  const duplicates = await db.select({ link: knowledge.link }).from(knowledge).groupBy(knowledge.link).having(
    magicSql`COUNT(*) > 1`
  );
  
  // Loop through each duplicate link and delete all but one
  for (const { link } of duplicates) {
    if (!link) {
      continue;
    }
    console.log(`Deleting duplicate records for link ${link}`);
    const duplicateRecords = await db.select({ id: knowledge.id }).from(knowledge).where(
      eq(knowledge.link, link)
    );

    // Keep the first record and delete the rest
    const idsToDelete = duplicateRecords.slice(1).map(row => row.id);

    if (idsToDelete.length > 0) {
      await db.delete(knowledge).where(
        eq(knowledge.id, idsToDelete[0])
      );
    }
  }

  console.log('Duplicate records deleted successfully.');
}

findAndDeleteDuplicates().catch(error => console.error(error));