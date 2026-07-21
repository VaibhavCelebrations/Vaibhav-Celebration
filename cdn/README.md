# Cloudflare R2 / CDN — Vaibhav Celebrations

## Object key prefixes (logical folders)

R2 has no real folders — use key prefixes:

```
themes/{theme-slug}/cover-{id}.jpg
themes/{theme-slug}/gallery-{id}.jpg
themes/{theme-slug}/sample-{id}.jpg
events/{event-id}/highlight-{id}.mp4
gallery/{tag-or-general}/file-{id}.jpg
blog/{post-slug}/cover-{id}.jpg
popups/{popup-id}/banner-{id}.jpg
invoices/{year}/{invoice-number}.pdf
users/{user-id}/avatar-{id}.png
media/general/file-{id}.*
```

Deleting a theme's assets: `DELETE /api/v1/admin/media/prefix` with `{ "prefix": "themes/royal-mandap/" }`.

## Cache-Control

All uploads set:
`Cache-Control: public, max-age=31536000, immutable`

Keys are unique (random suffix), so long-cache is safe.

## Upload flows

### A) Recommended — Presigned PUT (browser → R2 directly)

1. `POST /api/v1/admin/media/presign`
2. `PUT` file bytes to `uploadUrl` with returned headers
3. `POST /api/v1/admin/media/complete` to register `MediaAsset`
4. Frontend displays `https://cdn.vaibhavcelebrations.in/{cdnKey}` — **never** proxy through the API

### B) Multipart through backend

`POST /api/v1/admin/media/upload` (field `file` + `kind`, `scope`, `role`, `altText`)

Used for local/dev when R2 is unset, or small admin uploads.

## Env

```
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=vaibhav-celebrations-media
CLOUDFLARE_R2_PUBLIC_BASE_URL=https://cdn.vaibhavcelebrations.in
```

Without these, the backend falls back to local `uploads/` and still returns public URLs for development.
