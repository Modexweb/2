(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let games = [];
  const status = $('catalogueStatus');
  const formStatus = $('formStatus');
  const fields = ['gameTitle','gameCategory','gameImage','gameScreenshots','gameSize','gameRating','gamePlatform','gameGenre','gameDownload','gameModFeatures','gameOverview','gameFeatures','gameHighlights','gameFeatured'];
  const say = (target, message, kind = '') => { target.textContent = message; target.className = `admin-status${kind ? ' ' + kind : ''}`; };
  const slugify = (value) => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game';
  const setValue = (id, value) => { const node = $(id); if (!node) return; if (node.type === 'checkbox') node.checked = Boolean(value); else node.value = value == null ? '' : value; };
  const getValue = (id) => { const node = $(id); return node.type === 'checkbox' ? node.checked : node.value.trim(); };
  const normalize = (game) => ({
    ...game,
    id: Number(game.id) || Date.now(),
    slug: slugify(game.slug || game.title),
    screenshots: Array.isArray(game.screenshots) ? game.screenshots : [],
    description: {
      ...(game.description || {}),
      genre: String(game.description?.genre || game.category || 'Mobile game'),
      platform: String(game.description?.platform || 'Android'),
      modFeatures: String(game.description?.modFeatures || ''),
      overview: String(game.description?.overview || ''),
      keyFeatures: Array.isArray(game.description?.keyFeatures) ? game.description.keyFeatures.map(String) : [],
      whyChooseMod: Array.isArray(game.description?.whyChooseMod) ? game.description.whyChooseMod.map(String) : []
    }
  });
  function renderList() {
    const root = $('adminGamesList'); root.replaceChildren();
    if (!games.length) { const p = document.createElement('p'); p.className = 'loading-state'; p.textContent = 'No games yet. Add a game using the form below.'; root.appendChild(p); return; }
    games.forEach((game, index) => {
      const row = document.createElement('div'); row.className = 'admin-game-row';
      const img = document.createElement('img'); img.src = game.image || ''; img.alt = ''; img.onerror = () => { img.style.visibility = 'hidden'; };
      const copy = document.createElement('div'); copy.className = 'row-copy';
      const title = document.createElement('strong'); title.textContent = game.title || 'Untitled game';
      const sub = document.createElement('small'); sub.textContent = `${game.category || 'Other'} · Rating ${game.rating || '—'} · ${game.size || 'Size unknown'}`;
      copy.append(title, sub);
      const edit = document.createElement('button'); edit.className = 'admin-button'; edit.type = 'button'; edit.textContent = 'Edit'; edit.addEventListener('click', () => beginEdit(index));
      const remove = document.createElement('button'); remove.className = 'admin-button danger'; remove.type = 'button'; remove.textContent = 'Remove'; remove.addEventListener('click', () => {
        const removed = games[index].title;
        games.splice(index, 1); renderList(); say(status, `Removed “${removed}” from this working catalogue. Export to keep the change.`, 'success');
        if (String($('editId').value) === String(index)) clearForm();
      });
      row.append(img, copy, edit, remove); root.appendChild(row);
    });
  }
  function clearForm() {
    $('gameForm').reset(); $('editId').value = ''; setValue('gamePlatform', 'Android');
    $('editorHeading').textContent = 'Add a game'; $('saveGameButton').textContent = 'Save game to working catalogue';
    say(formStatus, '');
  }
  function beginEdit(index) {
    const game = games[index]; const d = game.description || {};
    $('editId').value = String(index);
    setValue('gameTitle', game.title); setValue('gameCategory', game.category); setValue('gameImage', game.image);
    setValue('gameScreenshots', (game.screenshots || []).join(', ')); setValue('gameSize', game.size); setValue('gameRating', game.rating);
    setValue('gamePlatform', d.platform || 'Android'); setValue('gameGenre', d.genre || game.category); setValue('gameDownload', game.downloadUrl);
    setValue('gameModFeatures', d.modFeatures); setValue('gameOverview', d.overview); setValue('gameFeatures', (d.keyFeatures || []).map(stripTags).join('\n'));
    setValue('gameHighlights', (d.whyChooseMod || []).map(stripTags).join('\n')); setValue('gameFeatured', game.featured);
    $('editorHeading').textContent = `Edit: ${game.title}`; $('saveGameButton').textContent = 'Update game'; $('editorPanel').scrollIntoView({behavior:'smooth',block:'start'}); say(formStatus, `Editing “${game.title}”.`);
  }
  function stripTags(value) { return String(value || '').replace(/<[^>]*>/g, ''); }
  $('gameForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const title = getValue('gameTitle'); const category = getValue('gameCategory'); const image = getValue('gameImage'); const overview = getValue('gameOverview');
    if (!title || !category || !image || !overview) { say(formStatus, 'Title, category, image, and overview are required.', 'error'); return; }
    const editIndex = $('editId').value === '' ? -1 : Number($('editId').value);
    const existing = editIndex >= 0 ? games[editIndex] : {};
    const parseLines = (value) => value.split('\n').map(item => item.trim()).filter(Boolean);
    const screenshots = getValue('gameScreenshots').split(',').map(item => item.trim()).filter(Boolean);
    const next = normalize({
      ...existing,
      id: existing.id || Math.max(0, ...games.map(game => Number(game.id) || 0)) + 1,
      title, slug: existing.slug || slugify(title), category, image, screenshots,
      size: getValue('gameSize') || 'Not listed', rating: getValue('gameRating') || '',
      downloadUrl: getValue('gameDownload') || '', featured: getValue('gameFeatured'),
      description: {
        genre: getValue('gameGenre') || category, platform: getValue('gamePlatform') || 'Android',
        modFeatures: getValue('gameModFeatures'), overview,
        keyFeatures: parseLines(getValue('gameFeatures')),
        whyChooseMod: parseLines(getValue('gameHighlights'))
      }
    });
    // Keep only one featured title at a time.
    if (next.featured) games = games.map(game => ({...game, featured: false}));
    if (editIndex >= 0 && editIndex < games.length) games[editIndex] = next; else games.unshift(next);
    renderList(); clearForm(); say(formStatus, `Saved “${title}” in this working catalogue. Export games.json to publish it.`, 'success');
    say(status, `${games.length} games in the working catalogue.`, 'success');
  });
  $('cancelEditButton').addEventListener('click', clearForm);
  $('exportButton').addEventListener('click', () => {
    try {
      const normalised = games.map(normalize);
      const blob = new Blob([JSON.stringify(normalised, null, 2) + '\n'], {type:'application/json;charset=utf-8'});
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'games.json'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      say(status, 'Exported games.json. Replace the project file and push the change to publish.', 'success');
    } catch (error) { say(status, `Could not export: ${error.message}`, 'error'); }
  });
  $('importFile').addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0]; if (!file) return;
    try { const parsed = JSON.parse(await file.text()); if (!Array.isArray(parsed)) throw new Error('JSON root must be an array.'); games = parsed.map(normalize); renderList(); clearForm(); say(status, `Imported ${games.length} games from ${file.name}.`, 'success'); }
    catch (error) { say(status, `Import failed: ${error.message}`, 'error'); }
    event.target.value = '';
  });
  $('resetButton').addEventListener('click', () => loadCatalogue());
  async function loadCatalogue() {
    try {
      const response = await fetch(new URL('games.json', document.baseURI), {cache:'no-cache'});
      if (!response.ok) throw new Error(`games.json returned ${response.status}`);
      const parsed = await response.json(); if (!Array.isArray(parsed)) throw new Error('games.json root must be an array.');
      games = parsed.map(normalize); renderList(); clearForm(); say(status, `Loaded ${games.length} games from the repository source file.`, 'success');
    } catch (error) {
      games = []; renderList(); say(status, `Could not load games.json (${error.message}). Open the site through a web server, or import the JSON file.`, 'error');
    }
  }
  loadCatalogue();
})();
