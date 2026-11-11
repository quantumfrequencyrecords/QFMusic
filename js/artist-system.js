import {
  loadData, saveDraft, slugify, esc, asset, formatDate,
  safeExternalUrl, recordImage, pageHero, emptyState, showToast
} from './core.js';
import { handleAdminSubmit } from './admin.js';

const app = document.getElementById('app');
const allowedViews = ['profile','news','music','videos','shows','members','gallery','merch'];
const socialLabels = {
  instagram:'Instagram', facebook:'Facebook', youtube:'YouTube',
  tiktok:'TikTok', spotify:'Spotify', appleMusic:'Apple Music',
  x:'X', website:'Website'
};

let qfState = null;
let observer = null;

function valueOfImage(value) {
  return typeof value === 'string' ? value : (value?.src || '');
}

function artistGenres(artist) {
  if (Array.isArray(artist?.genres) && artist.genres.length) return artist.genres.filter(Boolean);
  return artist?.genre ? [artist.genre] : [];
}

function hometownOf(record) {
  if (typeof record?.hometown === 'string' && record.hometown.trim()) return record.hometown;
  if (record?.hometown && typeof record.hometown === 'object') {
    return [record.hometown.city, record.hometown.state].filter(Boolean).join(', ');
  }
  return [record?.hometownCity, record?.hometownState].filter(Boolean).join(', ');
}

function artistBanner(artist) {
  return valueOfImage(artist?.banner) || valueOfImage(artist?.hero) ||
    recordImage(artist) || '';
}

function artistLogo(artist) {
  return valueOfImage(artist?.logo) || '';
}

function uniqueId(records, baseName) {
  const base = slugify(baseName);
  const used = new Set((records || []).map(item => item.id));
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  return id;
}

function splitList(value) {
  return String(value || '').split(/[,;\n]/).map(item => item.trim()).filter(Boolean);
}

function parseOptionalJson(value, label, fallback) {
  if (!String(value || '').trim()) return fallback;
  try { return JSON.parse(value); }
  catch { throw new Error(`${label} must contain valid JSON.`); }
}

function safeFileExt(file, fallback = 'jpg') {
  const ext = file?.name?.split('.').pop()?.toLowerCase() || fallback;
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : fallback;
}

function addExtraAsset(file, folder, basename) {
  if (!file || !file.size) return '';
  window.QFMUSIC_EXTRA_ASSETS ||= new Map();
  const path = `assets/images/${folder}/${basename}.${safeFileExt(file)}`;
  window.QFMUSIC_EXTRA_ASSETS.set(path, file);
  return path;
}

function readValue(row, name) {
  return row.querySelector(`[name="${name}"]`)?.value?.trim() || '';
}

function memberRowsFromForm(form, artistId) {
  const rows = [...form.querySelectorAll('[data-qf-member-row]')];
  const members = [];
  for (const row of rows) {
    const name = readValue(row, 'qfMemberName');
    const hasOtherData = [...row.querySelectorAll('input:not([type="file"]),textarea,select')]
      .some(input => input.name !== 'qfMemberName' && input.value.trim());
    const photoFile = row.querySelector('[name="qfMemberImageFile"]')?.files?.[0];
    if (!name) {
      if (hasOtherData || photoFile) throw new Error('Complete the name for each band-member row you started, or remove the empty row.');
      continue;
    }

    const socials = parseOptionalJson(readValue(row, 'qfMemberSocials'), `Social links for ${name}`, {});
    if (!socials || Array.isArray(socials) || typeof socials !== 'object') {
      throw new Error(`Social links for ${name} must be a JSON object.`);
    }

    const memberId = uniqueId([...(qfState?.records?.members || []), ...members], `${artistId}-${name}`);
    const city = readValue(row, 'qfMemberCity');
    const state = readValue(row, 'qfMemberState');
    const uploadedPhoto = addExtraAsset(photoFile, 'members', memberId);
    const photoPath = readValue(row, 'qfMemberImageUrl') || uploadedPhoto;

    members.push({
      id: memberId,
      artistId,
      name,
      nickname: readValue(row, 'qfMemberNickname'),
      hometown: {city, state},
      hometownDisplay: [city, state].filter(Boolean).join(', '),
      role: readValue(row, 'qfMemberRole'),
      primaryInstrument: readValue(row, 'qfMemberInstrument'),
      additionalInstruments: splitList(readValue(row, 'qfMemberAdditional')),
      bio: readValue(row, 'qfMemberBio'),
      joinedDate: readValue(row, 'qfMemberJoined'),
      status: readValue(row, 'qfMemberStatus') || 'active',
      image: {src: photoPath},
      socials,
      createdAt: new Date().toISOString(),
      file: `data/members/${memberId}.json`
    });
  }
  return members;
}

function memberEditor(index) {
  return `
    <fieldset class="qf-member-editor" data-qf-member-row>
      <div class="qf-member-editor-head">
        <strong>Band Member ${String(index + 1).padStart(2,'0')}</strong>
        <button type="button" class="btn small danger-button" data-qf-remove-member>Remove</button>
      </div>
      <div class="form-grid">
        <label>Full name<input name="qfMemberName" required placeholder="Member's full name"></label>
        <label>Nickname<input name="qfMemberNickname" placeholder="Optional nickname"></label>
      </div>
      <div class="form-grid">
        <label>Hometown city<input name="qfMemberCity" placeholder="City"></label>
        <label>Hometown state<input name="qfMemberState" placeholder="State"></label>
      </div>
      <div class="form-grid">
        <label>Primary instrument<input name="qfMemberInstrument" placeholder="Lead guitar, drums, vocals..."></label>
        <label>Role in the band<input name="qfMemberRole" placeholder="Lead vocalist, songwriter, producer..."></label>
      </div>
      <label>Additional instruments<input name="qfMemberAdditional" placeholder="Piano, harmonica, mandolin (comma separated)"></label>
      <div class="form-grid">
        <label>Joined date<input name="qfMemberJoined" type="date"></label>
        <label>Member status<select name="qfMemberStatus"><option value="active">Active member</option><option value="featured">Featured / touring member</option><option value="former">Former member</option></select></label>
      </div>
      <label>Member biography<textarea name="qfMemberBio" placeholder="A short biography for the member profile card"></textarea></label>
      <div class="form-grid">
        <label>Member photo path / URL<input name="qfMemberImageUrl" placeholder="assets/images/members/member-name.jpg"></label>
        <label>Upload member photo<input name="qfMemberImageFile" type="file" accept="image/*"></label>
      </div>
      <label>Member social links JSON (optional)<textarea name="qfMemberSocials" rows="2" spellcheck="false" placeholder='{"instagram":"https://..."}'></textarea></label>
    </fieldset>`;
}

