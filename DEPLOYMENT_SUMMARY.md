# 🤖 picoCLaw Bot Deployment Summary

## ✅ What's Been Created

### Coolify Application
- **Name:** pico-bot
- **UUID:** `hggg8o08go8gc80488g0444g`
- **Project:** picoCLaw
- **Build Pack:** Docker Compose
- **Status:** Created, awaiting deployment

### Environment Variables (Set)
| Variable | Value | Status |
|----------|-------|--------|
| DISCORD_BOT_TOKEN | `REPLACE_WITH_DISCORD_BOT_TOKEN` | ⚠️ Needs update |
| OPENAI_API_KEY | `REPLACE_WITH_OPENAI_API_KEY` | ⚠️ Needs update |
| DB_PASSWORD | `picosecret123` | ✅ Set |
| DB_HOST | `postgres` | ✅ Set |
| DB_NAME | `pico` | ✅ Set |
| DB_USER | `pico` | ✅ Set |
| DB_PORT | `5432` | ✅ Set |
| NODE_ENV | `production` | ✅ Set |

## 🚀 Next Steps

### 1. Get Required API Keys

#### Discord Bot Token
1. Go to https://discord.com/developers/applications
2. Create a New Application
3. Go to "Bot" section → Add Bot
4. Copy the Token
5. (Optional) Enable MESSAGE CONTENT INTENT under Privileged Gateway Intents

#### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new secret key
3. Copy the key

### 2. Update Environment Variables

In Coolify UI:
1. Go to https://hornz.ca
2. Projects → picoCLaw → pico-bot
3. Click "Environment Variables"
4. Update:
   - `DISCORD_BOT_TOKEN` with your actual Discord bot token
   - `OPENAI_API_KEY` with your actual OpenAI key

### 3. Deploy Options

#### Option A: Git-based Deployment (Recommended)
1. Push the bot code to `https://github.com/hornz/picoclaw-bot.git`
2. In Coolify, click "Deploy"

#### Option B: Manual Deployment
1. SSH into the Coolify server
2. Place the bot code in `/data/coolify/applications/hggg8o08go8gc80488g0444g/`
3. Run deployment from Coolify UI

### 4. Invite Bot to Discord

Use this URL (replace `YOUR_CLIENT_ID`):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=414464658496&scope=bot%20applications.commands
```

Required permissions:
- Send Messages
- Read Message History
- View Channels
- Add Reactions
- Use External Emojis

## 📁 Bot Code Location

The bot source code is at:
```
/root/.openclaw/workspace/picoclaw-bot/
```

To push to GitHub:
```bash
cd /root/.openclaw/workspace/picoclaw-bot
git remote add origin https://github.com/hornz/picoclaw-bot.git
git push -u origin main
```

## 🧠 Bot Features

- **Memory System**: PostgreSQL-backed long-term memory
- **AI Responses**: GPT-4o-mini powered witty replies
- **Evolving Personality**: Adapts based on interactions
- **Context Awareness**: Maintains conversation threads
- **User Profiles**: Learns preferences and habits

## 📊 Architecture

```
┌─────────────────┐
│   pico-bot      │  Node.js + TypeScript
│   (Discord.js)  │
└────────┬────────┘
         │
         │ AI (OpenAI)
         │
┌────────▼────────┐
│   PostgreSQL    │  Memories & User Profiles
│   (persistent)  │
└─────────────────┘
```

## 🔧 Post-Deployment

After deployment:
1. Check logs in Coolify for startup messages
2. Look for "Logged in as pico#XXXX"
3. Test by mentioning the bot in Discord

## 📝 Files Created

- `src/index.ts` - Main bot entry
- `src/brain.ts` - AI response generation
- `src/database.ts` - Memory management
- `docker-compose.yml` - Deployment config
- `Dockerfile` - Container build
- `package.json` - Dependencies

## 🔮 Future Enhancements

- [ ] Slash commands for admin controls
- [ ] Image generation capabilities
- [ ] Custom personality per server
- [ ] Analytics dashboard
- [ ] Scheduled messages/reminders

---

**Status:** ✅ Infrastructure ready, awaiting API keys + deployment
