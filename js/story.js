/* ==========================================================================
   Barako Trails — scroll scene state engine
   --------------------------------------------------------------------------
   Owns only scroll-driven scene state and the chapter rail. Navigation,
   filters, planner, dialogs, and the lightbox remain in js/script.js.

   Writes:
     html.has-story
     body[data-active-chapter]
     body style="--story-progress: <0–1>"
     .story-scene[data-active-step] style="--scene-progress: <0–1>"
     .scene-step.is-active
     .story-rail-item.is-active
   ========================================================================== */

(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceMotion.matches) return;

  const scenes = Array.from(document.querySelectorAll('.story-scene'));
  if (!scenes.length) return;

  const railItems = Array.from(document.querySelectorAll('.story-rail-item'));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  root.classList.add('has-story');

  function computeSceneProgress(scene) {
    const rect = scene.getBoundingClientRect();
    const scrollable = Math.max(rect.height - window.innerHeight, 1);
    return clamp(-rect.top / scrollable, 0, 1);
  }

  function setSceneState(scene, progress, activeStep) {
    scene.style.setProperty('--scene-progress', progress.toFixed(4));
    scene.dataset.activeStep = String(activeStep);

    scene.querySelectorAll('.scene-step').forEach((step, index) => {
      step.classList.toggle('is-active', index === activeStep);
    });
  }

  function setActiveChapter(chapter) {
    if (document.body.dataset.activeChapter === chapter) return;
    document.body.dataset.activeChapter = chapter;

    railItems.forEach((item) => {
      item.classList.toggle('is-active', item.dataset.railChapter === chapter);
    });
  }

  function update() {
    const viewportCenter = window.innerHeight / 2;
    let chapterAtCenter = '';

    scenes.forEach((scene) => {
      const rect = scene.getBoundingClientRect();
      const progress = computeSceneProgress(scene);
      const steps = Array.from(scene.querySelectorAll('.scene-step'));

      let activeStep = 0;
      let nearest = Infinity;
      steps.forEach((step, index) => {
        const stepRect = step.getBoundingClientRect();
        const distance = Math.abs(stepRect.top + stepRect.height / 2 - viewportCenter);
        if (distance < nearest) {
          nearest = distance;
          activeStep = index;
        }
      });

      setSceneState(scene, progress, activeStep);

      if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
        chapterAtCenter = scene.dataset.chapter || '';
      }
    });

    if (chapterAtCenter) setActiveChapter(chapterAtCenter);

    const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    document.body.style.setProperty('--story-progress', clamp(window.scrollY / scrollable, 0, 1).toFixed(4));

    ticking = false;
  }

  let ticking = false;
  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  window.addEventListener('load', requestUpdate);
  update();
})();
