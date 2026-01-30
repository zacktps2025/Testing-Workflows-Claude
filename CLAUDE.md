# CLAUDE.md - AI Assistant Guidelines

This file provides context and guidelines for AI assistants (like Claude) working with this repository.

## Repository Overview

**Repository:** slack-daily-priorities
**Purpose:** AI-powered Slack monitoring system that provides daily priority summaries
**Stack:** Node.js, TypeScript, Slack Bolt SDK, Claude API, SQLite

## Project Structure

```
slack-daily-priorities/
├── CLAUDE.md           # AI assistant guidelines (this file)
├── README.md           # Project documentation
├── package.json        # Node.js dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore rules
├── src/
│   ├── index.ts        # Main entry point
│   ├── config.ts       # Configuration loader
│   ├── logger.ts       # Winston logger setup
│   ├── storage.ts      # SQLite message storage
│   ├── slack-bot.ts    # Slack Bolt integration
│   ├── analyzer.ts     # Claude AI conversation analyzer
│   └── scheduler.ts    # Cron-based daily summary scheduler
├── data/               # SQLite database (gitignored)
└── logs/               # Application logs (gitignored)
```

## Architecture

### Data Flow
1. **Message Collection**: Slack bot listens to messages via Socket Mode
2. **Storage**: Messages stored in SQLite with metadata (channel, user, timestamp)
3. **Scheduling**: node-cron triggers daily summary at configured time
4. **Analysis**: Claude API analyzes 24h of conversations, extracts priorities
5. **Delivery**: Formatted summary posted to designated Slack channel

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Config | `src/config.ts` | Environment variable loading and validation |
| Storage | `src/storage.ts` | SQLite database operations for messages |
| Slack Bot | `src/slack-bot.ts` | Real-time message monitoring via Bolt SDK |
| Analyzer | `src/analyzer.ts` | Claude API integration for conversation analysis |
| Scheduler | `src/scheduler.ts` | Cron-based scheduling for daily summaries |

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Manually trigger a summary (for testing)
npm start -- --trigger-now
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_BOT_TOKEN` | Yes | Slack bot OAuth token (xoxb-...) |
| `SLACK_APP_TOKEN` | Yes | Slack app-level token (xapp-...) |
| `SLACK_SIGNING_SECRET` | Yes | Slack app signing secret |
| `SLACK_SUMMARY_CHANNEL` | Yes | Channel ID for posting summaries |
| `SLACK_MONITORED_CHANNELS` | No | Comma-separated channel IDs to monitor |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `ANTHROPIC_MODEL` | No | Claude model (default: claude-sonnet-4-20250514) |
| `DAILY_SUMMARY_CRON` | No | Cron schedule (default: 0 9 * * 1-5) |
| `TIMEZONE` | No | Timezone (default: America/New_York) |

## AI Assistant Instructions

### When Working on This Repository

1. **Understand the data flow** before making changes to any component
2. **Test Slack integrations** carefully - they affect real workspace communication
3. **Preserve message privacy** - never log full message contents in production
4. **Handle API errors gracefully** - both Slack and Claude APIs can fail
5. **Respect rate limits** - Slack and Anthropic have API rate limits

### Key Files to Understand

- `src/analyzer.ts:buildAnalysisPrompt()` - The prompt sent to Claude for analysis
- `src/analyzer.ts:formatSummaryForSlack()` - Slack Block Kit formatting
- `src/storage.ts:getMessagesSince()` - How messages are retrieved for analysis
- `src/scheduler.ts:runDailySummary()` - The main daily summary workflow

### Common Tasks

**Adding a new analysis feature:**
1. Update the prompt in `analyzer.ts:buildAnalysisPrompt()`
2. Add corresponding interface types in `analyzer.ts`
3. Update `parseAnalysisResponse()` to handle new fields
4. Add Slack Block Kit formatting in `formatSummaryForSlack()`

**Changing the summary schedule:**
1. Modify `DAILY_SUMMARY_CRON` in `.env`
2. Or update default in `config.ts`

**Adding new Slack commands:**
1. Add event handler in `slack-bot.ts:setupEventHandlers()`
2. Follow existing patterns for `app_mention` handling

### Prohibited Actions

- Do not commit `.env` files or API keys
- Do not store message contents in logs (use message IDs only)
- Do not force push to main branch
- Do not modify Slack permissions without team approval

### Code Conventions

- Use TypeScript strict mode
- Handle all async errors with try/catch
- Use the `logger` for all logging (not console.log)
- Follow existing patterns for Slack Block Kit formatting
- Keep Claude prompts in dedicated methods for easy modification

## Slack App Configuration

The Slack app requires these scopes and features:

### Bot Token Scopes
- `channels:history` - Read messages in public channels
- `channels:read` - View basic channel info
- `chat:write` - Send messages
- `groups:history` - Read messages in private channels (if needed)
- `users:read` - Get user information

### App Features
- **Socket Mode**: Enabled (for real-time events without public URL)
- **Event Subscriptions**: `message.channels`, `app_mention`

---

*Last updated: 2026-01-30*
