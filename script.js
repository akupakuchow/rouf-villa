/* =========================================================
   ROUF VILLA — MAIN JAVASCRIPT
   Modular version
   Any section can be removed without breaking other sections.
========================================================= */

(() => {
  'use strict';

  /* =========================================================
     GLOBAL / SHARED
  ========================================================= */

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );


  /* =========================================================
     01. COMPARISON SLIDER
     
     If #comparison does not exist,
     this entire feature simply does nothing.
  ========================================================= */

  function initComparison() {

    const slider = document.querySelector('#comparison');

    if (!slider) {
      return;
    }

    slider.addEventListener('input', () => {

      const parent = slider.parentElement;

      if (!parent) {
        return;
      }

      parent.style.setProperty(
        '--split',
        slider.value + '%'
      );

      slider.setAttribute(
        'aria-valuetext',
        slider.value + '% original photograph visible'
      );

    });

  }


  /* =========================================================
     02. ARCHITECTURAL GALLERY
     
     If gallery or buttons are removed,
     cinematic and other sections continue working.
  ========================================================= */

  function initGallery() {

    const gallery = document.querySelector('.gallery');

    if (!gallery) {
      return;
    }


    const previousButton = document.querySelector('#previous');
    const nextButton = document.querySelector('#next');

    function moveGallery(direction) {

      const firstFigure = gallery.querySelector('figure');

      if (!firstFigure) {
        return;
      }

      const figureWidth =
        firstFigure.getBoundingClientRect().width;

      const gap = 28;

      gallery.scrollBy({
        left: direction * (figureWidth + gap),
        behavior: reducedMotion.matches
          ? 'instant'
          : 'smooth'
      });

    }


    /* Previous button */

    if (previousButton) {

      previousButton.addEventListener(
        'click',
        () => moveGallery(-1)
      );

    }


    /* Next button */

    if (nextButton) {

      nextButton.addEventListener(
        'click',
        () => moveGallery(1)
      );

    }


    /* Keyboard navigation */

    gallery.addEventListener('keydown', event => {

      if (
        event.key === 'ArrowRight' ||
        event.key === 'ArrowLeft'
      ) {

        event.preventDefault();

        moveGallery(
          event.key === 'ArrowRight' ? 1 : -1
        );

      }

    });

  }


  /* =========================================================
     03. REVEAL ANIMATIONS
     
     If there are no .reveal elements,
     nothing happens.
  ========================================================= */

  function initRevealAnimations() {

    if (!('IntersectionObserver' in window)) {
      return;
    }

    document.documentElement.classList.add('js');

    const revealElements =
      document.querySelectorAll('.reveal');

    if (!revealElements.length) {
      return;
    }


    const observer = new IntersectionObserver(
      entries => {

        entries.forEach(entry => {

          if (entry.isIntersecting) {

            entry.target.classList.add('visible');

            observer.unobserve(entry.target);

          }

        });

      },
      {
        threshold: 0.08
      }
    );


    revealElements.forEach(element => {
      observer.observe(element);
    });

  }


  /* =========================================================
     04. CINEMATIC INTRO
     
     IMPORTANT:
     Everything related to cinematic scrolling is contained
     inside this function.

     If another website section is deleted,
     cinematic will continue working.
  ========================================================= */

  function initCinematic() {

    const film =
      document.querySelector('#entrance-film');

    const cinema =
      document.querySelector('.cinematic');

    const progressControl =
      document.querySelector('#film-progress');

    const chapter =
      document.querySelector('.film-chapter');

    const hint =
      document.querySelector('#film-hint');

    const status =
      document.querySelector('#film-status');


    /* ---------------------------------------------------------
       Cinematic section itself is required.
       If it doesn't exist, simply stop cinematic initialization.
    --------------------------------------------------------- */

    if (!cinema || !film) {
      return;
    }


    /* ---------------------------------------------------------
       Stage
    --------------------------------------------------------- */

    const stage =
      cinema.querySelector('.cinematic-stage');

    if (!stage) {
      return;
    }


    /* ---------------------------------------------------------
       Cinematic text cues
       
       Missing cues are allowed.
       The cinematic will continue working with whatever
       cues are present.
    --------------------------------------------------------- */

    const cues = {};

    document
      .querySelectorAll('[data-cue]')
      .forEach(element => {

        const name = element.dataset.cue;

        if (name) {
          cues[name] = element;
        }

      });


    /* ---------------------------------------------------------
       Utility
    --------------------------------------------------------- */

    const clamp = value =>
      Math.max(0, Math.min(1, value));


    /* ---------------------------------------------------------
       State
    --------------------------------------------------------- */

    let filmDuration = 0;

    let desiredTime = 0;

    let framePending = false;

    let failed = false;

    let filmStart = 0;

    let scrollDistance = 1;

    const frameDuration = 1 / 30;


    /* =========================================================
       MEASURE CINEMATIC SECTION
    ========================================================= */

    function measureFilm() {

      if (!cinema || !stage) {
        return;
      }

      filmStart =
        window.scrollY +
        cinema.getBoundingClientRect().top;

      scrollDistance = Math.max(
        1,
        cinema.offsetHeight -
        stage.offsetHeight
      );

    }


    /* =========================================================
       SEEK VIDEO
    ========================================================= */

    function seekToScroll() {

      if (
        failed ||
        !filmDuration ||
        film.seeking ||
        film.readyState < 2
      ) {
        return;
      }


      if (
        Math.abs(
          film.currentTime - desiredTime
        ) < frameDuration / 2
      ) {
        return;
      }


      film.currentTime = desiredTime;

    }


    /* =========================================================
       CUE OPACITY
    ========================================================= */

    function cueOpacity(
      p,
      start,
      full,
      fade,
      end
    ) {

      if (p < start || p > end) {
        return 0;
      }

      if (p < full) {

        return clamp(
          (p - start) /
          (full - start)
        );

      }

      if (p > fade) {

        return clamp(
          (end - p) /
          (end - fade)
        );

      }

      return 1;

    }


    /* =========================================================
       SET CUE
       
       Missing cue = simply do nothing.
    ========================================================= */

    function setCue(
      element,
      opacity,
      rise
    ) {

      if (!element) {
        return;
      }

      element.style.opacity =
        opacity.toFixed(3);

      element.style.transform =
        `translateY(${rise * (1 - opacity)}px)`;


      /*
         The intro remains accessible.
      */

      if (
        !cues.intro ||
        element !== cues.intro
      ) {

        element.setAttribute(
          'aria-hidden',
          opacity < 0.15
            ? 'true'
            : 'false'
        );

      }

    }


    /* =========================================================
       RENDER CINEMATIC FRAME
    ========================================================= */

    function renderFilm() {

      framePending = false;


      const p =
        reducedMotion.matches || failed
          ? 0
          : clamp(
              (window.scrollY - filmStart) /
              scrollDistance
            );


      /* -------------------------------------------------------
         Calculate video time
      ------------------------------------------------------- */

      desiredTime = filmDuration
        ? Math.round(
            p *
            (filmDuration - frameDuration) /
            frameDuration
          ) * frameDuration
        : 0;


      desiredTime = Math.max(
        0,
        Math.min(
          desiredTime,
          Math.max(
            0,
            filmDuration - frameDuration
          )
        )
      );


      /* -------------------------------------------------------
         Progress control
         
         Optional — if removed, cinematic still works.
      ------------------------------------------------------- */

      if (progressControl) {

        progressControl.value =
          String(p * 100);

        progressControl.style.setProperty(
          '--film-progress',
          `${p * 100}%`
        );

        progressControl.setAttribute(
          'aria-valuetext',
          `${Math.round(p * 100)} percent through the entrance film`
        );

      }


      /* -------------------------------------------------------
         Cinematic text cues
         
         Each cue is optional.
      ------------------------------------------------------- */

      setCue(
        cues.intro,
        1 - clamp((p - 0.09) / 0.1),
        -18
      );


      setCue(
        cues.trees,
        cueOpacity(
          p,
          0.2,
          0.27,
          0.37,
          0.45
        ),
        22
      );


      setCue(
        cues.door,
        cueOpacity(
          p,
          0.47,
          0.54,
          0.69,
          0.77
        ),
        22
      );


      setCue(
        cues.inside,
        clamp((p - 0.83) / 0.12),
        22
      );


      /* -------------------------------------------------------
         Chapter text
         
         Optional.
      ------------------------------------------------------- */

      if (chapter) {

        chapter.textContent =
          p < 0.44
            ? '01 / THE COURTYARD'
            : p < 0.81
              ? '02 / THE THRESHOLD'
              : '03 / WITHIN';

      }


      /* -------------------------------------------------------
         Scroll hint
         
         Optional.
      ------------------------------------------------------- */

      if (hint) {

        hint.textContent =
          reducedMotion.matches
            ? 'Explore the story below'
            : p >= 0.995
              ? 'Continue to discover the house'
              : p < 0.01
                ? 'Scroll to enter the house'
                : 'Scroll to explore · scroll back to return';

      }


      seekToScroll();

    }


    /* =========================================================
       REQUEST FRAME
    ========================================================= */

    function requestFilmFrame() {

      if (framePending) {
        return;
      }

      framePending = true;

      requestAnimationFrame(
        renderFilm
      );

    }


    /* =========================================================
       VIDEO EVENTS
    ========================================================= */

    film.addEventListener(
      'loadedmetadata',
      () => {

        filmDuration =
          Number.isFinite(film.duration)
            ? film.duration
            : 0;

        measureFilm();

        requestFilmFrame();

      }
    );


    film.addEventListener(
      'loadeddata',
      () => {

        cinema.classList.add(
          'film-ready'
        );

        if (status) {
          status.textContent = '';
        }

        requestFilmFrame();

      }
    );


    film.addEventListener(
      'seeked',
      seekToScroll
    );


    film.addEventListener(
      'canplay',
      seekToScroll
    );


    /* ---------------------------------------------------------
       Prevent autoplay
    --------------------------------------------------------- */

    film.addEventListener(
      'play',
      () => film.pause()
    );


    /* =========================================================
       VIDEO ERROR
    ========================================================= */

    film.addEventListener(
      'error',
      () => {

        failed = true;

        document.documentElement.classList.remove(
          'cinema-enabled'
        );

        cinema.classList.add(
          'film-failed'
        );


        if (status) {

          status.textContent =
            'Film unavailable. The story continues below.';

        }


        measureFilm();

        requestFilmFrame();

      }
    );


    /* =========================================================
       FILM PROGRESS SLIDER
       
       Optional.
    ========================================================= */

    if (progressControl) {

      progressControl.addEventListener(
        'input',
        () => {

          window.scrollTo({
            top:
              filmStart +
              Number(progressControl.value) / 100 *
              scrollDistance,
            behavior: 'instant'
          });

          requestFilmFrame();

        }
      );

    }


    /* =========================================================
       WINDOW SCROLL
    ========================================================= */

    window.addEventListener(
      'scroll',
      requestFilmFrame,
      {
        passive: true
      }
    );


    /* =========================================================
       WINDOW RESIZE
    ========================================================= */

    window.addEventListener(
      'resize',
      () => {

        measureFilm();

        requestFilmFrame();

      },
      {
        passive: true
      }
    );


    /* =========================================================
       PAGE SHOW
    ========================================================= */

    window.addEventListener(
      'pageshow',
      () => {

        measureFilm();

        requestFilmFrame();

      }
    );


    /* =========================================================
       SKIP CINEMATIC
       
       IMPORTANT:
       #house is optional now.
       
       If #house exists → scroll there.
       If #house doesn't exist → cinematic section ends.
    ========================================================= */

    const skipFilm =
      document.querySelector('.skip-film');


    if (skipFilm) {

      skipFilm.addEventListener(
        'click',
        event => {

          event.preventDefault();


          const story =
            document.querySelector('#house');


          /* -----------------------------------------------
             If House section exists
          ----------------------------------------------- */

          if (story) {

            window.scrollTo({
              top:
                window.scrollY +
                story.getBoundingClientRect().top,
              behavior: 'instant'
            });


            if (
              typeof story.focus === 'function'
            ) {

              story.focus({
                preventScroll: true
              });

            }

            return;

          }


          /* -----------------------------------------------
             If House section was deleted,
             simply move below cinematic section.
          ----------------------------------------------- */

          const nextSection =
            cinema.nextElementSibling;


          if (nextSection) {

            window.scrollTo({
              top:
                window.scrollY +
                nextSection.getBoundingClientRect().top,
              behavior: 'instant'
            });


            if (
              typeof nextSection.focus === 'function'
            ) {

              nextSection.focus({
                preventScroll: true
              });

            }

          }

        }
      );

    }


    /* =========================================================
       MOTION SETUP
    ========================================================= */

    function setupMotion() {

      document.documentElement.classList.toggle(
        'cinema-enabled',
        !reducedMotion.matches && !failed
      );


      film.pause();


      /* -------------------------------------------------------
         Load video only if necessary
      ------------------------------------------------------- */

      if (
        !reducedMotion.matches &&
        !film.getAttribute('src')
      ) {

        film.src =
          window.matchMedia(
            '(max-width: 850px)'
          ).matches
            ? 'assets/entrance-mobile.mp4'
            : 'assets/entrance-scrub.mp4';


        film.load();

      }


      /* -------------------------------------------------------
         Status
      ------------------------------------------------------- */

      if (status) {

        if (reducedMotion.matches) {

          status.textContent =
            'Reduced motion is on';

        } else if (film.readyState >= 2) {

          status.textContent = '';

        }

      }


      measureFilm();

      requestFilmFrame();

    }


    /* =========================================================
       REDUCED MOTION CHANGE
    ========================================================= */

    if (
      typeof reducedMotion.addEventListener ===
      'function'
    ) {

      reducedMotion.addEventListener(
        'change',
        setupMotion
      );

    }


    /* =========================================================
       START CINEMATIC
    ========================================================= */

    setupMotion();

  }


  /* =========================================================
     INITIALIZE EVERYTHING
     
     Each module is independent.
     
     If one section is deleted:
       - that module exits
       - other modules continue
  ========================================================= */

  // Reveal the whole family in generation order when its founder enters view.
  function initFamilyTree() {
    const tree = document.querySelector('.family-tree');
    if (!tree || reducedMotion.matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        tree.classList.add('family-visible');
        observer.disconnect();
      }
    }, { threshold: 0.2 });
    tree.classList.add('family-animated');
    observer.observe(tree.querySelector('.family-root'));
  }

  initFamilyTree();

  initComparison();

  initGallery();

  initRevealAnimations();

  initCinematic();

})();