import { pgTable, serial, text, jsonb, timestamp, pgEnum, vector } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const knowledgeType = pgEnum('knowledgeType', ['github', 'discord', 'docs']);

export const knowledge = pgTable('knowledge', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  type: knowledgeType('type'),
  link: text('link'),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});