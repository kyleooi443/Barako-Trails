const path = require('path');
const { createPage } = require('./helpers');

const OUT = path.join(process.env.HOME, 'Downloads');

const shots = [
  { name: 'barako-trails-desktop-full.png', viewport: { width: 1440, height: 900 }, fullPage: true },
  { name: 'barako-trails-desktop-fold.png', viewport: { width: 1440, height: 900 }, fullPage: false },
  { name: 'barako-trails-tablet-full.png', viewport: { width: 768, height: 1024 }, fullPage: true },
  { name: 'barako-trails-mobile-full.png', viewport: { width: 390, height: 844 }, fullPage: true },
  { name: 'barako-trails-mobile-fold.png', viewport: { width: 390, height: 844 }, fullPage: false },
  { name: 'barako-trails-desktop-planner.png', viewport: { width: 1440, height: 900 }, fullPage: false, scene: 'guide', at: 0.35 },
  { name: 'barako-trails-mobile-planner.png', viewport: { width: 390, height: 844 }, fullPage: false, scene: 'guide', at: 0.18 },
  { name: 'barako-trails-story-province.png', viewport: { width: 1440, height: 900 }, fullPage: false, scene: 'province', at: 0.45 },
  { name: 'barako-trails-story-experiences.png', viewport: { width: 1440, height: 900 }, fullPage: false, scene: 'experience-water', at: 0.5 },
  { name: 'barako-trails-story-food.png', viewport: { width: 1440, height: 900 }, fullPage: false, scene: 'food', at: 0.5 }
];

(async () => {
  for (const shot of shots) {
    const { browser, page } = await createPage({ viewport: shot.viewport });

    if (shot.scene) {
      const bounds = await page.evaluate((name) => {
        const scene = document.querySelector(`.story-scene[data-scene="${name}"]`);
        if (!scene) return null;
        const rect = scene.getBoundingClientRect();
        return { top: rect.top + window.scrollY, height: rect.height };
      }, shot.scene);

      if (!bounds) throw new Error(`scene not found: ${shot.scene}`);
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), bounds.top + bounds.height * shot.at);
    }

    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, shot.name), fullPage: shot.fullPage });
    console.log('saved', shot.name);
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
