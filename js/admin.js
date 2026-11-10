import {esc, slugify, saveDraft, showToast, getRecord} from './core.js';

const pendingAssets = new Map();
const folderFor = {artists:'artists',albums:'albums',songs:'songs',videos:'videos',news:'news',gallery:'gallery'};
const homeSlots = [
  {id:'labelAnnouncement', label:'New Label Announcements', type:'news'},
  {id:'newestArtist', label:'Newest Signed Artist', type:'artists'},
  {id:'newestSingle', label:'Newest Released Single', type:'songs'},
  {id:'newestAlbum', label:'Newest Released Album', type:'albums'},
  {id:'newestVideo', label:'Newest Released Video', type:'videos'}
];

function options(records, selected = '') {
  return (records || []).map(item => `<option value="${esc(item.id)}" ${item.id===selected?'selected':''}>${esc(item.name || item.title || item.id)}</option>`).join('');
}
function refOptions(state, type) {
  const records = (state.records[type] || []).filter(item => type !== 'songs' || !item.releaseType || item.releaseType === 'single');
  return records.map(item => `<option value="${esc(type)}:${esc(item.id)}">${esc(item.title || item.name || item.id)}</option>`).join('');
}
function slotPanel(state) {
  return homeSlots.map(slot => {
    const current = state.homeFeed.slots?.[slot.id]?.current;
    const currentValue = current ? `${current.type}:${current.id}` : '';
    const count = state.homeFeed.slots?.[slot.id]?.history?.length || 0;
    const items = refOptions(state, slot.type);
    return `<div class="admin-record"><div><strong>${esc(slot.label)}</strong><br><span>${current ? `Current: ${esc(getRecord(state,current.type,current.id)?.title || getRecord(state,current.type,current.id)?.name || 'Selected record')}` : 'No current selection'} · ${count} archived</span></div></div>
      <form class="form-grid" data-admin-form="home-slot" data-slot="${slot.id}">
        <label class="wide-label">Choose current item<select name="itemRef"><option value="">${items ? 'Select an item' : 'No records available yet'}</option>${items}</select></label>
        <div class="form-actions"><button class="btn small primary" type="submit" ${items?'':'disabled'}>Update card</button></div>
      </form>`;
  }).join('');
}

