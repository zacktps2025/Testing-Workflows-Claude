import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

export interface StoredMessage {
  id: number;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  text: string;
  thread_ts: string | null;
  timestamp: string;
  created_at: string;
}

export interface MessageInput {
  channelId: string;
  channelName: string;
  userId: string;
  userName: string;
  text: string;
  threadTs?: string;
  timestamp: string;
}

export class MessageStorage {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initializeSchema();
    logger.info(`Database initialized at ${dbPath}`);
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT NOT NULL,
        channel_name TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        text TEXT NOT NULL,
        thread_ts TEXT,
        timestamp TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_ts);
    `);
  }

  saveMessage(message: MessageInput): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO messages (channel_id, channel_name, user_id, user_name, text, thread_ts, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      message.channelId,
      message.channelName,
      message.userId,
      message.userName,
      message.text,
      message.threadTs || null,
      message.timestamp
    );
  }

  getMessagesSince(hours: number): StoredMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE created_at >= datetime('now', ?)
      ORDER BY timestamp ASC
    `);

    return stmt.all(`-${hours} hours`) as StoredMessage[];
  }

  getMessagesForChannel(channelId: string, hours: number): StoredMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE channel_id = ? AND created_at >= datetime('now', ?)
      ORDER BY timestamp ASC
    `);

    return stmt.all(channelId, `-${hours} hours`) as StoredMessage[];
  }

  getThreadMessages(threadTs: string): StoredMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE thread_ts = ? OR timestamp = ?
      ORDER BY timestamp ASC
    `);

    return stmt.all(threadTs, threadTs) as StoredMessage[];
  }

  getMessageStats(hours: number): { totalMessages: number; uniqueUsers: number; channelCount: number } {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as totalMessages,
        COUNT(DISTINCT user_id) as uniqueUsers,
        COUNT(DISTINCT channel_id) as channelCount
      FROM messages
      WHERE created_at >= datetime('now', ?)
    `);

    return stmt.get(`-${hours} hours`) as { totalMessages: number; uniqueUsers: number; channelCount: number };
  }

  cleanOldMessages(retentionDays: number): number {
    const stmt = this.db.prepare(`
      DELETE FROM messages
      WHERE created_at < datetime('now', ?)
    `);

    const result = stmt.run(`-${retentionDays} days`);
    return result.changes;
  }

  close(): void {
    this.db.close();
  }
}