function artistStudioFields(state) {
  const artists = state.records?.artists || [];
  return `
    <div class="qf-artist-extra">
      <div class="qf-studio-heading"><span class="kicker">ARTIST PROFILE</span><h4>Artist type, background & identity</h4></div>
      <div class="form-grid">
        <label>Artist type
          <select name="qfArtistType">
            <option value="group">Band / group</option>
            <option value="duo">Duo</option>
            <option value="solo">Solo artist</option>
          </select>
        </label>
        <label>Year formed<input name="qfFormed" type="number" min="1900" max="2100" step="1" placeholder="2024"></label>
        <label>QFR signing date<input name="qfSignedDate" type="date"></label>
      </div>
      <div class="form-grid">
        <label>Hometown city<input name="qfHometownCity" placeholder="City"></label>
        <label>Hometown state<input name="qfHometownState" placeholder="State"></label>
      </div>
      <label>Artist tagline<input name="qfTagline" placeholder="A short signature line for the artist"></label>
      <label>Short description<textarea name="qfDescription" placeholder="A concise description used on the signed-artists roster"></textarea></label>
      <div class="qf-studio-heading"><span class="kicker">ARTIST BRANDING</span><h4>Hero banner & band logo</h4></div>
      <div class="form-grid">
        <label>Banner image path / URL<input name="qfBannerUrl" placeholder="assets/images/artists/artist-banner.jpg"></label>
        <label>Upload banner image<input name="qfBannerFile" type="file" accept="image/*"></label>
      </div>
      <div class="form-grid">
        <label>Band / artist logo path / URL<input name="qfLogoUrl" placeholder="assets/images/artists/artist-logo.png"></label>
        <label>Upload band / artist logo<input name="qfLogoFile" type="file" accept="image/*"></label>
      </div>
      <div class="qf-studio-heading"><span class="kicker">OPTIONAL ARTIST METRICS</span><h4>Streams & Frequency DNA</h4></div>
      <div class="form-grid">
        <label>Weekly streams<input name="qfStreamsWeek" type="number" min="0" step="1" placeholder="Optional"></label>
        <label>Monthly streams<input name="qfStreamsMonth" type="number" min="0" step="1" placeholder="Optional"></label>
        <label>Year-to-date streams<input name="qfStreamsYtd" type="number" min="0" step="1" placeholder="Optional"></label>
      </div>
      <label>Frequency DNA JSON (optional)<textarea name="qfDnaJson" rows="3" spellcheck="false" placeholder='[{"label":"Energy","value":80},{"label":"Atmosphere","value":65}]'></textarea></label>

      <div class="qf-studio-heading qf-members-heading">
        <span class="kicker">MEET THE BAND</span>
        <h4>Band members</h4>
        <p>Create a separate JSON record for every member. Each record is linked to this artist by ID.</p>
      </div>
      <div class="qf-member-list" data-qf-member-list>${memberEditor(0)}</div>
      <button type="button" class="btn" data-qf-add-member>+ Add another member</button>
      <p class="form-note">Every artist must have at least one linked member record. For a solo artist, enter the artist as the single member. Add every current band member before saving the profile.</p>
    </div>`;
}

function enhanceArtistForm() {
  const form = app?.querySelector('form[data-admin-form="artist"]');
  if (!form || form.dataset.qfEnhanced === 'true') return;
  const submit = form.querySelector('button[type="submit"]');
  if (!submit) return;
  submit.insertAdjacentHTML('beforebegin', artistStudioFields(qfState || {records:{artists:[]}}));
  form.dataset.qfEnhanced = 'true';
}

function enhanceNewsForm() {
  const form = app?.querySelector('form[data-admin-form="news"]');
  if (!form || form.dataset.qfEnhanced === 'true') return;
  const submit = form.querySelector('button[type="submit"]');
  if (!submit) return;
  const artists = (qfState?.records?.artists || []).map(artist =>
    `<option value="${esc(artist.id)}">${esc(artist.name)}</option>`
  ).join('');
  submit.insertAdjacentHTML('beforebegin', `
    <label>Associated artist (optional)
      <select name="qfArtistId">
        <option value="">Label-wide news story</option>${artists}
      </select>
    </label>`);
  form.dataset.qfEnhanced = 'true';
}

function enhanceShowForm() {
  const grid=app?.querySelector('.admin-grid');
  if (!grid || grid.querySelector('[data-qf-show-form]')) return;
  const artistOptions=(qfState?.records?.artists||[]).map(artist=>`<option value="${esc(artist.id)}">${esc(artist.name)}</option>`).join('');
  grid.insertAdjacentHTML('beforeend', `
    <section class="admin-panel" data-qf-show-form>
      <h3>Add Artist Show / Appearance</h3>
      <p>Keep upcoming and past live dates connected to the artist profile.</p>
      <form class="form-stack" data-admin-form="show">
        <label>Show / event name<input name="title" required placeholder="Festival, headline show, live appearance"></label>
        <div class="form-grid"><label>Artist<select name="artistId" required><option value="">Select artist</option>${artistOptions}</select></label><label>Date<input name="date" type="date" required></label></div>
        <div class="form-grid"><label>Venue<input name="venue" placeholder="Venue name"></label><label>Time<input name="time" type="time"></label></div>
        <div class="form-grid"><label>City<input name="city" placeholder="City"></label><label>State<input name="state" placeholder="State"></label></div>
        <div class="form-grid"><label>Status<select name="status"><option value="announced">Announced</option><option value="on-sale">Tickets on sale</option><option value="sold-out">Sold out</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label><label>Tickets / event link<input name="ticketUrl" type="url" placeholder="https://..."></label></div>
        <label>Show notes<textarea name="description" placeholder="Optional event details"></textarea></label>
        <button class="btn primary" type="submit">Save show JSON</button>
      </form>
    </section>`);
}

