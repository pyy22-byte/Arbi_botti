# Arbi_botti

## Run in demo mode

```bash
DEMO_MODE=1 npm start
```

This runs the pipeline end-to-end using local demo data (no live scraping), computes matches/arbitrage, and sends Discord notifications for detected opportunities.

## Required environment variables

- `DISCORD_BOT_TOKEN` - Discord bot token
- `DISCORD_CHANNEL_ID` - Target Discord channel ID
- `DEMO_MODE` - Set to `1` to use demo data (optional)
