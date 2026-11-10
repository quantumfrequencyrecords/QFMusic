import {loadData, esc, asset, safeExternalUrl, getRecord, resolveRef, formatDate, pageHero, emptyState, recordImage, showToast} from './core.js';
import {initPlayer, playSong, playVideo} from './player.js';
import {renderAdmin, handleAdminSubmit, handleAdminAction} from './admin.js';

let state;
let trendPeriod = 'weekly';
const app = document.getElementById('app');
const headerRoot = document.getElementById('siteHeader');
const footerRoot = document.getElementById('siteFooter');

const pageCopy = (id, title, subtitle='') => state.site.pages?.[id] || {title,subtitle};
const artistFor = (id) => getRecord(state,'artists',id);
const imageTag = (path, alt='') => path ? `<img src="${esc(asset(path))}" alt="${esc(alt)}" loading="lazy">` : '';
const routeFor = (type,id) => {
  const routeMap = {artists:'artist',albums:'album',songs:'song',videos:'video',news:'news',gallery:'gallery-item'};
  return `#/${routeMap[type] || type}/${encodeURIComponent(id)}`;
};
const routeForRecord = (type,record) => routeFor(type,record.id);
const socialNames = {instagram:'IG',facebook:'FB',youtube:'YT',tiktok:'TT',spotify:'SP',appleMusic:'AM',x:'X'};

function renderHeader(route) {
  const nav = state.site.navigation || [];
  const links = nav.map(item => `<a href="#${esc(item.path)}" class="${route.startsWith(item.path.slice(1))?'active':''}">${esc(item.label)}</a>`).join('');
  headerRoot.innerHTML = `
    <header class="site-header" id="siteHeaderBar">
      <div class="header-inner">
        <div class="header-left">
          <button class="icon-button menu-button" id="menuButton" type="button" aria-label="Open navigation" aria-expanded="false"><span class="menu-glyph"><i></i><i></i><i></i></span></button>
          <a href="#/home" aria-label="QFR Home"><img class="header-logo" src="assets/qfr-mark.svg" alt=""></a>
        </div>
        <a class="header-wordmark" href="#/home">${esc(state.footer.labelName || state.site.brand?.name || 'Quantum Frequency Records')}</a>
        <div class="header-right"><button class="header-collapse" id="headerCollapse" type="button" aria-label="Collapse header">⌃</button><a class="store-button" href="#/store">Store ↗</a></div>
      </div>
    </header>
    <div class="drawer-backdrop" id="drawerBackdrop" hidden></div>
    <aside class="drawer" id="siteDrawer" aria-label="Main navigation">
      <div class="drawer-top"><div class="drawer-brand"><img src="assets/qfr-mark.svg" alt=""><span>${esc(state.site.brand?.shortName || 'QFR')} / MENU</span></div><button class="icon-button" id="drawerClose" type="button" aria-label="Close navigation">×</button></div>
      <nav>${links}<a href="#/store">Store</a><a href="#/admin">Label Studio</a></nav>
      <div class="drawer-bottom">${esc(state.site.brand?.tagline || '')}</div>
    </aside>`;
  const menuButton = document.getElementById('menuButton');
  const drawer = document.getElementById('siteDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const closeDrawer = () => { drawer.classList.remove('open'); backdrop.hidden = true; menuButton.setAttribute('aria-expanded','false'); };
  menuButton.addEventListener('click',()=>{drawer.classList.add('open');backdrop.hidden=false;menuButton.setAttribute('aria-expanded','true');});
  document.getElementById('drawerClose').addEventListener('click',closeDrawer);
  backdrop.addEventListener('click',closeDrawer);
  drawer.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeDrawer));
  document.getElementById('headerCollapse').addEventListener('click',()=>document.getElementById('siteHeaderBar').classList.toggle('collapsed'));
}

