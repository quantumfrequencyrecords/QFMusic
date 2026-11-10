export const ROOT = new URL('../', import.meta.url);
export const DRAFT_KEY = 'qfmusic-label-studio-draft-v1';

export function esc(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

export function slugify(value = '') {
  return String(value).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || `item-${Date.now()}`;
}

export function asset(path = '') {
  if (!path) return '';
  const value = String(path).trim();
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return new URL(value.replace(/^\/+/, ''), ROOT).href;
}

export function safeExternalUrl(value = '') {
  try {
    const url = new URL(String(value));
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

async function jsonFile(path, fallback) {
  try {
    const response = await fetch(new URL(path, ROOT), {cache: 'no-store'});
    if (!response.ok) throw new Error(`${response.status} ${path}`);
    return await response.json();
  } catch (error) {
    console.warn('QFMusic data unavailable:', path, error);
    return structuredClone(fallback);
  }
}

export async function loadData() {
  const [site, footer, values, manifest, homeFeed, trending, contact] = await Promise.all([
    jsonFile('data/site.json', {}),
    jsonFile('data/footer.json', {}),
    jsonFile('data/values.json', []),
    jsonFile('data/manifest.json', {artists:[],albums:[],songs:[],videos:[],news:[],gallery:[]}),
    jsonFile('data/home-feed.json', {slots:{}}),
    jsonFile('data/trending.json', {weekly:[],monthly:[],yearly:[]}),
    jsonFile('data/contact.json', {})
  ]);
  const records = {};
  for (const type of Object.keys(manifest)) {
    const refs = Array.isArray(manifest[type]) ? manifest[type] : [];
    records[type] = await Promise.all(refs.map(async ref => {
      if (!ref?.file) return null;
      return jsonFile(ref.file, null);
    }));
    records[type] = records[type].filter(Boolean);
  }
  const state = {site, footer, values, manifest, homeFeed, trending, contact, records};
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (draft && draft.version === 1) {
      for (const key of ['site','footer','values','manifest','homeFeed','trending','contact','records']) {
        if (draft[key] !== undefined) state[key] = draft[key];
      }
    }
  } catch (error) { console.warn('Unable to read local QFMusic draft', error); }
  for (const type of Object.keys(state.manifest)) {
    state.records[type] ||= [];
    state.manifest[type] ||= [];
  }
  return state;
}

export function saveDraft(state) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({version:1, ...state}));
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export function getRecord(state, type, id) {
  return (state.records[type] || []).find(record => record.id === id) || null;
}

export function resolveRef(state, ref) {
  if (!ref) return null;
  const record = getRecord(state, ref.type, ref.id);
  if (!record) return null;
  return {type:ref.type, ...record};
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(undefined, {year:'numeric',month:'short',day:'numeric'}).format(date);
}

export function showToast(message) {
  const root = document.getElementById('toastRoot');
  if (!root) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  root.append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

export function pageHero(kicker, title, subtitle = '') {
  return `<header class="page-hero"><div class="page-hero-content"><span class="kicker">${esc(kicker)}</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div></header>`;
}

export function emptyState(message, adminLink = true) {
  return `<div class="empty-state"><span class="empty-orbit" aria-hidden="true"></span><p>${esc(message)}</p>${adminLink ? '<a class="btn small" href="#/admin">Open Label Studio</a>' : ''}</div>`;
}

export function recordImage(record) {
  return record?.artwork?.src || record?.image?.src || record?.image || record?.thumbnail?.src || record?.thumbnail || '';
}
