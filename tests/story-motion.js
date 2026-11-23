const { assert, createPage, check } = require('./helpers');

(async () => {
  const results = [];

  const motion = await createPage({ viewport: { width: 1440, height: 900 } });
  const bounds = await motion.page.evaluate(() => {
    const scene = document.querySelector('#province .story-scene');
    const rect = scene.getBoundingClientRect();
    return { top: rect.top + window.scrollY, height: rect.height };
  });
  await motion.page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), bounds.top + bounds.height * 0.5);
  await motion.page.waitForTimeout(600);

  results.push(await check('scene visual parallaxes with motion allowed', async () => {
    const transform = await motion.page.locator('#province .scene-visual img').evaluate((el) => getComputedStyle(el).transform);
    assert.notStrictEqual(transform, 'none');
  }));

  results.push(await check('active step is revealed with a transform', async () => {
    const styles = await motion.page.locator('#province .scene-step.is-active').evaluate((el) => {
      const style = getComputedStyle(el);
      return { opacity: Number(style.opacity), transform: style.transform };
    });
    assert.ok(styles.opacity > 0.9, `opacity was ${styles.opacity}`);
    assert.notStrictEqual(styles.transform, 'none');
  }));
  results.push(await check('no console errors with motion allowed', async () => {
    assert.deepStrictEqual(motion.consoleErrors, []);
  }));
  await motion.browser.close();

  const reduced = await createPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

  results.push(await check('motion class disabled under reduced motion', async () => {
    assert.strictEqual(await reduced.page.evaluate(() => document.documentElement.classList.contains('has-story')), false);
  }));

  results.push(await check('all steps fully visible under reduced motion', async () => {
    const hidden = await reduced.page.locator('.scene-step').evaluateAll((steps) =>
      steps.filter((step) => Number(getComputedStyle(step).opacity) < 0.99).length
    );
    assert.strictEqual(hidden, 0);
  }));

  results.push(await check('no parallax under reduced motion', async () => {
    const transform = await reduced.page.locator('#province .scene-visual img').evaluate((el) => getComputedStyle(el).transform);
    assert.strictEqual(transform, 'none');
  }));

  results.push(await check('no scroll snapping under reduced motion', async () => {
    const snap = await reduced.page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType);
    assert.strictEqual(snap, 'none');
  }));
  results.push(await check('no console errors under reduced motion', async () => {
    assert.deepStrictEqual(reduced.consoleErrors, []);
  }));
  await reduced.browser.close();

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} motion checks passed`);
  process.exit(passed === results.length ? 0 : 1);
})();
