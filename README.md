# bob.supply

[bob.supply](https://bob.supply) is a deterministic avatar service backed by a
generated image batch. Give it a seed, get back a stable PNG avatar.

```text
https://bob.supply/alice?format=png
```

This repository contains the website, Cloudflare Worker runtime, image generation
pipeline, and public npm packages.

## Packages

Use the framework-agnostic SDK to generate avatar URLs:

```sh
npm install @bob-supply/sdk
```

```ts
import { bobAvatarUrl } from "@bob-supply/sdk";

bobAvatarUrl("alice");
// https://bob.supply/alice?format=png
```

Use the React package to render an image component:

```sh
npm install @bob-supply/react
```

```tsx
import { BobAvatar } from "@bob-supply/react";

<BobAvatar seed="alice" alt="Alice avatar" width={64} height={64} />;
```

## Repository Layout

- `apps/www`: TanStack Start app deployed as a Cloudflare Worker.
- `apps/generator`: resumable image generation and R2 upload tooling.
- `packages/sdk`: public URL helper package.
- `packages/react`: public React component package.
- `packages/core`: shared internal manifest, animal, and prompt utilities.

## Development

Install dependencies:

```sh
bun install
```

Common commands:

```sh
bun run fmt
bun run lint
bun run test
bun run build
```

Run the Worker-backed web app locally:

```sh
bun run --cwd apps/www dev
```

`apps/www` uses Wrangler dev with the generated Nitro Worker config and the remote
`BOB_SUPPLY_BUCKET` R2 binding. Local web development requires `wrangler login`
and access to the `bob-supply` Cloudflare account.

For Vite-only frontend work without the real Worker/R2 runtime:

```sh
bun run --cwd apps/www dev:vite
```

## Avatar Runtime

The public avatar API is:

```text
GET /{seed}?format=png
```

`format` defaults to `png`; other formats are reserved for future use. The seed
is hashed to pick an image from the active availability manifest, then the Worker
serves the selected object from the `bob-supply` R2 bucket through the
`BOB_SUPPLY_BUCKET` binding.

Runtime failure behavior:

- Missing R2 binding returns `503`.
- Missing selected R2 object returns `502`.
- Unsupported formats return `400`.
