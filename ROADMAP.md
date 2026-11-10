# QFMusic Development Roadmap

## Phase 1 — Foundation (included)
- Cinematic landing page and single-page website shell.
- Responsive dark/teal visual system.
- Data-driven navigation, homepage copy, values and footer.
- Empty catalog manifest for artists, albums, songs, videos, news and gallery.
- Persistent site-wide audio and video players.
- Label Studio forms for adding catalog records.
- Per-record JSON structure and ZIP export workflow.
- Five New-section cards with retained history.
- News archive and manually curated weekly/monthly/yearly Trending lists.

## Phase 2 — Catalog enrichment
- Add artist profile details, members, galleries and social links.
- Add album pages, track listings, credits and lyrics.
- Add Suno metadata capture and release checklists.
- Add bulk import/export and record validation.

## Phase 3 — Publishing and audience features
- Configure a secure hosted contact endpoint.
- Add mailing list integration and privacy-compliant analytics.
- Add SEO metadata, sitemap and Open Graph images for every record.
- Add optional Spotify and Apple Music outbound links.

## Phase 4 — Secure administration
- Add a private publishing workflow or authenticated CMS for committing JSON changes.
- Add role-based access, audit trail and media processing. The current static Label Studio is intentionally not an authenticated private admin area.
- Add release approvals, asset completeness checks and catalog reports.

## Architecture guardrails
- One reusable page template per content type.
- One JSON file per artist, album, song, video and story.
- Manifest references are the index; page components do not hardcode catalog items.
- Never place API secrets, private tokens or payment credentials in a GitHub Pages repository.
- Do not replace the persistent player during route changes.
