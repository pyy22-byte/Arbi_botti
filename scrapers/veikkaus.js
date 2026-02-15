import { chromium } from 'playwright';

const VEIKKAUS_URL = 'https://www.veikkaus.fi/fi/vedonlyonti';
const FOOTBALL_MARKET = '1X2';
const DEBUG = process.env.DEBUG === '1';

function debugLog(...args) {
  if (DEBUG) console.log('[veikkaus]', ...args);
}

function normalizeSport(value = '') {
  return String(value).trim().toLowerCase();
}

function normalizeLeague(value = '') {
  return String(value).trim().toLowerCase();
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
  }).formatToParts(date).find((part) => part.type === 'timeZoneName')?.value;

  const offset = (tzName || 'GMT+2').replace('GMT', '');
  const normalizedOffset = offset.includes(':') ? offset : `${offset}:00`;
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}${normalizedOffset}`;
}

function extractTeams(event) {
  if (Array.isArray(event?.participants) && event.participants.length >= 2) {
    return [event.participants[0]?.name, event.participants[1]?.name].filter(Boolean);
  }
  if (Array.isArray(event?.competitors) && event.competitors.length >= 2) {
    return [event.competitors[0]?.name, event.competitors[1]?.name].filter(Boolean);
  }
  if (event?.homeTeam?.name && event?.awayTeam?.name) {
    return [event.homeTeam.name, event.awayTeam.name];
  }
  if (typeof event?.name === 'string' && /[-–]/.test(event.name)) {
    return event.name.split(/[-–]/).map((v) => v.trim()).slice(0, 2);
  }
  return [];
}

function normalizeSelectionName(name = '') {
  const lower = String(name).toLowerCase().trim();
  if (['1', 'home', 'kotivoitto'].includes(lower)) return 'Home';
  if (['x', 'draw', 'tasapeli'].includes(lower)) return 'Draw';
  if (['2', 'away', 'vierasvoitto'].includes(lower)) return 'Away';
  return String(name).trim();
}

function parseSelections(market) {
  const rows = market?.selections || market?.outcomes || market?.options || market?.choices || [];
  const selections = rows
    .map((row) => ({
      name: normalizeSelectionName(row?.name || row?.label || row?.outcome || row?.type || ''),
      odds: Number(row?.odds ?? row?.price ?? row?.decimalOdds ?? row?.coefficient),
    }))
    .filter((selection) => selection.name && Number.isFinite(selection.odds) && selection.odds > 1);

  return selections;
}

function looksLikeFootball(value = '') {
  return /football|soccer|jalkapallo/i.test(String(value));
}

function looksLike1X2(value = '') {
  return /1x2|lopputulos|full\s*time\s*result/i.test(String(value));
}

function eventUrl(event) {
  if (event?.url) return event.url;
  if (event?.slug) return `https://www.veikkaus.fi/fi/vedonlyonti/tapahtuma/${event.slug}`;
  if (event?.id) return `https://www.veikkaus.fi/fi/vedonlyonti/tapahtuma/${event.id}`;
  return VEIKKAUS_URL;
}

function createNormalizedEvent(event, market) {
  const sport = normalizeSport(event?.sport?.name || event?.sportName || event?.sport || event?.category?.name || '');
  if (!looksLikeFootball(sport)) return null;

  const marketName = market?.name || market?.type || market?.title || '';
  if (!looksLike1X2(marketName)) return null;

  const teams = extractTeams(event);
  if (teams.length !== 2) return null;

  const selections = parseSelections(market);
  if (selections.length < 3) return null;

  return {
    sport,
    league: normalizeLeague(event?.league?.name || event?.competitionName || event?.competition?.name || ''),
    startTime: toHelsinkiISO(event?.startTime || event?.matchTime || event?.date || event?.eventStartTime),
    teams,
    marketType: FOOTBALL_MARKET,
    selections: selections.slice(0, 3),
    url: eventUrl(event),
    source: 'veikkaus',
  };
}

function findEventsInPayload(payload) {
  const found = [];

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    const markets = node.markets || node.betOffers || node.rows || node.marketList;
    if (Array.isArray(markets) && markets.length > 0) {
      for (const market of markets) {
        const normalized = createNormalizedEvent(node, market);
        if (normalized) found.push(normalized);
      }
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') walk(value);
    }
  }

  walk(payload);
  return found;
}

export async function getOdds() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const endpointSet = new Set();
  const eventMap = new Map();

  try {
    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      if (!contentType.includes('application/json')) return;
      if (!/event|odds|sports|bet|market|match|api/i.test(url)) return;

      if (!endpointSet.has(url)) {
        endpointSet.add(url);
        debugLog('detected JSON endpoint:', url);
      }

      try {
        const payload = await response.json();
        const parsed = findEventsInPayload(payload);
        for (const event of parsed) {
          const key = `${event.teams.join('|')}|${event.startTime}|${event.marketType}`;
          eventMap.set(key, event);
        }
      } catch {
        // Ignore responses that are not valid JSON payloads.
      }
    });

    await page.goto(VEIKKAUS_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(8000);

    const events = [...eventMap.values()];
    debugLog(`parsed ${events.length} football ${FOOTBALL_MARKET} events`);
    if (events[0]) {
      debugLog('sample event:', JSON.stringify(events[0], null, 2));
    }

    return events;
  } finally {
    await page.close();
    await browser.close();
  }
}
