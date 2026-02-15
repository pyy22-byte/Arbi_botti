// Event matcher module.
// Responsible for mapping the same sporting event across bookmakers.

export function matchEvents(pafOdds, veikkausOdds) {
  // TODO: Implement event matching strategy.
  // Ideas:
  // - Fuzzy team-name matching (aliases, abbreviations, locale differences).
  // - Time-window checks to ensure events refer to the same kickoff.
  // - League/sport filtering to reduce false positives.

  // Expected output shape (example):
  // [{ eventId: '...', paf: {...}, veikkaus: {...} }]
  return [];
}
