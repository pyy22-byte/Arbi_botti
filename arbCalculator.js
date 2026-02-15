export function calculateArbitrage(combinedEvent) {
  const bestSelections = combinedEvent.selections.map((selection) => {
    const pafOdds = selection.paf.odds;
    const veikkausOdds = selection.veikkaus.odds;

    if (pafOdds >= veikkausOdds) {
      return {
        key: selection.key,
        name: selection.paf.name,
        source: 'paf',
        odds: pafOdds,
      };
    }

    return {
      key: selection.key,
      name: selection.veikkaus.name,
      source: 'veikkaus',
      odds: veikkausOdds,
    };
  });

  if (bestSelections.length < 2) return null;

  const reciprocalSum = bestSelections.reduce((sum, selection) => sum + 1 / selection.odds, 0);
  const isArbitrage = reciprocalSum < 1;
  if (!isArbitrage) return null;

  const stakes = bestSelections.map((selection) => ({
    ...selection,
    stakeRatio: (1 / selection.odds) / reciprocalSum,
  }));

  return {
    ...combinedEvent,
    bestSelections,
    reciprocalSum,
    profit: 1 - reciprocalSum,
    stakePlan: stakes,
  };
}