function renderFooter() {
  const socialLinks = Object.entries(state.footer.socials || {}).filter(([,url])=>safeExternalUrl(url)).map(([name,url])=>`<a href="${esc(safeExternalUrl(url))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(name)}">${esc(socialNames[name] || name.slice(0,2).toUpperCase())}</a>`).join('');
  const nav = (state.site.navigation || []).slice(0,6).map(item=>`<a href="#${esc(item.path)}">${esc(item.label)}</a>`).join('');
  const bottom = (state.footer.bottomLinks || []).map(item=>`<a href="#${esc(item.path)}">${esc(item.label)}</a>`).join('');
  const email = safeExternalUrl(state.footer.email ? `mailto:${state.footer.email}` : '');
  footerRoot.innerHTML = `
    <footer class="site-footer">
      <div class="footer-main">
        <div>
          <div class="footer-brand"><img src="assets/qfr-mark.svg" alt=""><div><strong>${esc(state.footer.labelName || 'Quantum Frequency Records')}</strong><span>${esc(state.footer.tagline || '')}</span></div></div>
          <p class="footer-copy">${esc(state.footer.description || '')}${state.footer.location ? `<br>${esc(state.footer.location)}` : ''}</p>
          ${email ? `<p class="footer-copy"><a href="${esc(email)}">${esc(state.footer.email)}</a></p>` : ''}
        </div>
        <div><div class="footer-heading">Explore</div><nav class="footer-links">${nav}</nav><div class="footer-heading" style="margin-top:1.2rem">More</div><nav class="footer-links">${bottom}</nav></div>
        <div><div class="footer-heading">Stay Connected</div><div class="social-links">${socialLinks || '<span class="muted" style="font-size:.75rem">Social links will appear here when configured in footer.json.</span>'}</div></div>
      </div>
      <div class="footer-bottom"><span>${esc(state.footer.copyright || '')}</span><span>INDEPENDENT · ARTIST-FIRST · BEYOND GENRE</span></div>
    </footer>`;
}

function homeSlotCard(slotId,slot) {
  const record = resolveRef(state,slot.current);
  if (!record) return `<article class="content-card"><div class="card-art"></div><div class="card-body"><p class="card-kicker">${esc(slot.label)}</p><h3 class="card-title">Awaiting The Next Signal</h3><p class="card-excerpt">${esc(state.site.emptyStates?.new || '')}</p><a class="card-action" href="#/admin">Update in Label Studio ↗</a></div></article>`;
  const type = slot.current.type;
  const artist = record.artistId ? artistFor(record.artistId) : null;
  const image = recordImage(record) || recordImage(artist);
  const title = record.title || record.name || 'Untitled';
  const subtitle = artist?.name || record.category || '';
  const href = routeFor(type,record.id);
  return `<article class="content-card"><a href="${href}"><div class="card-art">${imageTag(image,title)}</div><div class="card-body"><p class="card-kicker">${esc(slot.label)}</p><h3 class="card-title">${esc(title)}</h3><p class="card-subtitle">${esc(subtitle)}</p><p class="card-excerpt">${esc(record.excerpt || record.description || '')}</p><span class="card-action">Discover more ↗</span></div></a></article>`;
}

function renderHistory() {
  const groups = Object.entries(state.homeFeed.slots || {}).filter(([,slot])=>(slot.history||[]).length);
  if (!groups.length) return '';
  return `<details class="archive-details"><summary>Explore previous New section highlights</summary><div class="news-list">${groups.map(([key,slot])=>(slot.history||[]).map(ref=>{
    const rec=resolveRef(state,ref); if(!rec) return '';
    return `<article class="news-row"><span class="date">${esc(slot.label)}</span><h3>${esc(rec.title||rec.name||'Archived item')}</h3><p>${esc(rec.excerpt||rec.description||'')}</p><a class="card-action" href="${routeFor(ref.type,ref.id)}">Open archived item ↗</a></article>`;
  }).join('')).join('')}</div></details>`;
}

function renderTrend() {
  const list = (state.trending[trendPeriod] || []).slice().sort((a,b)=>a.rank-b.rank);
  const items = list.map((ref,index)=>{
    const rec=resolveRef(state,ref); if(!rec) return '';
    const artist=rec.artistId?artistFor(rec.artistId):null;
    return `<a class="trend-item" href="${routeFor(ref.type,ref.id)}"><span class="trend-rank">${String(ref.rank || index+1).padStart(2,'0')}</span><span class="trend-name"><strong>${esc(rec.title||rec.name||'Untitled')}</strong><span>${esc(artist?.name || ref.type.slice(0,-1))}</span></span></a>`;
  }).join('');
  return `<div class="tab-row" role="tablist"><button class="tab-button ${trendPeriod==='weekly'?'active':''}" data-action="trend-tab" data-period="weekly" type="button">Weekly</button><button class="tab-button ${trendPeriod==='monthly'?'active':''}" data-action="trend-tab" data-period="monthly" type="button">Monthly</button><button class="tab-button ${trendPeriod==='yearly'?'active':''}" data-action="trend-tab" data-period="yearly" type="button">Yearly</button></div>${items ? `<div class="trend-list">${items}</div>` : emptyState(state.site.emptyStates?.trending || '',true)}`;
}

