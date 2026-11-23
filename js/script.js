/* ==========================================================================
   BATANGAS — Tourism concept website
   js/script.js
   --------------------------------------------------------------------------
   Vanilla JavaScript only. No dependencies, no build step.

   Contents
   01. Helpers & shared state
   02. Sticky header, reading progress & back to top
   03. Mobile navigation
   04. Anchor scrolling & active section
   05. Destination filtering
   06. Destination detail modal
   07. Gallery lightbox
   08. Photo credits & footer year
   ========================================================================== */

(() => {
  'use strict';

  /* ==========================================================================
     01. Helpers & shared state
     ========================================================================== */

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

  const supportsDialog =
    typeof HTMLDialogElement !== 'undefined' &&
    typeof HTMLDialogElement.prototype.showModal === 'function';

  const pad = (value) => String(value).padStart(2, '0');

  const header = $('#siteHeader');
  const backToTop = $('#backToTop');

  /* Keep the page from scrolling behind any open dialog. */
  function syncScrollLock() {
    const hasOpenDialog = Boolean(document.querySelector('dialog[open]'));
    document.body.classList.toggle('modal-open', hasOpenDialog);
  }

  let savedScrollY = 0;

  function openDialog(dialog, trigger) {
    if (!dialog || dialog.open) return;

    savedScrollY = window.scrollY;
    dialog._trigger = trigger || document.activeElement;

    if (supportsDialog) {
      dialog.showModal();
      syncScrollLock();
    } else {
      dialog.setAttribute('open', '');
      document.body.classList.add('modal-open');
    }
  }

  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;

    const trigger = dialog._trigger;
    dialog._trigger = null;

    if (supportsDialog) {
      dialog.close();
      syncScrollLock();
    } else {
      dialog.removeAttribute('open');
      syncScrollLock();
    }

    window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' });

    if (trigger && typeof trigger.focus === 'function' && document.contains(trigger)) {
      window.setTimeout(() => {
        if (dialog.open) return;
        trigger.focus({ preventScroll: true });
      }, 0);
    }
  }


  /* Native dialogs restore focus on close. This also handles backdrop clicks
     and keeps the scroll lock in sync for every dialog on the page. */
  $$('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });

    /* Chrome fires `cancel` for Escape but may not follow it with `close`.
       Take over the close so focus and the scroll lock are always restored. */
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeDialog(dialog);
    });

    dialog.addEventListener('close', () => {
      syncScrollLock();
    });
  });

  $$('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeDialog(button.closest('dialog')));
  });

  /* ==========================================================================
     02. Sticky header, reading progress & back to top
     ========================================================================== */

  let scrollTicking = false;

  function updateActiveNav(scrollTop) {
    const navLinks = $$('.nav-link');
    const sections = navLinks
      .map((link) => ({
        link,
        section: document.getElementById(link.dataset.nav)
      }))
      .filter((item) => item.section);

    if (!sections.length) return;

    const headerOffset = (header ? header.offsetHeight : 0) + Math.min(window.innerHeight * 0.18, 140);
    let current = sections[0].link;

    sections.forEach((item) => {
      if (item.section.getBoundingClientRect().top <= headerOffset) {
        current = item.link;
      }
    });

    /* Make the final section active when the page is scrolled to the end. */
    const atPageEnd =
      window.innerHeight + scrollTop >= document.documentElement.scrollHeight - 4;
    if (atPageEnd) current = sections[sections.length - 1].link;

    navLinks.forEach((link) => {
      const isActive = link === current;
      link.classList.toggle('is-active', isActive);

      if (isActive) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function updateScrollUI() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (header) {
      header.classList.toggle('is-scrolled', scrollTop > 36);
    }

    if (backToTop) {
      backToTop.classList.toggle('is-visible', scrollTop > 620);
    }

    updateActiveNav(scrollTop);
    scrollTicking = false;
  }

  function requestScrollUpdate() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateScrollUI);
  }

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate, { passive: true });

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }

  /* ==========================================================================
     03. Mobile navigation
     ========================================================================== */

  const nav = $('#primaryNav');
  const menuToggle = $('#menuToggle');
  let navScrollY = 0;

  function openMobileNav() {
    if (!nav || !menuToggle) return;

    navScrollY = window.scrollY;
    document.body.style.top = `-${navScrollY}px`;
    document.body.classList.add('nav-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close menu');

    /* Wait for the visibility transition to begin before moving focus;
       browsers can refuse focus on a still-hidden element. */
    const firstLink = $('.nav-link', nav);
    if (firstLink) {
      window.setTimeout(() => firstLink.focus({ preventScroll: true }), 80);
    }
  }

  function closeMobileNav(restoreFocus = true) {
    if (!menuToggle || !document.body.classList.contains('nav-open')) return;

    document.body.classList.remove('nav-open');
    document.body.style.top = '';
    window.scrollTo({ top: navScrollY, left: 0, behavior: 'instant' });
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');

    if (restoreFocus) menuToggle.focus({ preventScroll: true });
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      if (document.body.classList.contains('nav-open')) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });

    /* Keep keyboard focus inside the open menu. The header contains the
       brand, navigation, and close button in their natural tab order. */
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab' || !document.body.classList.contains('nav-open')) return;

      const focusable = $$('a[href], button:not([disabled])', header).filter(
        (element) => element.offsetParent !== null
      );

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
      /* A native dialog handles its own Escape key first. */
      if (!document.querySelector('dialog[open]')) closeMobileNav();
    }
  });

  /* ==========================================================================
     04. Anchor scrolling & active section
     ========================================================================== */

  function getHeaderOffset() {
    return (header ? header.offsetHeight : 76) + 14;
  }

  function scrollToElement(element) {
    if (!element) return;

    const top =
      element.getBoundingClientRect().top +
      (window.scrollY || document.documentElement.scrollTop) -
      getHeaderOffset();

    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }

  function scrollToHash(hash, updateHistory = true) {
    if (!hash || hash === '#' || hash.length < 2) return;

    const target = document.getElementById(hash.slice(1));
    if (!target) return;

    if (hash === '#home') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      scrollToElement(target);
    }

    if (updateHistory && window.history && history.pushState) {
      history.pushState(null, '', hash);
    }
  }

  $$('a[href^="#"]').forEach((link) => {
    /* The skip link should keep its native focus behaviour. */
    if (link.classList.contains('skip-link')) return;

    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if (!hash || hash === '#' || hash.length < 2) return;

      const target = document.getElementById(hash.slice(1));
      if (!target) return;

      event.preventDefault();

      const menuWasOpen = document.body.classList.contains('nav-open');

      if (menuWasOpen) {
        closeMobileNav(false);

        /* Move focus out of the overlay and into the destination section. */
        target.setAttribute('tabindex', '-1');
        window.setTimeout(() => target.focus({ preventScroll: true }), 120);
      }

      scrollToHash(hash);
    });
  });

  window.addEventListener('popstate', () => {
    if (window.location.hash) {
      scrollToHash(window.location.hash, false);
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  });

  /* ==========================================================================
     05. Destination filtering
     ========================================================================== */

  const destinationGrid = $('#destinationGrid');
  const filterButtons = $$('.filter');
  const destinationCards = destinationGrid
    ? $$('.destination-card', destinationGrid)
    : [];
  const filterCount = $('#filterCount');

  function updateFilterCounts() {
    filterButtons.forEach((button) => {
      const filter = button.dataset.filter;
      const count =
        filter === 'all'
          ? destinationCards.length
          : destinationCards.filter((card) => card.dataset.category === filter).length;

      const badge = button.querySelector('span');
      if (badge) badge.textContent = pad(count);
    });
  }

  function setDestinationFilter(filter) {
    if (!destinationGrid) return;

    const matching =
      filter === 'all'
        ? destinationCards
        : destinationCards.filter((card) => card.dataset.category === filter);

    destinationCards.forEach((card) => {
      card.hidden = !matching.includes(card);
    });

    destinationGrid.dataset.visible = String(matching.length);

    filterButtons.forEach((button) => {
      const isActive = button.dataset.filter === filter;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    if (filterCount) {
      filterCount.textContent = `Showing ${matching.length} destination${
        matching.length === 1 ? '' : 's'
      }`;
    }
  }

  if (destinationGrid) {
    updateFilterCounts();

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setDestinationFilter(button.dataset.filter || 'all');
      });
    });
  }

  /* ==========================================================================
     06. Destination detail modal
     ========================================================================== */

  const destinations = {
    taal: {
      tag: 'Nature',
      location: 'Talisay · Taal Lake',
      title: 'Taal Volcano',
      image: 'assets/images/dest-taal.jpg',
      alt: 'The crater of Taal Volcano surrounded by Taal Lake',
      desc: 'Taal Volcano is an active volcano at the centre of Taal Lake. The volcano island is a Permanent Danger Zone and may be closed to visitors during restrictions — the classic experience is viewing the caldera and lake from safe lakeshore towns and ridge roads.',
      highlights: [
        'Lakeshore views from Talisay and Agoncillo',
        'Taal Heritage Town, a short drive away',
        'Soft early-morning light over the caldera',
        'Check PHIVOLCS and local advisories before travelling'
      ],
      note: 'Taal Volcano Island is a Permanent Danger Zone. Do not enter closed areas; follow PHIVOLCS and local government advisories at all times.'
    },

    laiya: {
      tag: 'Beaches',
      location: 'San Juan · Tayabas Bay',
      title: 'Laiya Beach',
      image: 'assets/images/dest-laiya.jpg',
      alt: 'The long sandy shoreline of Laiya Beach in San Juan, Batangas',
      desc: "Laiya is San Juan's long beachfront on Tayabas Bay: a gentle curve of sand backed by resorts and coconut palms. It is an easy coastal base for swimming, shoreline walks, and slow sunsets.",
      highlights: [
        'Swimming and long shoreline walks',
        'Resorts, inns, and homestay stays',
        'Sunset over Tayabas Bay',
        'Day trips toward Calayo and Nasugbu'
      ],
      note: 'Weekends and holidays can be busy. Book stays ahead and confirm current rates directly with your accommodation.'
    },

    masasa: {
      tag: 'Beaches',
      location: 'Tingloy · Maricaban Island',
      title: 'Masasa Beach',
      image: 'assets/images/dest-masasa.jpg',
      alt: 'Clear turquoise water and pale sand at Masasa Beach, Tingloy',
      desc: 'Masasa Beach sits on Maricaban Island in Tingloy, reached by boat from the mainland. Its clear shallows and pale sand make it a favourite for snorkelling, swimming, and unhurried island days.',
      highlights: [
        'Snorkelling and swimming in clear water',
        'A short boat crossing from the mainland',
        'Island walks and quiet viewpoints',
        'Bring cash and carry your rubbish out'
      ],
      note: 'Boat crossings depend on weather and coast guard clearance. Confirm schedules and return times locally before you set out.'
    },

    fortune: {
      tag: 'Nature',
      location: 'Nasugbu · Batangas',
      title: 'Fortune Island',
      image: 'assets/images/dest-fortune.jpg',
      alt: 'The ruined lighthouse and limestone cliffs of Fortune Island in Nasugbu',
      desc: 'Fortune Island lies off Nasugbu, known for limestone cliffs, a ruined lighthouse, and clear water. It is usually visited as a day trip by boat, with time for swimming, snorkelling, and photography.',
      highlights: [
        'The ruined lighthouse and limestone cliffs',
        'Swimming and snorkelling',
        'Boat day trips from Nasugbu',
        'Bring reef-safe sunscreen and drinking water'
      ],
      note: 'There are no overnight facilities on the island. Trips depend on sea conditions; arrange your boat and return time locally.'
    },

    batulao: {
      tag: 'Mountains',
      location: 'Nasugbu · Batangas',
      title: 'Mt. Batulao',
      image: 'assets/images/dest-batulao.jpg',
      alt: 'The rolling green ridges of Mt. Batulao in Nasugbu, Batangas',
      desc: "Mt. Batulao in Nasugbu is one of Batangas' best-known day hikes: a sequence of rolling green ridges with exposed sections and wide views. The trail can be hot and busy on weekends.",
      highlights: [
        'Ridge-line hiking and wide views',
        'Early starts and cooler morning air',
        'Trailhead registration and local guides',
        'Views toward the coast and Taal'
      ],
      note: 'Register at the trailhead, hike with a guide where required, and check the weather before setting out. Leave no trace.'
    },

    maculot: {
      tag: 'Mountains',
      location: 'Cuenca · Batangas',
      title: 'Mt. Maculot',
      image: 'assets/images/dest-maculot.jpg',
      alt: 'Mount Maculot rising above the fields of Cuenca, Batangas',
      desc: 'Mt. Maculot rises above Cuenca and is famous for the Rockies, a rock formation with Taal Lake spread out below. The climb is steep and exposed in places; the mountain also has cultural and religious significance for locals.',
      highlights: [
        'The Rockies viewpoint',
        'Views over Taal Lake and the surrounding towns',
        'Day hikes and camping',
        'Respect local customs and closures'
      ],
      note: 'Some sections are exposed and can be dangerous in wet weather. Go with a registered guide and follow local trail rules.'
    },

    caleruega: {
      tag: 'Heritage',
      location: 'Nasugbu · Batangas',
      title: 'Caleruega Church',
      image: 'assets/images/dest-caleruega.jpg',
      alt: 'The stone facade of Caleruega Church in Nasugbu, Batangas',
      desc: 'Caleruega is a hilltop retreat and chapel complex in Nasugbu, known for its gardens, stone chapel, and quiet paths. It is a place for reflection rather than a conventional tourist stop.',
      highlights: [
        'The Chapel of Transfiguration',
        'Garden paths and hilltop viewpoints',
        'Quiet spaces for reflection',
        'Check opening hours and visitor rules'
      ],
      note: 'This is an active retreat and worship site. Dress respectfully, keep noise low, and confirm visiting hours before you go.'
    },

    verde: {
      tag: 'Nature',
      location: 'Batangas City · Verde Island Passage',
      title: 'Verde Island',
      image: 'assets/images/dest-verde.jpg',
      alt: 'Verde Island seen across the water from Batangas Bay',
      desc: 'Verde Island sits in the Verde Island Passage, a strait celebrated for exceptional marine biodiversity. The island is reached by boat and is a destination for diving and snorkelling rather than resort tourism.',
      highlights: [
        'Diving and snorkelling in the Verde Island Passage',
        'Boat trips from Batangas City',
        'Fishing communities and island walks',
        'Marine-protected area etiquette'
      ],
      note: 'Trips depend on weather and local arrangements. Never anchor on coral, and follow the guidance of your dive operator and local boat crew.'
    }
  };

  const destinationModal = $('#destinationModal');
  const destinationImage = $('#destinationImage');
  const destinationTag = $('#destinationTag');
  const destinationLocation = $('#destinationLocation');
  const destinationTitle = $('#destinationTitle');
  const destinationDesc = $('#destinationDesc');
  const destinationHighlights = $('#destinationHighlights');
  const destinationNote = $('#destinationNote');

  let activeDestination = null;

  function renderDestination(id) {
    const destination = destinations[id];
    if (!destination || !destinationModal) return;

    activeDestination = id;

    if (destinationImage) {
      destinationImage.src = destination.image;
      destinationImage.alt = destination.alt;
    }

    if (destinationTag) destinationTag.textContent = destination.tag;
    if (destinationLocation) destinationLocation.textContent = destination.location;
    if (destinationTitle) destinationTitle.textContent = destination.title;
    if (destinationDesc) destinationDesc.textContent = destination.desc;
    if (destinationNote) destinationNote.textContent = destination.note;

    if (destinationHighlights) {
      destinationHighlights.replaceChildren();

      destination.highlights.forEach((highlight) => {
        const item = document.createElement('li');
        item.textContent = highlight;
        destinationHighlights.append(item);
      });
    }

    destinationModal.scrollTop = 0;
  }

  $$('[data-open-destination]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.openDestination;
      if (!destinations[id]) return;

      renderDestination(id);
      openDialog(destinationModal, button);
    });
  });

  /* ==========================================================================
     07. Gallery lightbox
     ========================================================================== */

  const galleryItems = $$('.gallery-item');
  const lightbox = $('#lightbox');
  const lightboxImage = $('#lightboxImage');
  const lightboxCaption = $('#lightboxCaption');
  const lightboxCounter = $('#lightboxCounter');
  const lightboxPrev = $('#lightboxPrev');
  const lightboxNext = $('#lightboxNext');
  const lightboxClose = $('#lightboxClose');

  let galleryIndex = 0;

  function showGalleryImage(index) {
    if (!lightboxImage || !galleryItems.length) return;

    galleryIndex = (index + galleryItems.length) % galleryItems.length;

    const item = galleryItems[galleryIndex];
    const thumbnail = $('img', item);
    const fullSource = item.dataset.full || (thumbnail ? thumbnail.src : '');
    const caption = item.dataset.caption || '';

    lightboxImage.classList.add('is-loading');
    lightboxImage.src = fullSource;
    lightboxImage.alt = thumbnail ? thumbnail.alt : caption;

    if (lightboxCaption) lightboxCaption.textContent = caption;
    if (lightboxCounter) {
      lightboxCounter.textContent = `${pad(galleryIndex + 1)} / ${pad(galleryItems.length)}`;
    }

    if (lightboxImage.complete && lightboxImage.naturalWidth > 0) {
      window.requestAnimationFrame(() => lightboxImage.classList.remove('is-loading'));
    }
  }

  function openLightbox(index, trigger) {
    if (!lightbox) return;

    showGalleryImage(index);
    openDialog(lightbox, trigger);
  }

  galleryItems.forEach((item, index) => {
    item.addEventListener('click', () => openLightbox(index, item));
  });

  if (lightboxImage) {
    lightboxImage.addEventListener('load', () => lightboxImage.classList.remove('is-loading'));
    lightboxImage.addEventListener('error', () => lightboxImage.classList.remove('is-loading'));
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', () => showGalleryImage(galleryIndex - 1));
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', () => showGalleryImage(galleryIndex + 1));
  }

  if (lightboxClose && lightbox) {
    lightboxClose.addEventListener('click', () => closeDialog(lightbox));
  }

  document.addEventListener('keydown', (event) => {
    if (!lightbox || !lightbox.open) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showGalleryImage(galleryIndex - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      showGalleryImage(galleryIndex + 1);
    }
  });

  /* Touch swipe navigation. */
  if (lightbox) {
    let pointerStartX = null;
    let pointerStartY = null;

    lightbox.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
    });

    lightbox.addEventListener('pointerup', (event) => {
      if (pointerStartX === null || pointerStartY === null) return;

      const deltaX = event.clientX - pointerStartX;
      const deltaY = event.clientY - pointerStartY;

      pointerStartX = null;
      pointerStartY = null;

      if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY)) {
        showGalleryImage(galleryIndex + (deltaX < 0 ? 1 : -1));
      }
    });

    lightbox.addEventListener('pointercancel', () => {
      pointerStartX = null;
      pointerStartY = null;
    });
  }

  /* ==========================================================================
     08. Photo credits & footer year
     ========================================================================== */

  /* One entry per unique photograph used on the page. */
  const photoCredits = [
    { title: 'A view of Taal Volcano from Tanauan, Batangas', author: 'micluna', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:A_view_of_Taal_Volcano_from_Tanauan,_Batangas.jpg' },
    { title: 'Ancestral House in Taal, Batangas', author: 'Elmer B. Domingo', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Ancestral_House_in_Taal,_Batangas.jpg' },
    { title: 'Anilao, Batangas (sunset)', author: 'Heinrich Balbuena', license: 'CC BY 3.0', url: 'https://commons.wikimedia.org/wiki/File:Anilao,_Batanagas.JPG' },
    { title: 'Batangas Lomi in Lemery, Batangas', author: 'Ralff Nestor Nacor', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Batangas_Lomi_in_Lemery,_Batangas,_May_2026.jpg' },
    { title: 'Batulao', author: 'Allan Jay Quesada', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Batulao_-_Allan_Jay_Quesada.jpg' },
    { title: 'Beauty before the eruption (Taal Volcano crater)', author: 'LemuelSalibio', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Beauty_before_the_eruption_(Taal_Volcano_crater).jpg' },
    { title: 'Boats of Anilao, Batangas', author: 'Aldrin J. Garces', license: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Boats_of_Anilao,_Batangas.jpg' },
    { title: 'Bulalo from the Philippines', author: 'Obsidian Soul', license: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Bulalo_from_the_Philippines.jpg' },
    { title: 'Calayo Beach, Nasugbu, Batangas', author: 'Ten Thousand Strangers', license: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Calayo_Beach,_Nasugbu,_Batangas.jpg' },
    { title: 'Caleruega Church', author: 'Emman A. Foronda', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Caleruega_Church.jpg' },
    { title: 'Gotong Batangas', author: 'CNEcija12345', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Gotong_Batangas_CNE.jpg' },
    { title: 'Jeepney on the Batangas City–Lobo route', author: 'Fiszi37', license: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Jeepney_on_the_Batangas_City%E2%80%93Lobo_route_(2025).jpg' },
    { title: 'Kapeng Barako', author: 'Ej Afable', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Kapeng_Barako.jpg' },
    { title: 'Laiya Beach Resorts', author: 'Ten Thousand Strangers', license: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Laiya_Beach_Resorts.jpg' },
    { title: 'Laiya Beach, San Juan, Batangas', author: 'Marvinsinag', license: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Laiya_Beach_San_Juan_Batangas.jpg' },
    { title: 'Marcela Agoncillo Ancestral House, Taal', author: 'Ralff Nestor Nacor', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Marcela_Agoncillo_Ancestral_House,_Taal,_Batangas,_May_2026.jpg' },
    { title: 'Masasa Beach, Tingloy, Batangas', author: 'Joshmagtunao', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Masasa_Beach,_Tingloy_Batangas.jpg' },
    { title: 'Minor Basilica of Saint Martin of Tours (Taal Basilica)', author: 'ImaheNiNiño1989', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Minor_Basilica_of_Saint_Martin_of_Tours_or_Taal_Basilica_85M7772.jpg' },
    { title: 'Mount Macolod', author: 'Lawrence Ruiz', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Mount_Macolod.jpg' },
    { title: 'Mount Macolod peak hidden by clouds', author: 'Ramon FVelasquez', license: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Mount_Macolod_peak_hidden_by_clouds.jpg' },
    { title: 'Panutsa', author: 'Richmond Chi', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Panutsa.jpg' },
    { title: 'Ruins of Fortune Island, Nasugbu', author: 'Alienscream', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:RuinsofFortuneIsland_Nasugbu_Batangas_Philippines.jpg' },
    { title: 'Sinaing na Tulingan', author: 'micluna', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Sinaing_na_Tulingan_(braised_fish).jpg' },
    { title: 'Sublian sa Mataasnakahoy', author: 'Tbalaba', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Sublian_sa_Mataasnakahoy.jpg' },
    { title: 'Taal Basilica, Batangas', author: 'Ranieljosecastaneda', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:TAAL_BASILICA_BATANGAS_-_Asia%27s_Largest_Catholic_Church.jpg' },
    { title: 'Taal Lake Fisherman', author: 'micluna', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Taal_Lake_Fisherman.jpg' },
    { title: 'Taal Volcano from air', author: 'Patrickroque01', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Taal_Volcano_from_air_(Batangas;_04-03-2024).jpg' },
    { title: 'Taal Volcano Lake', author: 'Michael Angelo Luna', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Taal_Volcano_Lake.jpg' },
    { title: 'The 12 peaks at Mt. Batulao, Nasugbu', author: 'Larsjepp', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:12_peaks_at_Mt_Batulao_Nasugbu_Batangas.jpg' },
    { title: 'View of Verde Island from Batangas Bay', author: 'Ralff Nestor Nacor', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:View_of_Verde_Island_from_Batangas_Bay,_May_2026_(2).jpg' },
    { title: 'Ylagan-De La Rosa Ancestral House, Taal', author: 'Ralff Nestor Nacor', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Ylagan-De_La_Rosa_Ancestral_House,_Taal,_Batangas,_May_2026.jpg' }
  ];

  const creditsList = $('#creditsList');
  const creditsModal = $('#creditsModal');

  function buildCredits() {
    if (!creditsList) return;

    const fragment = document.createDocumentFragment();

    photoCredits
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title))
      .forEach((credit) => {
        const item = document.createElement('li');
        const title = document.createElement('strong');
        const link = document.createElement('a');

        title.textContent = credit.title;
        link.href = credit.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Wikimedia Commons';

        item.append(
          title,
          document.createTextNode(`${credit.author} · ${credit.license} · `),
          link
        );

        fragment.append(item);
      });

    creditsList.append(fragment);
  }

  buildCredits();

  ['#openCredits', '#openCreditsBottom'].forEach((selector) => {
    const trigger = $(selector);

    if (trigger) {
      trigger.addEventListener('click', () => openDialog(creditsModal, trigger));
    }
  });

  const footerYear = $('#footerYear');
  if (footerYear) footerYear.textContent = String(new Date().getFullYear());

  /* ==========================================================================
     Initial paint
     ========================================================================== */

  updateScrollUI();
})();
