import { App, LogLevel } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { Config } from './config';
import { MessageStorage, MessageInput } from './storage';
import { logger } from './logger';

export class SlackBot {
  private app: App;
  private client: WebClient;
  private storage: MessageStorage;
  private config: Config;
  private userCache: Map<string, string> = new Map();
  private channelCache: Map<string, string> = new Map();

  constructor(config: Config, storage: MessageStorage) {
    this.config = config;
    this.storage = storage;

    this.app = new App({
      token: config.slack.botToken,
      appToken: config.slack.appToken,
      signingSecret: config.slack.signingSecret,
      socketMode: true,
      logLevel: LogLevel.INFO,
    });

    this.client = this.app.client;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen to all messages in channels the bot is in
    this.app.message(async ({ message, say }) => {
      try {
        // Type guard for regular messages
        if (message.subtype === undefined || message.subtype === 'message_changed') {
          const msg = message as any;

          // Skip bot messages to avoid loops
          if (msg.bot_id) {
            return;
          }

          // Check if we should monitor this channel
          if (this.config.slack.monitoredChannels.length > 0 &&
              !this.config.slack.monitoredChannels.includes(msg.channel)) {
            return;
          }

          const userName = await this.getUserName(msg.user);
          const channelName = await this.getChannelName(msg.channel);

          const messageInput: MessageInput = {
            channelId: msg.channel,
            channelName,
            userId: msg.user,
            userName,
            text: msg.text || '',
            threadTs: msg.thread_ts,
            timestamp: msg.ts,
          };

          this.storage.saveMessage(messageInput);
          logger.debug(`Saved message from ${userName} in #${channelName}`);
        }
      } catch (error) {
        logger.error('Error processing message:', error);
      }
    });

    // Handle app mentions for interactive commands
    this.app.event('app_mention', async ({ event, say }) => {
      try {
        const text = event.text.toLowerCase();

        if (text.includes('status')) {
          const stats = this.storage.getMessageStats(24);
          await say({
            text: `📊 *Last 24 hours stats:*\n• Messages: ${stats.totalMessages}\n• Active users: ${stats.uniqueUsers}\n• Channels: ${stats.channelCount}`,
            thread_ts: event.ts,
          });
        } else if (text.includes('help')) {
          await say({
            text: `👋 *Slack Daily Priorities Bot*\n\nI monitor conversations and send daily priority summaries.\n\n*Commands:*\n• \`@bot status\` - Show message stats\n• \`@bot help\` - Show this help message`,
            thread_ts: event.ts,
          });
        }
      } catch (error) {
        logger.error('Error handling app mention:', error);
      }
    });
  }

  private async getUserName(userId: string): Promise<string> {
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId)!;
    }

    try {
      const result = await this.client.users.info({ user: userId });
      const name = result.user?.real_name || result.user?.name || userId;
      this.userCache.set(userId, name);
      return name;
    } catch (error) {
      logger.warn(`Could not fetch user info for ${userId}`);
      return userId;
    }
  }

  private async getChannelName(channelId: string): Promise<string> {
    if (this.channelCache.has(channelId)) {
      return this.channelCache.get(channelId)!;
    }

    try {
      const result = await this.client.conversations.info({ channel: channelId });
      const name = result.channel?.name || channelId;
      this.channelCache.set(channelId, name);
      return name;
    } catch (error) {
      logger.warn(`Could not fetch channel info for ${channelId}`);
      return channelId;
    }
  }

  async postMessage(channel: string, text: string, blocks?: any[]): Promise<void> {
    try {
      await this.client.chat.postMessage({
        channel,
        text,
        blocks,
        unfurl_links: false,
        unfurl_media: false,
      });
      logger.info(`Posted message to ${channel}`);
    } catch (error) {
      logger.error(`Failed to post message to ${channel}:`, error);
      throw error;
    }
  }

  async start(): Promise<void> {
    await this.app.start();
    logger.info('Slack bot started in socket mode');
  }

  async stop(): Promise<void> {
    await this.app.stop();
    logger.info('Slack bot stopped');
  }

  getClient(): WebClient {
    return this.client;
  }
}
