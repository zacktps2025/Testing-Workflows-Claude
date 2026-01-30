# Slack Daily Priorities Bot

An AI-powered Slack monitoring system that analyzes team conversations in real-time and delivers intelligent daily priority summaries each morning.

## Features

- **Real-time Message Monitoring**: Captures conversations across Slack channels using Socket Mode
- **AI-Powered Analysis**: Uses Claude to analyze conversations and extract actionable insights
- **Daily Priority Summaries**: Automated morning summaries with:
  - Top priorities ranked by urgency
  - Action items with assignees and deadlines
  - Key decisions made
  - Open questions needing answers
  - Discussion highlights
  - Team sentiment analysis
- **Flexible Scheduling**: Configurable summary delivery time and timezone
- **Privacy-Focused**: Messages stored locally in SQLite, automatic cleanup of old data

## Sample Daily Summary

```
🌅 Good Morning! Here's Your Daily Priority Summary

📊 Last 24h: 47 messages | 8 active team members | 4 channels

────────────────────────────────────────────────────

🎯 Today's Priorities

🔴 API Integration Deadline (#engineering)
   Client demo is Friday - need to complete OAuth flow today

🟡 Design Review Feedback (#design)
   Mobile mockups need revision based on yesterday's feedback

────────────────────────────────────────────────────

✅ Action Items

• Complete OAuth implementation → Sarah (Due: Thursday)
• Update mobile mockups → Mike
• Schedule client call → Alex (Due: Today)

────────────────────────────────────────────────────

📋 Key Decisions Made

• Going with PostgreSQL for the new service
• Launch date confirmed for March 15

────────────────────────────────────────────────────

❓ Open Questions

• Which payment provider should we integrate?
• Do we need SSO support for v1?

────────────────────────────────────────────────────

🧠 Team Pulse: Productive energy with some deadline pressure
```

## Prerequisites

- Node.js 18+
- A Slack workspace with admin access
- Anthropic API key (for Claude)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-org/slack-daily-priorities.git
cd slack-daily-priorities
npm install
```

### 2. Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name it (e.g., "Daily Priorities Bot") and select your workspace

### 3. Configure Slack App Permissions

Under **OAuth & Permissions**, add these Bot Token Scopes:
- `channels:history` - Read messages in public channels
- `channels:read` - View basic channel info
- `chat:write` - Send messages
- `users:read` - Get user display names

### 4. Enable Socket Mode

1. Go to **Socket Mode** in sidebar
2. Enable Socket Mode
3. Create an App-Level Token with `connections:write` scope
4. Save the token (starts with `xapp-`)

### 5. Enable Event Subscriptions

1. Go to **Event Subscriptions**
2. Enable Events
3. Under "Subscribe to bot events", add:
   - `message.channels`
   - `app_mention`

### 6. Install App to Workspace

1. Go to **Install App**
2. Click "Install to Workspace"
3. Copy the Bot User OAuth Token (starts with `xoxb-`)

### 7. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_APP_TOKEN=xapp-your-token
SLACK_SIGNING_SECRET=your-secret
SLACK_SUMMARY_CHANNEL=C0123456789
ANTHROPIC_API_KEY=sk-ant-your-key

# Optional
DAILY_SUMMARY_CRON=0 9 * * 1-5    # 9 AM weekdays
TIMEZONE=America/New_York
```

### 8. Add Bot to Channels

Invite the bot to channels you want to monitor:
```
/invite @DailyPrioritiesBot
```

### 9. Run the Bot

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `SLACK_MONITORED_CHANNELS` | (all) | Comma-separated channel IDs to monitor. Empty = all channels the bot is in |
| `DAILY_SUMMARY_CRON` | `0 9 * * 1-5` | When to post summaries (cron format) |
| `TIMEZONE` | `America/New_York` | Timezone for scheduling |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | Claude model to use |
| `MESSAGE_RETENTION_DAYS` | `30` | Days to keep messages before auto-cleanup |
| `DATABASE_PATH` | `./data/messages.db` | SQLite database location |

## Commands

Mention the bot for interactive commands:

- `@bot status` - Show message statistics for last 24h
- `@bot help` - Show available commands

## Testing

Manually trigger a summary for testing:

```bash
npm start -- --trigger-now
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Slack API     │────▶│   Slack Bot      │────▶│   SQLite DB     │
│  (Socket Mode)  │     │   (Bolt SDK)     │     │   (Messages)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Slack API     │◀────│   Scheduler      │◀────│   Analyzer      │
│  (Post Message) │     │   (node-cron)    │     │   (Claude API)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Deployment

### Using PM2

```bash
npm run build
pm2 start dist/index.js --name "slack-priorities"
```

### Using Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Using systemd

```ini
[Unit]
Description=Slack Daily Priorities Bot
After=network.target

[Service]
Type=simple
User=bot
WorkingDirectory=/opt/slack-priorities
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
EnvironmentFile=/opt/slack-priorities/.env

[Install]
WantedBy=multi-user.target
```

## Privacy & Security

- Messages are stored locally in SQLite - no third-party storage
- Automatic cleanup of messages older than retention period
- No message content is logged (only metadata for debugging)
- API keys stored in environment variables, not code
- Bot only reads channels it's explicitly invited to

## Troubleshooting

**Bot not receiving messages:**
- Ensure Socket Mode is enabled
- Check that `message.channels` event is subscribed
- Verify bot is invited to the channels

**Summary not posting:**
- Check cron schedule and timezone settings
- Verify `SLACK_SUMMARY_CHANNEL` is correct
- Check logs for errors: `cat logs/error.log`

**Claude API errors:**
- Verify API key is valid
- Check you have sufficient API credits
- Try a different model if rate limited

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [CLAUDE.md](CLAUDE.md) for development guidelines.
