---
name: instagram-scraper
description: >-
  Scrape public Instagram data without logging in and without a Meta developer
  account — profiles, posts, reels, stories, comments, hashtags, locations, and
  mentions. Use when the user wants to fetch an Instagram profile's follower
  count, bio, or post count, pull a profile's recent posts or reels, read the
  comments on a post, find posts under a hashtag or at a location, search for
  accounts by keyword, track a competitor's Instagram content, vet or discover
  influencers, export engagement metrics, monitor a brand's mentions, or build
  an Instagram data pipeline. Runs on Apify's Instagram Scraper; needs a free
  Apify account (API token), which this skill will help set up on first use.
keywords:
  - instagram
  - instagram-scraper
  - instagram-api
  - instagram-api-alternative
  - social-media
  - social-listening
  - hashtag-tracking
  - influencer-discovery
  - competitor-analysis
  - apify
---

# Instagram Scraper

Public Instagram data via Apify's [Instagram Scraper](https://apify.com/apify/instagram-scraper). No Instagram login, no cookies, no Meta app review.

| | |
|---|---|
| Actor | `apify/instagram-scraper` |
| Auth | `Authorization: Bearer $APIFY_TOKEN`, or a logged-in Apify CLI — see Setup |
| Price | from **$2.30 per 1,000 results**, billed by Apify |
| Free tier | $5/month credits ≈ **2,000+ results**, no credit card |

---

## Setup — do this before any data call

**Always run this preflight first.** Do not attempt a data call until it passes.

```bash
if [ -n "$APIFY_TOKEN" ]; then
  echo "AUTH_OK curl"
elif command -v apify >/dev/null 2>&1 && apify info >/dev/null 2>&1; then
  echo "AUTH_OK cli: apify"
elif { [ -f "$HOME/.apify/auth.json" ] || [ -f "$USERPROFILE/.apify/auth.json" ]; } \
     && npx --yes apify-cli@latest info >/dev/null 2>&1; then
  echo "AUTH_OK cli: npx --yes apify-cli@latest"
else
  echo "AUTH_MISSING"
fi
```

The checks are ordered cheapest-first. The `npx` fallback costs about four seconds,
so it only runs when an Apify config directory shows a previous login — a first-time
user reaches `AUTH_MISSING` instantly rather than waiting for a package download that
was never going to find a session.

**`$HOME` and `$USERPROFILE` are both checked on purpose.** On Windows they can point
to different places — sandboxes and some CI images remap `$HOME` while the Apify CLI
keeps writing to `$USERPROFILE\.apify`. Testing only `$HOME` there reports
`AUTH_MISSING` for a user who is perfectly well logged in, and the skill would then
send them to sign up for an account they already have. If you see `AUTH_MISSING` on a
machine you believe is authenticated, check both paths before trusting it.

**The two `AUTH_OK` modes are not interchangeable — the preflight tells you which
call form to use.**

- `AUTH_OK curl` — a token is in the environment. The HTTP calls in this skill work
  as written.
- `AUTH_OK cli: <prefix>` — the Apify CLI holds the session and **the token is not
  readable from disk**. `~/.apify/auth.json` carries account metadata only (username,
  plan, proxy groups — no `token` field); current CLI versions keep the token in the
  OS secrets backend. Do not try to extract one from that file: a bogus
  `Authorization: Bearer` header returns `401` and looks exactly like a revoked
  token. Use `apify call` instead, prefixed with whatever the preflight printed
  after `cli:` (`apify`, or `npx --yes apify-cli@latest` when the CLI is not on
  `PATH`).

### If the preflight prints `AUTH_OK cli`

Every payload in this skill still applies — write it to a file and hand it to
`apify call` instead of `curl`:

```bash
cat > /tmp/ig-input.json <<'EOF'
{"directUrls":["https://www.instagram.com/nasa/"],"resultsType":"details","resultsLimit":1}
EOF

apify call apify/instagram-scraper --input-file /tmp/ig-input.json --output-dataset --silent
```

- **Always pass the Actor id explicitly.** With no id, `apify call` runs the Actor
  defined by a local `.actor/actor.json` — inside an Actor repo that silently runs
  the wrong thing.
