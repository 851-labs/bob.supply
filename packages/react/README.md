# @bob-supply/react

React image component for [bob.supply](https://bob.supply) avatars.

## Install

```sh
npm install @bob-supply/react
```

## Usage

```tsx
import { BobAvatar } from "@bob-supply/react";

export function ProfileAvatar() {
  return <BobAvatar seed="alice" width={64} height={64} />;
}
```

`BobAvatar` renders a normal `<img>` element and accepts standard image props except `src`, which is generated from the `seed`.

```tsx
<BobAvatar seed="alice bob" alt="Alice Bob avatar" className="avatar" loading="lazy" />
```

## API

### `<BobAvatar />`

```ts
type BobAvatarProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  readonly seed: string;
  readonly format?: "png";
};
```

Props:

- `seed`: Required deterministic avatar seed.
- `format`: Optional image format. Currently only `png` is supported.
- `alt`: Optional alt text. Defaults to `${seed} avatar`.

The generated image URL uses `https://bob.supply/{seed}?format=png`.