export function renderAdmin(state) {
  const artistOptions = options(state.records.artists);
  const albumOptions = options(state.records.albums);
  const trendingTypes = ['songs','albums','artists','videos'];
  const trendingOptions = trendingTypes.map(type => refOptions(state,type)).join('');
  return `
    <div class="wrap section">
      <div class="admin-intro">
        <span class="kicker">LOCAL WORKSPACE · DRAFT MODE</span>
        <h2>Label Studio.</h2>
        <p>Add a finished Suno song once, keep its prompts and lyrics with its own JSON record, then reuse that same catalog record across Music, Artist pages, the persistent player, the New section and Trending. Changes stay in this browser until you export and publish the data bundle.</p>
        <div class="form-actions"><button class="btn primary" type="button" data-admin-action="export">Export data bundle (.zip)</button><button class="btn" type="button" data-admin-action="refresh">Refresh draft view</button><button class="btn danger-button" type="button" data-admin-action="reset">Clear local draft</button></div>
        <p class="status-line" id="adminStatus">${Object.values(state.records).reduce((sum,list)=>sum+(list?.length||0),0)} catalog records loaded · ${pendingAssets.size} media files attached in this session.</p>
      </div>

      <div class="admin-grid">
        <section class="admin-panel">
          <h3>Add Artist</h3><p>One profile JSON per artist. A new artist is automatically selected for the Newest Signed Artist card.</p>
          <form class="form-stack" data-admin-form="artist">
            <label>Artist / act name<input name="name" required placeholder="Artist name"></label>
            <div class="form-grid"><label>Genres<input name="genres" placeholder="Country Rock, Americana"></label><label>Hometown<input name="hometown" placeholder="City, State"></label></div>
            <label>Biography<textarea name="bio" placeholder="Artist biography"></textarea></label>
            <label>Image URL or repository path<input name="imageUrl" placeholder="assets/images/artists/artist.jpg"></label>
            <label>Upload artist image<input name="imageFile" type="file" accept="image/*"></label>
            <label>Social links (JSON)<textarea name="socials" placeholder='{"instagram":"https://...","youtube":"https://..."}'></textarea></label>
            <button class="btn primary" type="submit">Save artist JSON</button>
          </form>
        </section>

        <section class="admin-panel">
          <h3>Add Song / Single</h3><p>Each song becomes its own JSON file. Keep the exact Suno style prompt, lyrics and generation metadata with the master record.</p>
          <form class="form-stack" data-admin-form="song">
            <label>Song title<input name="title" required placeholder="Song title"></label>
            <div class="form-grid"><label>Artist<select name="artistId" required><option value="">Select artist</option>${artistOptions}</select></label><label>Release type<select name="releaseType"><option value="single">Single</option><option value="album-track">Album track</option></select></label></div>
            <div class="form-grid"><label>Release date<input name="releaseDate" type="date"></label><label>Genre / style<input name="genre" placeholder="Country Rock"></label></div>
            <label>Song description<textarea name="description" placeholder="Short description for cards and song page"></textarea></label>
            <label>Suno style prompt<textarea name="stylePrompt" placeholder="Paste the full Suno style prompt"></textarea></label>
            <label>Final lyrics<textarea name="lyrics" placeholder="Paste final lyrics, including section labels"></textarea></label>
            <div class="form-grid"><label>Suno song ID<input name="sunoId" placeholder="Suno ID / generation URL identifier"></label><label>Model<input name="model" placeholder="e.g. Suno model/version"></label></div>
            <div class="form-grid"><label>Duration (seconds)<input name="durationSec" type="number" min="0" step="1"></label><label>Mood / tags<input name="mood" placeholder="Bonfire, friendship, summer"></label></div>
            <label>Audio URL or existing path<input name="audioUrl" placeholder="assets/audio/song.mp3"></label>
            <label>Upload final audio file<input name="audioFile" type="file" accept="audio/*"></label>
            <label>Artwork URL or existing path<input name="artworkUrl" placeholder="assets/images/releases/song.jpg"></label>
            <label>Upload cover artwork<input name="artworkFile" type="file" accept="image/*"></label>
            <button class="btn primary" type="submit">Save song JSON</button>
          </form>
        </section>

        <section class="admin-panel">
          <h3>Import Song JSON</h3><p>Already have a song JSON record prepared? Import one here instead of retyping the song details. Its artist must exist in the artist catalog first.</p>
          <form class="form-stack" data-admin-form="import-song">
            <label>Choose song JSON file<input name="songJsonFile" type="file" accept=".json,application/json" required></label>
            <button class="btn" type="submit">Import song record</button>
          </form>
        </section>

        <section class="admin-panel">
          <h3>Add Album / EP</h3><p>Album JSON stores the release-level details and references the individual song records by ID.</p>
          <form class="form-stack" data-admin-form="album">
            <label>Album title<input name="title" required placeholder="Album title"></label>
            <div class="form-grid"><label>Artist<select name="artistId" required><option value="">Select artist</option>${artistOptions}</select></label><label>Release date<input name="releaseDate" type="date"></label></div>
            <div class="form-grid"><label>Release type<select name="releaseType"><option>Album</option><option>EP</option></select></label><label>Genre<input name="genre" placeholder="Alternative Rock"></label></div>
            <label>Description<textarea name="description" placeholder="Album overview"></textarea></label>
            <label>Track IDs (comma separated)<input name="trackIds" placeholder="song-one, song-two"></label>
            <label>Artwork URL or path<input name="artworkUrl" placeholder="assets/images/albums/album.jpg"></label>
            <label>Upload cover artwork<input name="artworkFile" type="file" accept="image/*"></label>
            <button class="btn primary" type="submit">Save album JSON</button>
          </form>
        </section>

        <section class="admin-panel">
          <h3>Add Video</h3><p>Use a YouTube URL or attach a local MP4/WebM file. The global video player stays mounted while visitors navigate.</p>
          <form class="form-stack" data-admin-form="video">
            <label>Video title<input name="title" required placeholder="Video title"></label>
            <div class="form-grid"><label>Artist<select name="artistId"><option value="">Label-wide / no artist</option>${artistOptions}</select></label><label>Publish date<input name="releaseDate" type="date"></label></div>
            <div class="form-grid"><label>Category<select name="category"><option>Music Video</option><option>Visualizer</option><option>Lyric Video</option><option>Behind The Scenes</option><option>Live Performance</option><option>Interview</option></select></label><label>YouTube URL<input name="youtubeUrl" placeholder="https://www.youtube.com/watch?v=..."></label></div>
            <label>Description<textarea name="description" placeholder="Video description"></textarea></label>
            <label>Local video URL / path<input name="videoUrl" placeholder="assets/videos/video.mp4"></label>
            <label>Upload video file<input name="videoFile" type="file" accept="video/mp4,video/webm,video/quicktime"></label>
            <label>Thumbnail URL / path<input name="thumbnailUrl" placeholder="assets/images/videos/video.jpg"></label>
            <label>Upload thumbnail<input name="thumbnailFile" type="file" accept="image/*"></label>
            <button class="btn primary" type="submit">Save video JSON</button>
          </form>
        </section>

        <section class="admin-panel">
          <h3>Add Gallery Image</h3><p>Gallery records are separate JSON files and can be categorized by artist, album, live, studio or behind-the-scenes content.</p>
          <form class="form-stack" data-admin-form="gallery">
            <label>Image title<input name="title" required placeholder="Gallery image title"></label>
            <div class="form-grid"><label>Artist<select name="artistId"><option value="">Label-wide / no artist</option>${artistOptions}</select></label><label>Category<select name="category"><option>Artist</option><option>Album</option><option>Studio</option><option>Live</option><option>Behind The Scenes</option><option>Artwork</option></select></label></div>
            <label>Description<textarea name="description" placeholder="Optional caption"></textarea></label>
            <label>Image URL / path<input name="imageUrl" placeholder="assets/images/gallery/image.jpg"></label>
            <label>Upload image<input name="imageFile" type="file" accept="image/*"></label>
            <button class="btn primary" type="submit">Save gallery JSON</button>
          </form>
        </section>

        <section class="admin-panel">
          <h3>Add News / Announcement</h3><p>News stories are retained in the News archive. A Label Announcement is also promoted automatically to the first New card.</p>
          <form class="form-stack" data-admin-form="news">
            <label>Headline<input name="title" required placeholder="Story headline"></label>
            <div class="form-grid"><label>Category<select name="category"><option value="label">Label Announcement</option><option value="artist">Artist News</option><option value="release">Release News</option><option value="industry">Industry / Editorial</option></select></label><label>Publish date<input name="publishDate" type="date"></label></div>
            <label>Excerpt<textarea name="excerpt" placeholder="Short card summary"></textarea></label>
            <label>Full story<textarea name="body" placeholder="Full story body"></textarea></label>
            <label>Image URL / path<input name="imageUrl" placeholder="assets/images/news/story.jpg"></label>
            <label>Upload story image<input name="imageFile" type="file" accept="image/*"></label>
            <button class="btn primary" type="submit">Save news JSON</button>
          </form>
        </section>

        <section class="admin-panel">
          <h3>Manage New At QFR</h3><p>Choose the current item for each card. Replacing an item moves the previous selection into its permanent history list.</p>
          <div class="form-stack">${slotPanel(state)}</div>
        </section>

        <section class="admin-panel">
          <h3>Trending Selection</h3><p>Curate your own weekly, monthly and yearly highlights. These selections are references to existing catalog records.</p>
          <form class="form-stack" data-admin-form="trending">
            <div class="form-grid"><label>Time period<select name="period"><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label><label>Rank / position<input name="rank" type="number" min="1" step="1" value="1"></label></div>
            <label>Catalog item<select name="itemRef"><option value="">Select an item</option>${trendingOptions}</select></label>
            <button class="btn primary" type="submit" ${trendingOptions?'':'disabled'}>Add to Trending</button>
          </form>
        </section>

        <section class="admin-panel">
          <h3>Nine Key Values</h3><p>Edit the values as JSON. Keep exactly nine entries to preserve the nine-value layout.</p>
          <form class="form-stack" data-admin-form="values">
            <label>Values JSON<textarea class="raw-json" name="json" spellcheck="false">${esc(JSON.stringify(state.values,null,2))}</textarea></label>
            <button class="btn primary" type="submit">Save values JSON</button>
          </form>
        </section>

        <section class="admin-panel wide">
          <h3>Label Details & Social Links</h3><p>Edit footer label information, contact details and social URLs. Leave a social URL blank to hide that link.</p>
          <form class="form-stack" data-admin-form="footer">
            <label>Footer JSON<textarea class="raw-json" name="json" spellcheck="false">${esc(JSON.stringify(state.footer,null,2))}</textarea></label>
            <button class="btn primary" type="submit">Save footer JSON</button>
          </form>
        </section>

        <section class="admin-panel wide">
          <h3>Website Copy & Navigation</h3><p>Landing page, home page, About page, navigation and empty-state wording are controlled here.</p>
          <form class="form-stack" data-admin-form="site">
            <label>Site JSON<textarea class="raw-json" name="json" spellcheck="false">${esc(JSON.stringify(state.site,null,2))}</textarea></label>
            <button class="btn primary" type="submit">Save site JSON</button>
          </form>
        </section>

        <section class="admin-panel wide">
          <h3>Current Catalog</h3><p>These lists update as records are added. Older records remain available in the public archive unless their JSON reference is intentionally removed.</p>
          <div class="metadata-grid">${['artists','albums','songs','videos','news'].map(type=>`<div class="metadata-cell"><span>${esc(type)}</span><strong>${(state.records[type]||[]).length} records</strong></div>`).join('')}</div>
        </section>
      </div>
      <p class="form-note" style="margin-top:1.5rem">Publishing note: Label Studio saves browser-local drafts. Export the data bundle and commit its files to GitHub to publish. Never paste a GitHub personal access token into this public website.</p>
    </div>`;
}

