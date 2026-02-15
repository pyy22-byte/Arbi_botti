// Veikkaus scraper module.
// Responsible for collecting veikkaus.fi events and converting them to the shared odds model.
import { chromium } from 'playwright';

export async function getOdds() {
  // TODO: Implement real scraping flow for veikkaus.fi.
  // Suggested steps:
  // 1) Navigate Veikkaus betting views with Playwright.
  // 2) Parse event/market rows and decimal odds.
  // 3) Return normalized records compatible with matcher.js.

  // Placeholder Playwright usage for scaffold completeness.
  const browser = await chromium.launch({ headless: true });
  await browser.close();

  // The agreed return shape for all scrapers.
  return [];
}