function renderHome() {
  const slots = state.homeFeed.slots || {};
  const slotCards = ['labelAnnouncement','newestArtist','newestSingle','newestAlbum','newestVideo'].map(key=>homeSlotCard(key,slots[key] || {label:key,current:null,history:[]})).join('');
  const artists = (state.records.artists || []).slice(0,4);
  const news = (state.records.news || []).slice().sort((a,b)=>(b.publishDate||'').localeCompare(a.publishDate||'')).slice(0,3);
  const values = (state.values || []).map(value=>`<article class="value-card"><span class="value-number">${String(value.number).padStart(2,'0')}</span><h3>${esc(value.title)}</h3><p>${esc(value.description)}</p></article>`).join('');
  const home = state.site.home || {};
  const featuredArtists = artists.length ? `<div class="card-grid">${artists.map(artist=>`<article class="content-card"><a href="${routeFor('artists',artist.id)}"><div class="card-art">${imageTag(recordImage(artist),artist.name)}</div><div class="card-body"><p class="card-kicker">${esc((artist.genres||[]).join(' · '))}</p><h3 class="card-title">${esc(artist.name)}</h3><span class="card-action">Artist profile ↗</span></div></a></article>`).join('')}</div>` : emptyState(state.site.emptyStates?.artists || '',true);
  const newsContent = news.length ? `<div class="news-list">${news.map(item=>`<article class="news-row"><span class="date">${esc(item.category||'NEWS')} · ${esc(formatDate(item.publishDate))}</span><h3>${esc(item.title)}</h3><p>${esc(item.excerpt||'')}</p><a class="card-action" href="${routeFor('news',item.id)}">Read story ↗</a></article>`).join('')}</div>` : emptyState(state.site.emptyStates?.news || '',true);
  return `
    <section class="studio-hero"><div class="studio-visual"><div class="studio-bars">${Array.from({length:38},()=>'<i></i>').join('')}</div></div><div class="studio-content"><span class="kicker">${esc(home.eyebrow||state.site.brand?.name||'')}</span><h1>${esc(home.headline||'A New Wave Of Sound.')}</h1><p>${esc(home.subheadline||'')}</p><div class="hero-actions"><a class="btn primary" href="#/artists">Explore Artists ↗</a><a class="btn" href="#/music">Explore Music</a></div></div></section>
    <div class="freq-line"></div>
    <section class="section"><div class="wrap"><div class="section-heading"><div><span class="kicker">THE LATEST SIGNALS</span><h2>${esc(home.newTitle||'New At QFR')}</h2><p>${esc(home.newSubtitle||'')}</p></div></div><div class="card-grid">${slotCards}</div>${renderHistory()}</div></section>
    <section class="section"><div class="wrap"><div class="section-heading"><div><span class="kicker">LABEL PULSE</span><h2>${esc(home.trendingTitle||'Hottest & Trending')}</h2><p>${esc(home.trendingSubtitle||'')}</p></div></div>${renderTrend()}</div></section>
    <section class="section"><div class="wrap"><div class="section-heading"><div><span class="kicker">THE ROSTER</span><h2>${esc(home.featuredArtistsTitle||'The Artists')}</h2><p>${esc(home.featuredArtistsText||'')}</p></div><a class="text-link" href="#/artists">View all artists ↗</a></div>${featuredArtists}</div></section>
    <section class="section"><div class="wrap"><div class="section-heading"><div><span class="kicker">FROM THE LABEL</span><h2>${esc(home.newsTitle||'Latest News')}</h2><p>${esc(home.newsSubtitle||'')}</p></div><a class="text-link" href="#/news">View all news ↗</a></div>${newsContent}</div></section>
    <section class="section"><div class="wrap"><div class="section-heading"><div><span class="kicker">WHAT WE STAND FOR</span><h2>${esc(home.valuesTitle||'9 Values. One Label.')}</h2><p>${esc(home.valuesSubtitle||'')}</p></div></div><div class="values-grid">${values}</div></div></section>
    <section class="section compact"><div class="wrap"><div class="quote-panel"><span class="kicker">A SHARED FREQUENCY</span><p>${esc(home.missionTitle||'Built Around The Artist.')}</p><p style="font:300 .9rem/1.7 var(--sans);color:var(--muted);max-width:650px;margin:1rem auto 0">${esc(home.missionText||'')}</p><a class="btn primary" style="margin-top:1.3rem" href="#/contact">${esc(home.ctaLabel||'Get In Touch')} ↗</a></div></div></section>`;
}

