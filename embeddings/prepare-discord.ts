import fs from "node:fs";

import type { DiscordMessageReference } from "./types";

function readDiscordMessages(filename: string) {
  const discordExport = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const channelId = discordExport.channel.id;
  const messages = discordExport.messages;
  const basicMessages = messages.filter(message => message?.type === "Default");
  const replies = messages.filter(message => message?.type === "Reply");
  const guildId = discordExport.guild.id;
  return { channelId, guildId, basicMessages, replies };
}

type GuildAndChannel = {
  guildId: string;
  channelId: string;
}

type Message = {
  id: string;
  content: string;
  reference?: DiscordMessageReference;
}

function transformDiscordMessage({ channelId, guildId, }: GuildAndChannel, message: Message) {
  return {
    link: `https://discord.com/channels/${guildId}/${channelId}/${message.id}`,
    content: message.content,
    type: "discord",
  }
}

function transformDiscordReply({ channelId, guildId, }: GuildAndChannel, message: Message) {
  return {
    link: `https://discord.com/channels/${guildId}/${channelId}/${message.id}`,
    content: message.content,
    type: "discord",
    meta: message.reference,
  }
}

type DefaultMessageDatum = { content: string; link: string; type: "discord" }

export function prepareBasicDiscordMessages(filename: string) {
  const { channelId, guildId, basicMessages } = readDiscordMessages(filename);
  return basicMessages.map((m: Message) => transformDiscordMessage({ channelId, guildId }, m)) as Array<DefaultMessageDatum>;
}

type ReplyDatum = { content: string; link: string; type: "discord", meta?: Record<string, string> }

export function prepareDiscordMessagesReplies(filename: string) {
  const { channelId, guildId, basicMessages, replies } = readDiscordMessages(filename);
  return replies.map((m: Message) => transformDiscordReply({ channelId, guildId }, m)) as Array<ReplyDatum>;
}