- **Prefer `--input-file` over inline `-i '{...}'`.** Inline JSON has to survive the
  shell, and PowerShell and `cmd.exe` mangle the quoting. A file never does.
  `--input-file -` reads stdin.
- **`--output-dataset` prints the dataset to stdout** — the same array
  `run-sync-get-dataset-items` returns, so every field in the Output section below is
  identical. `--silent` keeps run logs off stdout so the output parses as JSON.
- `apify call` waits for the run to finish, so the async polling pattern below is
  only needed on the `curl` path. Add `--timeout <seconds>` to bound a long job.
- The run is billed to whichever account the CLI is logged in as. `apify info` prints
  it — worth showing the user if they may have more than one.

### If the preflight prints `AUTH_MISSING`

Open the Apify sign-up page in the user's browser, then ask for the token. Run this
exactly as-is — it picks the right command per platform and degrades to printing the
URL when there is no browser (CI, SSH, containers):

```bash
URL="https://console.apify.com/sign-up?fpr=z8j1nz"
# xdg-open is checked before open: on some Linux distros `open` is openvt, not a browser.
if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
elif command -v open >/dev/null 2>&1; then open "$URL"
elif command -v powershell.exe >/dev/null 2>&1; then powershell.exe -NoProfile -Command "Start-Process '$URL'"
elif command -v cmd.exe >/dev/null 2>&1; then cmd.exe /c start "" "$URL"
else echo "Open this URL in a browser: $URL"
fi
```

Then tell the user what is happening — but **do not wait for a reply**:

> I've opened Apify's sign-up page in your browser. Instagram data comes through
> Apify, which is free to start — $5 of credits every month, no credit card, enough
> for around 2,000 results.
>
> Sign up there (or log in, if you already have an account). I'm opening the
> authorisation step now too — approve it and this machine stays connected, so you
> won't have to do any of this again.
>
> _The sign-up link is a referral link._

Immediately run the login. **Do not ask the user to confirm they've signed up first** —
this command opens Apify's authorisation page, which offers sign-up itself, and then
blocks until the user finishes. The command *is* the wait, so there is nothing to
detect and no round trip to burn:

```bash
timeout 300 npx --yes apify-cli@latest login -m console
```

- **`-m console` is required.** Bare `apify login` first prompts for a login method
  and will hang forever on stdin the agent cannot answer. `-m console` goes straight
  to the browser flow.
- **`timeout 300`** bounds it, so an abandoned sign-up doesn't hang the session. Exit
  code `124` means it timed out — the user walked away, so ask whether they still want
  to continue rather than silently retrying.
- On success it prints *"Success: You are logged in to Apify as `<username>`. Your
  token is stored in your OS keyring."* From then on the preflight resolves to
  `AUTH_OK cli` in **every future session** — no token to paste, store, or leak into
  a transcript.

**Then re-run the preflight. That is how you know whether it worked** — not the
message, and not an assumption that the browser step went fine:

| Preflight now says | Meaning | Do |
|---|---|---|
| `AUTH_OK cli: <prefix>` | Logged in and persisted | Continue with the request |
| `AUTH_MISSING` | Login did not complete | Say so plainly and ask whether to retry — **do not loop** |

The preflight's CLI branch is just `apify info`, which exits `0` when a session
exists and non-zero when it doesn't. It is the same check that produced
`AUTH_MISSING` a moment earlier, so re-running it is a genuine confirmation rather
than a restatement of what you already believed.

Two failure modes worth naming, because both look like success from the outside:
the user closes the authorisation tab without approving (exit `124` at the timeout),
and the user signs up but never reaches the approval step. In both the sign-up may
well have succeeded while **this machine is still not connected** — which is exactly
why the preflight, not the sign-up, is the thing to trust.

**Keep the sign-up tab and the login in that order.** The sign-up page is where the
referral is recorded; the authorisation step afterwards is just this machine
connecting to whichever account now exists. Opening them the other way round loses
the attribution.

### Never ask the user for their token