function renderArtists() {
  const copy=pageCopy('artists','Artists','');
  const artists=state.records.artists||[];
  const cards=artists.map(item=>`<article class="content-card" data-search="${esc([item.name,...(item.genres||[]),item.hometown].join(' ').toLowerCase())}"><a href="${routeFor('artists',item.id)}"><div class="card-art">${imageTag(recordImage(item),item.name)}</div><div class="card-body"><p class="card-kicker">${esc((item.genres||[]).join(' · '))}</p><h2 class="card-title">${esc(item.name)}</h2><p class="card-subtitle">${esc(item.hometown||'')}</p><p class="card-excerpt">${esc(item.bio||'')}</p><span class="card-action">Explore artist ↗</span></div></a></article>`).join('');
  return `${pageHero(copy.kicker||'THE QFR ROSTER',copy.title,copy.subtitle)}<section class="section"><div class="wrap"><div class="filter-bar"><input id="artistSearch" type="search" placeholder="Search artists or genres..." aria-label="Search artists"></div><div class="card-grid" id="artistGrid">${cards || emptyState(state.site.emptyStates?.artists||'',true)}</div></div></section>`;
}

function renderArtistDetail(id) {
  const artist=getRecord(state,'artists',id);
  if(!artist) return `${pageHero('ARTIST PROFILE','Artist Not Found','This artist profile may have moved or has not been added yet.')}<section class="section"><div class="wrap">${emptyState('No artist record is connected to this address.',true)}</div></section>`;
  const songs=(state.records.songs||[]).filter(s=>s.artistId===id);
  const albums=(state.records.albums||[]).filter(a=>a.artistId===id);
  const videos=(state.records.videos||[]).filter(v=>v.artistId===id);
  const img=recordImage(artist);
  return `${pageHero((artist.genres||[]).join(' · ')||'QFR ARTIST',artist.name,artist.hometown||'Quantum Frequency Records')}
    <section class="section"><div class="wrap detail-layout"><div>${img?`<img class="detail-art" src="${esc(asset(img))}" alt="${esc(artist.name)}">`:'<div class="detail-art"></div>'}</div><div><span class="kicker">ARTIST PROFILE</span><h2 class="page-title" style="font-size:3rem">${esc(artist.name)}</h2><p class="detail-copy">${esc(artist.bio||'Artist biography coming soon.')}</p>${artist.hometown?`<p class="muted">Based in ${esc(artist.hometown)}</p>`:''}<div class="social-links">${Object.entries(artist.socials||{}).filter(([,url])=>safeExternalUrl(url)).map(([key,url])=>`<a href="${esc(safeExternalUrl(url))}" target="_blank" rel="noopener">${esc(socialNames[key]||key)}</a>`).join('')}</div></div></div></section>
    <section class="section"><div class="wrap"><div class="section-heading"><div><span class="kicker">DISCOGRAPHY</span><h2>Music</h2></div></div>${albums.length?`<div class="card-grid">${albums.map(a=>albumCard(a)).join('')}</div>`:''}${songs.length?`<div class="admin-record-list">${songs.map(song=>songRow(song)).join('')}</div>`:''}${(!albums.length&&!songs.length)?emptyState('Releases for this artist will appear here when added.',true):''}</div></section>
    <section class="section"><div class="wrap"><div class="section-heading"><div><span class="kicker">WATCH</span><h2>Videos</h2></div></div>${videos.length?`<div class="card-grid">${videos.map(videoCard).join('')}</div>`:emptyState('No videos have been added for this artist yet.',true)}</div></section>`;
}

function albumCard(album) {
  const artist=artistFor(album.artistId);
  const art=recordImage(album)||recordImage(artist);
  return `<article class="content-card" data-artist="${esc(album.artistId||'')}"><a href="${routeFor('albums',album.id)}"><div class="card-art">${imageTag(art,album.title)}</div><div class="card-body"><p class="card-kicker">${esc(album.releaseType||'ALBUM')} · ${esc(formatDate(album.releaseDate))}</p><h3 class="card-title">${esc(album.title)}</h3><p class="card-subtitle">${esc(artist?.name||'')}</p><span class="card-action">View album ↗</span></div></a></article>`;
}
function songRow(song) {
  const artist=artistFor(song.artistId);
  return `<div class="admin-record"><div><strong>${esc(song.title)}</strong><br><span>${esc(artist?.name||'')} · ${esc(song.genre||'')} · ${esc(formatDate(song.releaseDate))}</span></div><button class="btn small" type="button" data-action="play-song" data-id="${esc(song.id)}">▶ Play</button><a class="text-link" href="${routeFor('songs',song.id)}">Details ↗</a></div>`;
}
function videoCard(video) {
  const artist=artistFor(video.artistId);
  const art=recordImage(video)||recordImage(artist);
  return `<article class="content-card"><div class="card-art">${imageTag(art,video.title)}</div><div class="card-body"><p class="card-kicker">${esc(video.category||'VIDEO')} · ${esc(formatDate(video.releaseDate))}</p><h3 class="card-title">${esc(video.title)}</h3><p class="card-subtitle">${esc(artist?.name||'QFR')}</p><p class="card-excerpt">${esc(video.description||'')}</p><button class="card-action" type="button" data-action="play-video" data-id="${esc(video.id)}">Play video ▶</button></div></article>`;
}