function enhanceAdminForms() {
  enhanceArtistForm();
  enhanceNewsForm();
  enhanceShowForm();
}

function displayGenre(artist) {
  return artistGenres(artist).join(' · ') || 'QFR ARTIST';
}

function artistRosterCard(artist) {
  const banner = artistBanner(artist);
  const logo = artistLogo(artist);
  const genres = artistGenres(artist);
  const search = [artist.name, ...genres, hometownOf(artist), artist.description, artist.bio].join(' ').toLowerCase();
  const details = [
    artist.formed ? `Est. ${artist.formed}` : '',
    artist.signedDate ? `Signed ${formatDate(artist.signedDate)}` : '',
    artist.stats?.ytd ? `${Number(artist.stats.ytd).toLocaleString()} streams YTD` : ''
  ].filter(Boolean).join(' · ');
  const firstSong = (qfState?.records?.songs || []).filter(song=>song.artistId===artist.id)
    .sort((a,b)=>(b.releaseDate||'').localeCompare(a.releaseDate||''))[0];
  return `
    <article class="qf-artist-banner" data-qf-artist-card data-search="${esc(search)}" data-genres="${esc(genres.join('|'))}">
      ${banner ? `<img class="qf-artist-banner-image" src="${esc(asset(banner))}" alt="" loading="lazy">` : ''}
      <div class="qf-artist-banner-veil"></div>
      <div class="qf-artist-banner-inner">
        <div class="qf-artist-banner-copy">
          <p class="kicker">${esc(displayGenre(artist))}${hometownOf(artist) ? ` · ${esc(hometownOf(artist))}` : ''}</p>
          <h2>${esc(artist.name || 'Untitled Artist')}</h2>
          <p class="qf-artist-description">${esc(artist.description || artist.bio || '')}</p>
          ${details ? `<p class="qf-artist-meta">${esc(details)}</p>` : ''}
          <div class="qf-artist-banner-actions">
            <a class="btn" href="#/artist/${encodeURIComponent(artist.id)}/members">${artist.type==='solo'?'Meet The Artist':'Meet The Band'}</a>
            <a class="btn primary qf-explore-button" href="#/artist/${encodeURIComponent(artist.id)}/profile">Explore ↗</a>
            ${firstSong?`<button class="btn" type="button" data-action="play-song" data-id="${esc(firstSong.id)}">Listen Now ▶</button>`:''}
          </div>
        </div>
        <div class="qf-artist-banner-brand">
          ${logo ? `<img src="${esc(asset(logo))}" alt="${esc(artist.name)} logo" loading="lazy">` : `<span>${esc(artist.name || 'QFR')}</span>`}
        </div>
      </div>
    </article>`;
}

function renderArtistDirectory(state) {
  const artists = state.records?.artists || [];
  const allGenres = [...new Set(artists.flatMap(artistGenres))].sort((a,b)=>a.localeCompare(b));
  const copy = state.site?.pages?.artists || {};
  if (!artists.length) {
    return `${pageHero(copy.kicker || 'THE QFR ROSTER', copy.title || 'Signed Artists', copy.subtitle || 'Meet the artists creating the next wave of sound.')}
      <section class="section"><div class="wrap">${emptyState(state.site?.emptyStates?.artists || 'Signed artists will appear here when their profiles are added in Label Studio.', true)}</div></section>`;
  }
  const selected = new URLSearchParams(location.hash.split('?')[1] || '').get('genre') || 'all';
  const groups = selected === 'all'
    ? [...new Set(artists.map(artist => artistGenres(artist)[0] || 'Other'))].map(genre => [genre, artists.filter(artist => (artistGenres(artist)[0] || 'Other') === genre)])
    : [[selected, artists.filter(artist => artistGenres(artist).includes(selected))]];
  return `
    ${pageHero(copy.kicker || 'THE QFR ROSTER', copy.title || 'Signed Artists', copy.subtitle || 'A home for artists, sounds and stories that refuse to exist inside the expected.')}
    <section class="section qf-artist-directory">
      <div class="wrap">
        <div class="section-heading"><div><span class="kicker">QFR ROSTER</span><h2>Signed Artists</h2><p>Explore the artists and bands signed to Quantum Frequency Records.</p></div><span class="qf-roster-count">${artists.length} ${artists.length===1?'artist':'artists'}</span></div>
        <div class="qf-genre-filters" aria-label="Filter artists by genre">
          <button type="button" class="qf-genre-chip ${selected==='all'?'active':''}" data-qf-genre="all">All Genres</button>
          ${allGenres.map(genre=>`<button type="button" class="qf-genre-chip ${selected===genre?'active':''}" data-qf-genre="${esc(genre)}">${esc(genre)}</button>`).join('')}
        </div>
        <label class="qf-artist-search"><span class="kicker">SEARCH THE ROSTER</span><input id="qfArtistSearch" type="search" placeholder="Search artists, hometowns or genres..."></label>
        <div class="qf-artist-groups" id="qfArtistGroups">
          ${groups.map(([genre, roster])=>`
            <section class="qf-artist-genre-group" data-qf-genre-group>
              <div class="qf-genre-heading"><span class="kicker">GENRE</span><h3>${esc(genre)}</h3></div>
              <div class="qf-artist-banner-list">${roster.map(artistRosterCard).join('')}</div>
            </section>`).join('')}
        </div>
        <p class="qf-no-results" id="qfArtistNoResults" hidden>No signed artists match those filters.</p>
      </div>
    </section>`;
}

