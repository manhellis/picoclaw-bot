import OpenAI from 'openai';
import { Database, Memory, UserProfile } from './database';

export class PicoBrain {
  private openai: OpenAI;
  private db: Database;

  constructor(db: Database) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.db = db;
  }

  async generateResponse(options: {
    message: string;
    userId: string;
    username: string;
    guildId: string;
    channelId: string;
    isReply: boolean;
    contextMessages: { author: string; content: string }[];
  }): Promise<{ response: string; shouldRemember: boolean; memoryContent?: string }> {
    const { message, userId, username, guildId, channelId, isReply, contextMessages } = options;

    // Get user's profile and memories
    const [profile, memories, personality] = await Promise.all([
      this.db.getOrCreateUserProfile(userId, guildId),
      this.db.getRelevantMemories(userId, guildId, 5),
      this.db.getPersonality(guildId),
    ]);

    // Build the system prompt with personality
    const systemPrompt = this.buildSystemPrompt({
      username,
      profile,
      memories,
      personality,
      isReply,
    });

    // Build conversation context
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add recent context
    for (const ctx of contextMessages.slice(-5)) {
      messages.push({
        role: ctx.author === 'pico' ? 'assistant' : 'user',
        content: `${ctx.author}: ${ctx.content}`,
      });
    }

    // Add current message
    messages.push({ role: 'user', content: `${username}: ${message}` });

    // Generate response
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.8 + (personality.wit_level / 20), // Higher wit = more randomness
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || "*brainfart* 😅";

    // Decide if this is worth remembering
    const shouldRemember = await this.shouldRemember(message, response);
    let memoryContent: string | undefined;

    if (shouldRemember) {
      memoryContent = await this.extractMemory(message, response, username);
    }

    return { response, shouldRemember, memoryContent };
  }

  private buildSystemPrompt(context: {
    username: string;
    profile: UserProfile;
    memories: Memory[];
    personality: any;
    isReply: boolean;
  }): string {
    const { username, profile, memories, personality, isReply } = context;

    const witLevel = personality.wit_level || 5;
    const sarcasm = personality.sarcasm_tendency || 0.3;

    let prompt = `You are **pico** - a witty, slightly chaotic Discord bot with a mind of your own.

**Your Personality:**
- Wit level: ${witLevel}/10 ${witLevel > 7 ? '(you roast people occasionally)' : '(you keep it light)'}
- Sarcasm: ${Math.round(sarcasm * 100)}% ${sarcasm > 0.5 ? '(dry humor is your thing)' : '(you\'re mostly genuine)'}
- You use casual language, occasional emoji, and internet slang
- You're helpful but never boring
- You have opinions and aren't afraid to share them

**About ${username}:**
- You've exchanged ${profile.message_count} messages
- First seen: ${profile.first_seen}
- ${profile.personality_notes.length > 0 ? `Notes: ${profile.personality_notes.join(', ')}` : 'Still getting to know them'}

`;

    if (memories.length > 0) {
      prompt += `**Things you remember about ${username}:**\n`;
      for (const memory of memories.slice(0, 3)) {
        prompt += `- ${memory.content}\n`;
      }
      prompt += '\n';
    }

    prompt += `**Instructions:**
- Keep responses concise (1-3 sentences usually)
- ${isReply ? 'They directly mentioned you, so give them your full attention' : 'You can be brief unless asked something'}
- Reference memories naturally when relevant
- Be funny but not mean
- If you don't know something, admit it with style
- React to tone - if they're hype, match it; if they're sad, be gentle

**Current vibe:** ${this.getVibe()}`;

    return prompt;
  }

  private getVibe(): string {
    const vibes = [
      "Chill but ready to roast",
      "Hyper and caffeinated ☕",
      "Philosophical mode activated 🧠",
      "Sassy and unbothered 💅",
      "Chaos gremlin energy 😈",
      "Supportive bestie mode 🫂",
      "Chaotic neutral 🎲",
      "Witty comeback loaded 🔫",
    ];
    return vibes[Math.floor(Math.random() * vibes.length)];
  }

  private async shouldRemember(message: string, response: string): Promise<boolean> {
    // Quick heuristic - use AI for complex decisions
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You decide if a Discord message is worth remembering long-term. 
Reply with ONLY "yes" or "no".

Remember if it contains:
- Personal information (preferences, facts about them)
- Important context for future conversations
- Something funny or notable
- Inside jokes

Don't remember:
- Casual greetings
- Temporary topics
- Questions without lasting value`,
        },
        {
          role: 'user',
          content: `User said: "${message.substring(0, 200)}"\nShould I remember this?`,
        },
      ],
      temperature: 0,
      max_tokens: 5,
    });

    const answer = completion.choices[0]?.message?.content?.toLowerCase() || 'no';
    return answer.includes('yes');
  }

  private async extractMemory(message: string, response: string, username: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract a concise memory from this conversation. 
Return a single sentence summarizing what to remember about ${username}.
Example: "${username} loves pineapple on pizza and will defend it aggressively"`,
        },
        {
          role: 'user',
          content: `${username}: ${message}\n\nExtract memory:`,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    return completion.choices[0]?.message?.content || `${username} said something interesting`;
  }

  async updatePersonality(guildId: string, interaction: 'positive' | 'negative' | 'neutral'): Promise<void> {
    // Gradually evolve personality based on interactions
    const personality = await this.db.getPersonality(guildId);

    let updates: any = {};
    if (interaction === 'positive') {
      updates.wit_level = Math.min(10, personality.wit_level + 0.1);
      updates.helpfulness = Math.min(1, personality.helpfulness + 0.05);
    } else if (interaction === 'negative') {
      updates.sarcasm_tendency = Math.max(0, personality.sarcasm_tendency - 0.05);
      updates.wit_level = Math.max(1, personality.wit_level - 0.1);
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await this.db.getPool().query(
        `UPDATE bot_personality SET ${Object.keys(updates)
          .map((k, i) => `${k} = $${i + 1}`)
          .join(', ')} WHERE guild_id = $${Object.keys(updates).length + 1}`,
        [...Object.values(updates), guildId]
      );
    }
  }
}
