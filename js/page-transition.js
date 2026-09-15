/**
 * GreenShift Page Transition Engine
 * Smooth page entrance, exit animations, and top glowing progress bar.
 */
(function () {
  function getProgressBar() {
    let bar = document.getElementById('gs-page-progress-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'gs-page-progress-bar';
      document.documentElement.appendChild(bar);
    }
    return bar;
  }

  function triggerPageIn() {
    const bar = getProgressBar();
    bar.classList.remove('gs-loading');
    bar.classList.add('gs-finished');

    setTimeout(() => {
      bar.style.opacity = '0';
      setTimeout(() => {
        bar.classList.remove('gs-finished');
        bar.style.width = '0%';
        bar.style.opacity = '';
      }, 250);
    }, 150);

    if (document.body) {
      document.body.classList.add('gs-page-transition-body');
      requestAnimationFrame(() => {
        document.body.classList.remove('gs-page-leaving');
        document.body.classList.add('gs-page-loaded');
      });
    }
  }

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    triggerPageIn();
  } else {
    document.addEventListener('DOMContentLoaded', triggerPageIn);
  }

  window.addEventListener('pageshow', function () {
    triggerPageIn();
  });

  // Intercept internal link clicks for smooth exit animation
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Ignore anchors, JS links, tel, mailto, downloads, new tabs
    if (
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      link.target === '_blank' ||
      link.hasAttribute('download') ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey
    ) {
      return;
    }

    let targetUrl;
    try {
      targetUrl = new URL(link.href, window.location.href);
    } catch (err) {
      return;
    }

    // Ignore external origins
    if (targetUrl.origin !== window.location.origin) return;

    // Same path & query with only hash change -> allow native smooth anchor jump
    if (
      targetUrl.pathname === window.location.pathname &&
      targetUrl.search === window.location.search &&
      targetUrl.hash
    ) {
      return;
    }

    // If navigating to the exact same page without hash, ignore
    if (targetUrl.href === window.location.href) return;

    e.preventDefault();

    const bar = getProgressBar();
    bar.classList.remove('gs-finished');
    bar.style.width = '0%';
    bar.style.opacity = '1';
    requestAnimationFrame(() => {
      bar.classList.add('gs-loading');
    });

    if (document.body) {
      document.body.classList.remove('gs-page-loaded');
      document.body.classList.add('gs-page-leaving');
    }

    setTimeout(function () {
      window.location.href = targetUrl.href;
    }, 200);
  });
})();
