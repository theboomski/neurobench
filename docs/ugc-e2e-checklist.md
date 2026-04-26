# UGC End-to-End Checklist

Use this checklist after applying `supabase/migrations/20260426_ugc_core.sql`.

## 1) Auth + Verification Gate

- [ ] Open `/ugc/create` while logged out -> login/signup modal appears immediately.
- [ ] Sign up with email/password and do **not** verify -> creation is blocked with verify-email message.
- [ ] Login with Google OAuth -> creation flow is available immediately.

## 2) Brackets Creation Flow

- [ ] Go to `/ugc/create`.
- [ ] Step 1: choose `Brackets`.
- [ ] Step 2: enter title and upload cover image.
- [ ] Step 3: upload at least 2 images (drag/drop or file picker), confirm item names auto-filled from filenames.
- [ ] Step 4: set language, visibility, category, optional NSFW, publish.
- [ ] Confirm redirect to `/ugc/brackets/[slug]`.

## 3) Balance Creation Flow

- [ ] Go to `/ugc/create`.
- [ ] Step 1: choose `Balance`.
- [ ] Step 2: enter title (cover optional).
- [ ] Step 3: choose round count and fill all option pairs.
- [ ] Step 4: set language/visibility/category/NSFW and publish.
- [ ] Confirm redirect to `/ugc/balance/[slug]`.

## 4) Browse + Play

- [ ] Open `/ugc` and confirm newly published public games appear.
- [ ] Open `/` and confirm UGC section appears with category/language/NSFW filters.
- [ ] Play a brackets game to final winner and open results page.
- [ ] Play a balance game to final winner.

## 5) History + My Games

- [ ] As logged-in user, open `/ugc/history` and confirm new play entries.
- [ ] Open `/ugc/my-games`, confirm both tabs (Brackets/Balance) work.
- [ ] Delete one game from `/ugc/my-games`, verify it disappears.

## 6) Visibility Rules

- [ ] `public` game: visible in feed and playable.
- [ ] `private` game: not listed in feed, accessible via direct URL.
- [ ] `closed` game: play page shows closed message and blocks new play submissions.
