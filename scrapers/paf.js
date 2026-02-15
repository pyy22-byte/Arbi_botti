import { chromium } from 'playwright';

const PAF_URL = 'https://www.paf.fi/sports';

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

function pickTeams(event) {
  if (Array.isArray(event?.competitors) && event.competitors.length >= 2) {
    return [event.competitors[0]?.name, event.competitors[1]?.name].filter(Boolean);
  }
  if (Array.isArray(event?.participants) && event.participants.length >= 2) {
    return [event.participants[0]?.name, event.participants[1]?.name].filter(Boolean);
  }
  if (typeof event?.name === 'string' && event.name.includes(' - ')) {
    return event.name.split(' - ').map((v) => v.trim()).slice(0, 2);
  }
  return [];
}

function normalizeMarketType(marketName = '') {
  const lower = marketName.toLowerCase();
  if (lower.includes('1x2')) return '1X2';
  if (lower.includes('moneyline')) return 'Moneyline';
  if (lower.includes('over/under') || lower.includes('total')) return 'Over/Under';
  return marketName || 'Unknown';
}

function parsePafPayload(payload) {
  const events = [];
  const rows = payload?.events || payload?.data?.events || payload?.items || [];

  for (const event of rows) {
    const markets = event?.markets || event?.betOffers || [];
    const base = {
      sport: normalizeSport(event?.sport?.name || event?.sportName || ''),
      league: normalizeLeague(event?.league?.name || event?.competitionName || ''),
      startTime: toHelsinkiISO(event?.startTime || event?.startsAt || event?.date),
      teams: pickTeams(event),
      source: 'paf',
      url: event?.url || (event?.id ? `https://www.paf.fi/sports/event/${event.id}` : PAF_URL),
    };

    for (const market of markets) {
      const selectionsRaw = market?.selections || market?.outcomes || [];
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
      if (!/event|odds|sports|offer|market/i.test(url)) return;

      try {
        const json = await response.json();
        collected.push(...parsePafPayload(json));
      } catch {
        // Ignore non-JSON bodies or unexpected payloads.
      }
    });

    await page.goto(PAF_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(6000);

    return collected;
  } finally {
    await page.close();
    await browser.close();
  }
}
