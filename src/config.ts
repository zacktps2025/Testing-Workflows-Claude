import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  slack: {
    botToken: string;
    appToken: string;
    signingSecret: string;
    summaryChannel: string;
    monitoredChannels: string[];
  };
  anthropic: {
    apiKey: string;
    model: string;
  };
  schedule: {
    dailySummaryTime: string; // Cron format, e.g., "0 9 * * 1-5" for 9 AM weekdays
    timezone: string;
  };
  database: {
    path: string;
  };
  messageRetentionDays: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export function loadConfig(): Config {
  return {
    slack: {
      botToken: requireEnv('SLACK_BOT_TOKEN'),
      appToken: requireEnv('SLACK_APP_TOKEN'),
      signingSecret: requireEnv('SLACK_SIGNING_SECRET'),
      summaryChannel: requireEnv('SLACK_SUMMARY_CHANNEL'),
      monitoredChannels: optionalEnv('SLACK_MONITORED_CHANNELS', '')
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0),
    },
    anthropic: {
      apiKey: requireEnv('ANTHROPIC_API_KEY'),
      model: optionalEnv('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514'),
    },
    schedule: {
      dailySummaryTime: optionalEnv('DAILY_SUMMARY_CRON', '0 9 * * 1-5'), // 9 AM weekdays
      timezone: optionalEnv('TIMEZONE', 'America/New_York'),
    },
    database: {
      path: optionalEnv('DATABASE_PATH', './data/messages.db'),
    },
    messageRetentionDays: parseInt(optionalEnv('MESSAGE_RETENTION_DAYS', '30'), 10),
  };
}