function renderMusic() {
  const copy=pageCopy('music','Music','');
  const albums=state.records.albums||[];
  const songs=state.records.songs||[];
  const artists=state.records.artists||[];
  const artistFilter=`<option value="">All artists</option>${artists.map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}`;
  const albumCards=albums.map(albumCard).join('');
  const songRows=songs.map(songRow).join('');
  return `${pageHero(copy.kicker||'THE CATALOG',copy.title,copy.subtitle)}<section class="section"><div class="wrap"><div class="filter-bar"><input id="musicSearch" type="search" placeholder="Search songs, albums or genres..." aria-label="Search music"><select id="musicArtistFilter" aria-label="Filter by artist">${artistFilter}</select></div><div class="section-heading"><div><span class="kicker">ALBUMS & EPS</span><h2>Albums</h2></div></div><div class="card-grid" id="albumGrid">${albumCards||emptyState(state.site.emptyStates?.music||'',true)}</div><div class="section-heading" style="margin-top:3rem"><div><span class="kicker">SINGLES & TRACKS</span><h2>All Songs</h2></div></div><div class="admin-record-list" id="songList">${songRows||emptyState(state.site.emptyStates?.music||'',true)}</div></div></section>`;
}

function renderAlbumDetail(id) {
  const album=getRecord(state,'albums',id);
  if(!album) return `${pageHero('ALBUM','Album Not Found','This release may not be available yet.')}<section class="section"><div class="wrap">${emptyState('No album record is connected to this address.',true)}</div></section>`;
  const artist=artistFor(album.artistId);
  const tracks=(album.trackIds||[]).map(trackId=>getRecord(state,'songs',trackId)).filter(Boolean);
  const art=recordImage(album)||recordImage(artist);
  return `${pageHero(album.releaseType||'ALBUM',album.title,artist?.name||'') }<section class="section"><div class="wrap detail-layout"><div>${art?`<img class="detail-art" src="${esc(asset(art))}" alt="${esc(album.title)}">`:'<div class="detail-art"></div>'}</div><div><span class="kicker">${esc(formatDate(album.releaseDate))}</span><h2 class="page-title" style="font-size:3rem">${esc(album.title)}</h2><p class="muted">${esc(artist?.name||'')}</p><p class="detail-copy">${esc(album.description||'')}</p><div class="metadata-grid"><div class="metadata-cell"><span>Genre</span><strong>${esc(album.genre||'—')}</strong></div><div class="metadata-cell"><span>Tracks</span><strong>${tracks.length||album.trackIds?.length||0}</strong></div></div></div></div></section><section class="section"><div class="wrap"><h2 class="page-title" style="font-size:2.8rem">Track Listing</h2><div class="admin-record-list">${tracks.map(songRow).join('')||emptyState('Add song JSON records and reference their IDs in this album JSON.',true)}</div></div></section>`;
}

function renderSongDetail(id) {
  const song=getRecord(state,'songs',id);
  if(!song) return `${pageHero('SONG','Song Not Found','This track may not be available yet.')}<section class="section"><div class="wrap">${emptyState('No song record is connected to this address.',true)}</div></section>`;
  const artist=artistFor(song.artistId);
  const art=recordImage(song)||recordImage(artist);
  return `${pageHero(song.releaseType==='single'?'SINGLE':'TRACK',song.title,artist?.name||'') }<section class="section"><div class="wrap detail-layout"><div>${art?`<img class="detail-art" src="${esc(asset(art))}" alt="${esc(song.title)}">`:'<div class="detail-art"></div>'}<button class="btn primary" style="margin-top:1rem;width:100%" data-action="play-song" data-id="${esc(song.id)}" type="button">▶ Play Track</button></div><div><span class="kicker">${esc(formatDate(song.releaseDate))}</span><h2 class="page-title" style="font-size:3rem">${esc(song.title)}</h2><p class="muted">${esc(artist?.name||'')} · ${esc(song.genre||'')}</p><p class="detail-copy">${esc(song.description||'')}</p><div class="metadata-grid"><div class="metadata-cell"><span>Release type</span><strong>${esc(song.releaseType||'Track')}</strong></div><div class="metadata-cell"><span>Duration</span><strong>${song.suno?.durationSec?`${Math.floor(song.suno.durationSec/60)}:${String(song.suno.durationSec%60).padStart(2,'0')}`:'—'}</strong></div><div class="metadata-cell"><span>Suno model</span><strong>${esc(song.suno?.model||'—')}</strong></div><div class="metadata-cell"><span>Suno ID</span><strong>${esc(song.suno?.songId||'—')}</strong></div></div></div></div></section>${song.lyrics?`<section class="section"><div class="wrap"><div class="section-heading"><div><span class="kicker">THE WORDS</span><h2>Lyrics</h2></div></div><div class="lyrics">${esc(song.lyrics)}</div></div></section>`:''}`;
}