function socialLinksHtml(socials = {}) {
  return Object.entries(socials || {}).map(([key,url]) => {
    const safe = safeExternalUrl(url);
    return safe ? `<a class="qf-social-link" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(socialLabels[key] || key)}</a>` : '';
  }).join('');
}

function artistMembers(state, artist) {
  const ids = Array.isArray(artist.memberIds) ? artist.memberIds : [];
  const linked = ids.map(id => (state.records?.members || []).find(member => member.id === id)).filter(Boolean);
  if (linked.length) return linked;
  if (Array.isArray(artist.members)) return artist.members;
  return [];
}

function artistNews(state, artistId) {
  return (state.records?.news || []).filter(item => item.artistId === artistId)
    .sort((a,b)=>(b.publishDate||'').localeCompare(a.publishDate||''));
}
function artistAlbums(state, artistId) {
  return (state.records?.albums || []).filter(item => item.artistId === artistId)
    .sort((a,b)=>(b.releaseDate||'').localeCompare(a.releaseDate||''));
}
function artistSongs(state, artistId) {
  return (state.records?.songs || []).filter(item => item.artistId === artistId)
    .sort((a,b)=>(b.releaseDate||'').localeCompare(a.releaseDate||''));
}
function artistVideos(state, artistId) {
  return (state.records?.videos || []).filter(item => item.artistId === artistId)
    .sort((a,b)=>(b.releaseDate||'').localeCompare(a.releaseDate||''));
}
function artistGallery(state, artistId) {
  return (state.records?.gallery || []).filter(item => item.artistId === artistId)
    .sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
}
function artistShows(state, artistId) {
  return (state.records?.shows || []).filter(item => item.artistId === artistId)
    .sort((a,b)=>(a.date||'').localeCompare(b.date||''));
}

function artistTabNav(artist, active) {
  return `<nav class="qf-artist-tabs" aria-label="Artist sections"><div class="wrap">
    ${allowedViews.map(view=>`<a class="${active===view?'active':''}" href="#/artist/${encodeURIComponent(artist.id)}/${view}">${view==='members'?(artist.type==='solo'?'Artist':'Members'):view.charAt(0).toUpperCase()+view.slice(1)}</a>`).join('')}
  </div></nav>`;
}

function memberPhoto(member) {
  const image = valueOfImage(member.image) || valueOfImage(member.photo);
  return image ? `<img src="${esc(asset(image))}" alt="${esc(member.name || 'Artist member')}" loading="lazy">` : `<div class="qf-member-photo-placeholder">${esc((member.name||'?').split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase())}</div>`;
}

function renderMembersView(artist, members) {
  const solo = artist.type === 'solo';
  if (!members.length) return `<div class="qf-empty-panel"><p class="kicker">${solo?'MEET THE ARTIST':'MEET THE BAND'}</p><h2>${solo?'Artist details coming soon':'Band members coming soon'}</h2><p>Add a member in Label Studio. Every member is stored as a separate JSON record linked to this artist.</p></div>`;
  return `<section class="qf-artist-view">
    <div class="qf-view-heading"><span class="kicker">${solo?'ARTIST PROFILE':'MEET THE BAND'}</span><h2>${solo?'Meet the Artist':'Meet the Band'}</h2><p>${esc(artist.name)}${solo?'':' members and their roles in the band.'}</p></div>
    <div class="qf-member-grid">
      ${members.map(member=>{
        const instruments = Array.isArray(member.additionalInstruments) ? member.additionalInstruments : splitList(member.additionalInstruments);
        const home = member.hometownDisplay || hometownOf(member);
        return `<article class="qf-member-card">
          <div class="qf-member-photo">${memberPhoto(member)}</div>
          <div class="qf-member-content">
            <p class="kicker">${esc(member.status==='former'?'FORMER MEMBER':member.status==='featured'?'FEATURED MEMBER':'QFR ARTIST')}</p>
            <h3>${esc(member.name || 'Member')}</h3>
            ${member.nickname?`<p class="qf-member-nickname">“${esc(member.nickname)}”</p>`:''}
            ${member.role?`<p class="qf-member-role">${esc(member.role)}</p>`:''}
            ${member.primaryInstrument?`<p class="qf-member-instrument"><strong>Primary instrument:</strong> ${esc(member.primaryInstrument)}</p>`:''}
            ${instruments.length?`<p class="qf-member-instrument"><strong>Also plays:</strong> ${esc(instruments.join(' · '))}</p>`:''}
            ${home?`<p class="qf-member-home">${esc(home)}</p>`:''}
            ${member.joinedDate?`<p class="qf-member-home">Joined ${esc(formatDate(member.joinedDate))}</p>`:''}
            ${member.bio?`<p class="qf-member-bio">${esc(member.bio)}</p>`:''}
            <div class="qf-member-socials">${socialLinksHtml(member.socials)}</div>
          </div>
        </article>`;
      }).join('')}
    </div>
  </section>`;
}

