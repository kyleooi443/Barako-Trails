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
    let progressAtCenter = 0;

    scenes.forEach((scene) => {
      const rect = scene.getBoundingClientRect();
      const progress = computeSceneProgress(scene);
      const steps = Array.from(scene.querySelectorAll('.scene-step'));

      /* The step with the most visible area owns the scene. Center distance
         only breaks ties, so tall grids stay readable when they fill the view. */
      let activeStep = 0;
      let bestScore = -Infinity;
      steps.forEach((step, index) => {
        const stepRect = step.getBoundingClientRect();
        const visible = Math.max(0, Math.min(stepRect.bottom, window.innerHeight) - Math.max(stepRect.top, 0));
        const centerDistance = Math.abs(stepRect.top + stepRect.height / 2 - viewportCenter);
        const score = visible - centerDistance / 10000;
        if (score > bestScore) {
          bestScore = score;
          activeStep = index;
        }
      });

      setSceneState(scene, progress, activeStep);

      if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
        chapterAtCenter = scene.dataset.chapter || '';
        progressAtCenter = progress;
      }
    });

    if (chapterAtCenter) setActiveChapter(chapterAtCenter);

    const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    document.body.style.setProperty('--story-progress', clamp(window.scrollY / scrollable, 0, 1).toFixed(4));
    document.body.style.setProperty('--active-progress', progressAtCenter.toFixed(4));

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
