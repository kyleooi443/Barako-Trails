const { assert, createPage, check, URL } = require('./helpers');

(async () => {
  const results = [];

  const desktop = await createPage({ viewport: { width: 1440, height: 900 } });
  results.push(await check('scene visual is sticky at desktop height', async () => {
    const visual = await desktop.page.locator('.scene-visual').first().evaluate((el) => ({
      position: getComputedStyle(el).position,
      height: Math.round(el.getBoundingClientRect().height)
    }));
    assert.strictEqual(visual.position, 'sticky');
    assert.strictEqual(visual.height, 900);
  }));

  results.push(await check('chapter rail visible on desktop', async () => {
    const visible = await desktop.page.locator('.story-rail').isVisible();
    assert.strictEqual(visible, true);
  }));

  results.push(await check('normal steps fill the viewport', async () => {
    const short = await desktop.page.locator('.scene-step:not(.scene-step--tall)').evaluateAll((steps, height) =>
      steps.filter((step) => Math.round(step.getBoundingClientRect().height) < height).length,
    900
    );
    assert.strictEqual(short, 0);
  }));
  results.push(await check('no desktop console errors', async () => {
    assert.deepStrictEqual(desktop.consoleErrors, []);
  }));
  await desktop.browser.close();

  for (const width of [768, 390, 360]) {
    const pageSet = await createPage({ viewport: { width, height: 900 } });
    results.push(await check(`chapter rail hidden at ${width}px`, async () => {
      assert.strictEqual(await pageSet.page.locator('.story-rail').isVisible(), false);
    }));

    results.push(await check(`no horizontal overflow at ${width}px`, async () => {
      const overflow = await pageSet.page.evaluate(() =>
        document.documentElement.scrollWidth - window.innerWidth
      );
      assert.ok(overflow <= 0, `overflow ${overflow}px`);
    }));

    results.push(await check(`destination and gallery grids fit at ${width}px`, async () => {
      const wide = await pageSet.page.evaluate(() => {
        const grids = ['#destinationGrid', '#galleryGrid']
          .map((selector) => document.querySelector(selector))
          .filter(Boolean);
        return grids.filter((grid) => grid.getBoundingClientRect().right > window.innerWidth + 1).length;
      });
      assert.strictEqual(wide, 0);
    }));
    await pageSet.browser.close();
  }

  const noJs = await createPage({ javaScriptEnabled: false });
  results.push(await check('all steps visible without JavaScript', async () => {
    const hidden = await noJs.page.locator('.scene-step').evaluateAll((steps) =>
      steps.filter((step) => Number(getComputedStyle(step).opacity) < 0.99).length
    );
    assert.strictEqual(hidden, 0);
  }));
  await noJs.browser.close();

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} layout checks passed (${URL})`);
  process.exit(passed === results.length ? 0 : 1);
})();
