import { loadConfig } from './config';
import { MessageStorage } from './storage';
import { SlackBot } from './slack-bot';
import { ConversationAnalyzer } from './analyzer';
import { DailySummaryScheduler } from './scheduler';
import { logger } from './logger';

async function main(): Promise<void> {
  logger.info('Starting Slack Daily Priorities Bot...');

  // Load configuration
  const config = loadConfig();
  logger.info('Configuration loaded');

  // Initialize components
  const storage = new MessageStorage(config.database.path);
  const slackBot = new SlackBot(config, storage);
  const analyzer = new ConversationAnalyzer(config);
  const scheduler = new DailySummaryScheduler(config, storage, analyzer, slackBot);

  // Handle graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down...`);

    scheduler.stop();
    await slackBot.stop();
    storage.close();

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  });

  // Start the bot
  await slackBot.start();

  // Start the scheduler
  scheduler.start();

  // Check for manual trigger flag (useful for testing)
  if (process.argv.includes('--trigger-now')) {
    logger.info('Manual trigger flag detected, running summary now...');
    await scheduler.triggerSummaryNow();
  }

  logger.info('Bot is running! Press Ctrl+C to stop.');

  // Log monitored channels
  if (config.slack.monitoredChannels.length > 0) {
    logger.info(`Monitoring channels: ${config.slack.monitoredChannels.join(', ')}`);
  } else {
    logger.info('Monitoring all channels the bot is a member of');
  }

  logger.info(`Daily summary will be posted to: ${config.slack.summaryChannel}`);
}

main().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});