function fileExt(file, fallback) {
  const ext = file?.name?.split('.').pop()?.toLowerCase();
  return ext && /^[a-z0-9]{2,5}$/.test(ext) ? ext : fallback;
}

function attachFile(form, inputName, folder, slug, fallbackExt) {
  const file = form.querySelector(`[name="${inputName}"]`)?.files?.[0];
  if (!file) return '';
  const path = `assets/${folder}/${slug}.${fileExt(file,fallbackExt)}`;
  pendingAssets.set(path, file);
  return path;
}

function uniqueId(state, collection, title) {
  let id = slugify(title);
  let suffix = 2;
  const existing = new Set((state.records[collection] || []).map(item => item.id));
  while (existing.has(id)) id = `${slugify(title)}-${suffix++}`;
  return id;
}

function setSlot(state, slotId, ref) {
  state.homeFeed.slots ||= {};
  const slot = state.homeFeed.slots[slotId] ||= {label:slotId,current:null,history:[]};
  slot.history ||= [];
  if (slot.current && !(slot.current.type === ref.type && slot.current.id === ref.id)) {
    slot.history.unshift({...slot.current, archivedAt:new Date().toISOString()});
  }
  slot.current = {...ref, featuredAt:new Date().toISOString()};
}

function addRecord(state, type, record, slotId = '') {
  const file = `data/${folderFor[type]}/${record.id}.json`;
  record.file = file;
  state.records[type] ||= [];
  state.manifest[type] ||= [];
  state.records[type].push(record);
  state.manifest[type].push({id:record.id,file});
  if (slotId) setSlot(state,slotId,{type,id:record.id});
  saveDraft(state);
}

