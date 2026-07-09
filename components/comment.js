/* ============================================
   COMMENT COMPONENT
   Site-wide "Chat" section.
   Seeded from js/comments.json, then any comment a
   user posts (on any page) is appended to the same
   shared, site-wide list so it shows up everywhere.
   ============================================ */

const COMMENTS_STORAGE_KEY = 'Roger McDaniels_comments';

function getStoredComments() {
  return JSON.parse(localStorage.getItem(COMMENTS_STORAGE_KEY)) || [];
}

function saveStoredComments(comments) {
  localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
}

async function initCommentsSection() {
  const section = document.getElementById('comments-section');
  if (!section) return;

  section.innerHTML = `
    <div class="section-header fade-in">
      <h2 class="section-title">Chat</h2>
      <button class="btn btn-glass btn-sm add-comment-toggle" id="add-comment-toggle" onclick="toggleCommentForm()">
        ${getIcon('plus')} Add Comment
      </button>
    </div>
    <div class="comments-wrap fade-in">
      <form class="comment-form" id="comment-form">
        <div class="form-row">
          <div class="form-group">
            <label for="comment-name">Name</label>
            <input type="text" id="comment-name" name="name" required placeholder="Your name">
          </div>
          <div class="form-group">
            <label for="comment-rating">Rating</label>
            <select id="comment-rating" name="rating">
              <option value="5">★★★★★ Excellent</option>
              <option value="4">★★★★☆ Good</option>
              <option value="3">★★★☆☆ Average</option>
              <option value="2">★★☆☆☆ Poor</option>
              <option value="1">★☆☆☆☆ Terrible</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="comment-message">Comment</label>
          <textarea id="comment-message" name="message" required placeholder="Share your thoughts..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary">
          Post Comment
          ${getIcon('send')}
        </button>
      </form>
      <div class="comment-carousel">
        <button class="comment-carousel-arrow comment-carousel-arrow-prev" onclick="commentCarouselPrev()" aria-label="Previous comments">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="comment-carousel-viewport" id="comment-carousel-viewport">
          <div class="comment-list" id="comment-list"></div>
        </div>
        <button class="comment-carousel-arrow comment-carousel-arrow-next" onclick="commentCarouselNext()" aria-label="Next comments">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="comment-carousel-dots" id="comment-carousel-dots"></div>
    </div>
  `;

  document.getElementById('comment-form').addEventListener('submit', handleCommentSubmit);
  await renderComments();
}

function toggleCommentForm() {
  const form = document.getElementById('comment-form');
  const toggle = document.getElementById('add-comment-toggle');
  if (!form || !toggle) return;

  const isOpen = form.classList.toggle('active');
  toggle.classList.toggle('active', isOpen);
  toggle.innerHTML = isOpen
    ? `${getIcon('close')} Cancel`
    : `${getIcon('plus')} Add Comment`;

  if (isOpen) {
    form.querySelector('#comment-name').focus();
  }
}

async function handleCommentSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('comment-name').value.trim();
  const rating = parseInt(document.getElementById('comment-rating').value, 10);
  const message = document.getElementById('comment-message').value.trim();
  if (!name || !message) return;

  const comments = getStoredComments();
  comments.unshift({
    name,
    rating,
    message,
    avatar: '',
    date: new Date().toISOString()
  });
  saveStoredComments(comments);

  e.target.reset();
  await renderComments();
  showToast('Comment posted!', 'success');
  toggleCommentForm();
}

async function renderComments() {
  const list = document.getElementById('comment-list');
  if (!list) return;

  // Combine the seeded testimonials/comments from comments.json with anything
  // a user has posted (stored locally), newest user comments first.
  const seeded = await loadComments();
  const userComments = getStoredComments();
  const comments = [...userComments, ...seeded];

  if (comments.length === 0) {
    list.innerHTML = `<p class="comment-empty">Be the first to leave a comment.</p>`;
    return;
  }

  list.innerHTML = comments.map(c => `
    <div class="comment-item">
      ${c.avatar
        ? `<img class="comment-avatar comment-avatar-img" src="${c.avatar}" alt="${c.name}" loading="lazy">`
        : `<div class="comment-avatar">${c.name.charAt(0).toUpperCase()}</div>`}
      <div class="comment-content">
        <div class="comment-meta">
          <h4>${c.name}</h4>
          <span class="comment-date">${new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div class="comment-stars">${renderStars(c.rating)}</div>
        <p>${c.message}</p>
      </div>
    </div>
  `).join('');

  initCommentCarousel(comments.length);
}

