# QFMusic — Quantum Frequency Records

A clean, mobile-first, data-driven rebuild of the Quantum Frequency Records website. It is designed for GitHub Pages and for a workflow where new Suno songs, artists, albums, videos and news are added continually.

## Important: repository creation

The connected GitHub integration available during this build can access existing repositories and write files, but it does not expose GitHub's **Create repository** operation. The `QFMusic` repository did not exist when checked. Create an empty public repository named **QFMusic** under `quantumfrequencyrecords`, then upload the contents of this folder to the repository root. Do not upload the outer `QFMusic` folder as a nested folder.

## Pages

- `/` — animated landing page; Explore opens the main website.
- `site.html#/home` — main homepage.
- `site.html#/artists` — artist directory; each artist detail page is generated from its JSON record.
- `site.html#/music` — albums and singles catalog; each song has its own JSON file.
- `site.html#/videos` — video library.
- `site.html#/news` — news archive.
- `site.html#/about` — label story and nine values.
- `site.html#/gallery` — image gallery.
- `site.html#/contact` — contact / inquiry page.
- `site.html#/store` — coming-soon store page.
- `site.html#/admin` — Label Studio data manager.

The website uses a single-page navigation shell after Explore. This is intentional: the global audio and video elements remain mounted while visitors move between pages, so playback does not stop during internal navigation.

## Data model

- `data/site.json` — landing, homepage, navigation and page copy.
- `data/footer.json` — footer/label details and all social links.
- `data/values.json` — the nine QFR values.
- `data/manifest.json` — index of every artist, album, song, video, news item and gallery record.
- `data/artists/<artist-slug>.json` — one file per artist.
- `data/albums/<album-slug>.json` — one file per album.
- `data/songs/<song-slug>.json` — **one JSON file per song**, including Suno metadata, prompt, lyrics, artwork and audio path.
- `data/videos/<video-slug>.json` — one file per video.
- `data/news/<story-slug>.json` — one file per news story.
- `data/home-feed.json` — current item and retained history for all five New-section cards.
- `data/trending.json` — manual weekly, monthly and yearly trending lists.
- `data/contact.json` — inquiry options and optional form endpoint.

The catalog starts empty by design. The nine values and label/site copy are preloaded; no artists, songs, albums, videos or news records are seeded.

## Label Studio

Open `site.html#/admin`. Add artists, songs, albums, videos, gallery images and news stories. You can also import an existing song JSON file, choose which items appear in each of the five New cards, curate weekly/monthly/yearly Trending lists, edit the nine values, and update site/footer JSON.

Changes made in the browser are saved as local drafts in that browser. Select **Export data bundle** to download a ZIP containing updated JSON files and any media files attached in the current Label Studio session. Upload/replace those files in GitHub to publish them. GitHub Pages is static hosting; a browser-only page cannot safely commit to GitHub without a separate authenticated publishing service. The admin tool therefore never asks you to paste a GitHub token into the public site. **Important:** the Label Studio route is not password-protected in this static starter. It does not publish changes on its own, but anyone who opens it can create drafts in their own browser. Use a private CMS or hosting-level access control before treating it as a confidential admin area.

## Suno song workflow

1. Finish a song in Suno and download its final audio file and artwork.
2. Open Label Studio → Add Song.
3. Select the artist, enter title/release details, paste the Suno style prompt and lyrics, and fill in the available Suno model/ID/duration/date metadata.
4. Attach the final audio and cover art if available.
5. Save, then export the data bundle. The ZIP includes `data/songs/<song-slug>.json`, its manifest reference and uploaded media assets.
6. Add the ZIP contents to the repository. The music page, artist page, player and Newest Released Single card read the same data.

## Persistent players

Audio and video player elements live outside the route-rendered page content. Internal navigation changes only the page view, not the player DOM. Audio files can be MP3, WAV, M4A or browser-supported formats. Video records can use a local MP4/WebM path or a YouTube URL.

## Publish with GitHub Pages

1. In the `QFMusic` repository open **Settings → Pages**.
2. Under Build and deployment select **Deploy from a branch**.
3. Select branch `main` and folder `/ (root)`.
4. Save. The site will publish at `https://quantumfrequencyrecords.github.io/QFMusic/`.

## Preview locally

Run a local web server from this folder (fetching JSON files directly from `file://` is not supported by browsers):

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Security and limitations

- Do not store passwords, tokens, API keys or private credentials in JSON or client-side JavaScript.
- GitHub Pages cannot run server-side email, authentication, payment processing or a private database.
- Contact delivery stays disabled until a trusted hosted form endpoint is configured in `data/contact.json`.
- Video embeds and external links should be checked before publishing.
- The Label Studio local draft is browser-specific until its exported ZIP is committed to the repository.