function readFields(form) { return Object.fromEntries(new FormData(form).entries()); }
function jsonOrEmpty(text) { return text.trim() ? JSON.parse(text) : {}; }

export async function handleAdminSubmit(event, state, rerender) {
  const form = event.target.closest('form[data-admin-form]');
  if (!form) return false;
  event.preventDefault();
  const type = form.dataset.adminForm;
  const f = readFields(form);
  try {
    if (type === 'artist') {
      const id = uniqueId(state,'artists',f.name);
      const imageFile = attachFile(form,'imageFile','images/artists',id,'jpg');
      const socials = jsonOrEmpty(f.socials || '');
      const imageSrc = f.imageUrl?.trim() || imageFile;
      addRecord(state,'artists',{id,name:f.name.trim(),genres:f.genres.split(',').map(v=>v.trim()).filter(Boolean),hometown:f.hometown.trim(),bio:f.bio.trim(),image:{src:imageSrc},socials,createdAt:new Date().toISOString()},'newestArtist');
      showToast(`Artist saved: ${f.name}`);
    } else if (type === 'song') {
      if (!getRecord(state,'artists',f.artistId)) throw new Error('Select an artist before saving a song.');
      const id = uniqueId(state,'songs',f.title);
      const audioFile = attachFile(form,'audioFile','audio',id,'mp3');
      const artFile = attachFile(form,'artworkFile','images/releases',id,'jpg');
      const audioSrc = f.audioUrl?.trim() || audioFile;
      const artSrc = f.artworkUrl?.trim() || artFile;
      const record = {id,title:f.title.trim(),artistId:f.artistId,albumId:f.albumId || '',releaseType:f.releaseType || 'single',releaseDate:f.releaseDate || '',genre:f.genre.trim(),mood:f.mood.trim(),description:f.description.trim(),stylePrompt:f.stylePrompt.trim(),lyrics:f.lyrics.trim(),audio:{src:audioSrc},artwork:{src:artSrc},suno:{songId:f.sunoId.trim(),model:f.model.trim(),durationSec:f.durationSec ? Number(f.durationSec) : null},credits:{writers:[],producers:[]},links:{spotify:'',appleMusic:''},createdAt:new Date().toISOString()};
      addRecord(state,'songs',record,record.releaseType === 'single' ? 'newestSingle' : '');
      showToast(`Song saved: ${f.title}`);
    } else if (type === 'import-song') {
      const file = form.querySelector('[name="songJsonFile"]')?.files?.[0];
      if (!file) throw new Error('Choose a song JSON file to import.');
      const imported = JSON.parse(await file.text());
      if (!imported.title || !imported.artistId) throw new Error('Song JSON must include a title and artistId.');
      if (!getRecord(state,'artists',imported.artistId)) throw new Error(`Artist ${imported.artistId} is not in the artist catalog yet.`);
      const id = uniqueId(state,'songs',imported.id || imported.title);
      imported.id = id; delete imported.file;
      imported.audio ||= {src:''}; imported.artwork ||= {src:''}; imported.suno ||= {songId:'',model:'',durationSec:null};
      addRecord(state,'songs',imported,imported.releaseType==='single'?'newestSingle':'');
      showToast(`Imported song JSON: ${imported.title}`);
    } else if (type === 'album') {
      if (!getRecord(state,'artists',f.artistId)) throw new Error('Select an artist before saving an album.');
      const id = uniqueId(state,'albums',f.title);
      const artFile = attachFile(form,'artworkFile','images/albums',id,'jpg');
      const artwork = f.artworkUrl?.trim() || artFile;
      addRecord(state,'albums',{id,title:f.title.trim(),artistId:f.artistId,releaseDate:f.releaseDate || '',releaseType:f.releaseType || 'Album',genre:f.genre.trim(),description:f.description.trim(),trackIds:f.trackIds.split(',').map(v=>v.trim()).filter(Boolean),artwork:{src:artwork},createdAt:new Date().toISOString()},'newestAlbum');
      showToast(`Album saved: ${f.title}`);
    } else if (type === 'video') {
      const id = uniqueId(state,'videos',f.title);
      const videoFile = attachFile(form,'videoFile','videos',id,'mp4');
      const imageFile = attachFile(form,'thumbnailFile','images/videos',id,'jpg');
      addRecord(state,'videos',{id,title:f.title.trim(),artistId:f.artistId || '',releaseDate:f.releaseDate || '',category:f.category || 'Music Video',description:f.description.trim(),videoSrc:f.videoUrl?.trim() || videoFile,youtubeUrl:f.youtubeUrl.trim(),thumbnail:{src:f.thumbnailUrl?.trim() || imageFile},createdAt:new Date().toISOString()},'newestVideo');
      showToast(`Video saved: ${f.title}`);
    } else if (type === 'gallery') {
      const id = uniqueId(state,'gallery',f.title);
      const imageFile = attachFile(form,'imageFile','images/gallery',id,'jpg');
      addRecord(state,'gallery',{id,title:f.title.trim(),artistId:f.artistId||'',category:f.category||'Studio',description:f.description.trim(),image:{src:f.imageUrl?.trim()||imageFile},createdAt:new Date().toISOString()});
      showToast(`Gallery image saved: ${f.title}`);
    } else if (type === 'news') {
      const id = uniqueId(state,'news',f.title);
      const imageFile = attachFile(form,'imageFile','images/news',id,'jpg');
      addRecord(state,'news',{id,title:f.title.trim(),category:f.category || 'label',publishDate:f.publishDate || '',excerpt:f.excerpt.trim(),body:f.body.trim(),image:{src:f.imageUrl?.trim() || imageFile},createdAt:new Date().toISOString()},f.category === 'label' ? 'labelAnnouncement' : '');
      showToast(`News story saved: ${f.title}`);
    } else if (type === 'home-slot') {
      const slotId = form.dataset.slot;
      const [itemType,itemId] = (f.itemRef || '').split(':');
      if (!itemType || !itemId || !getRecord(state,itemType,itemId)) throw new Error('Select an available record.');
      setSlot(state,slotId,{type:itemType,id:itemId});
      saveDraft(state);
      showToast('New section card updated. Previous selection moved to history.');
    } else if (type === 'trending') {
      const [itemType,itemId] = (f.itemRef || '').split(':');
      if (!itemType || !itemId || !getRecord(state,itemType,itemId)) throw new Error('Select an available catalog record.');
      const period = f.period || 'weekly';
      state.trending[period] ||= [];
      state.trending[period].push({type:itemType,id:itemId,rank:Math.max(1,Number(f.rank)||state.trending[period].length+1)});
      state.trending[period].sort((a,b)=>a.rank-b.rank);
      saveDraft(state);
      showToast(`Added to ${period} Trending.`);
    } else if (type === 'values') {
      const parsed = JSON.parse(f.json);
      if (!Array.isArray(parsed) || parsed.length !== 9) throw new Error('Values must be a JSON array containing exactly nine entries.');
      state.values = parsed;
      saveDraft(state);
      showToast('Nine values updated.');
    } else if (type === 'footer') {
      state.footer = JSON.parse(f.json);
      saveDraft(state);
      showToast('Footer details and social links updated.');
    } else if (type === 'site') {
      state.site = JSON.parse(f.json);
      saveDraft(state);
      showToast('Website copy and navigation updated.');
    } else {
      return false;
    }
    rerender();
    return true;
  } catch (error) {
    showToast(error.message || 'Unable to save this record. Check the entered information.');
    return true;
  }
}

