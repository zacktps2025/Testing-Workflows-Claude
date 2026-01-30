import Anthropic from '@anthropic-ai/sdk';
import { Config } from './config';
import { StoredMessage } from './storage';
import { logger } from './logger';

export interface DailySummary {
  priorities: Priority[];
  actionItems: ActionItem[];
  keyDecisions: string[];
  openQuestions: string[];
  topicsSummary: TopicSummary[];
  overallSentiment: string;
}

export interface Priority {
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  relatedChannel?: string;
  mentionedBy?: string[];
}

export interface ActionItem {
  task: string;
  assignee?: string;
  deadline?: string;
  context: string;
}

export interface TopicSummary {
  topic: string;
  summary: string;
  channelName: string;
  participantCount: number;
}

export class ConversationAnalyzer {
  private client: Anthropic;
  private model: string;

  constructor(config: Config) {
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
    this.model = config.anthropic.model;
  }

  async analyzeDailyConversations(messages: StoredMessage[]): Promise<DailySummary> {
    if (messages.length === 0) {
      return this.getEmptySummary();
    }

    const conversationText = this.formatMessagesForAnalysis(messages);
    const prompt = this.buildAnalysisPrompt(conversationText);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return this.parseAnalysisResponse(content.text);
    } catch (error) {
      logger.error('Error analyzing conversations:', error);
      throw error;
    }
  }

  private formatMessagesForAnalysis(messages: StoredMessage[]): string {
    // Group messages by channel
    const channelGroups = new Map<string, StoredMessage[]>();

    for (const msg of messages) {
      const channelMessages = channelGroups.get(msg.channel_name) || [];
      channelMessages.push(msg);
      channelGroups.set(msg.channel_name, channelMessages);
    }

    let formattedText = '';

    for (const [channelName, channelMessages] of channelGroups) {
      formattedText += `\n=== #${channelName} ===\n`;

      for (const msg of channelMessages) {
        const timestamp = new Date(msg.created_at).toLocaleTimeString();
        const threadIndicator = msg.thread_ts ? ' (in thread)' : '';
        formattedText += `[${timestamp}] ${msg.user_name}${threadIndicator}: ${msg.text}\n`;
      }
    }

    return formattedText;
  }

  private buildAnalysisPrompt(conversationText: string): string {
    return `You are an AI assistant helping a team stay organized. Analyze the following Slack conversations from the past 24 hours and extract key information for a daily morning summary.

<conversations>
${conversationText}
</conversations>

Please analyze these conversations and provide a structured summary in the following JSON format:

{
  "priorities": [
    {
      "title": "Brief title of the priority",
      "description": "Detailed description of why this is a priority",
      "urgency": "high|medium|low",
      "relatedChannel": "channel name if applicable",
      "mentionedBy": ["names of people who brought this up"]
    }
  ],
  "actionItems": [
    {
      "task": "Description of the task",
      "assignee": "Person responsible if mentioned",
      "deadline": "Deadline if mentioned",
      "context": "Brief context about where this came up"
    }
  ],
  "keyDecisions": [
    "Summary of important decisions made"
  ],
  "openQuestions": [
    "Questions that were asked but not answered or need follow-up"
  ],
  "topicsSummary": [
    {
      "topic": "Main topic discussed",
      "summary": "Brief summary of the discussion",
      "channelName": "Channel where discussed",
      "participantCount": 3
    }
  ],
  "overallSentiment": "Brief assessment of team mood/energy based on conversations"
}

Guidelines:
- Focus on work-relevant priorities and tasks
- Identify any blockers or urgent issues
- Note any commitments or deadlines mentioned
- Capture decisions that affect the team
- Flag questions that need answers
- Be concise but informative
- If there's not enough information for a category, leave it as an empty array
- Order priorities by urgency (high first)

Return ONLY the JSON object, no additional text.`;
  }

  private parseAnalysisResponse(responseText: string): DailySummary {
    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      let jsonText = responseText.trim();

      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }

      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }

      const parsed = JSON.parse(jsonText.trim());

      return {
        priorities: parsed.priorities || [],
        actionItems: parsed.actionItems || [],
        keyDecisions: parsed.keyDecisions || [],
        openQuestions: parsed.openQuestions || [],
        topicsSummary: parsed.topicsSummary || [],
        overallSentiment: parsed.overallSentiment || 'No sentiment analysis available',
      };
    } catch (error) {
      logger.error('Failed to parse analysis response:', error);
      logger.debug('Response text:', responseText);
      return this.getEmptySummary();
    }
  }

  private getEmptySummary(): DailySummary {
    return {
      priorities: [],
      actionItems: [],
      keyDecisions: [],
      openQuestions: [],
      topicsSummary: [],
      overallSentiment: 'No conversations to analyze',
    };
  }

  formatSummaryForSlack(summary: DailySummary, stats: { totalMessages: number; uniqueUsers: number; channelCount: number }): { text: string; blocks: any[] } {
    const blocks: any[] = [];

    // Header
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🌅 Good Morning! Here\'s Your Daily Priority Summary',
        emoji: true,
      },
    });

    // Stats section
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📊 *Last 24h:* ${stats.totalMessages} messages | ${stats.uniqueUsers} active team members | ${stats.channelCount} channels`,
        },
      ],
    });

    blocks.push({ type: 'divider' });

    // Priorities
    if (summary.priorities.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*🎯 Today\'s Priorities*',
        },
      });

      for (const priority of summary.priorities) {
        const urgencyEmoji = priority.urgency === 'high' ? '🔴' : priority.urgency === 'medium' ? '🟡' : '🟢';
        const channel = priority.relatedChannel ? ` (#${priority.relatedChannel})` : '';

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${urgencyEmoji} *${priority.title}*${channel}\n${priority.description}`,
          },
        });
      }

      blocks.push({ type: 'divider' });
    }

    // Action Items
    if (summary.actionItems.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*✅ Action Items*',
        },
      });

      let actionText = '';
      for (const item of summary.actionItems) {
        const assignee = item.assignee ? ` → *${item.assignee}*` : '';
        const deadline = item.deadline ? ` (Due: ${item.deadline})` : '';
        actionText += `• ${item.task}${assignee}${deadline}\n`;
      }

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: actionText,
        },
      });

      blocks.push({ type: 'divider' });
    }

    // Key Decisions
    if (summary.keyDecisions.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*📋 Key Decisions Made*',
        },
      });

      let decisionsText = '';
      for (const decision of summary.keyDecisions) {
        decisionsText += `• ${decision}\n`;
      }

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: decisionsText,
        },
      });

      blocks.push({ type: 'divider' });
    }

    // Open Questions
    if (summary.openQuestions.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*❓ Open Questions*',
        },
      });

      let questionsText = '';
      for (const question of summary.openQuestions) {
        questionsText += `• ${question}\n`;
      }

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: questionsText,
        },
      });

      blocks.push({ type: 'divider' });
    }

    // Topics Summary
    if (summary.topicsSummary.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*💬 Discussion Highlights*',
        },
      });

      for (const topic of summary.topicsSummary.slice(0, 5)) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${topic.topic}* (in #${topic.channelName})\n${topic.summary}`,
          },
        });
      }

      blocks.push({ type: 'divider' });
    }

    // Sentiment
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `🧠 *Team Pulse:* ${summary.overallSentiment}`,
        },
      ],
    });

    // Footer
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '_Have a productive day! React with 👍 if this summary was helpful._',
        },
      ],
    });

    // Generate plain text fallback
    const text = `Good Morning! Here's Your Daily Priority Summary\n\n` +
      `Last 24h: ${stats.totalMessages} messages from ${stats.uniqueUsers} team members\n\n` +
      (summary.priorities.length > 0 ? `Top Priority: ${summary.priorities[0].title}\n` : '') +
      (summary.actionItems.length > 0 ? `Action Items: ${summary.actionItems.length} tasks to track\n` : '') +
      `\nTeam Pulse: ${summary.overallSentiment}`;

    return { text, blocks };
  }
}
