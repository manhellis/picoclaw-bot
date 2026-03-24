# 🤖 pico - The Witty, Evolving Discord Bot

pico is a Discord bot with personality, memory, and the ability to learn from every conversation. Built for the picoCLaw project.

## ✨ Features

- **🧠 Long-term Memory**: Remembers facts, preferences, and inside jokes about users
- **🎭 Evolving Personality**: Adapts its wit, sarcasm, and helpfulness based on interactions
- **💬 Contextual Conversations**: Maintains conversation threads across multiple messages
- **🎲 Dynamic Responses**: Uses AI to generate witty, contextual responses
- **📊 User Profiles**: Tracks interaction patterns and preferences for each user

## 🚀 Tech Stack

- **Node.js** + **TypeScript** - Core runtime
- **Discord.js** - Discord API integration
- **PostgreSQL** - Memory and data persistence
- **OpenAI GPT-4o-mini** - Response generation
- **Docker + Docker Compose** - Deployment

## 🛠️ Setup

### Prerequisites

- Docker and Docker Compose
- Discord Bot Token
- OpenAI API Key

### Environment Variables

```bash
DISCORD_BOT_TOKEN=your_bot_token
OPENAI_API_KEY=your_openai_key
DB_PASSWORD=secure_password
```

### Running Locally

```bash
# Install dependencies
npm install

# Build
npm run build

# Run (requires PostgreSQL running)
npm start
```

### Running with Docker

```bash
docker-compose up -d
```

## 📁 Project Structure

```
picoclaw-bot/
├── src/
│   ├── index.ts       # Bot entry point
│   ├── database.ts    # PostgreSQL/memory management
│   └── brain.ts       # AI response generation
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 🎯 How It Works

1. **Message Processing**: Listens to all messages in configured channels
2. **Response Triggers**: Responds when mentioned, replied to, or randomly (10% chance)
3. **Memory System**: Stores important facts about users and conversations
4. **AI Generation**: Uses GPT-4o-mini with custom personality prompts
5. **Learning Loop**: Adjusts personality traits based on positive/negative interactions

## 🔮 Future Features

- [ ] Slash commands for memory management
- [ ] Custom personality per server
- [ ] Image generation and analysis
- [ ] Scheduled messages/reminders
- [ ] Integration with external APIs

## 📜 License

MIT - Made with 💜 by picoCLaw
