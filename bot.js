import { Client, EmbedBuilder, GatewayIntentBits } from 'discord.js';

const token = process.env.DISCORD_BOT_TOKEN;
const channelId = process.env.DISCORD_CHANNEL_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const sentCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;
let readyPromise;

function cleanupCache() {
  const now = Date.now();
  for (const [key, createdAt] of sentCache.entries()) {
    if (now - createdAt > CACHE_TTL_MS) sentCache.delete(key);
  }
}

function makeCacheKey(eventInfo) {
  const oddsSnapshot = eventInfo.bestSelections.map((s) => `${s.key}:${s.source}:${s.odds}`).join('|');
  return `${eventInfo.id}|${oddsSnapshot}`;
}

export async function initBot() {
  if (!token) throw new Error('DISCORD_BOT_TOKEN is not set');
  if (!channelId) throw new Error('DISCORD_CHANNEL_ID is not set');

  if (!readyPromise) {
    readyPromise = client.login(token);
  }
  await readyPromise;
}

function formatLocalTime(iso) {
  return new Date(iso).toLocaleString('fi-FI', {
    timeZone: 'Europe/Helsinki',
    hour12: false,
  });
}

export async function sendArbitrageNotification(eventInfo) {
  cleanupCache();

  const key = makeCacheKey(eventInfo);
  if (sentCache.has(key)) return false;

  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) {
    throw new Error('Configured channel was not found or is not text-based');
  }

  const oddsLines = eventInfo.selections.flatMap((selection) => [
    `PAF ${selection.paf.name} @ ${selection.paf.odds.toFixed(2)}`,
    `Veikkaus ${selection.veikkaus.name} @ ${selection.veikkaus.odds.toFixed(2)}`,
  ]);

  const stakeLines = eventInfo.stakePlan
    .map((item) => `${item.name} (${item.source}): ${(item.stakeRatio * 100).toFixed(2)}%`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle(`Arbitrage found: ${eventInfo.teams.join(' vs ')}`)
    .setDescription([
      `**Sport/League:** ${eventInfo.sport} / ${eventInfo.league}`,
      `**Start:** ${formatLocalTime(eventInfo.startTime)} (Europe/Helsinki)`,
      `**Market:** ${eventInfo.marketType}`,
      '',
      '**Odds by bookmaker**',
      ...oddsLines,
      '',
      `**Arbitrage %:** ${(eventInfo.profit * 100).toFixed(2)}%`,
      '**Suggested stake split**',
      stakeLines,
      '',
      `[PAF event](${eventInfo.sources.paf.url}) | [Veikkaus event](${eventInfo.sources.veikkaus.url})`,
    ].join('\n'))
    .setColor(0x00b894)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  sentCache.set(key, Date.now());
  return true;
}
