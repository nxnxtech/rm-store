/* ============================================
   SCROLL HINT COMPONENT
   Full-width bottom bar with a bouncing chevron
   nudging the user to keep scrolling. Disappears
   permanently (until page refresh) once the
   footer enters the viewport.

   Usage: drop <script src="../components/scroll-hint.js"></script>
   near the end of the page, after #footer-placeholder
   exists in the DOM. No other setup required.
   ============================================ */

(function () {
  const FOOTER_SELECTOR = '#footer-placeholder, footer';
  const MIN_SCROLLABLE_PX = 200; // don't show on pages that barely scroll

  let dismissed = false;
  let el = null;
  let observer = null;

  function init() {
    if (dismissed || el) return;

    const footer = document.querySelector(FOOTER_SELECTOR);
    if (!footer) return;

    // Skip entirely if there's nothing meaningful to scroll to.
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable < MIN_SCROLLABLE_PX) return;

    // If the footer is already visible on load, don't bother showing the hint.
    if (footer.getBoundingClientRect().top < window.innerHeight) return;

    build();
    watchFooter(footer);
  }

  function build() {
    el = document.createElement('div');
    el.className = 'scroll-hint';
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Scroll down');
    el.innerHTML = `
      <div class="scroll-hint-chevron">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
    `;
    el.addEventListener('click', () => {
      window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('active'));
  }

  function watchFooter(footer) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) dismiss();
      });
    }, { threshold: 0, rootMargin: '0px 0px 0px 0px' });
    observer.observe(footer);
  }

  function dismiss() {
    dismissed = true;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (el) {
      el.classList.remove('active');
      el.classList.add('scroll-hint-hidden');
      const node = el;
      el = null;
      setTimeout(() => node.remove(), 400);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Some pages render footer/content asynchronously (data-driven pages
  // like product.html). Give layout a moment to settle, then re-check.
  window.addEventListener('load', () => setTimeout(init, 300));
})();