function renderVideos() {
  const copy=pageCopy('videos','Videos','');
  const videos=state.records.videos||[];
  return `${pageHero(copy.kicker||'WATCH & LISTEN',copy.title,copy.subtitle)}<section class="section"><div class="wrap"><div class="card-grid">${videos.map(videoCard).join('')||emptyState(state.site.emptyStates?.videos||'',true)}</div></div></section>`;
}

function renderNews() {
  const copy=pageCopy('news','News','');
  const news=(state.records.news||[]).slice().sort((a,b)=>(b.publishDate||'').localeCompare(a.publishDate||''));
  return `${pageHero(copy.kicker||'THE LATEST',copy.title,copy.subtitle)}<section class="section"><div class="wrap"><div class="filter-bar"><input id="newsSearch" type="search" placeholder="Search news and announcements..." aria-label="Search news"><select id="newsCategory" aria-label="Filter news"><option value="">All categories</option><option value="label">Label</option><option value="artist">Artist</option><option value="release">Releases</option><option value="industry">Editorial</option></select></div><div class="news-list" id="newsList">${news.map(item=>`<article class="news-row" data-category="${esc(item.category||'')}" data-search="${esc([item.title,item.excerpt,item.body].join(' ').toLowerCase())}"><span class="date">${esc((item.category||'NEWS').toUpperCase())} · ${esc(formatDate(item.publishDate))}</span><h3>${esc(item.title)}</h3><p>${esc(item.excerpt||'')}</p><a class="card-action" href="${routeFor('news',item.id)}">Read story ↗</a></article>`).join('')||emptyState(state.site.emptyStates?.news||'',true)}</div></div></section>`;
}

function renderNewsDetail(id) {
  const item=getRecord(state,'news',id);
  if(!item) return `${pageHero('QFR NEWS','Story Not Found','This story may have moved.')}<section class="section"><div class="wrap">${emptyState('No news record is connected to this address.',true)}</div></section>`;
  const img=recordImage(item);
  return `${pageHero((item.category||'NEWS').toUpperCase(),item.title,formatDate(item.publishDate))}<section class="section"><div class="wrap" style="max-width:850px">${img?`<img class="detail-art" style="aspect-ratio:16/8;max-width:none;margin-bottom:1.5rem" src="${esc(asset(img))}" alt="${esc(item.title)}">`:''}<p class="detail-copy">${esc(item.body||item.excerpt||'')}</p><a class="text-link" href="#/news">← Back to News</a></div></section>`;
}

function renderAbout() {
  const copy=state.site.aboutPage||{};
  const values=(state.values||[]).map(value=>`<article class="value-card"><span class="value-number">${String(value.number).padStart(2,'0')}</span><h3>${esc(value.title)}</h3><p>${esc(value.description)}</p></article>`).join('');
  return `${pageHero('OUR STORY',copy.title||'About Quantum Frequency Records',copy.subtitle||'')}<section class="section"><div class="wrap"><div class="detail-copy" style="max-width:850px;font-size:1.1rem">${esc(copy.intro||'')}</div><div class="admin-grid" style="margin-top:2rem"><article class="prose-panel"><span class="kicker">01 / PURPOSE</span><h2>${esc(copy.missionTitle||'The Mission')}</h2><p>${esc(copy.mission||'')}</p></article><article class="prose-panel"><span class="kicker">02 / PROCESS</span><h2>${esc(copy.approachTitle||'How We Work')}</h2><p>${esc(copy.approach||'')}</p></article><article class="prose-panel wide"><span class="kicker">03 / CREATION</span><h2>${esc(copy.aiTitle||'Technology With Intention')}</h2><p>${esc(copy.ai||'')}</p></article></div></div></section><section class="section"><div class="wrap"><div class="section-heading"><div><span class="kicker">OUR FOUNDATION</span><h2>9 Values. One Label.</h2></div></div><div class="values-grid">${values}</div></div></section><section class="section"><div class="wrap"><div class="quote-panel"><p>${esc(copy.closingQuote||'Every artist has a frequency.')}</p></div></div></section>`;
}