function renderProfileView(state, artist, members, albums, songs, videos, news) {
  const latestRelease = [...albums,...songs].sort((a,b)=>(b.releaseDate||'').localeCompare(a.releaseDate||''))[0];
  const latestNews = news[0];
  const featuredVideo = videos[0];
  const dna = Array.isArray(artist.dna) ? artist.dna.filter(item=>item && item.label && Number.isFinite(Number(item.value))) : [];
  const stats = [
    ['Weekly streams',artist.stats?.week],
    ['Monthly streams',artist.stats?.month],
    ['Streams YTD',artist.stats?.ytd]
  ].filter(([,value])=>Number(value)>0);
  const photo = recordImage(artist);
  const about = artist.bio || artist.biography || artist.description || '';
  return `
    <section class="qf-artist-view">
      <div class="qf-profile-intro">
        ${photo?`<img class="qf-profile-photo" src="${esc(asset(photo))}" alt="${esc(artist.name)}" loading="lazy">`:''}
        <div><span class="kicker">ABOUT ${esc(artist.name).toUpperCase()}</span><h2>Artist Profile</h2>
          ${artist.description?`<p class="qf-profile-description">${esc(artist.description)}</p>`:''}
          <p class="qf-profile-bio">${esc(about || 'Artist biography coming soon.')}</p>
          ${socialLinksHtml(artist.socials)?`<div class="qf-social-row">${socialLinksHtml(artist.socials)}</div>`:''}
        </div>
      </div>
      ${stats.length?`<div class="qf-stream-stats">${stats.map(([label,value])=>`<div><span>${esc(label)}</span><strong>${Number(value).toLocaleString()}</strong></div>`).join('')}</div>`:''}
      ${dna.length?`<div class="qf-dna-panel"><div class="qf-view-heading"><span class="kicker">THE SOUND</span><h2>Frequency DNA</h2></div><div class="qf-dna-grid">${dna.map(item=>`<div class="qf-dna-item"><div><span>${esc(item.label)}</span><strong>${Math.max(0,Math.min(100,Number(item.value)))}%</strong></div><div class="qf-dna-track"><i style="width:${Math.max(0,Math.min(100,Number(item.value)))}%"></i></div></div>`).join('')}</div></div>`:''}
      <div class="qf-feature-grid">
        ${latestRelease?`<article class="qf-feature-card"><span class="kicker">LATEST RELEASE</span><h3>${esc(latestRelease.title)}</h3><p>${esc(latestRelease.releaseType || latestRelease.genre || 'Release')} ${latestRelease.releaseDate?`· ${esc(formatDate(latestRelease.releaseDate))}`:''}</p><a href="#/${latestRelease.trackIds?'album':'song'}/${encodeURIComponent(latestRelease.id)}">Explore release ↗</a></article>`:''}
        ${latestNews?`<article class="qf-feature-card"><span class="kicker">LATEST NEWS</span><h3>${esc(latestNews.title)}</h3><p>${esc(latestNews.excerpt||'')}</p><a href="#/news/${encodeURIComponent(latestNews.id)}">Read story ↗</a></article>`:''}
        ${featuredVideo?`<article class="qf-feature-card"><span class="kicker">FEATURED VIDEO</span><h3>${esc(featuredVideo.title)}</h3><p>${esc(featuredVideo.description||'')}</p><button type="button" class="btn small" data-action="play-video" data-id="${esc(featuredVideo.id)}">Play video ▶</button></article>`:''}
      </div>
      ${members.length?`<div class="qf-profile-members"><div class="qf-view-heading"><span class="kicker">THE PEOPLE BEHIND THE SOUND</span><h2>${artist.type==='solo'?'Meet the Artist':'Meet the Band'}</h2></div><div class="qf-member-grid compact">${members.slice(0,4).map(member=>`<article class="qf-member-card compact"><div class="qf-member-photo">${memberPhoto(member)}</div><div class="qf-member-content"><h3>${esc(member.name)}</h3><p class="qf-member-role">${esc(member.role||member.primaryInstrument||'')}</p></div></article>`).join('')}</div><a class="text-link" href="#/artist/${encodeURIComponent(artist.id)}/members">View all members ↗</a></div>`:''}
      ${songs.length?`<div class="qf-top-songs"><div class="qf-view-heading"><span class="kicker">LISTEN</span><h2>Latest Songs</h2></div><div class="qf-song-list">${songs.slice(0,5).map(song=>`<div class="qf-song-row"><div><strong>${esc(song.title)}</strong><span>${esc(song.genre||'')} ${song.releaseDate?`· ${esc(formatDate(song.releaseDate))}`:''}</span></div><button type="button" class="btn small" data-action="play-song" data-id="${esc(song.id)}">▶ Play</button></div>`).join('')}</div></div>`:''}
    </section>`;
}

function renderMusicView(albums, songs) {
  const albumCards = albums.length ? `<div class="card-grid">${albums.map(album=>`
    <article class="content-card"><a href="#/album/${encodeURIComponent(album.id)}"><div class="card-art">${recordImage(album)?`<img src="${esc(asset(recordImage(album)))}" alt="${esc(album.title)}">`:''}</div><div class="card-body"><p class="card-kicker">${esc(album.releaseType||'ALBUM')}</p><h3 class="card-title">${esc(album.title)}</h3><p class="card-subtitle">${esc(formatDate(album.releaseDate))}</p><span class="card-action">View album ↗</span></div></a></article>`).join('')}</div>` : '';
  const songRows = songs.length ? `<div class="qf-song-list">${songs.map(song=>`
    <div class="qf-song-row"><div><strong>${esc(song.title)}</strong><span>${esc(song.genre||'')} ${song.releaseDate?`· ${esc(formatDate(song.releaseDate))}`:''}</span></div><div class="qf-song-actions"><button type="button" class="btn small" data-action="play-song" data-id="${esc(song.id)}">▶ Play</button><a class="text-link" href="#/song/${encodeURIComponent(song.id)}">Details ↗</a></div></div>`).join('')}</div>` : '';
  return `<section class="qf-artist-view"><div class="qf-view-heading"><span class="kicker">DISCOGRAPHY</span><h2>Music & Releases</h2></div>
    <h3 class="qf-subheading">Albums & EPs</h3>${albumCards||`<p class="muted">Albums and EPs will appear here when added to the catalog.</p>`}
    <h3 class="qf-subheading">Singles & Songs</h3>${songRows||`<p class="muted">Songs will appear here when added to the catalog.</p>`}</section>`;
}

