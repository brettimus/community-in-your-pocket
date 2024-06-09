import fs from "node:fs";

import type { DiscordMessageReference } from "./types";

type GuildAndChannel = {
  guildId: string;
  channelId: string;
}

type Message = {
  id: string;
  content: string;
  type: string;
  reference?: DiscordMessageReference;
  timestamp: string;
}

export const HONO_QUICK_QUESTIONS_NOV23_APR24 = 'data/hono-help-quick-questions-nov2023-april2024.json';
export const HONO_QUICK_QUESTIONS_APR24 = 'data/hono-help-quick-questions-april.json';
export const HONO_QUICK_QUESTIONS_MAY24 = 'data/hono-help-quick-questions-may.json';

function readAllDiscordFiles() {
  const discordExportNov = JSON.parse(fs.readFileSync(HONO_QUICK_QUESTIONS_NOV23_APR24, 'utf8'));
  const discordExportApr = JSON.parse(fs.readFileSync(HONO_QUICK_QUESTIONS_APR24, 'utf8'));
  const discordExportMay = JSON.parse(fs.readFileSync(HONO_QUICK_QUESTIONS_MAY24, 'utf8'));

  const guildId = discordExportNov.guild.id;
  const channelId = discordExportNov.channel.id;

  const messages = [
    ...discordExportNov.messages,
    ...discordExportApr.messages,
    ...discordExportMay.messages
  ];

  return { channelId, guildId, messages };
}

function readDiscordMessages(filename: string) {
  const discordExport = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const channelId = discordExport.channel.id;
  const messages = discordExport.messages;
  const basicMessages = messages.filter((message: Message) => message?.type === "Default");
  const replies = messages.filter((message: Message) => message?.type === "Reply");
  const guildId = discordExport.guild.id;
  return { channelId, guildId, basicMessages, replies };
}


function transformDiscordMessage({ channelId, guildId, }: GuildAndChannel, message: Message) {
  return {
    link: `https://discord.com/channels/${guildId}/${channelId}/${message.id}`,
    content: message.content,
    type: "discord" as const,
  }
}

export function prepareBasicDiscordMessages(filename: string) {
  const { channelId, guildId, basicMessages } = readDiscordMessages(filename);
  return basicMessages.map((m: Message) => transformDiscordMessage({ channelId, guildId }, m)) as Array<ReturnType<typeof transformDiscordMessage>>;
}

// content - message content
// contentWithReplies - message content + replies, newline separated
// meta - { children: Array<Message> }
export function prepareDiscordMessagesWithReplies() {
  const { channelId, guildId, messages } = readAllDiscordFiles();
  const messageMap = createMessageTree(messages);
  return Array.from(messageMap.values())
    .map((m: MessageWithChildren) => {
      const childContent = m.children ? m.children?.map(c => `\n\n${c.content}`).join("") : "";
      return {
        ...m,
        sourceId: m.id,
        type: "discord" as const,
        link: `https://discord.com/channels/${guildId}/${channelId}/${m.id}`,
        // Compress content and all replies
        content: `${m.content}${childContent}`,
        ...(m.children && ({
          meta: {
            children: m.children
          }
        }))
      }
    });
}

type MessageWithChildren = Message & { children?: Array<Message> }

function createMessageTree(messages: Array<Message>) {
  // Root map, all default messages
  const basicMessages = messages.filter(m => m.type === "Default");
  const rootMap = new Map<string, MessageWithChildren>();
  for (const message of basicMessages) {
    rootMap.set(message.id, message);
  }

  // TODO - use orphans somehow
  const orphans: Array<MessageWithChildren> = []
  const replies = messages.filter(m => m.type === "Reply");

  for (const message of replies) {
    const referenceMessage = message.reference?.messageId;
    if (!referenceMessage) {
      orphans.push(message);
      continue;
    }

    const parent = rootMap.get(referenceMessage);
    if (!parent) {
      orphans.push(message);
      continue;
    }

    parent.children = parent.children ?? [];
    parent.children.push(message);

    // TODO - for each reply to this reply, add that message to parent.children
    findRepliesToReplies(parent.children, replies, message);
  }

  // Make sure the children are sorted by ascending timestamp
  for (const message of rootMap.values()) {
    message.children?.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();

      if (Number.isNaN(dateA)) {
        console.warn('Invalid date', a.id);
      }

      if (Number.isNaN(dateB)) {
        console.warn('Invalid date', b.id);
      }

      return dateA - dateB;
    })
  }

  return rootMap;
}

// NOTE - Recursive but we don't care, the tree is tiny
function findRepliesToReplies(collection: Array<Message>, replies: Array<Message>, message: Message) {
  const repliesToThis = replies.filter(r => r.reference?.messageId === message.id);
  if (repliesToThis.length === 0) {
    return collection;
  }

  for (const replyToThis of repliesToThis) {
    collection.push(replyToThis);
    findRepliesToReplies(collection, replies, replyToThis);
  }

  return collection;
}