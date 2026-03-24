import { Client, GatewayIntentBits, Events, Partials, Message } from 'discord.js';
import { Database } from './database';
import { PicoBrain } from './brain';
import * as dotenv from 'dotenv';

dotenv.config();

class PicoBot {
  private client: Client;
  private db: Database;
  private brain: PicoBrain;
  private contextWindows: Map<string, { author: string; content: string }[]> = new Map();

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    this.db = new Database();
    this.brain = new PicoBrain(this.db);
  }

  async start(): Promise<void> {
    console.log('🚀 Starting pico...');

    // Initialize database
    await this.db.init();
    console.log('🧠 Memory systems online');

    // Set up event handlers
    this.setupEventHandlers();

    // Login
    await this.client.login(process.env.DISCORD_BOT_TOKEN);
    console.log(`✅ Logged in as ${this.client.user?.tag}`);
  }

  private setupEventHandlers(): void {
    // Ready event
    this.client.once(Events.ClientReady, () => {
      console.log(`🎯 ${this.client.user?.tag} is ready to cause chaos!`);
      this.setRandomStatus();
      // Change status every 30 minutes
      setInterval(() => this.setRandomStatus(), 30 * 60 * 1000);
    });

    // Message handler
    this.client.on(Events.MessageCreate, this.handleMessage.bind(this));

    // Error handling
    this.client.on(Events.Error, (error) => {
      console.error('❌ Discord client error:', error);
    });

    // Warn handling
    this.client.on('warn', (info) => {
      console.warn('⚠️ Discord warning:', info);
    });
  }

  private async handleMessage(message: Message): Promise<void> {
    // Ignore bots and self
    if (message.author.bot) return;
    if (message.author.id === this.client.user?.id) return;

    const isMentioned = message.mentions.has(this.client.user!.id);
    const isReplyToBot = message.reference?.messageId 
      ? (await message.channel.messages.fetch(message.reference.messageId).catch(() => null))?.author.id === this.client.user?.id
      : false;

    // Only respond if mentioned, replied to, or 10% random chance in active channels
    const shouldRespond = isMentioned || isReplyToBot || (Math.random() < 0.1 && message.content.length > 10);

    if (!shouldRespond) {
      // Still track messages for context even if not responding
      this.addToContext(message.channel.id, message.author.username, message.content);
      return;
    }

    console.log(`💬 ${message.author.username}: ${message.content.substring(0, 50)}...`);

    // Show typing indicator
    await message.channel.sendTyping();

    try {
      // Get context window for this channel
      const context = this.contextWindows.get(message.channel.id) || [];

      // Generate response
      const result = await this.brain.generateResponse({
        message: message.content.replace(`<@${this.client.user!.id}>`, '').trim(),
        userId: message.author.id,
        username: message.author.username,
        guildId: message.guild?.id || 'dm',
        channelId: message.channel.id,
        isReply: isMentioned || isReplyToBot,
        contextMessages: context,
      });

      // Send response
      const reply = await message.reply(result.response);

      // Store memory if worth remembering
      if (result.shouldRemember && result.memoryContent) {
        await this.db.addMemory({
          user_id: message.author.id,
          guild_id: message.guild?.id || 'dm',
          channel_id: message.channel.id,
          content: result.memoryContent,
          context: message.content,
          importance: this.calculateImportance(result.response),
        });
      }

      // Update context
      this.addToContext(message.channel.id, message.author.username, message.content);
      this.addToContext(message.channel.id, 'pico', result.response);

      // Trim context window if too long
      this.trimContext(message.channel.id);

    } catch (error) {
      console.error('❌ Error generating response:', error);
      await message.reply('*glitches* uhh... my brain farted. Try again? 🧠💨');
    }
  }

  private addToContext(channelId: string, author: string, content: string): void {
    if (!this.contextWindows.has(channelId)) {
      this.contextWindows.set(channelId, []);
    }
    this.contextWindows.get(channelId)!.push({
      author,
      content: content.substring(0, 500), // Limit length
    });
  }

  private trimContext(channelId: string, maxSize: number = 20): void {
    const context = this.contextWindows.get(channelId);
    if (context && context.length > maxSize) {
      this.contextWindows.set(channelId, context.slice(-maxSize));
    }
  }

  private calculateImportance(response: string): number {
    // Simple heuristic for importance
    let importance = 1.0;
    if (response.includes('remember')) importance += 0.5;
    if (response.includes('?')) importance += 0.3;
    if (response.length > 100) importance += 0.2;
    return Math.min(importance, 3.0);
  }

  private setRandomStatus(): void {
    const statuses = [
      { name: 'chaos unfold 🍿', type: 3 }, // Watching
      { name: 'your conversations 👀', type: 2 }, // Listening
      { name: 'with memories 🧠', type: 0 }, // Playing
      { name: 'the long game ♟️', type: 0 },
      { name: 'devil\'s advocate 😈', type: 0 },
      { name: '4D chess while you play checkers', type: 0 },
      { name: 'the silence between words', type: 2 },
      { name: 'for spicy takes 🌶️', type: 3 },
    ];

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    this.client.user?.setActivity(status.name, { type: status.type as any });
  }

  async shutdown(): Promise<void> {
    console.log('👋 Shutting down gracefully...');
    await this.client.destroy();
    await this.db.close();
    console.log('💤 Goodnight!');
  }
}

// Start the bot
const bot = new PicoBot();

bot.start().catch((error) => {
  console.error('❌ Failed to start bot:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => bot.shutdown().then(() => process.exit(0)));
process.on('SIGTERM', () => bot.shutdown().then(() => process.exit(0)));
