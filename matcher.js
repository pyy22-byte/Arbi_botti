const ABBREVIATIONS = new Set(['fc', 'cf', 'ac', 'bk', 'fk', 'if', 'sc', 'hk', 'jk']);

function stripDiacritics(text) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function normalizeTeamName(name = '') {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !ABBREVIATIONS.has(token))
    .sort()
    .join(' ');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function similarity(a, b) {
  if (!a && !b) return 1;
  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - distance / maxLen;
}

function withinTenMinutes(aIso, bIso) {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= 10 * 60 * 1000;
}

function normalizeSelectionName(name = '') {
  const normalized = normalizeTeamName(name);
  if (['1', 'home', 'kotivoitto'].includes(normalized)) return 'home';
  if (['x', 'draw', 'tasapeli'].includes(normalized)) return 'draw';
  if (['2', 'away', 'vierasvoitto'].includes(normalized)) return 'away';
  if (/over|yli/.test(normalized)) return 'over';
  if (/under|alle/.test(normalized)) return 'under';
  return normalized;
}

function mapSelections(event) {
  const map = new Map();
  for (const selection of event.selections || []) {
    map.set(normalizeSelectionName(selection.name), selection);
  }
  return map;
}

export function matchEvents(pafEvents, veikkausEvents) {
  const matched = [];

  for (const pafEvent of pafEvents) {
    const pafTeams = (pafEvent.teams || []).map(normalizeTeamName).sort().join(' vs ');

    for (const veiEvent of veikkausEvents) {
      if (pafEvent.marketType !== veiEvent.marketType) continue;
      if (pafEvent.sport !== veiEvent.sport) continue;
      if (pafEvent.league !== veiEvent.league) continue;
      if (!withinTenMinutes(pafEvent.startTime, veiEvent.startTime)) continue;

      const veiTeams = (veiEvent.teams || []).map(normalizeTeamName).sort().join(' vs ');
      if (similarity(pafTeams, veiTeams) < 0.75) continue;

      const pafMap = mapSelections(pafEvent);
      const veiMap = mapSelections(veiEvent);
      const sharedKeys = [...pafMap.keys()].filter((key) => veiMap.has(key));
      if (sharedKeys.length < 2) continue;

      matched.push({
        id: `${pafEvent.teams.join('-')}|${pafEvent.startTime}|${pafEvent.marketType}`,
        sport: pafEvent.sport,
        league: pafEvent.league,
        startTime: pafEvent.startTime,
        teams: pafEvent.teams,
        marketType: pafEvent.marketType,
        selections: sharedKeys.map((key) => ({
          key,
          paf: pafMap.get(key),
          veikkaus: veiMap.get(key),
        })),
        sources: {
          paf: { url: pafEvent.url },
          veikkaus: { url: veiEvent.url },
        },
      });
      break;
    }
  }

  return matched;
}