function renderVideosView(videos) {
  return `<section class="qf-artist-view"><div class="qf-view-heading"><span class="kicker">WATCH</span><h2>Videos</h2><p>Music videos, visualizers, live performances and behind-the-scenes footage.</p></div>
    ${videos.length?`<div class="card-grid">${videos.map(video=>`
      <article class="content-card"><div class="card-art">${recordImage(video)?`<img src="${esc(asset(recordImage(video)))}" alt="${esc(video.title)}">`:''}</div><div class="card-body"><p class="card-kicker">${esc(video.category||'VIDEO')}</p><h3 class="card-title">${esc(video.title)}</h3><p class="card-excerpt">${esc(video.description||'')}</p><button type="button" class="btn small primary" data-action="play-video" data-id="${esc(video.id)}">Play video ▶</button></div></article>`).join('')}</div>`:`<p class="muted">Videos for this artist will appear here when added.</p>`}
  </section>`;
}

function renderNewsView(news) {
  return `<section class="qf-artist-view"><div class="qf-view-heading"><span class="kicker">UPDATES</span><h2>Artist News</h2><p>News, announcements and updates connected to this artist.</p></div>
    ${news.length?`<div class="news-list">${news.map(item=>`<article class="news-row"><span class="date">${esc((item.category||'NEWS').toUpperCase())} · ${esc(formatDate(item.publishDate))}</span><h3>${esc(item.title)}</h3><p>${esc(item.excerpt||'')}</p><a class="card-action" href="#/news/${encodeURIComponent(item.id)}">Read story ↗</a></article>`).join('')}</div>`:`<p class="muted">Artist news will appear here when a story is associated with this artist in Label Studio.</p>`}
  </section>`;
}

function renderGalleryView(gallery) {
  if (!gallery.length) return `<section class="qf-artist-view"><div class="qf-view-heading"><span class="kicker">VISUAL ARCHIVE</span><h2>Gallery</h2></div><p class="muted">Artist photos, live performances, studio moments and behind-the-scenes images will appear here.</p></section>`;
  const categories = ['All',...new Set(gallery.map(item=>item.category).filter(Boolean))];
  return `<section class="qf-artist-view"><div class="qf-view-heading"><span class="kicker">VISUAL ARCHIVE</span><h2>Gallery</h2></div>
    <div class="qf-gallery-filters">${categories.map(cat=>`<button type="button" class="qf-genre-chip ${cat==='All'?'active':''}" data-qf-gallery-filter="${esc(cat)}">${esc(cat)}</button>`).join('')}</div>
    <div class="qf-gallery-grid">${gallery.map(item=>`<button class="qf-gallery-image" type="button" data-qf-lightbox="${esc(asset(recordImage(item)))}" data-category="${esc(item.category||'')}" aria-label="Open ${esc(item.title||'gallery image')}">
      ${recordImage(item)?`<img src="${esc(asset(recordImage(item)))}" alt="${esc(item.title||'')}" loading="lazy">`:''}<span>${esc(item.title||item.description||'')}</span></button>`).join('')}</div>
  </section>`;
}