**Do not request, accept, or handle an Apify API token in the conversation.** The
browser login above exists precisely so the secret never reaches the agent: the CLI
receives it directly from Apify and writes it to the OS keyring, and this skill only
ever reads the *result* of that (`apify info`'s exit code), never the value.

If the user offers a token unprompted, **decline it and point them at one of the two
safe routes below.** Anything pasted into a session is a live credential sitting in a
transcript, in scrollback, and in any log that captures the conversation.

**Headless environments** — CI, SSH, containers, anywhere the OAuth round trip cannot
open a browser. The user sets the credential themselves, out of band, *before*
starting the agent:

```bash
# the user runs this in their own shell / CI secret store — not via the agent
export APIFY_TOKEN="…"
```

The preflight then reports `AUTH_OK curl` and everything works, with the value never
passing through the conversation.

**Or the CLI's own prompt**, which reads the token from stdin rather than the
conversation:

```bash
npx --yes apify-cli@latest login -m manual
```

Avoid `login -t <token>`. Passing a secret as a command-line argument exposes it in
the process list to every other process on the machine, and in shell history. It also
**clears the stored session before validating**, so a typo or a stale value logs the
user out of a session that was working.

When a token does legitimately exist in the environment, always reference it as
`$APIFY_TOKEN` and let the shell expand it — as every example in this skill does.
Never substitute the literal value into a command, a log line, or a message.

---

## Fetching data

One call, synchronous, returns the items directly. Good for anything that finishes
inside ~60 s. **This is the `AUTH_OK curl` form** — under `AUTH_OK cli`, put the
same `-d` payload in a file and run it through `apify call` as shown above.

```bash
curl -s -X POST \
  "https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?timeout=120" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -H "User-Agent: instagram-scraper-skill" \
  -d '{"directUrls":["https://www.instagram.com/nasa/"],"resultsType":"details","resultsLimit":1}'
```

The `User-Agent` header is only so runs originating from this skill can be told apart
in logs. It carries no personal data and can be removed.

### Choosing `resultsType`

| Value | Returns |
|---|---|
| `details` | Profile metadata: followers, following, bio, post count, profile picture. **Cheapest — 1 result per profile.** |
| `posts` | A feed of posts |
| `reels` | Reels only |
| `stories` | Currently-live stories |
| `comments` | Comments on a post URL |
| `mentions` | Posts mentioning an account |

Pick `details` whenever the user only needs profile numbers. Using `posts` for that
question costs up to 100× more for no benefit.

### Input reference

| Field | Type | Default | Notes |
|---|---|---|---|
| `directUrls` | array | — | Profile, post, reel, hashtag, location or audio URLs — see URL handling below |
| `resultsType` | string | `posts` | See table above |
| `resultsLimit` | integer | `100` | Per URL. **Drives cost — always set it.** |
| `onlyPostsNewerThan` | string | — | `YYYY-MM-DD`, ISO, or `1 day` / `2 months`. UTC |
| `search` | string | — | Keyword, instead of `directUrls` |
| `searchType` | string | `hashtag` | `hashtag`, `profile`, `place`, `user` |
| `searchLimit` | integer | `10` | Max items discovered per search |
| `addParentData` | boolean | `false` | Stamps each item with the query that produced it |

**Four more fields work but are not in the published input schema.** They are
documented in the Actor's README and verified working — use them freely:

| Field | Type | Applies to | Notes |
|---|---|---|---|
| `addProfileStatistics` | boolean | `details` | Adds a `statistics` object (~60 fields) — `account_type` (1 Personal, 2 Business, 3 Creator), `media_count`, `total_clips_count`, `category`, `city_name`, contact fields. Works on private profiles too |
| `skipPinnedPosts` | boolean | `posts` | Exclude pinned posts |
| `isNewestComments` | boolean | `comments` | Newest-first ordering. **Paid plans only** — free plans get default order |
| `includeNestedComments` | boolean | `comments` | Include replies. **Paid plans only.** Each reply is a separate result, so totals exceed `resultsLimit` |

### URL handling

`directUrls` is more forgiving than it looks. All of these are accepted:

- **Profile IDs work anywhere a profile URL does** — a bare numeric ID is fine
- `instagram.com/_u/natgeo/profilecard/` — `_u` and `profilecard` are stripped
- `instagram.com/stories/username/` — reduced to the username
- `instagram.com/share/BAC6cDeb_-` — resolved to the canonical post URL
- `instagram.com/explore/locations/7538318/` — the ID alone is valid, no slug needed

**Not supported:** numeric post IDs in URL form (`instagram.com/p/3369450800358839406/`)
for `posts`, `reels`, `mentions` or `details`. Use the shortCode form instead. This
format *does* work for `comments`.

**The URL type drives the output schema.** Hashtag, location, audio and explore URLs
return their own metadata even when paired with another content mode — so a location
URL with `resultsType: "details"` yields place details, not profile details.

### Constraints that will bite you

- **One content type per run.** There is no way to get posts *and* comments in a
  single call. Run twice.
- **URLs beat search.** `directUrls` and `search` cannot be combined; if both are
  present the URLs win and the search is ignored.
- **Hashtags go in as plaintext** — `travel`, never `#travel`.
- **Multiple search terms are comma-separated** in one string: `"travel, fitness"`.
- **Free plans get about one page of comments per post (~15).** Paid plans have no
  such cap. Do not report this as an error — say what it is.

### Common tasks

Every capability the Actor exposes, with the payload for each. Swap the `-d '...'`
into the curl above.

**Profile stats for several accounts** — cheapest possible call:

```bash
-d '{"directUrls":["https://www.instagram.com/nasa/","https://www.instagram.com/natgeo/"],"resultsType":"details","resultsLimit":1}'
```

**A profile's recent posts, last 30 days:**

```bash
-d '{"directUrls":["https://www.instagram.com/nasa/"],"resultsType":"posts","resultsLimit":30,"onlyPostsNewerThan":"1 month"}'
```

**A profile's reels:**

```bash
-d '{"directUrls":["https://www.instagram.com/nasa/"],"resultsType":"reels","resultsLimit":20}'
```

**A profile's current stories** — only returns anything while stories are live, and
often needs a paid plan:

```bash
-d '{"directUrls":["https://www.instagram.com/nasa/"],"resultsType":"stories","resultsLimit":20}'
```

**Posts that mention an account** — brand monitoring:

```bash
-d '{"directUrls":["https://www.instagram.com/nasa/"],"resultsType":"mentions","resultsLimit":50}'
```

**Comments on one post:**

```bash
-d '{"directUrls":["https://www.instagram.com/p/SHORTCODE/"],"resultsType":"comments","resultsLimit":50}'
```

**Posts under a hashtag:**

```bash
-d '{"search":"wildlifephotography","searchType":"hashtag","searchLimit":50,"resultsType":"posts","resultsLimit":50}'
```

**Find accounts by keyword** — `user` returns account records:

```bash
-d '{"search":"climate photographer","searchType":"user","searchLimit":20,"resultsType":"details"}'
```

**Search profiles by name** — `profile` matches on profile pages:

```bash
-d '{"search":"national geographic","searchType":"profile","searchLimit":20,"resultsType":"details"}'
```

**Posts from a place:**

```bash
-d '{"search":"Yosemite National Park","searchType":"place","searchLimit":20,"resultsType":"posts","resultsLimit":50}'
```

**Posts from a specific location or hashtag URL** — pass the URL directly instead of
searching:

```bash
-d '{"directUrls":["https://www.instagram.com/explore/tags/wildlife/"],"resultsType":"posts","resultsLimit":50}'
```

**Tracking which query produced which post** — when scraping several hashtags or
profiles in one run, `addParentData` stamps each item with its source so the results
can be grouped afterwards:

```bash
-d '{"search":"wildlife","searchType":"hashtag","searchLimit":30,"resultsType":"posts","resultsLimit":30,"addParentData":true}'
```

**Deep profile statistics** — account type, post and reel counts, category, city,
public contact fields. Also works on private profiles:

```bash
-d '{"directUrls":["https://www.instagram.com/nasa/"],"resultsType":"details","resultsLimit":1,"addProfileStatistics":true}'
```

**Recent posts, excluding pinned ones:**

```bash
-d '{"directUrls":["https://www.instagram.com/nasa/"],"resultsType":"posts","resultsLimit":30,"skipPinnedPosts":true}'
```

**Only the pinned posts** — invert the same pair:

```bash
-d '{"directUrls":["https://www.instagram.com/nasa/"],"resultsType":"posts","skipPinnedPosts":false,"onlyPostsNewerThan":"0 minutes"}'
```

**Newest comments first, including replies** — both paid-plan only:

```bash
-d '{"directUrls":["https://www.instagram.com/p/SHORTCODE/"],"resultsType":"comments","resultsLimit":50,"isNewestComments":true,"includeNestedComments":true}'
```

## Output

**Each content type produces a different schema, and they cannot be combined in one
run.** Samples below are abridged to the useful fields; the URL type you pass can
override the shape (a location URL returns place data even under another mode).

**Post / carousel** (`resultsType: "posts"`) — 23 fields:

```json
{
  "inputUrl": "https://www.instagram.com/p/DZxvMgyH8yR/",
  "id": "3923124318436838545",
  "type": "Image",
  "shortCode": "DZxvMgyH8yR",
  "caption": "In the Democratic Republic of the Congo…",
  "hashtags": [], "mentions": ["carstenpeter"],
  "url": "https://www.instagram.com/p/DZxvMgyH8yR/",
  "likesCount": 34512, "commentsCount": 210,
  "timestamp": "2026-06-22T17:24:20.000Z",
  "displayUrl": "https://…", "images": [], "childPosts": [],
  "dimensionsWidth": 1080, "dimensionsHeight": 1350, "alt": "…",
  "ownerUsername": "natgeo", "ownerFullName": "National Geographic", "ownerId": "787132",
  "firstComment": "…", "latestComments": [], "isCommentsDisabled": false
}
```

**Reel** (`resultsType: "reels"`) — 31 fields. Posts plus video:

```json
{
  "…all post fields…": "…",
  "videoUrl": "https://…", "videoDuration": 28.28,
  "videoViewCount": 120433, "videoPlayCount": 98221,
  "audioUrl": "https://…", "musicInfo": {}, "productType": "clips",
  "isPinned": false
}
```

**Comment** (`resultsType: "comments"`):

```json
{
  "postUrl": "https://www.instagram.com/p/DZ5T2XPllXv/",
  "commentUrl": "https://www.instagram.com/p/DZ5T2XPllXv/c/18093536360613690",
  "id": "18093536360613690",
  "text": "We love you NASA 💙🌎🌊",
  "ownerUsername": "mavideniz5521__", "ownerProfilePicUrl": "https://…",
  "timestamp": "2026-06-22T17:24:20.000Z",
  "likesCount": 4, "repliesCount": null, "replies": null,
  "owner": { "username": "…" }
}
```

`repliesCount` and `replies` populate only with `includeNestedComments: true` (paid).

**Profile details** (`resultsType: "details"`) — 22 fields. Verified live:

```json
{
  "inputUrl": "https://www.instagram.com/nasa/",
  "id": "528817151", "username": "nasa", "url": "https://www.instagram.com/nasa/",
  "fullName": "NASA", "biography": "Making the seemingly impossible, possible. ✨",
  "externalUrl": "https://www.nasa.gov/", "externalUrls": [],
  "followersCount": 104423132, "followsCount": 92, "postsCount": 4888,
  "verified": true, "private": false,
  "isBusinessAccount": true, "businessCategoryName": "Government Agencies",
  "joinedRecently": false, "fbid": "17841401474538262",
  "profilePicUrl": "https://…", "profilePicUrlHD": "https://…",
  "highlightReelCount": 5, "igtvVideoCount": 171,
  "latestPosts": [], "relatedProfiles": []
}
```

**`details` already includes `latestPosts` (up to 12) and `relatedProfiles` (up to 48)
at no extra cost.** If the user wants a profile's numbers *and* a look at recent posts,
one `details` call covers both — a second `posts` call is usually waste.

With `addProfileStatistics: true` a `statistics` object is appended (~60 fields):
`account_type` (1 Personal, 2 Business, 3 Creator), `media_count`, `total_clips_count`,
`category`, `city_name`, `address_street`, `zip`, `bio_links`, `mutual_followers_count`.

**Mentions** (`resultsType: "mentions"`) — 21 fields, post-shaped, plus `taggedUsers`,
`music`, `carouselImages`, `carouselImageCount`.

**Place details** (location URL) — 16 fields:

```json
{
  "inputUrl": "https://www.instagram.com/explore/locations/7538318/",
  "name": "Copenhagen, Denmark", "location_id": "7538318", "slug": "copenhagen",
  "lat": 55.6761, "lng": 12.5683,
  "location_address": "…", "location_city": "…", "location_zip": "…",
  "phone": "…", "category": "…", "price_range": "…",
  "media_count": 1284322, "ig_business": "…", "posts": [], "hours": {}
}
```

**Hashtag details** (hashtag URL) — 15 fields, including SEO-style extras:
`name`, `postsCount`, `url`, `id`, `posts`, `postsPerDay`, `difficulty`, `related`,
`frequent`, `average`, `rare`, `relatedFrequent`, `relatedAverage`, `relatedRare`.

**Search results** carry `searchTerm` and `searchSource` so you can tell which query
produced each row:

- **Hashtag search** — 6 fields: `searchTerm`, `searchSource`, `name`, `postsCount`, `url`, `id`
- **Place search** — 17 fields: place-details shape plus `searchTerm` / `searchSource`
- **Profile search** — 13 fields: post-shaped, with `ownerUsername`, `ownerFullName`, `taggedUsers`

### Images are URLs, not files

Every image and video field is a link to Instagram's CDN. Nothing is downloaded, and
**those links are signed and expire after a few hours.** If the user needs the media
itself, fetch it promptly on their own bandwidth.

### Runs longer than a minute

For large jobs, start async and poll rather than holding a sync connection:

```bash
RUN=$(curl -s -X POST "https://api.apify.com/v2/acts/apify~instagram-scraper/runs" \
  -H "Authorization: Bearer $APIFY_TOKEN" -H "Content-Type: application/json" \
  -d '{"directUrls":["https://www.instagram.com/nasa/"],"resultsType":"posts","resultsLimit":1000}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

curl -s "https://api.apify.com/v2/actor-runs/$RUN?waitForFinish=60" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])"

curl -s "https://api.apify.com/v2/actor-runs/$RUN/dataset/items?format=json" \
  -H "Authorization: Bearer $APIFY_TOKEN"
```

Poll until `status` is `SUCCEEDED`, then fetch items. `FAILED` or `ABORTED` means stop
and report — do not silently retry a job the user is paying for.

---

## Errors

| Status | Meaning | What to do |
|---|---|---|
| `401` | Token missing, wrong, or revoked | Re-run the Setup preflight above. Do not retry the call. A `401` on the curl path while the CLI is logged in means the token was invented — switch to `apify call`. |
| `402` / `insufficient credit` | Monthly credits exhausted | Tell the user; they can wait for the monthly reset or upgrade at https://apify.com/pricing?fpr=z8j1nz (referral link). Do not retry. |
| `404` | Bad Actor ID or run ID | Check the URL uses `apify~instagram-scraper` with a tilde, not a slash. |
| `408` / timeout | Sync call exceeded the limit | Switch to the async pattern above. |
| Empty array | Private, deleted, or genuinely empty | Report honestly. **Do not** assume it is a billing problem. |
| `apify call` exits non-zero | The run failed, or the CLI session is gone | The CLI prints the reason and a run URL — read it rather than retrying. If `apify info` also fails, the session expired: re-run Setup. |

An empty result is a real answer. Private accounts, deleted posts and quiet hashtags
all legitimately return nothing.

### Data quirks to report accurately, not treat as bugs

- **`likesCount: -1`** means the creator hid the like count. Instagram does not expose
  it. Say "hidden by the creator" — never report it as zero or as an error.
- **Private profiles** generally return nothing. One exception: if a private account
  is tagged as a **collaborator** on a post and any co-author is public, Instagram
  treats that post as public and it will appear in results.
- **Metrics can differ from what the app shows.** Instagram serves slightly different
  counts to logged-out visitors, and large counts move constantly. Small discrepancies
  are expected.
- **Result counts are not guaranteed.** There is no fixed cap; you get what Instagram
  exposes publicly. To sanity-check what *should* be available, open the URL in an
  incognito window.

---

## Cost discipline

The user is paying per result. Treat that as real money.

- **Always set `resultsLimit`.** The default is 100 per URL; a five-URL call with the
  default costs 500 results when the user probably wanted 25.
- **Use `resultsType: "details"`** for any question about followers, bio or post
  counts. It returns one result per profile.
- **Start small.** For anything open-ended, run a bounded first pass, show the user
  what came back, and confirm before scaling up.
- **Say what a large run will cost** before starting it. At $2.30/1,000, a 5,000-result
  job is about $11.50.
- Never loop the same call after a `401` or `402` — each attempt can be billable and
  none of them will succeed.
