(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const body = document.body;
  const base = body.dataset.base || './';
  const homeUrl = new URL(base, document.baseURI);

  // Shared theme and header-search behavior for the home page and generated game pages.
  const themeToggle = $('#themeToggle');
  const themeGlyph = $('#themeGlyph');
  function setTheme(theme) {
    if (theme === 'light') {
      body.setAttribute('data-theme', 'light');
      if (themeGlyph) themeGlyph.textContent = '☾';
    } else {
      body.removeAttribute('data-theme');
      if (themeGlyph) themeGlyph.textContent = '☼';
      theme = 'dark';
    }
    try { localStorage.setItem('modex-theme', theme); } catch (_) { /* Storage may be disabled. */ }
  }
  try { setTheme(localStorage.getItem('modex-theme') || 'dark'); } catch (_) { setTheme('dark'); }
  if (themeToggle) themeToggle.addEventListener('click', () => setTheme(body.getAttribute('data-theme') === 'light' ? 'dark' : 'light'));
  const year = $('#currentYear');
  if (year) year.textContent = new Date().getFullYear();

  const searchForm = $('#searchForm');
  const searchInput = $('#searchInput');
  if (searchForm && searchInput) {
    const currentParams = new URLSearchParams(location.search);
    if (currentParams.has('q')) searchInput.value = currentParams.get('q') || '';
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = searchInput.value.trim();
      if (body.dataset.page === 'home') {
        if (typeof window.filterModexGames === 'function') window.filterModexGames(query, true);
      } else {
        const target = new URL(homeUrl.href);
        if (query) target.searchParams.set('q', query);
        location.href = target.href + '#games';
      }
    });
  }

  if (body.dataset.page !== 'home') return;

  const grid = $('#gameGrid');
  const recent = $('#recentGames');
  const categoryList = $('#categoryList');
  const resultCount = $('#resultsCount');
  const emptyState = $('#emptyState');
  const sortSelect = $('#sortSelect');
  const search = $('#searchInput');
  const hero = $('#hero');
  let games = [];
  let selectedCategory = 'all';
  let query = new URLSearchParams(location.search).get('q') || '';
  let sortMode = 'featured';
  const safeSlug = (value) => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game';
  const imageUrl = (game) => {
    const path = game.image || '';
    if (/^(https?:|data:)/i.test(path)) return path;
    return new URL(path.split('/').map((part, i) => i ? encodeURIComponent(part) : part).join('/'), homeUrl).href;
  };
  const pageUrl = (game) => new URL(`games/${game.slug || safeSlug(game.title)}/`, homeUrl).href;
  const text = (value, fallback = '') => String(value == null || value === '' ? fallback : value);

  function createCard(game, isNew = false) {
    const article = document.createElement('article');
    article.className = 'game-card';
    const link = document.createElement('a');
    link.className = 'game-card-link';
    link.href = pageUrl(game);
    link.setAttribute('aria-label', `View details for ${text(game.title, 'game')}`);
    const image = document.createElement('img');
    image.className = 'game-card-image';
    image.src = imageUrl(game);
    image.alt = `${text(game.title)} cover art`;
    image.loading = 'lazy';
    image.onerror = () => { image.onerror = null; image.classList.add('image-unavailable'); image.alt = `${text(game.title)} image unavailable`; };
    link.appendChild(image);
    if (isNew) {
      const tag = document.createElement('span'); tag.className = 'new-tag'; tag.textContent = 'JUST ADDED'; link.appendChild(tag);
    }
    const cardBody = document.createElement('div'); cardBody.className = 'game-card-body';
    const category = document.createElement('span'); category.className = 'game-category'; category.textContent = text(game.category, 'Other');
    const title = document.createElement('h3'); title.textContent = text(game.title, 'Untitled game');
    const meta = document.createElement('div'); meta.className = 'game-card-meta';
    const platform = document.createElement('span'); platform.textContent = text(game.description && game.description.platform, 'Mobile');
    const rating = document.createElement('span'); rating.className = 'rating';
    const star = document.createElement('span'); star.className = 'rating-star'; star.textContent = '★';
    rating.append(star, document.createTextNode(text(game.rating, '—')));
    meta.append(platform, rating);
    cardBody.append(category, title, meta);
    link.appendChild(cardBody); article.appendChild(link);
    return article;
  }

  function renderHero() {
    if (!games.length) return;
    const featured = games.find(game => game.featured) || games[0];
    const title = $('#heroTitle');
    const description = $('#heroDescription');
    const kicker = $('#heroKicker');
    const meta = $('#heroMeta');
    const image = $('#heroImage');
    const action = $('#heroAction');
    if (title) title.innerHTML = `${escapeHtml(featured.title).replace(/\s+/, '<br>')}<br><span>Worth playing.</span>`;
    if (description) description.textContent = text(featured.description && featured.description.overview, 'Discover this game and explore its details.');
    if (kicker) kicker.textContent = `${text(featured.category, 'FEATURED').toUpperCase()} SPOTLIGHT`;
    if (meta) {
      meta.replaceChildren();
      [text(featured.category, 'Mobile game'), `${text(featured.rating, '—')} ★ rating`, text(featured.size, 'Size varies')].forEach((item, index) => {
        if (index) meta.appendChild(document.createTextNode('•'));
        const span = document.createElement('span'); span.textContent = item; meta.appendChild(span);
      });
    }
    if (image) { image.src = imageUrl(featured); image.alt = ''; image.onerror = () => { image.onerror = null; image.style.visibility = 'hidden'; }; }
    if (action) { action.href = pageUrl(featured); action.innerHTML = 'Explore featured game <span aria-hidden="true">↗</span>'; }
    const total = $('#heroTotal'); if (total) total.textContent = `${games.length} ${games.length === 1 ? 'GAME' : 'GAMES'}`;
    const index = $('#heroIndex'); if (index) index.textContent = '01';
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function renderCategories() {
    if (!categoryList) return;
    categoryList.replaceChildren();
    const counts = new Map();
    games.forEach(game => { const category = text(game.category, 'Other'); counts.set(category, (counts.get(category) || 0) + 1); });
    const addChip = (key, label, count) => {
      const button = document.createElement('button'); button.type = 'button';
      button.className = `category-chip${selectedCategory === key ? ' selected' : ''}`;
      button.dataset.category = key; button.textContent = label;
      const n = document.createElement('span'); n.className = 'chip-count'; n.textContent = count; button.appendChild(n);
      button.addEventListener('click', () => { selectedCategory = key; renderCategories(); renderGrid(); });
      categoryList.appendChild(button);
    };
    addChip('all', 'All games', games.length);
    [...counts.entries()].sort((a,b) => a[0].localeCompare(b[0])).forEach(([name, count]) => addChip(name, name, count));
    const allCount = $('#allCount'); if (allCount) allCount.textContent = games.length;
  }
  function renderRecent() {
    if (!recent) return;
    recent.replaceChildren();
    games.slice(0, 8).forEach((game, index) => recent.appendChild(createCard(game, index < 3)));
  }
  function renderGrid() {
    if (!grid) return;
    let filtered = games.filter(game => {
      const haystack = [game.title, game.category, game.description?.genre, game.description?.overview, ...(game.description?.keyFeatures || [])].join(' ').toLowerCase();
      return (!query || haystack.includes(query.toLowerCase())) && (selectedCategory === 'all' || game.category === selectedCategory);
    });
    if (sortMode === 'name') filtered.sort((a,b) => text(a.title).localeCompare(text(b.title)));
    else if (sortMode === 'rating') filtered.sort((a,b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
    grid.replaceChildren();
    filtered.forEach(game => grid.appendChild(createCard(game, false)));
    if (resultCount) resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'game' : 'games'}`;
    if (emptyState) emptyState.classList.toggle('hidden', filtered.length !== 0);
    if (grid) grid.classList.toggle('hidden', filtered.length === 0);
    const heading = $('#gamesHeading');
    if (heading) heading.textContent = query ? `Results for “${query}”` : selectedCategory === 'all' ? 'Explore all games' : `${selectedCategory} games`;
  }
  window.filterModexGames = (nextQuery, updateUrl = false) => {
    query = String(nextQuery || '').trim();
    if (search && search.value !== query) search.value = query;
    renderGrid();
    if (updateUrl) {
      const url = new URL(location.href);
      if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
      history.replaceState({}, '', url);
      if (query) $('#new-games')?.classList.add('hidden'); else $('#new-games')?.classList.remove('hidden');
    }
  };
  if (search) search.addEventListener('input', () => window.filterModexGames(search.value, true));
  if (sortSelect) sortSelect.addEventListener('change', () => { sortMode = sortSelect.value; renderGrid(); });
  const prev = $('#railPrev'), next = $('#railNext');
  if (prev) prev.addEventListener('click', () => recent?.scrollBy({left: -recent.clientWidth * .8, behavior: 'smooth'}));
  if (next) next.addEventListener('click', () => recent?.scrollBy({left: recent.clientWidth * .8, behavior: 'smooth'}));

  fetch(new URL('games.json', homeUrl).href, {cache: 'no-cache'})
    .then(response => { if (!response.ok) throw new Error(`Unable to load games.json (${response.status})`); return response.json(); })
    .then(data => {
      if (!Array.isArray(data)) throw new Error('games.json must contain a JSON array.');
      games = data.filter(game => game && game.title && game.image);
      if (!games.length) throw new Error('No valid games are listed in games.json.');
      renderHero(); renderCategories(); renderRecent();
      if (search) search.value = query;
      window.filterModexGames(query, false);
      if (query) $('#new-games')?.classList.add('hidden');
    })
    .catch(error => {
      console.error(error);
      if (grid) grid.innerHTML = '<p class="loading-state">Could not load the game catalogue. Check that <code>games.json</code> is available and run the site through a local web server.</p>';
      if (recent) recent.innerHTML = '<p class="loading-state">Game catalogue unavailable.</p>';
    });
})();
