export type KnowledgeDatum = { 
  content: string, 
  link: string, 
  type: "github" | "discord", 
  meta?: object,
  sourceId?: string,
};

export type DiscordMessageReference = {
  messageId: string;
  channelId: string;
  guildId: string;
}