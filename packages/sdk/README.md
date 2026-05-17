# @bob-supply/sdk

Framework-agnostic helpers for [bob.supply](https://bob.supply) avatar URLs.

## Install

```sh
npm install @bob-supply/sdk
```

## Usage

```ts
import { bobAvatarUrl } from "@bob-supply/sdk";

const url = bobAvatarUrl("alice");
// https://bob.supply/alice?format=png
```

Seeds are URL-encoded before they are added to the URL:

```ts
bobAvatarUrl("alice bob");
// https://bob.supply/alice%20bob?format=png
```

## API

### `bobAvatarUrl(seed, options?)`

Returns a deterministic [bob.supply](https://bob.supply) avatar URL for `seed`.

```ts
function bobAvatarUrl(seed: string, options?: BobAvatarUrlOptions): string;
```

Options:

```ts
type BobAvatarUrlOptions = {
  readonly format?: "png";
};
```

An empty or whitespace-only seed throws a `TypeError`.

### `DefaultBobAvatarBaseUrl`

The production avatar service origin:

```ts
const DefaultBobAvatarBaseUrl = "https://bob.supply";
```
