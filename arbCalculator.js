export function calculateArbitrage(matchedEvent) {
  const bestSelections = matchedEvent.selections.map((selection) => {
    const pafOdds = Number(selection.paf.odds);
    const veikkausOdds = Number(selection.veikkaus.odds);

    if (pafOdds >= veikkausOdds) {
      return {
        key: selection.key,
        source: 'paf',
        odds: pafOdds,
        name: selection.paf.name,
      };
    }

    return {
      key: selection.key,
      source: 'veikkaus',
      odds: veikkausOdds,
      name: selection.veikkaus.name,
    };
  });

  if (bestSelections.length < 2) return null;

  const impliedSum = bestSelections.reduce((sum, selection) => sum + (1 / selection.odds), 0);
  if (impliedSum >= 1) return null;

  const stakePlan = bestSelections.map((selection) => ({
    name: selection.name,
    source: selection.source,
    stakeRatio: (1 / selection.odds) / impliedSum,
  }));

  return {
    id: matchedEvent.id,
    sport: matchedEvent.sport,
    league: matchedEvent.league,
    startTime: matchedEvent.startTime,
    teams: matchedEvent.teams,
    marketType: matchedEvent.marketType,
    selections: matchedEvent.selections,
    bestSelections,
    impliedSum,
    profit: 1 - impliedSum,
    stakePlan,
    sources: {
      paf: { url: matchedEvent.sources?.paf?.url || 'https://www.paf.fi/sports' },
      veikkaus: { url: matchedEvent.sources?.veikkaus?.url || 'https://www.veikkaus.fi/fi/vedonlyonti' },
    },
  };
}