function crc32(bytes) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}
function u16(view, offset, value) { view.setUint16(offset,value,true); }
function u32(view, offset, value) { view.setUint32(offset,value,true); }
function concat(parts) {
  const length = parts.reduce((sum,part)=>sum+part.length,0);
  const out = new Uint8Array(length); let offset = 0;
  for (const part of parts) { out.set(part,offset); offset += part.length; }
  return out;
}
async function makeZip(entries) {
  const encoder = new TextEncoder();
  const localParts = [], centralParts = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours()<<11)|(now.getMinutes()<<5)|(Math.floor(now.getSeconds()/2));
  const dosDate = (((now.getFullYear()-1980)&127)<<9)|((now.getMonth()+1)<<5)|now.getDate();
  for (const [name,value] of entries) {
    const nameBytes = encoder.encode(name);
    const data = value instanceof File ? new Uint8Array(await value.arrayBuffer()) : value instanceof Uint8Array ? value : encoder.encode(String(value));
    const crc = crc32(data);
    const localHeader = new Uint8Array(30); const lv = new DataView(localHeader.buffer);
    u32(lv,0,0x04034b50); u16(lv,4,20); u16(lv,6,0x0800); u16(lv,8,0); u16(lv,10,dosTime); u16(lv,12,dosDate); u32(lv,14,crc); u32(lv,18,data.length); u32(lv,22,data.length); u16(lv,26,nameBytes.length); u16(lv,28,0);
    localParts.push(localHeader,nameBytes,data);
    const central = new Uint8Array(46); const cv = new DataView(central.buffer);
    u32(cv,0,0x02014b50); u16(cv,4,20); u16(cv,6,20); u16(cv,8,0x0800); u16(cv,10,0); u16(cv,12,dosTime); u16(cv,14,dosDate); u32(cv,16,crc); u32(cv,20,data.length); u32(cv,24,data.length); u16(cv,28,nameBytes.length); u16(cv,30,0); u16(cv,32,0); u16(cv,34,0); u16(cv,36,0); u32(cv,38,0); u32(cv,42,offset);
    centralParts.push(central,nameBytes);
    offset += localHeader.length + nameBytes.length + data.length;
  }
  const local = concat(localParts); const central = concat(centralParts);
  const end = new Uint8Array(22); const ev = new DataView(end.buffer);
  u32(ev,0,0x06054b50); u16(ev,4,0); u16(ev,6,0); u16(ev,8,entries.length); u16(ev,10,entries.length); u32(ev,12,central.length); u32(ev,16,local.length); u16(ev,20,0);
  return new Blob([local,central,end],{type:'application/zip'});
}

