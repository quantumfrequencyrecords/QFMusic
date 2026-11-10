# QFMusic Data Workflow

Use the Label Studio page (`site.html#/admin`) for normal content additions. Use this directory for the conventions that keep the catalog consistent.

## Record rules

- Keep slugs lowercase, unique, and hyphenated.
- One artist, album, song, video or news story per JSON file.
- Update `data/manifest.json` when adding/removing a record.
- Do not put lyrics, Suno prompts or song metadata in HTML or JavaScript.
- Prefer repository-relative media paths such as `assets/audio/<slug>.mp3`.
- Never commit credentials, API tokens or private customer data.

## Song record fields

A song JSON can contain `id`, `title`, `artistId`, `albumId`, `releaseType`, `releaseDate`, `genre`, `mood`, `description`, `stylePrompt`, `lyrics`, `audio`, `artwork`, `credits`, `suno` and `links`. Keep the exact Suno style prompt and lyrics in the record so each release has an auditable source record.

## New section history

`data/home-feed.json` has five slots. Each slot has a `current` reference and a `history` array. When a new current item is selected in Label Studio, the previous current item is moved into history automatically. Do not manually delete history if the older cards should remain discoverable.
