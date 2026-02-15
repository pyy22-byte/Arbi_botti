// Discord bot lifecycle and message/event wiring.
// This file will later orchestrate scraping, matching, and arbitrage notifications.
import { Client, GatewayIntentBits } from 'discord.js';
import { getOdds as getPafOdds } from './scrapers/paf.js';
import { getOdds as getVeikkausOdds } from './scrapers/veikkaus.js';
import { matchEvents } from './matcher.js';
import { calculateArbitrage } from './arbCalculator.js';

export async function startBot(token) {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // TODO: Move this logic into a scheduled scanner (e.g., cron/interval + command trigger).
    // TODO: Send alerts to a configured Discord channel when arbitrage opportunities are found.
    const [pafOdds, veikkausOdds] = await Promise.all([getPafOdds(), getVeikkausOdds()]);
    const matchedEvents = matchEvents(pafOdds, veikkausOdds);
    const opportunities = calculateArbitrage(matchedEvents);

    console.log(`Scaffold run complete. Matched events: ${matchedEvents.length}, opportunities: ${opportunities.length}`);
  });

  client.on('error', (error) => {
    console.error('Discord client error:', error);
  });

  await client.login(token);
}
