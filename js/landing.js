const siteUrl = new URL('../data/site.json', import.meta.url);
const landing = document.getElementById('landing');

try {
  const response = await fetch(siteUrl, {cache:'no-store'});
  if (response.ok) {
    const site = await response.json();
    const config = site.landing || {};
    document.title = site.brand?.name || 'Quantum Frequency Records';
    document.getElementById('landingEyebrow').textContent = config.eyebrow || site.brand?.name || '';
    document.getElementById('landingHeadline').innerHTML = `${escapeText(config.headlineLine1 || 'Unleash Music’s')}<br><span>${escapeText(config.headlineLine2 || 'Raw Vibrational Energy')}</span>`;
    document.getElementById('landingDescription').textContent = config.description || '';
    document.getElementById('exploreLabel').textContent = config.exploreLabel || 'Explore';
    document.querySelector('.landing-footer span:first-child').textContent = config.leftFoot || '';
    document.querySelector('.landing-footer span:last-child').textContent = config.rightFoot || '';
    const words = config.words || [];
    document.getElementById('landingWords').innerHTML = words.map((word, index) => `${index ? '<i>·</i>' : ''}<span class="word${index===0?' active':''}">${escapeText(word)}</span>`).join('');
  }
} catch (error) { console.warn('Landing configuration could not be loaded.', error); }

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const wordEls = [...document.querySelectorAll('#landingWords .word')];
let currentWord = 0;
if (wordEls.length > 1) {
  window.setInterval(() => {
    wordEls[currentWord]?.classList.remove('active');
    currentWord = (currentWord + 1) % wordEls.length;
    wordEls[currentWord]?.classList.add('active');
  }, 1700);
}

document.getElementById('fxToggle').addEventListener('click', event => {
  const isOn = landing.classList.toggle('fx-off') === false;
  event.currentTarget.textContent = isOn ? 'FX ON' : 'FX OFF';
  event.currentTarget.setAttribute('aria-pressed', String(isOn));
});

const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let width = 0, height = 0, particles = [], frame = 0;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.7);
  width = window.innerWidth; height = window.innerHeight;
  canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const count = Math.min(70, Math.round(width/18));
  particles = Array.from({length:count}, () => ({x:Math.random()*width,y:Math.random()*height,r:Math.random()*1.4+.35,v:Math.random()*.22+.04,a:Math.random()*.45+.12}));
}
function draw() {
  if (landing.classList.contains('fx-off')) { frame = requestAnimationFrame(draw); return; }
  ctx.clearRect(0,0,width,height);
  for (const p of particles) {
    p.y -= p.v;
    if (p.y < -4) { p.y = height+4; p.x = Math.random()*width; }
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle = `rgba(130,240,226,${p.a})`; ctx.fill();
  }
  frame = requestAnimationFrame(draw);
}
resize();
window.addEventListener('resize', resize, {passive:true});
if (!reduced) draw(); else canvas.style.opacity = '.2';
