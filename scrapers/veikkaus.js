import { chromium } from 'playwright';

const VEIKKAUS_URL = 'https://www.veikkaus.fi/fi/vedonlyonti';

function normalizeSport(value = '') {
  return value.trim().toLowerCase();
}

function normalizeLeague(value = '') {
  return value.trim().toLowerCase();
}

function toHelsinkiISO(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));

  const tzName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Helsinki',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value;

  const offset = (tzName || 'GMT+2').replace('GMT', '');
  const normalizedOffset = offset.includes(':')
    ? offset
    : `${offset}:00`;

  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}${normalizedOffset}`;
}

function parseTeams(event) {
  if (Array.isArray(event?.participants) && event.participants.length >= 2) {
    return [event.participants[0]?.name, event.participants[1]?.name].filter(Boolean);
  }
  if (typeof event?.name === 'string' && /[-–]/.test(event.name)) {
    return event.name.split(/[-–]/).map((v) => v.trim()).slice(0, 2);
  }
  return [];
}

function normalizeMarketType(marketName = '') {
  const lower = marketName.toLowerCase();
  if (lower.includes('1x2')) return '1X2';
  if (lower.includes('moneyline')) return 'Moneyline';
  if (lower.includes('yli/alle') || lower.includes('over/under') || lower.includes('total')) return 'Over/Under';
  return marketName || 'Unknown';
}

function parseVeikkausPayload(payload) {
  const rows = payload?.events || payload?.matches || payload?.data?.events || [];
  const events = [];

  for (const event of rows) {
    const markets = event?.markets || event?.betOffers || event?.rows || [];

    const base = {
      sport: normalizeSport(event?.sport?.name || event?.sportName || ''),
      league: normalizeLeague(event?.league?.name || event?.competitionName || ''),
      startTime: toHelsinkiISO(event?.startTime || event?.matchTime || event?.date),
      teams: parseTeams(event),
      source: 'veikkaus',
      url: event?.url || (event?.id ? `https://www.veikkaus.fi/fi/vedonlyonti/tapahtuma/${event.id}` : VEIKKAUS_URL),
    };

    for (const market of markets) {
      const selectionsRaw = market?.selections || market?.outcomes || market?.options || [];
      const selections = selectionsRaw
        .map((selection) => ({
          name: selection?.name || selection?.label || selection?.outcome,
          odds: Number(selection?.odds || selection?.price || selection?.decimalOdds),
        }))
        .filter((s) => s.name && Number.isFinite(s.odds) && s.odds > 1);

      if (selections.length < 2) continue;

      events.push({
        ...base,
        marketType: normalizeMarketType(market?.name || market?.type || ''),
        selections,
      });
    }
  }

  return events;
}

export async function getOdds() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const collected = [];

  try {
    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      if (!contentType.includes('application/json')) return;
      if (!/event|odds|sports|bet|market|match/i.test(url)) return;

      try {
        const json = await response.json();
        collected.push(...parseVeikkausPayload(json));
      } catch {
        // Ignore non-JSON bodies or unsupported payloads.
      }
    });

    await page.goto(VEIKKAUS_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(6000);

    return collected;
  } finally {
    await page.close();
    await browser.close();
  }
}