function renderShowsView(shows) {
  return `<section class="qf-artist-view"><div class="qf-view-heading"><span class="kicker">LIVE & IN PERSON</span><h2>Shows & Appearances</h2><p>Upcoming performances, events and live appearances.</p></div>
    ${shows.length?`<div class="qf-show-list">${shows.map(show=>{
      const place=[show.venue,[show.city,show.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
      const ticket=safeExternalUrl(show.ticketUrl||'');
      return `<article class="qf-show-card"><div class="qf-show-date"><strong>${esc(show.date?new Date(`${show.date}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'TBA')}</strong><span>${esc(show.date?new Date(`${show.date}T12:00:00`).getFullYear():'')}</span></div><div class="qf-show-info"><p class="kicker">${esc((show.status||'announced').replaceAll('-',' ').toUpperCase())}${show.time?` · ${esc(show.time)}`:''}</p><h3>${esc(show.title)}</h3><p>${esc(place||'Venue details to be announced')}</p>${show.description?`<p class="qf-show-description">${esc(show.description)}</p>`:''}</div>${ticket?`<a class="btn small" href="${esc(ticket)}" target="_blank" rel="noopener noreferrer">Tickets ↗</a>`:''}</article>`;
    }).join('')}</div>`:`<p class="muted">No shows have been announced for this artist yet. Upcoming dates will appear here when they are added in Label Studio.</p>`}
  </section>`;
}

function renderMerchView(artist) {
  return `<section class="qf-artist-view"><div class="qf-merch-panel"><span class="kicker">COMING SOON</span><h2>Merch for ${esc(artist.name)}</h2><p>Artist merchandise will appear here as the QFR store expands. Until then, contact the label about artist merchandise and collaborations.</p><a class="btn" href="#/contact">Contact the label ↗</a></div></section>`;
}

function renderArtistProfile(state, id, view = 'profile') {
  const artist = (state.records?.artists || []).find(item=>item.id===id);
  if (!artist) return `${pageHero('ARTIST PROFILE','Artist Not Found','This artist profile may have moved or has not been added yet.')}<section class="section"><div class="wrap">${emptyState('No artist record is connected to this address.',true)}</div></section>`;
  if (!allowedViews.includes(view)) view = 'profile';
  const members = artistMembers(state,artist);
  const albums = artistAlbums(state,id);
  const songs = artistSongs(state,id);
  const videos = artistVideos(state,id);
  const news = artistNews(state,id);
  const gallery = artistGallery(state,id);
  const shows = artistShows(state,id);
  const banner = artistBanner(artist);
  const logo = artistLogo(artist);
  const meta = [
    hometownOf(artist) ? `<span><b>Hometown</b>${esc(hometownOf(artist))}</span>` : '',
    artist.formed ? `<span><b>Formed</b>${esc(artist.formed)}</span>` : '',
    artist.signedDate ? `<span><b>Signed to QFR</b>${esc(formatDate(artist.signedDate))}</span>` : ''
  ].filter(Boolean).join('');
  let content = '';
  if (view === 'profile') content = renderProfileView(state,artist,members,albums,songs,videos,news);
  else if (view === 'news') content = renderNewsView(news);
  else if (view === 'music') content = renderMusicView(albums,songs);
  else if (view === 'videos') content = renderVideosView(videos);
  else if (view === 'shows') content = renderShowsView(shows);
  else if (view === 'members') content = renderMembersView(artist,members);
  else if (view === 'gallery') content = renderGalleryView(gallery);
  else content = renderMerchView(artist);

  const firstSong = songs[0];
  const hero = `
    <section class="qf-artist-profile-hero">
      ${banner?`<img class="qf-artist-profile-banner" src="${esc(asset(banner))}" alt="" fetchpriority="high">`:''}
      <div class="qf-artist-profile-veil"></div>
      <div class="wrap qf-artist-profile-inner">
        <div class="qf-artist-profile-brand">${logo?`<img src="${esc(asset(logo))}" alt="${esc(artist.name)} logo">`:`<span>${esc(artist.name)}</span>`}</div>
        <div class="qf-artist-profile-copy">
          <p class="kicker">${esc(displayGenre(artist))} ${hometownOf(artist)?`· ${esc(hometownOf(artist))}`:''}</p>
          <h1>${esc(artist.name)}</h1>
          <p>${esc(artist.tagline || artist.description || '')}</p>
          <div class="qf-artist-hero-actions">
            ${firstSong?`<button class="btn primary" type="button" data-action="play-song" data-id="${esc(firstSong.id)}">Listen Now ▶</button>`:''}
            <button class="btn" type="button" data-qf-share>Share Artist ↗</button>
          </div>
        </div>
        ${meta?`<div class="qf-artist-profile-meta">${meta}</div>`:''}
      </div>
    </section>`;
  return `${hero}${artistTabNav(artist,view)}<section class="section"><div class="wrap">${content}</div></section>`;
}

function decorateArtistDirectory() {
  const search = app.querySelector('#qfArtistSearch');
  const chips = [...app.querySelectorAll('[data-qf-genre]')];
  const cards = [...app.querySelectorAll('[data-qf-artist-card]')];
  let genre = 'all';
  const groups = [...app.querySelectorAll('[data-qf-genre-group]')];
  const noResults = app.querySelector('#qfArtistNoResults');
  const apply = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    cards.forEach(card=>{
      const genres = (card.dataset.genres || '').split('|');
      const matchesGenre = genre==='all' || genres.includes(genre);
      const matchesSearch = !query || (card.dataset.search || '').includes(query);
      card.hidden = !(matchesGenre && matchesSearch);
      if (!card.hidden) visible++;
    });
    groups.forEach(group=>{group.hidden=!group.querySelector('[data-qf-artist-card]:not([hidden])');});
    if (noResults) noResults.hidden = visible > 0;
  };
  chips.forEach(chip=>chip.addEventListener('click',()=>{
    genre=chip.dataset.qfGenre||'all';
    chips.forEach(item=>item.classList.toggle('active',item===chip));
    apply();
  }));
  search?.addEventListener('input',apply);
}

function decorateArtistProfile() {
  app.querySelectorAll('[data-qf-gallery-filter]').forEach(button=>button.addEventListener('click',()=>{
    const selected=button.dataset.qfGalleryFilter||'All';
    app.querySelectorAll('[data-qf-gallery-filter]').forEach(item=>item.classList.toggle('active',item===button));
    app.querySelectorAll('[data-qf-lightbox]').forEach(image=>{
      image.hidden=selected!=='All' && image.dataset.category!==selected;
    });
  }));
  app.querySelectorAll('[data-qf-lightbox]').forEach(button=>button.addEventListener('click',()=>{
    const overlay=document.createElement('div');
    overlay.className='qf-gallery-lightbox';
    overlay.innerHTML=`<button type="button" aria-label="Close image">×</button><img src="${esc(button.dataset.qfLightbox)}" alt="">`;
    overlay.addEventListener('click',()=>overlay.remove());
    document.body.append(overlay);
  }));
  app.querySelector('[data-qf-share]')?.addEventListener('click',async()=>{
    try {
      if (navigator.share) await navigator.share({title:document.title,url:location.href});
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(location.href); showToast('Artist link copied.'); }
      else showToast('Copy the artist page address from your browser.');
    } catch {}
  });
}

async function refreshArtistRoute() {
  await Promise.resolve();
  if (!app) return;
  const parts=decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/');
  const page=parts[0]||'home';
  if (page==='artists') {
    app.innerHTML=renderArtistDirectory(qfState);
    decorateArtistDirectory();
  } else if (page==='artist') {
    app.innerHTML=renderArtistProfile(qfState,parts[1]||'',parts[2]||'profile');
    decorateArtistProfile();
  } else if (page==='admin') {
    enhanceAdminForms();
  }
}

async function handleEnhancedAdminSubmit(event) {
  const form = event.target.closest('form[data-admin-form]');
  if (!form || !['artist','news','show'].includes(form.dataset.adminForm)) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  try {
    qfState = await loadData();
    qfState.records.members ||= [];
    qfState.manifest.members ||= [];
    qfState.records.shows ||= [];
    qfState.manifest.shows ||= [];

    const type=form.dataset.adminForm;
    const formData=new FormData(form);
    const fields=Object.fromEntries(formData.entries());

    if (type==='artist') {
      const name=String(fields.name||'').trim();
      if (!name) throw new Error('Enter an artist or band name.');
      const artistId=uniqueId(qfState.records.artists,name);
      const dna=parseOptionalJson(fields.qfDnaJson,'Frequency DNA',[]);
      if (!Array.isArray(dna) || dna.some(item=>!item || !String(item.label||'').trim() || !Number.isFinite(Number(item.value)) || Number(item.value)<0 || Number(item.value)>100)) {
        throw new Error('Frequency DNA must be an array of {\"label\":\"Energy\",\"value\":80} entries, with values from 0 to 100.');
      }
      const members=memberRowsFromForm(form,artistId);
      if (!members.length) throw new Error('Add at least one member. For a solo act, add the artist as the member.');
      const before=new Set(qfState.records.artists.map(item=>item.id));
      await handleAdminSubmit(event,qfState,()=>{});
      const artist=qfState.records.artists.find(item=>!before.has(item.id));
      if (!artist) return;

      const bannerFile=form.querySelector('[name=\"qfBannerFile\"]')?.files?.[0];
      const logoFile=form.querySelector('[name=\"qfLogoFile\"]')?.files?.[0];
      const bannerPath=String(fields.qfBannerUrl||'').trim() || addExtraAsset(bannerFile,'artists',`${artistId}-banner`);
      const logoPath=String(fields.qfLogoUrl||'').trim() || addExtraAsset(logoFile,'artists',`${artistId}-logo`);
      const city=String(fields.qfHometownCity||'').trim();
      const region=String(fields.qfHometownState||'').trim();
      artist.type=fields.qfArtistType||'group';
      artist.formed=fields.qfFormed ? Number(fields.qfFormed) : '';
      artist.signedDate=String(fields.qfSignedDate||'').trim();
      artist.hometownCity=city;
      artist.hometownState=region;
      artist.hometown=[city,region].filter(Boolean).join(', ') || artist.hometown || '';
      artist.tagline=String(fields.qfTagline||'').trim();
      artist.description=String(fields.qfDescription||'').trim();
      artist.biography=artist.bio||'';
      artist.banner={src:bannerPath};
      artist.logo={src:logoPath};
      artist.dna=dna;
      artist.stats={
        week:fields.qfStreamsWeek ? Number(fields.qfStreamsWeek) : null,
        month:fields.qfStreamsMonth ? Number(fields.qfStreamsMonth) : null,
        ytd:fields.qfStreamsYtd ? Number(fields.qfStreamsYtd) : null
      };
      artist.memberIds=[];
      for (const member of members) {
        qfState.records.members.push(member);
        qfState.manifest.members.push({id:member.id,file:member.file});
        artist.memberIds.push(member.id);
      }
      saveDraft(qfState);
      showToast(`Artist saved with ${members.length} linked member record${members.length===1?'':'s'}.`);
    } else if (type==='news') {
      const title=String(fields.title||'').trim();
      const artistId=String(fields.qfArtistId||'').trim();
      const before=new Set(qfState.records.news.map(item=>item.id));
      await handleAdminSubmit(event,qfState,()=>{});
      const news=qfState.records.news.find(item=>!before.has(item.id));
      if (news) {
        news.artistId=artistId;
        saveDraft(qfState);
        showToast(artistId ? 'Artist news story saved and linked to its artist.' : 'News story saved.');
      }
    } else if (type==='show') {
      const title=String(fields.title||'').trim();
      const artistId=String(fields.artistId||'').trim();
      if (!title || !fields.date) throw new Error('Enter a show name and date.');
      if (!(qfState.records.artists||[]).some(artist=>artist.id===artistId)) throw new Error('Select an artist for this show.');
      const id=uniqueId(qfState.records.shows,`${title}-${artistId}`);
      const show={
        id,title,artistId,date:String(fields.date||''),time:String(fields.time||''),
        venue:String(fields.venue||'').trim(),city:String(fields.city||'').trim(),
        state:String(fields.state||'').trim(),status:String(fields.status||'announced'),
        ticketUrl:String(fields.ticketUrl||'').trim(),description:String(fields.description||'').trim(),
        createdAt:new Date().toISOString(),file:`data/shows/${id}.json`
      };
      qfState.records.shows.push(show);
      qfState.manifest.shows.push({id,file:show.file});
      saveDraft(qfState);
      showToast(`Show saved for ${qfState.records.artists.find(artist=>artist.id===artistId)?.name || 'artist'}.`);
    }
    window.setTimeout(()=>window.location.reload(),700);
  } catch (error) {
    showToast(error.message || 'Unable to save this record. Check the entered information.');
  }
}

function handleStudioClicks(event) {
  const add=event.target.closest('[data-qf-add-member]');
  if (add) {
    const list=add.closest('form')?.querySelector('[data-qf-member-list]');
    if (list) list.insertAdjacentHTML('beforeend',memberEditor(list.querySelectorAll('[data-qf-member-row]').length));
    return;
  }
  const remove=event.target.closest('[data-qf-remove-member]');
  if (remove) {
    const list=remove.closest('[data-qf-member-list]');
    const row=remove.closest('[data-qf-member-row]');
    if (!row || !list) return;
    if (list.querySelectorAll('[data-qf-member-row]').length===1) {
      row.querySelectorAll('input,textarea').forEach(input=>{if(input.type==='file')input.value='';else input.value='';});
      row.querySelectorAll('select').forEach(select=>select.selectedIndex=0);
    } else row.remove();
  }
}

async function init() {
  qfState=await loadData();
  qfState.records.members ||= [];
  qfState.manifest.members ||= [];
  qfState.records.shows ||= [];
  qfState.manifest.shows ||= [];

  app?.addEventListener('submit',handleEnhancedAdminSubmit,true);
  app?.addEventListener('click',handleStudioClicks,true);
  window.addEventListener('hashchange',refreshArtistRoute);
  window.addEventListener('popstate',refreshArtistRoute);

  if (app && !observer) {
    observer=new MutationObserver(()=>{
      const parts=decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/');
      const page=parts[0]||'home';
      // The primary site module and this extension both load data asynchronously.
      // Re-apply the enhanced renderer if the primary renderer wins the race.
      if (page==='admin') enhanceAdminForms();
      else if (page==='artists' && !app.querySelector('.qf-artist-directory')) {
        app.innerHTML=renderArtistDirectory(qfState);
        decorateArtistDirectory();
      } else if (page==='artist' && !app.querySelector('.qf-artist-tabs')) {
        app.innerHTML=renderArtistProfile(qfState,parts[1]||'',parts[2]||'profile');
        decorateArtistProfile();
      }
    });
    observer.observe(app,{childList:true,subtree:true});
  }

  await refreshArtistRoute();
}

init().catch(error=>console.error('QFMusic artist system could not initialize:',error));
