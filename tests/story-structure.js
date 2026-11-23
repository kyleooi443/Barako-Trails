const { assert, createPage, check } = require('./helpers');

(async () => {
  const { browser, page, consoleErrors } = await createPage();
  const results = [];

  results.push(await check('twelve story scenes exist', async () => {
    assert.strictEqual(await page.locator('.story-scene').count(), 12);
  }));

  results.push(await check('each scene has chapter metadata', async () => {
    const missing = await page.locator('.story-scene').evaluateAll((scenes) =>
      scenes.filter((scene) => !scene.dataset.scene || !scene.dataset.chapter).length
    );
    assert.strictEqual(missing, 0);
  }));

  results.push(await check('each scene has one visual and one content layer', async () => {
    const bad = await page.locator('.story-scene').evaluateAll((scenes) =>
      scenes.filter((scene) =>
        scene.querySelectorAll(':scope > .scene-visual').length !== 1 ||
        scene.querySelectorAll(':scope > .scene-content').length !== 1
      ).length
    );
    assert.strictEqual(bad, 0);
  }));

  results.push(await check('each content layer has numeric steps', async () => {
    const bad = await page.locator('.scene-content').evaluateAll((contents) =>
      contents.filter((content) => {
        const steps = Array.from(content.querySelectorAll('.scene-step'));
        return steps.length === 0 || steps.some((step) => !/^\d+$/.test(step.dataset.step || ''));
      }).length
    );
    assert.strictEqual(bad, 0);
  }));

  results.push(await check('chapter rail has nine text labels', async () => {
    assert.strictEqual(await page.locator('.story-rail').count(), 1);
    assert.strictEqual(await page.locator('.story-rail-item').count(), 9);
  }));

  results.push(await check('story stylesheet and script are linked', async () => {
    assert.strictEqual(await page.locator('link[href="css/story.css"]').count(), 1);
    assert.strictEqual(await page.locator('script[src="js/story.js"]').count(), 1);
  }));

  results.push(await check('no console errors', async () => {
    assert.deepStrictEqual(consoleErrors, []);
  }));

  await browser.close();

  const noJs = await createPage({ javaScriptEnabled: false });
  results.push(await check('all steps retain text without JavaScript', async () => {
    const empty = await noJs.page.locator('.scene-step').evaluateAll((steps) =>
      steps.filter((step) => !(step.textContent || '').trim()).length
    );
    assert.strictEqual(empty, 0);
  }));
  await noJs.browser.close();

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} structure checks passed`);
  process.exit(passed === results.length ? 0 : 1);
})();
