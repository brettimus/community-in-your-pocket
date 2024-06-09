import fs from 'node:fs';

const dmsApril = readDiscordMessages('data/hono-help-quick-questions-april.json');
const dmsMay = readDiscordMessages('data/hono-help-quick-questions-may.json');
const dmsNovApril = readDiscordMessages('data/hono-help-quick-questions-nov2023-april2024.json');

const allMessages = [...dmsApril.messages, ...dmsMay.messages, ...dmsNovApril.messages];

// NOTE - Look for this message! Thread was created 
//
// https://discord.com/channels/1011308539819597844/1012485912409690122/1216968678982029332

console.log("All messages count: ", allMessages.length);

const uniqueTypes = getUniqueMessageTypes(allMessages);
console.log("Types:", uniqueTypes);

const basics = allMessages.filter(m => m.type === "Default");
console.log("Basics count:", basics.length)
console.log("Basics preview", basics.slice(0, 10).map(m => {
  return {
    id: m.id,
    refId: m.reference?.messageId
  }
}))

const replies = allMessages.filter(m => m.type === "Reply");
console.log("Replies count:", replies.length)
console.log("Replies preview", replies.slice(0, 10).map(m => {
  return {
    id: m.id,
    reference: m.reference,
    // refId: m.reference?.messageId
  }
}))

const threadCreatedFromExample = allMessages.find(m => m.id === "1216968678982029332");
console.log("Thread created from this", threadCreatedFromExample);

const threadCreatedExamples = allMessages.filter(m => m.type === "ThreadCreated");
console.log("Thread created examples", threadCreatedExamples.slice(0, 3));

const tree = createMessageTree(allMessages);

const treeValues = Array.from(tree.values());
const childlessMessages = treeValues.filter(m => !m.children);
console.log("Childless messages count", childlessMessages.length);

type Message = {
  id: string;
  type: string;
  reference?: {
    messageId: string;
  }
}

type MessageWithChildren = Message & { children?: Array<Message> }

function createMessageTree(messages: Array<Message>) {
  // Root map, all default messages
  const basicMessages = messages.filter(m => m.type === "Default");
  const rootMap = new Map<string, MessageWithChildren>();
  for (const message of basicMessages) {
    rootMap.set(message.id, message);
  }

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

  return rootMap;
}

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

function createMessageTreeOld(messages: Array<Message>) {
  // Root map, all default messages
  const basicMessages = messages.filter(m => m.type === "Default");
  const rootMap = new Map<string, MessageWithChildren>();
  for (const message of basicMessages) {
    rootMap.set(message.id, message);
  }

  const replyMap = new Map<string, MessageWithChildren>();
  const replies = messages.filter(m => m.type === "Reply");
  for (const message of replies) {
    replyMap.set(message.id, message);
  }

  for (const message of replies) {
    const referenceMessage = message.reference?.messageId;
    if (!referenceMessage) {
      continue;
    }
    const parent = rootMap.get(referenceMessage) ?? replyMap.get(referenceMessage);
    if (parent) {
      parent.children = parent.children ?? [];
      parent.children.push(message);
    }
  }


  // Replace all children with the "withChild" references
  for (const replyWithChildren of replyMap.values()) {
    if (!replyWithChildren.children) {
      continue;
    }
    for (const child of replyWithChildren.children) {
      const parentId = child.reference?.messageId;
      if (!parentId) {
        continue;
      }
      // TODO - replace this in parent's children?
      const parent = rootMap.get(parentId) ?? replyMap.get(parentId);
      if (parent?.children) {
        const childIndex = parent.children.findIndex(c => c.id === child.id);
        if (childIndex !== -1) {
          parent.children[childIndex] = child;
        }
      }
    }
  }

  return rootMap;
}


function getUniqueMessageTypes(messages: { type: string}[] ) {
  const types = messages.map(message => message.type);
  return Array.from(new Set(types));
}

function readDiscordMessages(filename: string) {
  const discordExport = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const channelId = discordExport.channel.id;
  const messages = discordExport.messages;
  const basicMessages = messages.filter(message => message?.type === "Default");
  const guildId = discordExport.guild.id;
  return { channelId, guildId, basicMessages, messages };
}