/* ============================================
   COMMENT CAROUSEL
   Auto-advancing horizontal carousel for the
   comment list. Slides one "page" of cards at a
   time, loops back to the start, pauses on hover
   and re-arms itself whenever the comment list is
   re-rendered (e.g. after posting a new comment).
   ============================================ */

const commentCarousel = {
  page: 0,
  totalPages: 1,
  autoplayId: null,
  autoplayDelay: 4500,
  resizeHandlerAttached: false
};

function getCommentCarouselPerView() {
  return 1;
}

function initCommentCarousel(itemCount) {
  const viewport = document.getElementById('comment-carousel-viewport');
  if (!viewport) return;

  const perView = getCommentCarouselPerView();
  commentCarousel.totalPages = Math.max(1, Math.ceil(itemCount / perView));
  commentCarousel.page = 0;

  renderCommentCarouselDots();
  updateCommentCarouselPosition(false);
  startCommentCarouselAutoplay();

  if (!commentCarousel.resizeHandlerAttached) {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const list = document.getElementById('comment-list');
        if (!list) return;
        const count = list.children.length;
        const newPerView = getCommentCarouselPerView();
        commentCarousel.totalPages = Math.max(1, Math.ceil(count / newPerView));
        commentCarousel.page = Math.min(commentCarousel.page, commentCarousel.totalPages - 1);
        renderCommentCarouselDots();
        updateCommentCarouselPosition(false);
      }, 200);
    });

    viewport.addEventListener('mouseenter', stopCommentCarouselAutoplay);
    viewport.addEventListener('mouseleave', startCommentCarouselAutoplay);

    commentCarousel.resizeHandlerAttached = true;
  }
}

function renderCommentCarouselDots() {
  const dots = document.getElementById('comment-carousel-dots');
  if (!dots) return;

  if (commentCarousel.totalPages <= 1) {
    dots.innerHTML = '';
    return;
  }

  dots.innerHTML = Array.from({ length: commentCarousel.totalPages }, (_, i) => `
    <button class="comment-carousel-dot${i === commentCarousel.page ? ' active' : ''}" onclick="goToCommentCarouselPage(${i})" aria-label="Go to comment slide ${i + 1}"></button>
  `).join('');
}

function updateCommentCarouselPosition(smooth = true) {
  const viewport = document.getElementById('comment-carousel-viewport');
  if (!viewport) return;

  viewport.scrollTo({
    left: commentCarousel.page * viewport.clientWidth,
    behavior: smooth ? 'smooth' : 'auto'
  });

  const dots = document.querySelectorAll('.comment-carousel-dot');
  dots.forEach((dot, i) => dot.classList.toggle('active', i === commentCarousel.page));
}

function goToCommentCarouselPage(page) {
  commentCarousel.page = page;
  updateCommentCarouselPosition(true);
  restartCommentCarouselAutoplay();
}

function commentCarouselNext() {
  commentCarousel.page = (commentCarousel.page + 1) % commentCarousel.totalPages;
  updateCommentCarouselPosition(true);
  restartCommentCarouselAutoplay();
}

function commentCarouselPrev() {
  commentCarousel.page = (commentCarousel.page - 1 + commentCarousel.totalPages) % commentCarousel.totalPages;
  updateCommentCarouselPosition(true);
  restartCommentCarouselAutoplay();
}

function startCommentCarouselAutoplay() {
  stopCommentCarouselAutoplay();
  if (commentCarousel.totalPages <= 1) return;
  commentCarousel.autoplayId = setInterval(() => {
    commentCarousel.page = (commentCarousel.page + 1) % commentCarousel.totalPages;
    updateCommentCarouselPosition(true);
  }, commentCarousel.autoplayDelay);
}

function stopCommentCarouselAutoplay() {
  if (commentCarousel.autoplayId) {
    clearInterval(commentCarousel.autoplayId);
    commentCarousel.autoplayId = null;
  }
}

function restartCommentCarouselAutoplay() {
  startCommentCarouselAutoplay();
}