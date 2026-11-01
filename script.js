(() => {
  'use strict';

  // Portfolio content supplied by the owner.
  // Videos are listed oldest first; the same video is only kept once per folder,
  // and titles are numbered automatically.
  const rawProjectGroups = [
    {
      id: 'saas',
      name: 'SAAS Infographics',
      keywords: ['saas', 'software as a service'],
      label: 'SaaS Infographic',
      kind: 'YouTube video',
      urls: [
        'https://youtu.be/TkP1ke5_JNQ',
        'https://youtu.be/f6yCZayRz48',
        'https://youtu.be/CrPp8tKF6OM',
        'https://youtu.be/_H1V_izM5O4'
      ]
    },
    {
      id: 'short-form',
      name: 'Short Form Infographics',
      keywords: ['short form', 'shorts', 'short video'],
      label: 'Short Form',
      kind: 'YouTube Short',
      urls: [
        'https://youtube.com/shorts/VAPHMOwsGuM?feature=share',
        'https://youtube.com/shorts/oYqnqw9oGW4?feature=share',
        'https://youtube.com/shorts/yscOse1xhrs?feature=share',
        'https://youtube.com/shorts/ttOXtL8eFMA?feature=share',
        'https://youtube.com/shorts/ufyC5VimXZE?feature=share',
        'https://youtube.com/shorts/ABLsaHyX8UQ?feature=share'
      ]
    },
    {
      id: 'long-form',
      name: 'Long Form Infographics',
      keywords: ['long form', 'long video'],
      label: 'Long Form',
      kind: 'YouTube video',
      urls: [
        'https://youtu.be/xPr14CMHeVI',
        'https://youtu.be/p4alG8td2qY'
      ]
    },
    {
      id: 'talking-head',
      name: 'Talking Head',
      keywords: ['talking head', 'talkinghead'],
      label: 'Talking Head',
      kind: 'YouTube video',
      urls: [
        'https://youtu.be/p4alG8td2qY',
        'https://youtube.com/shorts/ufyC5VimXZE?feature=share',
        'https://youtube.com/shorts/ttOXtL8eFMA?feature=share'
      ]
    }
  ];

  const projectGroups = rawProjectGroups.map((group) => {
    const seen = new Set();
    const videos = [];
    group.urls.forEach((url) => {
      const id = youtubeId(url);
      if (!id || seen.has(id)) return;
      seen.add(id);
      videos.push({
        title: `${group.label} ${String(videos.length + 1).padStart(2, '0')}`,
        url,
        description: /\/shorts\//.test(url) ? 'YouTube Short' : 'YouTube video'
      });
    });
    return { id: group.id, name: group.name, keywords: group.keywords, videos };
  });

  const resourceGroups = [
    {
      id: 'project-files', name: 'Project Files', keywords: ['project', 'project files'],
      links: [{ title: 'Project Files', url: 'https://drive.google.com/drive/folders/1cwCtAw6xMDadTvah-BLzW03CIXIszWfC?usp=sharing', description: 'Google Drive folder' }]
    },
    {
      id: 'plugins', name: 'Plugins', keywords: ['plugin', 'plugins'],
      links: [{ title: 'Plugins', url: 'https://drive.google.com/drive/folders/1_jihAIffgAkcigmTzPjWU1ubIQ8XUDtO?usp=sharing', description: 'Google Drive folder' }]
    },
    {
      id: 'others', name: 'Others', keywords: ['other', 'others', 'misc'],
      links: [{ title: 'Others', url: 'https://drive.google.com/drive/folders/1SgXy3nJHU5i8Hevewdff-3PmBARQQDSq?usp=sharing', description: 'Google Drive folder' }]
    }
  ];

  const software = [
    { name: 'After Effects', detail: 'Motion design and compositing', src: 'assets/icons/after-effects.png' },
    { name: 'Premiere Pro', detail: 'Editing', src: 'assets/icons/premiere-pro.png' },
    { name: 'Photoshop', detail: 'Design and thumbnails', src: 'assets/icons/photoshop.png' },
    { name: 'Illustrator', detail: 'Vector work and logos', src: 'assets/icons/illustrator.png' },
    { name: 'DaVinci Resolve', detail: 'Editing and color', src: 'assets/icons/davinci-resolve.png' }
  ];

  const FEATURED_VIDEO_ID = 'f6yCZayRz48';
  const $ = (id) => document.getElementById(id);
  const videoWindow = $('videoWindow');
  const titlebar = $('windowTitlebar');
  const fallback = $('videoFallback');
  const restoreButton = $('restoreWindow');
  const finderPanel = $('finderPanel');
  const finderTitle = $('finderTitle');
  const finderContent = $('finderContent');
  const customSidebar = $('sidebarCustomItems');
  const itemCount = $('finderItemCount');
  const minimizedTray = $('minimizedTray');
  // YouTube refuses to embed when the page has no web origin (opened as file://) and shows Error 153.
  const canEmbed = location.protocol !== 'file:';
  const textViewer = $('textViewer');

  let activeWindow = null;
  let windowLayer = 20;
  let finderMode = null;
  let currentFolder = null;
  let currentCategoryId = null;
  let currentView = 'grid';
  let toastTimer = 0;
  let videoMaximized = false;
  let finderMaximized = false;
  let notesMaximized = false;
  let featuredIsPlaying = true;
  let featuredIsMuted = true;
  const previousRects = new Map();

  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function normalize(value) {
    return String(value ?? '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function includesAllTerms(haystack, query) {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    const text = normalize(haystack);
    return terms.every((term) => text.includes(term));
  }

  function notify(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 1900);
  }

  function setActiveWindow(windowName) {
    activeWindow = windowName;
    document.querySelectorAll('.app-window').forEach((node) => node.classList.remove('is-active'));
    if (!windowName) return;
    const node = $(windowName);
    if (!node || node.hidden || node.classList.contains('is-minimized')) {
      activeWindow = null;
      return;
    }
    node.classList.add('is-active');
    node.style.zIndex = String(++windowLayer);
  }

  function activateNextVisibleWindow(excludedId = '') {
    const candidates = [...document.querySelectorAll('.app-window')].filter((node) =>
      node.id !== excludedId && !node.hidden && !node.classList.contains('is-minimized')
    );
    candidates.sort((a, b) => (Number.parseInt(b.style.zIndex, 10) || 0) - (Number.parseInt(a.style.zIndex, 10) || 0));
    setActiveWindow(candidates[0]?.id || null);
  }

  // Clicking any exposed portion of an app window raises it above overlapping windows,
  // matching macOS window activation and focus behavior.
  document.querySelectorAll('.app-window').forEach((node) => {
    node.addEventListener('pointerdown', () => {
      if (!node.hidden && !node.classList.contains('is-minimized')) setActiveWindow(node.id);
    }, true);
  });

  function setItemCount(count) {
    itemCount.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
  }

  function youtubeId(rawUrl) {
    try {
      const url = new URL(rawUrl);
      if (url.hostname === 'youtu.be' || url.hostname.endsWith('.youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
      if (url.searchParams.get('v')) return url.searchParams.get('v');
      const match = url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/);
      return match ? match[1] : '';
    } catch {
      return '';
    }
  }

  // Camera plays the supplied featured YouTube URL in its preview stage.
  function buildFeaturedVideo() {
    const stage = $('desktopYouTube');
    if (!stage) return;
    const originParam = location.origin && location.origin !== 'null' ? `&origin=${encodeURIComponent(location.origin)}` : '';
    fallback.style.backgroundImage = `url(https://i.ytimg.com/vi/${FEATURED_VIDEO_ID}/hqdefault.jpg), url(assets/video-poster.jpg)`;
    if (!canEmbed) {
      // file:// pages cannot embed YouTube (Error 153); keep the poster and link out instead.
      fallback.removeAttribute('aria-hidden');
      fallback.innerHTML = `<a class="fallback-pill" href="https://www.youtube.com/watch?v=${FEATURED_VIDEO_ID}" target="_blank" rel="noopener noreferrer">Autoplay needs run-local.bat or hosting · Watch on YouTube ↗</a>`;
      return;
    }
    stage.innerHTML = `<iframe id="desktopYouTubeFrame" src="https://www.youtube-nocookie.com/embed/${FEATURED_VIDEO_ID}?autoplay=1&mute=1&controls=0&loop=1&playlist=${FEATURED_VIDEO_ID}&playsinline=1&enablejsapi=1&rel=0&modestbranding=1${originParam}" title="Featured portfolio video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    const frame = $('desktopYouTubeFrame');
    frame.addEventListener('load', () => {
      fallback.style.display = 'none';
      // Start listening for player events, then make sure it autoplays muted.
      frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), 'https://www.youtube-nocookie.com');
      featuredCommand('mute');
      featuredCommand('playVideo');
      window.setTimeout(() => { featuredCommand('mute'); featuredCommand('playVideo'); }, 900);
    });
  }

  function featuredCommand(command) {
    const frame = $('desktopYouTubeFrame');
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: command, args: [] }), 'https://www.youtube-nocookie.com');
  }

  function syncFeaturedUI() {
    $('playPauseButton').classList.toggle('is-paused', !featuredIsPlaying);
    $('playPauseButton').setAttribute('aria-label', featuredIsPlaying ? 'Pause video' : 'Play video');
    $('playPauseButton').title = featuredIsPlaying ? 'Pause' : 'Play';
    $('audioTool').classList.toggle('is-muted', featuredIsMuted);
    $('audioTool').setAttribute('aria-label', featuredIsMuted ? 'Turn sound on' : 'Mute');
    $('audioTool').title = featuredIsMuted ? 'Sound off. Click to turn on' : 'Sound on. Click to mute';
  }

  function playDesktopVideo() {
    featuredIsPlaying = true;
    featuredCommand('playVideo');
    syncFeaturedUI();
  }

  function pauseDesktopVideo() {
    featuredIsPlaying = false;
    featuredCommand('pauseVideo');
    syncFeaturedUI();
  }

  // Keep the buttons truthful: the player reports whether it is really playing / muted
  // (autoplay can be blocked by a browser, and the YouTube UI can change state too).
  window.addEventListener('message', (event) => {
    const frame = $('desktopYouTubeFrame');
    if (!frame || event.source !== frame.contentWindow) return;
    let data = event.data;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch { return; } }
    if (!data) return;
    if (data.event === 'onStateChange') {
      if (data.info === 1) featuredIsPlaying = true;
      if (data.info === 2) featuredIsPlaying = false;
    }
    if (data.event === 'infoDelivery' && data.info) {
      if (data.info.playerState === 1) featuredIsPlaying = true;
      if (data.info.playerState === 2) featuredIsPlaying = false;
      if (typeof data.info.muted === 'boolean') featuredIsMuted = data.info.muted;
    }
    syncFeaturedUI();
  });

  function closeFinder() {
    finderPanel.hidden = true;
    finderPanel.classList.remove('is-minimized');
    if (activeWindow === 'finderPanel') activateNextVisibleWindow('finderPanel');
  }

  function closeNotes() {
    textViewer.hidden = true;
    textViewer.classList.remove('is-minimized');
    if (activeWindow === 'textViewer') activateNextVisibleWindow('textViewer');
  }

  function setSelectedSidebar(key) {
    finderPanel.querySelectorAll('.sidebar-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.favorite === key || item.dataset.standard === key);
    });
  }

  function createSidebarButton(group) {
    const button = document.createElement('button');
    button.className = 'sidebar-item custom-favorite';
    button.type = 'button';
    button.dataset.favorite = group.id;
    button.innerHTML = `<img class="favorite-folder-icon" src="assets/folder.svg" alt=""><span>${escapeHTML(group.name)}</span>`;
    button.addEventListener('click', () => {
      $('finderSearch').value = '';
      if (finderMode === 'Projects' || finderMode === 'Resources') {
        const groups = finderMode === 'Projects' ? projectGroups : resourceGroups;
        const index = groups.findIndex((entry) => entry.id === group.id);
        if (index >= 0) renderCategory(finderMode, index);
      }
    });
    return button;
  }

  function buildSidebar(folderType) {
    finderMode = folderType;
    customSidebar.replaceChildren();
    if (folderType === 'Projects') projectGroups.forEach((group) => customSidebar.append(createSidebarButton(group)));
    if (folderType === 'Resources') resourceGroups.forEach((group) => customSidebar.append(createSidebarButton(group)));
    finderPanel.querySelectorAll('[data-standard]').forEach((button) => {
      button.onclick = () => showStandardLocation(button.dataset.standard);
    });
    if (folderType === 'SSD') setSelectedSidebar('Applications');
  }

  function showStandardLocation(label) {
    $('finderSearch').value = '';
    setSelectedSidebar(label);
    currentFolder = label;
    if (label === 'Applications') {
      renderSoftware('Applications');
      return;
    }
    finderTitle.textContent = label;
    finderContent.innerHTML = `
      <div class="standard-location">
        <div class="standard-location-icon">${label === 'AirDrop' ? '◎' : label === 'Desktop' ? '▣' : label === 'Downloads' ? '↓' : '▤'}</div>
        <h3>${escapeHTML(label)}</h3>
        <p>This Finder location is part of the macOS-style navigation.</p>
        <p class="standard-location-note">Choose one of the portfolio Favorites to browse its contents.</p>
      </div>`;
    setItemCount(0);
    updateViewButtons();
  }

  function updateViewButtons() {
    $('viewGridButton').classList.toggle('active', currentView === 'grid');
    $('viewListButton').classList.toggle('active', currentView === 'list');
    finderContent.classList.toggle('list-view', currentView === 'list');
  }

  function emptyState(title, description) {
    return `<div class="finder-empty-state"><div class="empty-folder-art">▱</div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p></div>`;
  }

  function projectCardMarkup(video, group, index) {
    const id = youtubeId(video.url || '');
    const thumbnail = id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : '';
    return `<button class="finder-file video-file" type="button" data-project-group="${escapeHTML(group.id)}" data-video-index="${index}">
      <span class="file-preview video-preview">${thumbnail ? `<img src="${escapeHTML(thumbnail)}" alt="" loading="lazy">` : '<span class="preview-play">▶</span>'}<i>▶</i></span>
      <span class="file-copy"><strong>${escapeHTML(video.title)}</strong><small>${escapeHTML(video.description || group.name)}</small></span>
    </button>`;
  }

  function resourceCardMarkup(link, group, index) {
    return `<button class="finder-file resource-file" type="button" data-resource-group="${escapeHTML(group.id)}" data-resource-index="${index}">
      <span class="file-preview resource-preview"><span>↗</span></span>
      <span class="file-copy"><strong>${escapeHTML(link.title)}</strong><small>${escapeHTML(link.description || 'Open shared resource')}</small></span>
    </button>`;
  }

  function bindProjectCards() {
    finderContent.querySelectorAll('[data-video-index]').forEach((button) => button.addEventListener('click', () => {
      const group = projectGroups.find((entry) => entry.id === button.dataset.projectGroup);
      const video = group?.videos[Number(button.dataset.videoIndex)];
      if (video) openVideo(video);
    }));
  }

  function bindResourceCards() {
    finderContent.querySelectorAll('[data-resource-index]').forEach((button) => button.addEventListener('click', () => {
      const group = resourceGroups.find((entry) => entry.id === button.dataset.resourceGroup);
      const link = group?.links[Number(button.dataset.resourceIndex)];
      if (link?.url && /^https:\/\//i.test(link.url)) {
        window.open(link.url, '_blank', 'noopener,noreferrer');
      } else notify('This resource link is unavailable.');
    }));
  }

  function renderCategory(type, index) {
    currentFolder = type;
    const groups = type === 'Projects' ? projectGroups : resourceGroups;
    const group = groups[index];
    if (!group) return;
    currentCategoryId = group.id;
    finderTitle.textContent = group.name;
    setSelectedSidebar(group.id);

    if (type === 'Projects') {
      const videos = group.videos;
      finderContent.innerHTML = videos.length
        ? `<div class="finder-items ${currentView === 'list' ? 'as-list' : 'as-grid'}">${videos.map((video) => projectCardMarkup(video, group, group.videos.indexOf(video))).join('')}</div>`
        : emptyState('No projects added yet', 'There are no Talking Head videos linked here yet.');
      bindProjectCards();
      setItemCount(videos.length);
    } else {
      const links = group.links;
      finderContent.innerHTML = links.length
        ? `<div class="finder-items ${currentView === 'list' ? 'as-list' : 'as-grid'}">${links.map((link) => resourceCardMarkup(link, group, group.links.indexOf(link))).join('')}</div>`
        : emptyState('No resources added yet', 'No shared links have been added to this category.');
      bindResourceCards();
      setItemCount(links.length);
    }
    updateViewButtons();
  }

  function renderSoftware(locationName = 'Applications') {
    currentFolder = locationName;
    finderTitle.textContent = locationName;
    setSelectedSidebar('Applications');
    finderContent.innerHTML = `<div class="software-grid ${currentView === 'list' ? 'as-list' : 'as-grid'}">${software.map((app) => `<div class="software-item" data-search-item="${escapeHTML(app.name)}">
          <img src="${escapeHTML(app.src)}" alt="${escapeHTML(app.name)} app icon" loading="lazy">
          <strong>${escapeHTML(app.name)}</strong>
          <small>${escapeHTML(app.detail)}</small>
        </div>`).join('')}</div>`;
    setItemCount(software.length);
    updateViewButtons();
  }

  // ---- Global search: always looks through every folder, video, resource, app and note. ----
  function searchEverything(query) {
    const hits = { folders: [], videos: [], resources: [], apps: [], notes: [] };
    projectGroups.forEach((group, index) => {
      if (includesAllTerms(`${group.name} ${(group.keywords || []).join(' ')} projects`, query)) hits.folders.push({ type: 'Projects', group, index });
      group.videos.forEach((video, videoIndex) => {
        if (includesAllTerms(`${video.title} ${video.description || ''} ${group.name} ${(group.keywords || []).join(' ')}`, query)) hits.videos.push({ group, video, videoIndex });
      });
    });
    resourceGroups.forEach((group, index) => {
      if (includesAllTerms(`${group.name} ${(group.keywords || []).join(' ')} resources`, query)) hits.folders.push({ type: 'Resources', group, index });
      group.links.forEach((link, linkIndex) => {
        if (includesAllTerms(`${link.title} ${link.description || ''} ${group.name} ${(group.keywords || []).join(' ')}`, query)) hits.resources.push({ group, link, linkIndex });
      });
    });
    software.forEach((app) => {
      if (includesAllTerms(`${app.name} ${app.detail} applications software`, query)) hits.apps.push(app);
    });
    notesFolders.forEach((folder) => folder.notes.forEach((note) => {
      if (includesAllTerms(`${note.title} ${note.preview} ${folder.name} notes about`, query)) hits.notes.push({ folder, note });
    }));
    return hits;
  }

  function renderGlobalSearch(query) {
    const hits = searchEverything(query);
    const layout = currentView === 'list' ? 'as-list' : 'as-grid';
    const wrap = (where, inner) => `<div class="search-result-wrap"><div class="search-result-location">${escapeHTML(where)}</div>${inner}</div>`;
    const sections = [];
    if (hits.folders.length) sections.push(['Folders', hits.folders.map(({ type, group }) => wrap(type, `<button class="finder-file" type="button" data-open-folder="${type}:${escapeHTML(group.id)}">
        <span class="file-preview folder-preview"><img src="assets/folder.svg" alt=""></span>
        <span class="file-copy"><strong>${escapeHTML(group.name)}</strong><small>Folder</small></span></button>`))]);
    if (hits.videos.length) sections.push(['Videos', hits.videos.map(({ group, video, videoIndex }) => wrap(group.name, projectCardMarkup(video, group, videoIndex)))]);
    if (hits.resources.length) sections.push(['Resources', hits.resources.map(({ group, link, linkIndex }) => wrap(group.name, resourceCardMarkup(link, group, linkIndex)))]);
    if (hits.apps.length) sections.push(['Applications', hits.apps.map((app) => wrap('Applications', `<button class="finder-file" type="button" data-open-app="${escapeHTML(app.name)}">
        <span class="file-preview app-preview"><img src="${escapeHTML(app.src)}" alt=""></span>
        <span class="file-copy"><strong>${escapeHTML(app.name)}</strong><small>${escapeHTML(app.detail)}</small></span></button>`))]);
    if (hits.notes.length) sections.push(['Notes', hits.notes.map(({ folder, note }) => wrap(`Notes · ${folder.name}`, `<button class="finder-file" type="button" data-open-note="${escapeHTML(note.id)}">
        <span class="file-preview note-preview"><img src="assets/notes.svg" alt=""></span>
        <span class="file-copy"><strong>${escapeHTML(note.title)}</strong><small>Note</small></span></button>`))]);

    const total = sections.reduce((sum, [, cards]) => sum + cards.length, 0);
    finderTitle.textContent = 'Search Results';
    setSelectedSidebar('');
    finderContent.innerHTML = total
      ? `<div class="finder-items ${layout}">${sections.map(([title, cards]) => `<div class="search-section">${title}</div>${cards.join('')}`).join('')}</div>`
      : emptyState('No matches found', 'Try SaaS, short form, long form, talking head, plugins, After Effects or about.');
    bindProjectCards();
    bindResourceCards();
    finderContent.querySelectorAll('[data-open-folder]').forEach((button) => button.addEventListener('click', () => {
      const [type, id] = button.dataset.openFolder.split(':');
      const groups = type === 'Projects' ? projectGroups : resourceGroups;
      $('finderSearch').value = '';
      buildSidebar(type);
      renderCategory(type, Math.max(0, groups.findIndex((group) => group.id === id)));
    }));
    finderContent.querySelectorAll('[data-open-app]').forEach((button) => button.addEventListener('click', () => {
      $('finderSearch').value = '';
      buildSidebar('SSD');
      renderSoftware('Applications');
    }));
    finderContent.querySelectorAll('[data-open-note]').forEach((button) => button.addEventListener('click', () => openNotes(button.dataset.openNote)));
    setItemCount(total);
    updateViewButtons();
  }

  function openFolder(name) {
    currentFolder = name;
    finderPanel.hidden = false;
    finderPanel.classList.remove('is-minimized', 'is-maximized');
    finderMaximized = false;
    finderPanel.style.left = '';
    finderPanel.style.top = '';
    finderPanel.style.transform = '';
    $('finderSearch').value = '';
    $('finderSearchRow').hidden = true;
    currentView = 'grid';
    buildSidebar(name);
    if (name === 'Projects') renderCategory('Projects', 0);
    else if (name === 'Resources') renderCategory('Resources', 0);
    else renderSoftware('Applications');
    updateViewButtons();
    setActiveWindow('finderPanel');
  }

  // ---- Video players: one floating window per video, any number at once. ----
  const mediaWindows = new Map();
  let mediaCounter = 0;

  function openVideo(item) {
    const id = youtubeId(item?.url || '');
    if (!id) {
      notify('This video link is not valid.');
      return;
    }
    const existing = mediaWindows.get(id);
    if (existing) { existing.restore(); return; }

    const isShort = /\/shorts\//.test(item.url);
    const title = item.title || 'Project video';
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    const thumb = `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
    const node = document.createElement('section');
    node.className = `media-viewer app-window${isShort ? ' is-short' : ''}`;
    node.id = `mediaWindow${++mediaCounter}`;
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'false');
    node.setAttribute('aria-label', title);
    const originParam = location.origin && location.origin !== 'null' ? `&origin=${encodeURIComponent(location.origin)}` : '';
    const body = canEmbed
      ? `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1${originParam}" title="${escapeHTML(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
      : `<a class="media-fallback" href="${watchUrl}" target="_blank" rel="noopener noreferrer" style="background-image:url(${thumb}),url(assets/video-poster.jpg)">
           <span class="fallback-play">▶</span><strong>Watch on YouTube</strong>
           <small>In-page playback needs this portfolio to be hosted (GitHub Pages, or a local server) instead of opened as a file. Once hosted, videos play right here.</small></a>`;
    node.innerHTML = `
      <header class="media-toolbar">
        <div class="finder-traffic-lights">
          <button class="traffic-light red" data-act="close" aria-label="Close video player"></button>
          <button class="traffic-light yellow" data-act="min" aria-label="Minimize video player"></button>
          <button class="traffic-light green" data-act="max" aria-label="Toggle video player size"></button>
        </div>
        <button class="media-back" data-act="close"><span>‹</span> Back</button>
        <h2>${escapeHTML(title)}</h2>
        <div class="media-actions"><a class="media-yt" href="${watchUrl}" target="_blank" rel="noopener noreferrer">YouTube ↗</a><button class="media-close" data-act="close" aria-label="Close video player">×</button></div>
      </header>
      <div class="media-content">${body}</div>`;
    desktop.append(node);

    // New players open toward the right and cascade, so the Finder stays reachable
    // and you can keep opening more videos.
    const rect = node.getBoundingClientRect();
    const step = mediaWindows.size % 6;
    node.style.left = `${Math.max(0, window.innerWidth - rect.width - 28 - step * 34)}px`;
    node.style.top = `${Math.max(0, Math.min(window.innerHeight - 60, 40 + step * 30))}px`;
    node.style.transform = 'none';

    let chip = null;
    const entry = {
      node,
      restore() {
        node.classList.remove('is-minimized');
        chip?.remove(); chip = null;
        setActiveWindow(node.id);
      },
      close() {
        chip?.remove(); chip = null;
        node.remove();
        mediaWindows.delete(id);
        if (activeWindow === node.id) activateNextVisibleWindow(node.id);
      }
    };
    mediaWindows.set(id, entry);
    node.addEventListener('pointerdown', () => {
      if (!node.classList.contains('is-minimized')) setActiveWindow(node.id);
    }, true);
    node.querySelectorAll('[data-act]').forEach((button) => button.addEventListener('click', () => {
      const act = button.dataset.act;
      if (act === 'close') entry.close();
      if (act === 'max') node.classList.toggle('is-maximized');
      if (act === 'min') {
        node.classList.add('is-minimized');
        chip = document.createElement('button');
        chip.className = 'tray-chip';
        chip.type = 'button';
        chip.textContent = `▶ ${title}`;
        chip.onclick = () => entry.restore();
        minimizedTray.append(chip);
        if (activeWindow === node.id) activateNextVisibleWindow(node.id);
      }
    }));
    wireDrag([node.querySelector('.media-toolbar')], node);
    setActiveWindow(node.id);
  }

  // ---- Notes app: folders | note list | note, like the supplied Notes.svg ----
  const aboutProfile = {
    name: 'Shailesh Jaiswal',
    handle: '@shaileshcrafts',
    role: 'Motion Designer & Video Editor',
    country: 'India',
    years: 4,
    saasCompanies: '5+',
    bio: 'Four years of turning complicated ideas into clear, fast-moving infographic videos.',
    howIWork: 'Every project starts with the story, then gets built in motion: clean layouts, tight pacing and sound that carries the viewer through.',
    instagram: 'shaileshcarfts',
    email: 'shaileshcarfts@gmail.com'
  };
  const FOLDER_ICON = '<svg viewBox="0 0 16 16"><path d="M1.8 4.3c0-.8.6-1.4 1.4-1.4h2.6l1.5 1.6h5.5c.8 0 1.4.6 1.4 1.4v5.8c0 .8-.6 1.4-1.4 1.4H3.2c-.8 0-1.4-.6-1.4-1.4z"/></svg>';
  const FLAG_ICON = '<svg viewBox="0 0 16 16"><path d="M3.5 14V2.5M3.5 3h8l-1.6 2.6L11.5 8h-8"/></svg>';
  const thumbFor = (url) => { const id = youtubeId(url); return id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : 'assets/video-poster.jpg'; };
  const allVideos = () => {
    const seen = new Set();
    return projectGroups.flatMap((group) => group.videos).filter((video) => { const id = youtubeId(video.url); if (seen.has(id)) return false; seen.add(id); return true; });
  };
  // About Me: laid out like the supplied folded poster (giant numerals, staggered photo + text blocks).
  function renderAboutNote() {
    const p = aboutProfile;
    const videos = allVideos();
    const total = videos.length;
    const thumbs = projectGroups.find((group) => group.id === 'saas')?.videos.slice(-1).map((video) => video.url) || [];
    const onerr = `onerror="this.onerror=null;this.src='assets/about/marble-face.jpg'"`;
    return `<div class="poster">
      <section class="pr pr1">
        <span class="p-tag">Years</span>
        <span class="p-num">${escapeHTML(p.years)}</span>
        <figure class="p-img"><img src="assets/about/marble-face.jpg" alt=""><figcaption>Fragment study.</figcaption></figure>
        <div class="p-text"><b>${escapeHTML(p.role)}</b>
          <p>${escapeHTML(p.name)}, ${escapeHTML(p.country)}.<br>${escapeHTML(p.handle)}</p>
          <p>${escapeHTML(p.bio)}</p></div>
      </section>
      <section class="pr pr2">
        <figure class="p-img wide"><img src="assets/about/shailesh-crafts-banner.jpg" alt="${escapeHTML(p.name)} crafts content"><figcaption>Shailesh Crafts cover.</figcaption></figure>
        <div class="p-text"><b>SaaS companies</b>
          <p>More than five SaaS companies, from product explainers to short and long-form content.</p></div>
        <span class="p-num">${escapeHTML(p.saasCompanies)}</span>
      </section>
      <section class="pr pr3">
        <figure class="p-img stack">${thumbs.map((url) => `<img src="${escapeHTML(thumbFor(url))}" alt="" ${onerr}>`).join('')}<figcaption>Latest SaaS infographic.</figcaption></figure>
        <div class="p-text"><b>Selected work</b>
          <p>${projectGroups.map((group) => `${escapeHTML(group.name.replace(' Infographics', ''))}: ${group.videos.length}`).join('<br>')}</p>
          <p><button class="notes-link" type="button" data-notes-open="${escapeHTML(projectGroups[0].id)}">Open Projects</button></p></div>
        <span class="p-num">${total}</span>
      </section>
      <section class="pr pr4">
        <span class="p-tag">Tools</span>
        <span class="p-num">${software.length}</span>
        <div class="p-text"><b>Software</b>
          <p>${software.map((app) => escapeHTML(app.name)).join('<br>')}</p>
          <b class="p-gap">Contact</b>
          <p><a href="https://instagram.com/${encodeURIComponent(p.instagram)}" target="_blank" rel="noopener noreferrer">@${escapeHTML(p.instagram)}</a><br><a href="mailto:${escapeHTML(p.email)}">${escapeHTML(p.email)}</a></p></div>
        <figure class="p-img tools"><div>${software.map((app) => `<img src="${escapeHTML(app.src)}" alt="${escapeHTML(app.name)}" title="${escapeHTML(app.name)}">`).join('')}</div><figcaption>The tools behind the work.</figcaption></figure>
      </section>
    </div>`;
  }

  function renderContactNote() {
    const p = aboutProfile;
    return `<h1>Say hello</h1>
      <p>${escapeHTML(p.name)} · ${escapeHTML(p.handle)} · ${escapeHTML(p.country)}</p>
      <ul>
        <li>Instagram: <a class="notes-link" href="https://instagram.com/${encodeURIComponent(p.instagram)}" target="_blank" rel="noopener noreferrer">@${escapeHTML(p.instagram)}</a></li>
        <li>Email: <a class="notes-link" href="mailto:${escapeHTML(p.email)}">${escapeHTML(p.email)}</a></li>
      </ul>
      <p>Available for motion design and video editing, especially SaaS explainers, short-form and long-form content.</p>
      <img class="notes-pic" src="assets/about/shailesh-crafts-banner.jpg" alt="">`;
  }

  function renderSkillsNote() {
    return `<h1>Skills &amp; Tools</h1>
      <p>The software behind the work:</p>
      <ul>${software.map((app) => `<li><em>${escapeHTML(app.name)}</em>: ${escapeHTML(app.detail)}</li>`).join('')}</ul>
      <div class="notes-apps">${software.map((app) => `<figure><img src="${escapeHTML(app.src)}" alt=""><span>${escapeHTML(app.name)}</span></figure>`).join('')}</div>`;
  }

  function renderWorkNote() {
    return `<h1>Selected Work</h1>
      <p>Everything I have published, by format:</p>
      <ul>${projectGroups.map((group) => `<li><button class="notes-link" type="button" data-notes-open="${escapeHTML(group.id)}">${escapeHTML(group.name)}</button> (${group.videos.length})</li>`).join('')}</ul>
      <img class="notes-pic" src="${escapeHTML(thumbFor(allVideos()[0]?.url || ''))}" alt="" onerror="this.onerror=null;this.src='assets/video-poster.jpg'">
      <p>Need the source files? Open <button class="notes-link" type="button" data-notes-open-resources>Resources</button>.</p>`;
  }

  const notesFolders = [
    { id: 'about', name: 'About', icon: FOLDER_ICON, notes: [
      { id: 'about-me', title: 'About Me', time: 'Today', preview: aboutProfile.role, render: renderAboutNote },
      { id: 'skills', title: 'Skills & Tools', time: 'Today', preview: 'The software behind the work', render: renderSkillsNote },
      { id: 'contact', title: 'Say hello', time: 'Yesterday', preview: 'Instagram and email', render: renderContactNote }
    ] },
    { id: 'work', name: 'Work', icon: FLAG_ICON, notes: [
      { id: 'selected-work', title: 'Selected Work', time: 'Yesterday', preview: 'Videos grouped by format', render: renderWorkNote }
    ] }
  ];

  let notesFolderId = 'about';
  let notesNoteId = 'about-me';

  function renderNotes() {
    const folder = notesFolders.find((entry) => entry.id === notesFolderId) || notesFolders[0];
    const note = folder.notes.find((entry) => entry.id === notesNoteId) || folder.notes[0];
    notesFolderId = folder.id; notesNoteId = note.id;
    $('notesFolders').innerHTML = notesFolders.map((entry) => `<button class="notes-folder${entry.id === folder.id ? ' active' : ''}" type="button" data-folder-id="${entry.id}">${entry.icon}<span class="name">${escapeHTML(entry.name)}</span><span class="count">${entry.notes.length}</span></button>`).join('');
    $('notesList').innerHTML = folder.notes.map((entry) => `<button class="note-row${entry.id === note.id ? ' active' : ''}" type="button" data-note-id="${entry.id}"><span class="t">${escapeHTML(entry.title)}</span><span class="s"><b>${escapeHTML(entry.time)}</b>${escapeHTML(entry.preview)}</span></button>`).join('');
    $('notesDate').textContent = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(',', ' at');
    $('aboutText').innerHTML = note.render();
    $('aboutText').scrollTop = 0;
    $('notesFolders').querySelectorAll('[data-folder-id]').forEach((button) => button.onclick = () => { notesFolderId = button.dataset.folderId; notesNoteId = ''; renderNotes(); });
    $('notesList').querySelectorAll('[data-note-id]').forEach((button) => button.onclick = () => { notesNoteId = button.dataset.noteId; renderNotes(); });
    $('aboutText').querySelectorAll('[data-notes-open]').forEach((button) => button.onclick = () => {
      openFolder('Projects');
      renderCategory('Projects', Math.max(0, projectGroups.findIndex((group) => group.id === button.dataset.notesOpen)));
    });
    $('aboutText').querySelectorAll('[data-notes-open-resources]').forEach((button) => button.onclick = () => openFolder('Resources'));
  }

  function openNotes(noteId) {
    textViewer.hidden = false;
    textViewer.classList.remove('is-minimized', 'is-maximized');
    notesMaximized = false;
    textViewer.style.left = '';
    textViewer.style.top = '';
    textViewer.style.transform = '';
    if (typeof noteId === 'string') {
      const folder = notesFolders.find((entry) => entry.notes.some((note) => note.id === noteId));
      if (folder) { notesFolderId = folder.id; notesNoteId = noteId; }
    }
    renderNotes();
    setActiveWindow('textViewer');
  }

  // Camera window controls and YouTube player commands.
  const desktop = document.querySelector('.desktop');
  buildFeaturedVideo();
  setActiveWindow('videoWindow');
  syncFeaturedUI();
  const hideFeaturedWindow = () => {
    videoWindow.hidden = true;
    restoreButton.hidden = false;
    if (typeof loadDesktopIconPositions === 'function') loadDesktopIconPositions();
    pauseDesktopVideo();
    if (activeWindow === 'videoWindow') activateNextVisibleWindow('videoWindow');
  };
  $('closeWindow').onclick = hideFeaturedWindow;
  $('minimizeWindow').onclick = hideFeaturedWindow;
  restoreButton.onclick = () => {
    if (ignoreDesktopDragClick(restoreButton)) return;
    videoWindow.hidden = false;
    restoreButton.hidden = true;
    playDesktopVideo();
    setActiveWindow('videoWindow');
  };
  $('maximizeWindow').onclick = () => {
    videoMaximized = !videoMaximized;
    if (videoMaximized) previousRects.set('videoWindow', videoWindow.getBoundingClientRect());
    videoWindow.classList.toggle('is-fullscreen', videoMaximized);
    if (!videoMaximized) {
      const rect = previousRects.get('videoWindow');
      if (rect) { videoWindow.style.left = `${rect.left}px`; videoWindow.style.top = `${rect.top}px`; videoWindow.style.transform = 'none'; }
    }
  };
  $('playPauseButton').onclick = () => featuredIsPlaying ? pauseDesktopVideo() : playDesktopVideo();
  $('audioTool').onclick = () => {
    featuredIsMuted = !featuredIsMuted;
    featuredCommand(featuredIsMuted ? 'mute' : 'unMute');
    if (!featuredIsMuted && !featuredIsPlaying) playDesktopVideo();
    syncFeaturedUI();
    notify(featuredIsMuted ? 'Sound off' : 'Sound on');
  };
  $('effectsButton').onclick = () => {
    const open = $('effectsButton').getAttribute('aria-expanded') === 'true';
    $('effectsButton').setAttribute('aria-expanded', String(!open));
    $('effectsMenu').hidden = open;
  };
  document.querySelectorAll('[data-filter]').forEach((button) => button.onclick = () => {
    const frame = $('desktopYouTubeFrame');
    frame?.classList.remove('filter-soft', 'filter-warm', 'filter-mono');
    if (button.dataset.filter !== 'none') frame?.classList.add(`filter-${button.dataset.filter}`);
    document.querySelectorAll('[data-filter]').forEach((entry) => entry.classList.toggle('active', entry === button));
    $('effectsMenu').hidden = true;
    $('effectsButton').setAttribute('aria-expanded', 'false');
  });

  function wireDrag(handles, target) {
    let state = null;
    handles.forEach((handle) => {
      handle.addEventListener('pointerdown', (event) => {
        if (event.target.closest('button, a, input')) return;
        if (target.classList.contains('is-maximized') || target.classList.contains('is-fullscreen')) return;
        const rect = target.getBoundingClientRect();
        state = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
        handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener('pointermove', (event) => {
        if (!state) return;
        const maxLeft = window.innerWidth - target.offsetWidth;
        const maxTop = window.innerHeight - 44;
        target.style.left = `${Math.max(0, Math.min(maxLeft, state.left + event.clientX - state.x))}px`;
        target.style.top = `${Math.max(0, Math.min(maxTop, state.top + event.clientY - state.y))}px`;
        target.style.transform = 'none';
      });
      handle.addEventListener('pointerup', () => { state = null; });
      handle.addEventListener('pointercancel', () => { state = null; });
    });
  }
  wireDrag([titlebar], videoWindow);
  wireDrag([$('finderToolbar')], finderPanel);
  wireDrag([...textViewer.querySelectorAll('[data-drag]')], textViewer);

  // Desktop icons can be repositioned like macOS desktop items. Positions are
  // remembered in this browser, but are constrained to the desktop work area.
  const desktopIcons = [...document.querySelectorAll('.desktop-icon, .restore-window')];
  const desktopPositionKey = 'macos-portfolio-desktop-icon-positions-v1';
  let desktopDrag = null;

  function desktopIconKey(icon) { return icon.dataset.folder || icon.id || icon.className; }

  function loadDesktopIconPositions() {
    try {
      const stored = JSON.parse(localStorage.getItem(desktopPositionKey) || '{}');
      desktopIcons.forEach((icon) => {
        const position = stored[desktopIconKey(icon)];
        if (!position || icon.hidden) return;
        const maxLeft = Math.max(0, desktop.clientWidth - icon.offsetWidth);
        const maxTop = Math.max(0, desktop.clientHeight - icon.offsetHeight);
        icon.style.left = `${Math.max(0, Math.min(1, position.x)) * maxLeft}px`;
        icon.style.top = `${Math.max(0, Math.min(1, position.y)) * maxTop}px`;
        icon.style.right = 'auto';
        icon.style.bottom = 'auto';
        icon.style.transform = 'none';
      });
    } catch { /* local storage can be unavailable in private browsing */ }
  }

  function saveDesktopIconPositions() {
    const positions = {};
    desktopIcons.forEach((icon) => {
      if (icon.hidden || icon.style.left === '' || icon.style.top === '') return;
      const maxLeft = Math.max(1, desktop.clientWidth - icon.offsetWidth);
      const maxTop = Math.max(1, desktop.clientHeight - icon.offsetHeight);
      positions[desktopIconKey(icon)] = {
        x: Math.max(0, Math.min(1, icon.offsetLeft / maxLeft)),
        y: Math.max(0, Math.min(1, icon.offsetTop / maxTop))
      };
    });
    try { localStorage.setItem(desktopPositionKey, JSON.stringify(positions)); } catch { /* optional persistence */ }
  }

  desktopIcons.forEach((icon) => {
    icon.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.pointerType !== 'touch') return;
      if (event.target.closest('a')) return;
      const desktopRect = desktop.getBoundingClientRect();
      const rect = icon.getBoundingClientRect();
      desktopDrag = { icon, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: rect.left - desktopRect.left, top: rect.top - desktopRect.top, moved: false };
      icon.setPointerCapture(event.pointerId);
    });
    icon.addEventListener('pointermove', (event) => {
      if (!desktopDrag || desktopDrag.icon !== icon || desktopDrag.pointerId !== event.pointerId) return;
      const dx = event.clientX - desktopDrag.startX;
      const dy = event.clientY - desktopDrag.startY;
      if (!desktopDrag.moved && Math.hypot(dx, dy) < 6) return;
      if (!desktopDrag.moved) {
        desktopDrag.moved = true;
        // Switch from the original right/bottom/center anchors only once a drag begins.
        icon.style.left = `${desktopDrag.left}px`;
        icon.style.top = `${desktopDrag.top}px`;
        icon.style.right = 'auto';
        icon.style.bottom = 'auto';
        icon.style.transform = 'none';
      }
      icon.classList.add('is-dragging');
      icon.style.zIndex = '90';
      const maxLeft = Math.max(0, desktop.clientWidth - icon.offsetWidth);
      const maxTop = Math.max(0, desktop.clientHeight - icon.offsetHeight);
      icon.style.left = `${Math.max(0, Math.min(maxLeft, desktopDrag.left + dx))}px`;
      icon.style.top = `${Math.max(0, Math.min(maxTop, desktopDrag.top + dy))}px`;
    });
    const finishDesktopDrag = (event) => {
      if (!desktopDrag || desktopDrag.icon !== icon || desktopDrag.pointerId !== event.pointerId) return;
      if (desktopDrag.moved) {
        icon.dataset.draggedAt = String(Date.now());
        saveDesktopIconPositions();
      }
      icon.classList.remove('is-dragging');
      icon.style.zIndex = '';
      desktopDrag = null;
    };
    icon.addEventListener('pointerup', finishDesktopDrag);
    icon.addEventListener('pointercancel', finishDesktopDrag);
  });
  loadDesktopIconPositions();
  window.addEventListener('resize', loadDesktopIconPositions);

  function ignoreDesktopDragClick(icon) {
    return Number(icon.dataset.draggedAt || 0) > 0 && Date.now() - Number(icon.dataset.draggedAt) < 450;
  }

  // Desktop launchers. Click once to open; drag to move.
  document.querySelectorAll('[data-folder]').forEach((icon) => icon.addEventListener('click', (event) => {
    if (ignoreDesktopDragClick(icon)) { event.preventDefault(); return; }
    openFolder(icon.dataset.folder);
  }));
  $('driveIcon').addEventListener('click', (event) => { if (!ignoreDesktopDragClick(event.currentTarget)) openFolder('SSD'); });
  $('finderCloseDot').onclick = closeFinder;
  $('finderMinDot').onclick = () => { finderPanel.classList.add('is-minimized'); if (activeWindow === 'finderPanel') activateNextVisibleWindow('finderPanel'); };
  $('finderMaxDot').onclick = () => {
    finderMaximized = !finderMaximized;
    finderPanel.classList.toggle('is-maximized', finderMaximized);
  };

  $('notesCloseDot').onclick = closeNotes;
  $('closeText').onclick = closeNotes;
  $('notesMinDot').onclick = () => { textViewer.classList.add('is-minimized'); if (activeWindow === 'textViewer') activateNextVisibleWindow('textViewer'); };
  $('notesMaxDot').onclick = () => {
    notesMaximized = !notesMaximized;
    textViewer.classList.toggle('is-maximized', notesMaximized);
  };
  $('aboutIcon').onclick = (event) => { if (!ignoreDesktopDragClick(event.currentTarget)) openNotes(); };
  $('screenshotIcon').onclick = (event) => { if (!ignoreDesktopDragClick(event.currentTarget)) notify('Screenshot selected'); };

  function rerenderCurrentView() {
    if (currentFolder === 'Applications' || currentFolder === 'SSD') {
      renderSoftware(currentFolder === 'SSD' ? 'SSD' : 'Applications');
      return;
    }
    if (currentFolder === 'Projects' || currentFolder === 'Resources') {
      const groups = currentFolder === 'Projects' ? projectGroups : resourceGroups;
      const index = Math.max(0, groups.findIndex((group) => group.id === currentCategoryId));
      renderCategory(currentFolder, index);
      return;
    }
    showStandardLocation(currentFolder || 'Desktop');
  }

  $('viewGridButton').onclick = () => { currentView = 'grid'; rerenderCurrentView(); };
  $('viewListButton').onclick = () => { currentView = 'list'; rerenderCurrentView(); };
  $('finderSearchToggle').onclick = () => {
    $('finderSearchRow').hidden = !$('finderSearchRow').hidden;
    if (!$('finderSearchRow').hidden) $('finderSearch').focus();
  };
  $('finderSearch').addEventListener('input', () => {
    const query = $('finderSearch').value.trim();
    if (query) renderGlobalSearch(query);
    else rerenderCurrentView();
  });
  $('finderMore').onclick = () => notify('Finder options');
  $('finderShare').onclick = () => {
    if (navigator.share) navigator.share({ title: document.title, url: location.href }).catch(() => {});
    else notify('Use your browser share controls to share this portfolio.');
  };

  // Keyboard: Escape closes the active window; Ctrl/Cmd+F opens Finder search.
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && !finderPanel.hidden) {
      event.preventDefault();
      $('finderSearchRow').hidden = false;
      $('finderSearch').focus();
      return;
    }
    if (event.key !== 'Escape') return;
    const media = activeWindow && [...mediaWindows.values()].find((entry) => entry.node.id === activeWindow);
    if (media) media.close();
    else if (activeWindow === 'textViewer') closeNotes();
    else if (activeWindow === 'finderPanel') closeFinder();
  });
})();
