import { getOdds as getVeikkausOdds } from './scrapers/veikkaus.js';

const DEMO_MODE = process.env.DEMO_MODE === '1';

async function runVeikkausFetchOnce() {
  const events = await getVeikkausOdds();
  console.log(`Veikkaus events: ${events.length}`);
  if (events[0]) {
    console.log(JSON.stringify(events[0], null, 2));
  }
}

async function main() {
  if (DEMO_MODE) {
    console.log('DEMO_MODE=1 is set, but phase 1 only fetches Veikkaus odds and prints to console.');
  }

  try {
    await runVeikkausFetchOnce();
  } catch (error) {
    console.error('[veikkaus] fetch failed:', error.message);
    process.exitCode = 1;
  }
}

main();