export async function exportDataBundle(state) {
  const entries = [];
  const addJson = (path,value) => entries.push([path,JSON.stringify(value,null,2)+'\n']);
  addJson('data/site.json',state.site);
  addJson('data/footer.json',state.footer);
  addJson('data/values.json',state.values);
  addJson('data/manifest.json',state.manifest);
  addJson('data/home-feed.json',state.homeFeed);
  addJson('data/trending.json',state.trending);
  addJson('data/contact.json',state.contact);
  for (const [type,records] of Object.entries(state.records)) {
    for (const record of records || []) {
      const ref = (state.manifest[type] || []).find(item=>item.id===record.id);
      const path = ref?.file || record.file || `data/${folderFor[type] || type}/${record.id}.json`;
      const clean = {...record}; delete clean.file;
      addJson(path,clean);
    }
  }
  entries.push(['PUBLISHING.txt','QFMusic data export. Upload these paths into the root of your QFMusic repository, replacing JSON files with the same names. Keep media files in their assets paths. Then allow GitHub Pages to redeploy.\n']);
  for (const [path,file] of pendingAssets.entries()) entries.push([path,file]);
  const zip = await makeZip(entries);
  const url = URL.createObjectURL(zip);
  const link = document.createElement('a'); link.href = url; link.download = `QFMusic-data-${new Date().toISOString().slice(0,10)}.zip`;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),60000);
  showToast(`Data bundle ready: ${entries.length} files.`);
}

export async function handleAdminAction(event, state, rerender) {
  const button = event.target.closest('[data-admin-action]');
  if (!button) return false;
  const action = button.dataset.adminAction;
  if (action === 'export') {
    await exportDataBundle(state);
  } else if (action === 'refresh') {
    rerender(); showToast('Draft view refreshed.');
  } else if (action === 'reset') {
    const accepted = window.confirm('Clear all QFMusic drafts saved in this browser? This does not delete files already committed to GitHub.');
    if (accepted) { localStorage.removeItem('qfmusic-label-studio-draft-v1'); window.location.reload(); }
  }
  return true;
}
