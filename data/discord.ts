import fs from 'node:fs';

const dmsApril = readDiscordMessages('data/hono-help-quick-questions-april.json');
const dmsMay = readDiscordMessages('data/hono-help-quick-questions-may.json');
const dmsNovApril = readDiscordMessages('data/hono-help-quick-questions-nov2023-april2024.json');

const allMessages = [...dmsApril.messages, ...dmsMay.messages, ...dmsNovApril.messages];

console.log(allMessages.length);
console.log(allMessages.filter(m => !m.type))

const uniqueTypes = getUniqueMessageTypes(allMessages);

console.log(uniqueTypes);

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