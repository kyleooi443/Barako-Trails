const { assert, createPage, check } = require('./helpers');

(async () => {
  const { browser, page, consoleErrors } = await createPage();
  const results = [];

  results.push(await check('motion class is enabled', async () => {
    assert.strictEqual(await page.evaluate(() => document.documentElement.classList.contains('has-story')), true);
  }));

  const bounds = await page.evaluate(() => {
    const scene = document.querySelector('#province .story-scene');
    const rect = scene.getBoundingClientRect();
    return { top: rect.top + window.scrollY, height: rect.height };
  });

  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), bounds.top + bounds.height * 0.25);
  await page.waitForTimeout(120);

  const first = await page.evaluate(() => {
    const scene = document.querySelector('#province .story-scene');
    return {
      chapter: document.body.dataset.activeChapter,
      step: scene.dataset.activeStep,
      progress: parseFloat(scene.style.getPropertyValue('--scene-progress'))
    };
  });

  results.push(await check('active chapter is province', async () => {
    assert.strictEqual(first.chapter, '02 The province');
  }));

  results.push(await check('active step is an integer index', async () => {
    assert.ok(Number.isInteger(Number(first.step)), `step was ${first.step}`);
    assert.ok(Number(first.step) >= 0);
  }));

  results.push(await check('scene progress is between 0 and 1', async () => {
    assert.ok(first.progress >= 0 && first.progress <= 1, `progress was ${first.progress}`);
  }));

  results.push(await check('matching rail item is active', async () => {
    const active = await page.locator('.story-rail-item.is-active').textContent();
    assert.strictEqual(active.trim(), '02 The province');
  }));

  results.push(await check('one scene step is marked active', async () => {
    const count = await page.locator('#province .story-scene .scene-step.is-active').count();
    assert.strictEqual(count, 1);
  }));

  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), bounds.top + bounds.height * 0.75);
  await page.waitForTimeout(120);

  results.push(await check('scene progress increases on further scroll', async () => {
    const later = await page.evaluate(() => parseFloat(
      document.querySelector('#province .story-scene').style.getPropertyValue('--scene-progress')
    ));
    assert.ok(later > first.progress, `${later} did not exceed ${first.progress}`);
  }));

  results.push(await check('no console errors', async () => {
    assert.deepStrictEqual(consoleErrors, []);
  }));

  await browser.close();

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} state checks passed`);
  process.exit(passed === results.length ? 0 : 1);
})();
