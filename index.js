import 'dotenv/config';
import { getOdds as getPafOdds } from './scrapers/paf.js';
import { getOdds as getVeikkausOdds } from './scrapers/veikkaus.js';
import { pafEvents as demoPafEvents, veikkausEvents as demoVeikkausEvents } from './demoData.js';
import { matchEvents } from './matcher.js';
import { calculateArbitrage } from './arbCalculator.js';
import { initBot, sendArbitrageNotification } from './bot.js';

const SCAN_INTERVAL_MS = 60 * 1000;
const DEMO_MODE = process.env.DEMO_MODE === '1';

async function processEvents(pafEvents, veikkausEvents, options = {}) {
  const matched = matchEvents(pafEvents, veikkausEvents, options);

  for (const event of matched) {
    const opportunity = calculateArbitrage(event);
    if (!opportunity) continue;

    try {
      const sent = await sendArbitrageNotification(opportunity);
      if (sent) {
        console.log(
          `[arb] Sent alert for ${opportunity.teams.join(' vs ')} (${(opportunity.profit * 100).toFixed(2)}%)`,
        );
      }
    } catch (error) {
      console.error('[discord] failed to send notification:', error.message);
    }
  }
}

async function scanOnce() {
  let pafEvents = [];
  let veikkausEvents = [];

  try {
    pafEvents = await getPafOdds();
  } catch (error) {
    console.error('[paf] scrape failed:', error.message);
  }

  try {
    veikkausEvents = await getVeikkausOdds();
  } catch (error) {
    console.error('[veikkaus] scrape failed:', error.message);
  }

  await processEvents(pafEvents, veikkausEvents);
}

async function runDemoMode() {
  console.log('DEMO_MODE=1 enabled: using local demoData.js without live scrapers.');
  await processEvents(demoPafEvents, demoVeikkausEvents, { demoMode: true });
}

async function main() {
  await initBot();
  console.log('Discord bot connected. Starting arbitrage scanner...');

  if (DEMO_MODE) {
    await runDemoMode();
    return;
  }

  await scanOnce();
  setInterval(async () => {
    await scanOnce();
  }, SCAN_INTERVAL_MS);
}

main().catch((error) => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});