function renderGallery() {
  const copy=pageCopy('gallery','Gallery','');
  const items=state.records.gallery||[];
  return `${pageHero(copy.kicker||'VISUAL ARCHIVE',copy.title,copy.subtitle)}<section class="section"><div class="wrap"><div class="card-grid">${items.map(item=>`<article class="content-card"><div class="card-art">${imageTag(recordImage(item),item.title||'Gallery image')}</div><div class="card-body"><h3 class="card-title">${esc(item.title||'Untitled image')}</h3><p class="card-subtitle">${esc(item.category||'')}</p></div></article>`).join('')||emptyState(state.site.emptyStates?.gallery||'',true)}</div></div></section>`;
}

function renderContact() {
  const copy=pageCopy('contact','Get In Touch','');
  const types=state.contact.inquiryTypes||[];
  return `${pageHero(copy.kicker||'CONNECT WITH QFR',copy.title,copy.subtitle)}<section class="section"><div class="wrap contact-layout"><div class="contact-info"><span class="kicker">START A CONVERSATION</span><h2 class="page-title" style="font-size:3rem">${esc(copy.sideTitle||'Let’s Connect.')}</h2><p>${esc(copy.sideText||'For general questions, artist submissions, licensing, collaborations, feedback or press inquiries, send a note.')}</p>${state.contact.email?`<p><a class="text-link" href="mailto:${esc(state.contact.email)}">${esc(state.contact.email)}</a></p>`:''}<p class="form-note">${esc(state.contact.notice||'')}</p></div><form class="form-stack" id="contactForm"><div class="form-grid"><label>Your name<input name="name" required></label><label>Email address<input name="email" type="email" required></label></div><label>Reason for reaching out<select name="reason">${types.map(t=>`<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('')}</select></label><label>Artist / song / subject<input name="subject" placeholder="Optional"></label><label>Message<textarea name="message" required placeholder="Tell us what is on your mind..."></textarea></label><button class="btn primary" type="submit">Send Inquiry ↗</button><p class="form-note">This form needs a secure hosted endpoint. Configure `formEndpoint` in `data/contact.json` before accepting public submissions.</p></form></div></section>`;
}

function renderStore() {
  const store=state.site.store||{};
  return `${pageHero('QFR MERCHANDISE',store.title||'The QFR Store',store.subtitle||'')}<section class="section"><div class="wrap"><div class="store-panel"><div><strong>${esc(store.status||'COMING SOON')}</strong><h2>${esc(store.title||'The QFR Store')}</h2><p>${esc(store.subtitle||'')}</p><a class="btn" href="#/contact">Contact The Label ↗</a></div></div></div></section>`;
}

function renderLegal(kind) {
  const legal=state.site.legal||{};
  const title=kind==='privacy'?(legal.privacyTitle||'Privacy Policy'):(legal.termsTitle||'Terms Of Use');
  const text=kind==='privacy'?(legal.privacyText||''):(legal.termsText||'');
  return `${pageHero('QFR INFORMATION',title,'')}<section class="section"><div class="wrap" style="max-width:850px"><div class="prose-panel"><p>${esc(text)}</p></div></div></section>`;
}

function renderRoute() {
  const route=(decodeURIComponent(location.hash.replace(/^#\/?/,''))||'home').split('/');
  const page=route[0]; const id=route[1]||'';
  if(page==='home') app.innerHTML=renderHome();
  else if(page==='artists') app.innerHTML=renderArtists();
  else if(page==='artist') app.innerHTML=renderArtistDetail(id);
  else if(page==='music') app.innerHTML=renderMusic();
  else if(page==='album') app.innerHTML=renderAlbumDetail(id);
  else if(page==='song') app.innerHTML=renderSongDetail(id);
  else if(page==='videos') app.innerHTML=renderVideos();
  else if(page==='video') {
    const video=getRecord(state,'videos',id);
    app.innerHTML=video?`${pageHero('VIDEO',video.title,video.description||'')}<section class="section"><div class="wrap">${videoCard(video)}</div></section>`:`${pageHero('VIDEO','Video Not Found','')}<section class="section"><div class="wrap">${emptyState('No video record is connected to this address.',true)}</div></section>`;
    if(video) window.setTimeout(()=>playVideo(video),0);
  }
  else if(page==='news') app.innerHTML=id?renderNewsDetail(id):renderNews();
  else if(page==='about') app.innerHTML=renderAbout();
  else if(page==='gallery') app.innerHTML=renderGallery();
  else if(page==='contact') app.innerHTML=renderContact();
  else if(page==='store') app.innerHTML=renderStore();
  else if(page==='privacy'||page==='terms') app.innerHTML=renderLegal(page);
  else if(page==='admin') app.innerHTML=`${pageHero('QFR MANAGEMENT','Label Studio','A practical workspace for adding and organizing the label catalog.')}${renderAdmin(state)}`;
  else app.innerHTML=`${pageHero('QFR','Page Not Found','The page you requested is not part of this site.')}<section class="section"><div class="wrap"><a class="btn primary" href="#/home">Return Home</a></div></section>`;
  renderHeader(page);
  renderFooter();
  document.title = `${page==='home'?'Home':page.charAt(0).toUpperCase()+page.slice(1)} — ${state.site.brand?.name||'Quantum Frequency Records'}`;
  attachPageFilters();
  app.focus({preventScroll:true});
}

function attachPageFilters() {
  const artistSearch=document.getElementById('artistSearch');
  artistSearch?.addEventListener('input',()=>{
    const value=artistSearch.value.toLowerCase();
    document.querySelectorAll('#artistGrid [data-search]').forEach(card=>{card.hidden=!card.dataset.search.includes(value);});
  });
  const musicSearch=document.getElementById('musicSearch');
  const musicArtist=document.getElementById('musicArtistFilter');
  const filterMusic=()=>{
    const q=(musicSearch?.value||'').toLowerCase(); const artist=musicArtist?.value||'';
    document.querySelectorAll('#albumGrid .content-card').forEach(card=>{card.hidden=(!!q&&!card.textContent.toLowerCase().includes(q))||(!!artist&&card.dataset.artist!==artist);});
    document.querySelectorAll('#songList .admin-record').forEach(row=>{const id=row.querySelector('[data-id]')?.dataset.id;const song=getRecord(state,'songs',id);row.hidden=(!!q&&!row.textContent.toLowerCase().includes(q))||(!!artist&&song?.artistId!==artist);});
  };
  musicSearch?.addEventListener('input',filterMusic);
  musicArtist?.addEventListener('change',filterMusic);
  const newsSearch=document.getElementById('newsSearch'); const newsCategory=document.getElementById('newsCategory');
  const filterNews=()=>{
    const q=(newsSearch?.value||'').toLowerCase();const category=newsCategory?.value||'';
    document.querySelectorAll('#newsList [data-search]').forEach(item=>{item.hidden=(!!q&&!item.dataset.search.includes(q))||(!!category&&item.dataset.category!==category);});
  };
  newsSearch?.addEventListener('input',filterNews);newsCategory?.addEventListener('change',filterNews);
}

async function handleContactSubmit(form) {
  const formData=new FormData(form);
  if (!state.contact.formEndpoint) {
    if (state.contact.email) {
      const subject=encodeURIComponent(`QFR Inquiry: ${formData.get('reason')||'General'}`);
      const body=encodeURIComponent(`Name: ${formData.get('name')}\nEmail: ${formData.get('email')}\nSubject: ${formData.get('subject')}\n\n${formData.get('message')}`);
      window.location.href=`mailto:${state.contact.email}?subject=${subject}&body=${body}`;
      return;
    }
    showToast('Contact delivery is not configured yet. Add a secure form endpoint or label email in data/contact.json.');
    return;
  }
  try {
    const response=await fetch(state.contact.formEndpoint,{method:'POST',body:formData,headers:{Accept:'application/json'}});
    if(!response.ok) throw new Error('Form endpoint returned an error.');
    form.reset();showToast('Your inquiry has been submitted.');
  } catch(error) { showToast(error.message||'Unable to submit your inquiry.'); }
}

app.addEventListener('click', async event => {
  const routeLink=event.target.closest('a[href^="#/"]');
  if(routeLink) return;
  const action=event.target.closest('[data-action]');
  if(!action) return;
  const actionName=action.dataset.action;
  if(actionName==='play-song') {
    const song=getRecord(state,'songs',action.dataset.id);if(song)playSong(song,artistFor(song.artistId));
  } else if(actionName==='play-video') {
    const video=getRecord(state,'videos',action.dataset.id);if(video)playVideo(video);
  } else if(actionName==='trend-tab') {
    trendPeriod=action.dataset.period||'weekly';renderRoute();
  }
});

app.addEventListener('submit', async event => {
  const form=event.target;
  if(form.matches('#contactForm')) {event.preventDefault();await handleContactSubmit(form);return;}
  if(form.matches('form[data-admin-form]')) {await handleAdminSubmit(event,state,renderRoute);}
});
app.addEventListener('click', async event => {
  if(event.target.closest('[data-admin-action]')) await handleAdminAction(event,state,renderRoute);
});

window.addEventListener('hashchange',renderRoute);
window.addEventListener('popstate',renderRoute);

state=await loadData();
initPlayer(document.getElementById('playerRoot'));
if(!location.hash) location.hash='/home';
renderRoute();
