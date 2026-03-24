import { Pool, PoolClient } from 'pg';

export interface Memory {
  id: number;
  user_id: string;
  guild_id: string;
  channel_id: string;
  content: string;
  context?: string;
  importance: number;
  created_at: Date;
  last_accessed: Date;
  access_count: number;
}

export interface UserProfile {
  user_id: string;
  guild_id: string;
  message_count: number;
  personality_notes: string[];
  preferred_topics: string[];
  interaction_style: string;
  first_seen: Date;
  last_seen: Date;
}

export class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'pico',
      user: process.env.DB_USER || 'pico',
      password: process.env.DB_PASSWORD || 'pico',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });
  }

  async init(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Memories table - stores what pico learns
      await client.query(`
        CREATE TABLE IF NOT EXISTS memories (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          guild_id VARCHAR(255) NOT NULL,
          channel_id VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          context TEXT,
          importance FLOAT DEFAULT 1.0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          access_count INTEGER DEFAULT 0
        )
      `);

      // User profiles - tracks how pico knows each person
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          guild_id VARCHAR(255) NOT NULL,
          message_count INTEGER DEFAULT 0,
          personality_notes TEXT[] DEFAULT '{}',
          preferred_topics TEXT[] DEFAULT '{}',
          interaction_style VARCHAR(50) DEFAULT 'casual',
          first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, guild_id)
        )
      `);

      // Conversations - tracks ongoing threads
      await client.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id SERIAL PRIMARY KEY,
          channel_id VARCHAR(255) NOT NULL,
          guild_id VARCHAR(255) NOT NULL,
          messages JSONB DEFAULT '[]',
          summary TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Bot's evolving personality
      await client.query(`
        CREATE TABLE IF NOT EXISTS bot_personality (
          id SERIAL PRIMARY KEY,
          guild_id VARCHAR(255) NOT NULL,
          wit_level INTEGER DEFAULT 5,
      sarcasm_tendency FLOAT DEFAULT 0.3,
          helpfulness FLOAT DEFAULT 0.8,
          inside_jokes JSONB DEFAULT '{}',
          learned_phrases TEXT[] DEFAULT '{}',
          UNIQUE(guild_id)
        )
      `);

      // Create indexes for faster queries
      await client.query(`CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_memories_guild ON memories(guild_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC)`);

      console.log('✅ Database initialized');
    } finally {
      client.release();
    }
  }

  async addMemory(memory: Omit<Memory, 'id' | 'created_at' | 'last_accessed' | 'access_count'>): Promise<void> {
    await this.pool.query(
      `INSERT INTO memories (user_id, guild_id, channel_id, content, context, importance)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [memory.user_id, memory.guild_id, memory.channel_id, memory.content, memory.context, memory.importance]
    );
  }

  async getRelevantMemories(userId: string, guildId: string, limit: number = 10): Promise<Memory[]> {
    const result = await this.pool.query(
      `SELECT * FROM memories 
       WHERE user_id = $1 AND guild_id = $2
       ORDER BY importance DESC, last_accessed DESC
       LIMIT $3`,
      [userId, guildId, limit]
    );

    // Update access count and last_accessed
    for (const row of result.rows) {
      await this.pool.query(
        `UPDATE memories SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP WHERE id = $1`,
        [row.id]
      );
    }

    return result.rows;
  }

  async getOrCreateUserProfile(userId: string, guildId: string): Promise<UserProfile> {
    const result = await this.pool.query(
      `SELECT * FROM user_profiles WHERE user_id = $1 AND guild_id = $2`,
      [userId, guildId]
    );

    if (result.rows.length > 0) {
      // Update last seen
      await this.pool.query(
        `UPDATE user_profiles SET last_seen = CURRENT_TIMESTAMP, message_count = message_count + 1 
         WHERE user_id = $1 AND guild_id = $2`,
        [userId, guildId]
      );
      return result.rows[0];
    }

    // Create new profile
    const newProfile = await this.pool.query(
      `INSERT INTO user_profiles (user_id, guild_id) VALUES ($1, $2) RETURNING *`,
      [userId, guildId]
    );
    return newProfile.rows[0];
  }

  async updateUserProfile(userId: string, guildId: string, updates: Partial<UserProfile>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length > 0) {
      values.push(userId, guildId);
      await this.pool.query(
        `UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = $${paramIndex} AND guild_id = $${paramIndex + 1}`,
        values
      );
    }
  }

  async getPersonality(guildId: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT * FROM bot_personality WHERE guild_id = $1`,
      [guildId]
    );

    if (result.rows.length === 0) {
      const newPersonality = await this.pool.query(
        `INSERT INTO bot_personality (guild_id) VALUES ($1) RETURNING *`,
        [guildId]
      );
      return newPersonality.rows[0];
    }

    return result.rows[0];
  }

  public getPool(): Pool {
    return this.pool;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
