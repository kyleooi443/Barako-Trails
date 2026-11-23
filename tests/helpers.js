const assert = require('assert');
const { chromium } = require('/Users/kylemasilang/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');

const URL = 'http://127.0.0.1:8765/index.html';
const EXECUTABLE = '/Users/kylemasilang/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell';

async function createPage({
  viewport = { width: 1440, height: 900 },
  reducedMotion = 'no-preference',
  javaScriptEnabled = true
} = {}) {
  const browser = await chromium.launch({ executablePath: EXECUTABLE, headless: true });
  const context = await browser.newContext({
    viewport,
    reducedMotion,
    javaScriptEnabled
  });
  const page = await context.newPage();
  const consoleErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(URL, { waitUntil: 'load' });
  if (javaScriptEnabled) await page.evaluate(() => document.fonts.ready);

  return { browser, page, consoleErrors };
}

async function check(name, fn) {
  try {
    await fn();
    console.log('PASS', name);
    return true;
  } catch (error) {
    console.log('FAIL', name, '-', error.message);
    return false;
  }
}

module.exports = { assert, createPage, check, URL };
