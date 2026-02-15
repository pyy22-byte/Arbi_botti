import 'dotenv/config';
import { getOdds as getVeikkausOdds } from './scrapers/veikkaus.js';
import { pafEvents as demoPafEvents, veikkausEvents as demoVeikkausEvents } from './demoData.js';
import { matchEvents } from './matcher.js';
import { calculateArbitrage } from './arbCalculator.js';
import { initBot, sendArbitrageNotification } from './bot.js';

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

async function runDemoMode() {
  console.log('DEMO_MODE=1 enabled: using local demoData.js without live scrapers.');
  await initBot();
  await processEvents(demoPafEvents, demoVeikkausEvents, { demoMode: true });
}

async function runLiveVeikkausFetch() {
  console.log('Live mode: fetching Veikkaus odds once (no matching/arbitrage yet).');
  try {
    const veikkausEvents = await getVeikkausOdds();
    console.log(`[veikkaus] event count: ${veikkausEvents.length}`);
    if (veikkausEvents[0]) {
      console.log('[veikkaus] sample event:', JSON.stringify(veikkausEvents[0], null, 2));
    }
  } catch (error) {
    console.error('[veikkaus] scrape failed:', error.message);
  }
}

async function main() {
  if (DEMO_MODE) {
    await runDemoMode();
    return;
  }

  await runLiveVeikkausFetch();
}

main().catch((error) => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});
