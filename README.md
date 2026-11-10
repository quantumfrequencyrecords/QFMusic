# Quantum Frequency Records — QFMusic revamp

A data-first Next.js App Router website for Quantum Frequency Records. The project is configured for static export to GitHub Pages and includes a reusable artist system, normalized band-member profiles, song-first release intake, Label Studio, content validation, and a direct-to-fan monetization structure.

## What changed

- **Artist cards** are driven by JSON and display a banner background, artist logo (or wordmark fallback), genre, and an **Explore** link to `/artists/[slug]`.
- **Band members are first-class records.** Every artist folder contains `members.json`; each entry points to `content/members/<member-id>.json`. The member profile stores name, nickname, hometown city/state, default instrument, additional instruments, main photo path, biography, credits, and social links. The artist roster stores the specific role and instruments for that particular artist.
- **Song-first content model.** Add one file at `content/songs/<song-slug>.json`. It references `artistId` and optional `albumId`; the music catalog, artist discography, album track listing, and song pages derive their data automatically. Do not manually update a song index.
- **Label Studio** includes three workflows: create a new artist with a new band lineup; update an existing artist lineup (add/link member profiles); and intake a song release. Song intake accepts JSON, audio, and artwork files and exports a ZIP with the correct JSON/media paths.
- **All editable site copy and sections** live in `content/site/*.json`; page introductions, navigation, footer, homepage sections, artist-section labels, contact reasons, legal pages, SEO, monetization, player, poll, and Social Hub behavior have dedicated JSON settings.
- **Monetization** supports links and metadata for direct digital sales, vinyl/CD/cassette, merch, stems, sync licensing, shows, fan support, newsletters, and affiliate offers. Payment processing is not embedded in the static site.
- **Discovery features** include global search across artists, member profiles, albums, songs, videos, news, and shows; video filtering by artist/category/search/date; and a filterable Social Hub timeline.
- **Validation and automation** check JSON syntax and record relationships before deployment. A CLI release importer is also provided.

## Technology

- Next.js 16.4.6 App Router + React 19.3.1 + TypeScript
- Tailwind CSS + custom cinematic theme
- Framer Motion dependency available for future transitions
- Lucide React icons
- Static export for GitHub Pages

## Install and run locally

```bash
npm install
npm run validate
npm run typecheck
npm run dev
```

Open the local URL printed by Next.js. For local development, leave `NEXT_PUBLIC_BASE_PATH` empty.

## GitHub Pages deployment

The included workflow deploys the static `out/` directory to GitHub Pages.

1. Upload/merge this project into the **QFMusic** repository.
2. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the build/deploy source.
3. Ensure the deployment branch is `main` (or edit `.github/workflows/deploy.yml` if your default branch differs).
4. Push to `main` or run the workflow manually.

The workflow sets `NEXT_PUBLIC_BASE_PATH=/QFMusic` and the QFMusic Pages URL. If the repository is renamed, update those values in `.github/workflows/deploy.yml` and `content/site/seo.json`.

## Add a new artist

Use **Label Studio → New Artist & Members**. Add the artist details, add new member records or link existing member profiles, and export the ZIP. Extract/merge its `content/` files into the repository. Add the banner/logo/member images under `public/media/` using the paths entered in the Studio form.

The resulting artist folder looks like:

```text
content/artists/new-artist/
  artist.json
  members.json
content/members/member-one.json
content/members/member-two.json
public/media/artists/new-artist/banner.jpg
public/media/artists/new-artist/logo.png
public/media/members/member-one/portrait.jpg
```

`members.json` is the artist-specific lineup and references canonical member profiles by ID. This prevents duplicate biographies and photo paths when a musician belongs to more than one project.

## Add or update an artist lineup

Open **Label Studio → Update Artist Lineup**, choose one of the existing roster artists, then add new member profiles and/or link existing profiles. The ZIP contains the updated `content/artists/<artist-id>/members.json` plus one new `content/members/<member-id>.json` for each newly created person. Existing members remain in the lineup package.

## Add a new song (the routine workflow)

1. Download the final audio file from the creation/production workflow.
2. Open **Label Studio → New Song Release**.
3. Select the artist, enter the song metadata, credits, rights checks, Suno source details, and external listening/purchase links.
4. Optionally upload the audio file and artwork; Studio places them in the correct `public/media/` paths inside the ZIP.
5. Export the song package, merge the ZIP contents into the repository, then run:

```bash
npm run validate
```

6. Commit and push. The site automatically adds the song to Music, the artist's release list, and its album track listing (if `albumId` is set).

To import a prepared JSON document directly:

```bash
npm run import:release -- path/to/song-intake.json
npm run validate
```

The importer writes one file under `content/songs/`. It does not create or update a manual index.

## Data directories

| Directory | One JSON file represents |
|---|---|
| `content/site/` | Global navigation, home sections, page copy, footer, contact reasons, legal copy, SEO, player, monetization, poll, and social hub settings |
| `content/artists/<artist-id>/artist.json` | Artist identity, bio, hometown, genres, signing date, art paths, links, store links |
| `content/artists/<artist-id>/members.json` | Artist-specific lineup referencing member profile IDs |
| `content/members/<member-id>.json` | Reusable band-member profile |
| `content/songs/<song-id>.json` | Main release record and source metadata |
| `content/albums/<album-id>.json` | Album/EP data; songs attach by `albumId` |
| `content/videos/` | Music videos, lyric videos, live and behind-the-scenes video records |
| `content/news/` | Label and artist news |
| `content/shows/` | Live dates, venues, cities, ticket links |
| `content/gallery/` | Photo records and categories |
| `content/products/` | Store items, formats, variants, prices, and purchase URLs |

## Important limitations to understand

- GitHub Pages is static hosting. The Label Studio page is a **public client-side authoring/export utility, not a secure private admin portal**, and it **cannot commit JSON files back to GitHub**. It exports a ZIP to be committed, which avoids exposing a GitHub token in a public page. A future authenticated admin backend or GitHub App can automate commits, but that requires a server-side component and private credentials.
- Contact form submissions currently prepare an email in the visitor's email application. Connect a form service or backend before treating it as a production inbox.
- Poll voting is intentionally disabled until a real provider/database is configured; a static GitHub Pages site cannot aggregate votes across visitors by itself.
- Product pages link to third-party checkouts. This repo does not store payment-card data or process transactions.
- The reference website and QFMusic repository source were not available to inspect through the supplied source links in this session. The included UI follows the project documents' described dark, minimal, cinematic design direction. To guarantee pixel-level matching to the live QFRMusic reference and avoid replacing any current QFMusic functionality, merge against the actual repository and preserve its existing licensed assets and any unlisted components.
- Initial artist records include the nine names listed in the project roadmap and mark them as signed roster entries. The provided documents do not specify their genres, biographies, member names, photos, or banner/logo files, so those fields are intentionally empty rather than invented.

## Before launch

- Add/verify artist genres, biographies, hometowns, member lineups, artwork paths, and official links.
- Review every song's credits, split sheets, sample clearances, Suno plan/download record, copyright status, and commercial-use status before publishing or selling it.
- Add approved privacy, terms, and copyright language.
- Configure a real form destination, mailing-list provider, checkout links, and poll provider as desired.
- Preserve your existing assets when merging this project into the current repo.
