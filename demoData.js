export const pafEvents = [
  {
    sport: 'football',
    league: 'veikkausliiga',
    startTime: '2026-08-15T18:00:00+03:00',
    teams: ['HJK Helsinki', 'KuPS'],
    marketType: '1X2',
    selections: [
      { name: 'Home', odds: 2.3 },
      { name: 'Draw', odds: 3.8 },
      { name: 'Away', odds: 3.7 },
    ],
    source: 'paf',
    url: 'https://example.com/paf/hjk-kups-1x2',
  },
  {
    sport: 'ice hockey',
    league: 'liiga',
    startTime: '2026-08-16T19:30:00+03:00',
    teams: ['Tappara', 'Ilves'],
    marketType: 'Moneyline',
    selections: [
      { name: 'Home', odds: 1.75 },
      { name: 'Away', odds: 1.9 },
    ],
    source: 'paf',
    url: 'https://example.com/paf/tappara-ilves-moneyline',
  },
];

export const veikkausEvents = [
  {
    sport: 'football',
    league: 'veikkausliiga',
    startTime: '2026-08-15T18:00:00+03:00',
    teams: ['HJK Helsinki', 'KuPS'],
    marketType: '1X2',
    selections: [
      { name: 'Home', odds: 2.2 },
      { name: 'Draw', odds: 3.6 },
      { name: 'Away', odds: 4.2 },
    ],
    source: 'veikkaus',
    url: 'https://example.com/veikkaus/hjk-kups-1x2',
  },
  {
    sport: 'ice hockey',
    league: 'liiga',
    startTime: '2026-08-16T19:30:00+03:00',
    teams: ['Tappara', 'Ilves'],
    marketType: 'Moneyline',
    selections: [
      { name: 'Home', odds: 1.8 },
      { name: 'Away', odds: 1.88 },
    ],
    source: 'veikkaus',
    url: 'https://example.com/veikkaus/tappara-ilves-moneyline',
  },
];
