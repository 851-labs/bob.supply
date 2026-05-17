# Bob Avatars

Whimsical animal PFP generation pipeline.

The initial pipeline creates a review batch of 100 animals with 4 variants each. Every generation uses the exact prompt template:

```text
create a pfp for a {animal} in cartoon bobs burgers style with solid background
```

## Commands

```bash
bun install
bun run test
bun run plan
bun run generate
```

`bun run plan` writes `generated/batch-001/manifest.json` without generating images.

`bun run generate` is resumable. Existing image files are skipped unless `--force` is passed.
It also writes `generated/batch-001/available.json`, which contains only images that exist on disk.

## Generation

`bun run generate` prompts the Codex CLI once per manifest entry and saves each PNG under `generated/batch-001/{animal-slug}/{variant}.png`.

For a small smoke run:

```bash
bun run generate -- --limit 1 --force
```

Generation runs with `--concurrency 4` by default. To slow it down or speed it up:

```bash
bun run generate -- --concurrency 2
```

For local pipeline tests without image generation:

```bash
bun run generate -- --provider mock --limit 1 --force
```

To refresh only the availability manifest after adding or uploading images:

```bash
bun run availability
```

## PFP API

The web app serves deterministic avatar images from seeds:

```text
GET /pfp/{seed}?format=png
```

The exact decoded seed is hashed as raw UTF-8, so `Alice` and `alice` may map to different
avatars. `format` defaults to `png`; other formats are reserved for later and currently return
`400`. In local dev, the API reads from `generated/batch-001`. In Cloudflare, `apps/www` expects an
R2 binding named `BOB_SUPPLY_BUCKET` and reads keys like `batch-001/{animal-slug}/{variant}.png`.
