// Entry point: loads configuration and starts the Discord bot process.
import 'dotenv/config';
import { startBot } from './bot.js';

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('Missing DISCORD_TOKEN in environment variables.');
  process.exit(1);
}

startBot(token).catch((error) => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});
