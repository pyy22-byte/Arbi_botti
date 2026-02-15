# Arbi_botti

Node.js (ES modules) scaffolding for a Discord bot that will monitor sports betting odds from **paf.fi** and **veikkaus.fi**, then report potential arbitrage opportunities.

## Tech stack

- Node.js (ESM)
- discord.js v14
- Playwright
- dotenv

## Project structure

```text
.
├── index.js
├── bot.js
├── scrapers/
│   ├── paf.js
│   └── veikkaus.js
├── matcher.js
├── arbCalculator.js
└── README.md
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file:

   ```env
   DISCORD_TOKEN=your_discord_bot_token
   ```

3. Start the bot:

   ```bash
   npm start
   ```

When configured with a valid token, the bot logs in and prints the account tag in console.

## Current status

This repository currently provides **scaffolding only**:

- `scrapers/paf.js` and `scrapers/veikkaus.js` expose placeholder `getOdds()` functions with TODOs.
- `matcher.js` contains TODOs for event matching logic.
- `arbCalculator.js` contains TODOs for arbitrage calculations.
- `bot.js` shows the orchestration flow for future Discord notifications.

No full scraping implementation is included yet.
