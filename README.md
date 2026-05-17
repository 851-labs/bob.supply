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
bun run upload:generated
```

`bun run plan` writes `apps/generator/generated/batch-001/manifest.json` without generating images.

`bun run generate` is resumable. Existing image files are skipped unless `--force` is passed.
It also writes `apps/generator/generated/batch-001/available.json`, which contains only images that exist on disk.

## Generation

`bun run generate` prompts the Codex CLI once per manifest entry and saves each PNG under
`apps/generator/generated/batch-001/{animal-slug}/{variant}.png`.

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

Generated PNGs are tracked with Git LFS under `apps/generator/generated/**/*.png`. Do not commit
`.DS_Store`.

To upload the active batch to R2:

```bash
bun run upload:generated
```

The upload command writes files from `apps/generator/generated/batch-001` to the `bob-supply` bucket
with keys like `batch-001/{animal-slug}/{variant}.png`. PNGs are uploaded as `image/png`; JSON
manifests are uploaded as `application/json; charset=utf-8`.

## PFP API

The web app serves deterministic avatar images from seeds:

```text
GET /{slug}?format=png
```

The root slug must use only letters, numbers, `_`, or `-`. The exact slug is hashed as raw UTF-8, so
`Alice` and `alice` may map to different avatars. `format` defaults to `png`; other formats are
reserved for later and currently return `400`.

The web runtime serves `/{slug}?format=png` from the Cloudflare R2 binding named
`BOB_SUPPLY_BUCKET`. Missing bucket bindings return `503`. If an avatar selected from
`available.json` is absent in R2, the seed API returns `502`.

## Tooling Packages

`@bob-supply/sdk` exports framework-agnostic URL helpers:

```ts
import { bobAvatarUrl } from "@bob-supply/sdk";

bobAvatarUrl("alice");
```

`@bob-supply/react` exports a small image component:

```tsx
import { BobAvatar } from "@bob-supply/react";

<BobAvatar seed="alice" alt="Alice avatar" />;
```

## Web Dev

`apps/www` defaults to Worker dev:

```bash
bun run --cwd apps/www dev
```

This builds the app and runs Wrangler against `.output/server/wrangler.json` with the remote
`BOB_SUPPLY_BUCKET` binding, so local API and gallery image requests exercise the same R2 bucket as
production. Local dev requires `wrangler login` and access to the `bob-supply` Cloudflare account.
