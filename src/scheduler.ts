import cron from 'node-cron';
import { Config } from './config';
import { MessageStorage } from './storage';
import { ConversationAnalyzer } from './analyzer';
import { SlackBot } from './slack-bot';
import { logger } from './logger';

export class DailySummaryScheduler {
  private config: Config;
  private storage: MessageStorage;
  private analyzer: ConversationAnalyzer;
  private slackBot: SlackBot;
  private scheduledTask: cron.ScheduledTask | null = null;
  private cleanupTask: cron.ScheduledTask | null = null;

  constructor(
    config: Config,
    storage: MessageStorage,
    analyzer: ConversationAnalyzer,
    slackBot: SlackBot
  ) {
    this.config = config;
    this.storage = storage;
    this.analyzer = analyzer;
    this.slackBot = slackBot;
  }

  start(): void {
    // Schedule daily summary
    this.scheduledTask = cron.schedule(
      this.config.schedule.dailySummaryTime,
      async () => {
        logger.info('Running scheduled daily summary...');
        await this.runDailySummary();
      },
      {
        timezone: this.config.schedule.timezone,
      }
    );

    // Schedule daily cleanup at midnight
    this.cleanupTask = cron.schedule(
      '0 0 * * *',
      () => {
        logger.info('Running scheduled cleanup...');
        this.runCleanup();
      },
      {
        timezone: this.config.schedule.timezone,
      }
    );

    logger.info(`Daily summary scheduled: ${this.config.schedule.dailySummaryTime} (${this.config.schedule.timezone})`);
    logger.info('Daily cleanup scheduled: midnight');
  }

  stop(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
    }
    if (this.cleanupTask) {
      this.cleanupTask.stop();
      this.cleanupTask = null;
    }
    logger.info('Scheduler stopped');
  }

  async runDailySummary(): Promise<void> {
    try {
      // Get messages from last 24 hours
      const messages = this.storage.getMessagesSince(24);
      const stats = this.storage.getMessageStats(24);

      logger.info(`Analyzing ${messages.length} messages from last 24 hours`);

      if (messages.length === 0) {
        logger.info('No messages to analyze, skipping summary');
        await this.slackBot.postMessage(
          this.config.slack.summaryChannel,
          '🌅 Good morning! It was quiet in the last 24 hours - no conversations to summarize. Have a great day!'
        );
        return;
      }

      // Analyze conversations
      const summary = await this.analyzer.analyzeDailyConversations(messages);

      // Format and post to Slack
      const { text, blocks } = this.analyzer.formatSummaryForSlack(summary, stats);

      await this.slackBot.postMessage(
        this.config.slack.summaryChannel,
        text,
        blocks
      );

      logger.info('Daily summary posted successfully');
    } catch (error) {
      logger.error('Failed to run daily summary:', error);

      // Try to post error notification
      try {
        await this.slackBot.postMessage(
          this.config.slack.summaryChannel,
          '⚠️ Sorry, I encountered an error generating today\'s summary. The team has been notified.'
        );
      } catch {
        // Ignore notification failure
      }
    }
  }

  private runCleanup(): void {
    try {
      const deleted = this.storage.cleanOldMessages(this.config.messageRetentionDays);
      logger.info(`Cleaned up ${deleted} messages older than ${this.config.messageRetentionDays} days`);
    } catch (error) {
      logger.error('Failed to run cleanup:', error);
    }
  }

  // Method to manually trigger summary (useful for testing)
  async triggerSummaryNow(): Promise<void> {
    logger.info('Manually triggering daily summary...');
    await this.runDailySummary();
  }
}
