import {asset, esc, showToast} from './core.js';

let audioElement;
let videoElement;
let videoFrame;
let videoPanel;
let dock;

function isYoutube(value = '') {
  const text = String(value);
  return /youtu\.be\/|youtube\.com\/(watch|embed|shorts)/i.test(text);
}

function youtubeEmbed(value = '', id = '') {
  if (id) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  try {
    const url = new URL(value);
    let videoId = url.searchParams.get('v');
    if (!videoId && url.hostname.includes('youtu.be')) videoId = url.pathname.slice(1);
    if (!videoId && url.pathname.includes('/embed/')) videoId = url.pathname.split('/embed/')[1];
    if (!videoId && url.pathname.includes('/shorts/')) videoId = url.pathname.split('/shorts/')[1];
    return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId.split(/[?&/]/)[0])}?autoplay=1&rel=0` : '';
  } catch { return ''; }
}

export function initPlayer(root) {
  root.innerHTML = `
    <aside class="player-dock" id="playerDock" hidden aria-label="Persistent music player">
      <img class="player-cover" id="playerCover" src="assets/qfr-mark.svg" alt="">
      <div class="player-meta"><span class="tiny" id="playerStatus">NOW PLAYING</span><strong id="playerTitle">—</strong><span id="playerArtist">—</span></div>
      <audio id="qfrAudio" controls preload="metadata"></audio>
      <button class="player-close" type="button" data-player-action="hide-audio" aria-label="Hide player">×</button>
    </aside>
    <aside class="video-player-panel" id="videoPlayerPanel" hidden aria-label="Persistent video player">
      <div class="video-panel-top"><span id="videoPlayerTitle">Now Playing</span><button class="player-close" type="button" data-player-action="hide-video" aria-label="Hide video">×</button></div>
      <video id="qfrVideo" controls playsinline preload="metadata" hidden></video>
      <iframe id="qfrVideoFrame" title="QFR video player" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen hidden></iframe>
    </aside>`;
  dock = root.querySelector('#playerDock');
  audioElement = root.querySelector('#qfrAudio');
  videoElement = root.querySelector('#qfrVideo');
  videoFrame = root.querySelector('#qfrVideoFrame');
  videoPanel = root.querySelector('#videoPlayerPanel');

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-player-action]');
    if (!button) return;
    if (button.dataset.playerAction === 'hide-audio') dock.hidden = true;
    if (button.dataset.playerAction === 'hide-video') videoPanel.hidden = true;
  });
  audioElement.addEventListener('error', () => showToast('This audio file could not be loaded. Check the song JSON audio path.'));
  videoElement.addEventListener('error', () => showToast('This video file could not be loaded. Check the video JSON media path.'));
}

export function playSong(song, artist) {
  const source = song?.audio?.src || song?.audioUrl || '';
  if (!source) {
    showToast('This song is in the catalog, but an audio file has not been attached yet.');
    return;
  }
  const url = asset(source);
  if (videoElement) videoElement.pause();
  if (videoFrame) videoFrame.src = 'about:blank';
  if (videoPanel) videoPanel.hidden = true;
  if (audioElement.src !== url) audioElement.src = url;
  const title = song.title || 'Untitled song';
  const artistName = artist?.name || song.artistName || 'Quantum Frequency Records';
  document.getElementById('playerTitle').textContent = title;
  document.getElementById('playerArtist').textContent = artistName;
  document.getElementById('playerStatus').textContent = 'NOW PLAYING';
  const cover = song.artwork?.src || artist?.image?.src || '';
  document.getElementById('playerCover').src = cover ? asset(cover) : 'assets/qfr-mark.svg';
  dock.hidden = false;
  audioElement.play().catch(() => showToast('Press play in the player to begin listening.'));
}

export function playVideo(video) {
  const source = video?.videoSrc || video?.url || video?.youtubeUrl || '';
  const youtube = video?.youtubeId || isYoutube(source);
  if (!source && !video?.youtubeId) {
    showToast('This video is listed, but its video URL or file has not been added yet.');
    return;
  }
  audioElement?.pause();
  videoPanel.hidden = false;
  document.getElementById('videoPlayerTitle').textContent = video?.title || 'QFR Video';
  if (youtube) {
    videoElement.pause();
    videoElement.removeAttribute('src');
    videoElement.hidden = true;
    videoFrame.hidden = false;
    videoFrame.src = youtubeEmbed(source, video?.youtubeId || '');
  } else {
    videoFrame.src = 'about:blank';
    videoFrame.hidden = true;
    videoElement.hidden = false;
    const url = asset(source);
    if (videoElement.src !== url) videoElement.src = url;
    videoElement.play().catch(() => showToast('Press play in the video player to begin watching.'));
  }
}
