const { assert, createPage, check } = require('./helpers');

(async () => {
  const results = [];
  const desktop = await createPage({ viewport: { width: 1440, height: 900 } });
  const page = desktop.page;

  results.push(await check('all five destination filters are available', async () => {
    const state = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.filter'));
      return {
        count: buttons.length,
        offscreen: buttons.filter((button) => {
          const rect = button.getBoundingClientRect();
          return rect.right > window.innerWidth + 1 || rect.left < -1;
        }).length
      };
    });
    assert.strictEqual(state.count, 5);
    assert.strictEqual(state.offscreen, 0);
  }));

  results.push(await check('mountain filter shows two destinations', async () => {
    await page.locator('.filter[data-filter="mountains"]').click();
    const visible = await page.locator('.destination-card:not([hidden])').count();
    assert.strictEqual(visible, 2, `expected 2 mountain cards, got ${visible}`);
    await page.locator('.filter[data-filter="all"]').click();
  }));

  results.push(await check('planner updates title and stop count', async () => {
    const before = await page.locator('#plannerResult h4').textContent();
    await page.locator('label[for="landscape-mountain"]').click();
    await page.locator('label[for="days-long"]').click();
    await page.locator('label[for="pace-adventure"]').click();
    await page.waitForTimeout(150);
    const after = await page.locator('#plannerResult h4').textContent();
    assert.notStrictEqual(before, after, 'planner title did not change');
    assert.match(after, /mountain escape/i);
    assert.strictEqual(await page.locator('#plannerResult .result-stops li').count(), 5);
  }));

  results.push(await check('destination modal opens and Close restores focus', async () => {
    const trigger = page.locator('[data-open-destination="taal"]').first();
    await trigger.click();
    assert.strictEqual(await page.locator('#destinationModal').evaluate((el) => el.open), true);
    await page.locator('#destinationModal [data-close-modal]').first().click();
    await page.waitForTimeout(120);
    assert.strictEqual(
      await page.evaluate(() => document.activeElement?.getAttribute('data-open-destination')),
      'taal'
    );
  }));

  results.push(await check('Plan a trip here lands the planner below the header', async () => {
    const handoff = await createPage({ viewport: { width: 1440, height: 900 } });
    await handoff.page.locator('[data-open-destination="taal"]').first().click();
    await handoff.page.locator('#planFromDestination').click();
    await handoff.page.waitForTimeout(1500);
    const state = await handoff.page.evaluate(() => ({
      top: Math.round(document.querySelector('#tripPlanner').getBoundingClientRect().top),
      header: Math.round(document.querySelector('#siteHeader').offsetHeight)
    }));
    assert.ok(state.top >= state.header + 5, `planner top ${state.top} sits under the ${state.header}px header`);
    assert.ok(state.top <= 140, `planner top ${state.top} is too far below the header`);
    assert.deepStrictEqual(handoff.consoleErrors, []);
    await handoff.browser.close();
  }));

  results.push(await check('hero image keeps its descriptive alt text', async () => {
    const hero = await page.locator('img[src*="hero-taal"]').first().evaluate((img) => ({
      alt: img.getAttribute('alt') || '',
      hidden: img.hasAttribute('aria-hidden')
    }));
    assert.ok(hero.alt.trim().length >= 8, 'hero alt missing');
    assert.strictEqual(hero.hidden, false);
  }));

  results.push(await check('lightbox opens, Next changes the counter, Close restores focus', async () => {
    const item = page.locator('.gallery-item').first();
    await item.click();
    const before = await page.locator('#lightboxCounter').textContent();
    await page.locator('#lightboxNext').click();
    await page.waitForTimeout(100);
    const after = await page.locator('#lightboxCounter').textContent();
    assert.notStrictEqual(before, after, 'lightbox counter did not change');
    await page.locator('#lightboxClose').click();
    await page.waitForTimeout(120);
    assert.strictEqual(await page.evaluate(() => document.activeElement?.classList.contains('gallery-item')), true);
  }));

  results.push(await check('nav link scrolls to culture with header offset', async () => {
    await page.locator('.menu-toggle').click();
    await page.waitForTimeout(250);
    await page.locator('.nav-link[href="#culture"]').click();
    await page.waitForTimeout(1600);
    const top = await page.locator('#culture').evaluate((el) => Math.round(el.getBoundingClientRect().top));
    assert.ok(top >= 40 && top <= 140, `culture top was ${top}`);
  }));

  results.push(await check('no desktop console errors', async () => {
    assert.deepStrictEqual(desktop.consoleErrors, []);
  }));
  await desktop.browser.close();

  for (const width of [390, 360]) {
    const mobile = await createPage({ viewport: { width, height: 844 } });

    results.push(await check(`no horizontal overflow at ${width}px`, async () => {
      const overflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, `overflow ${overflow}px`);
    }));

    results.push(await check(`all five filters visible at ${width}px`, async () => {
      const offscreen = await mobile.page.locator('.filter').evaluateAll((buttons) =>
        buttons.filter((button) => {
          const rect = button.getBoundingClientRect();
          return rect.right > window.innerWidth + 1 || rect.left < -1;
        }).length
      );
      assert.strictEqual(offscreen, 0);
    }));

    results.push(await check(`tall destination step is active at ${width}px`, async () => {
      const top = await mobile.page.locator('#destinations .scene-step--tall').evaluate((el) =>
        el.getBoundingClientRect().top + window.scrollY
      );
      await mobile.page.evaluate((y) => window.scrollTo({ top: y + 100, behavior: 'instant' }), top);
      await mobile.page.waitForTimeout(800);
      const active = await mobile.page.locator('#destinations .scene-step--tall').evaluate((el) =>
        el.classList.contains('is-active')
      );
      assert.strictEqual(active, true);
    }));

    results.push(await check(`tap targets stay at least 40px at ${width}px`, async () => {
      const small = await mobile.page.evaluate(() => {
        const selector = 'a.btn, button.btn, .filter, .text-link, .chip-row label, .season-tab, .menu-toggle, .back-to-top, .card-title button, .gallery-item';
        return Array.from(document.querySelectorAll(selector)).filter((el) => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 &&
            (rect.width < 40 || rect.height < 40);
        }).length;
      });
      assert.strictEqual(small, 0, `${small} small controls`);
    }));

    results.push(await check(`visible text is at least 11px at ${width}px`, async () => {
      const small = await mobile.page.evaluate(() => {
        const offenders = [];
        const visible = (el) => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        document.querySelectorAll('*').forEach((el) => {
          if (!visible(el) || el.closest('[aria-hidden="true"]')) return;
          const own = Array.from(el.childNodes)
            .filter((node) => node.nodeType === 3)
            .map((node) => node.textContent.trim())
            .join(' ')
            .trim();
          if (!own) return;
          if (parseFloat(getComputedStyle(el).fontSize) < 11) offenders.push(own.slice(0, 30));
        });
        return offenders;
      });
      assert.deepStrictEqual(small, [], `small text: ${small.slice(0, 8).join(', ')}`);
    }));

    results.push(await check(`meaningful images keep descriptive alt text at ${width}px`, async () => {
      const missing = await mobile.page.evaluate(() =>
        Array.from(document.querySelectorAll('img:not([aria-hidden="true"])'))
          .filter((img) => !img.getAttribute('alt') || img.getAttribute('alt').trim().length < 8)
          .map((img) => img.getAttribute('src'))
      );
      assert.deepStrictEqual(missing, [], `unlabeled images: ${missing.join(', ')}`);
    }));

    results.push(await check(`no console errors at ${width}px`, async () => {
      assert.deepStrictEqual(mobile.consoleErrors, []);
    }));
    await mobile.browser.close();
  }

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} regression checks passed`);
  process.exit(passed === results.length ? 0 : 1);
})();
