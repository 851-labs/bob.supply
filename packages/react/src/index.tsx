import type { ImgHTMLAttributes, ReactElement } from "react";
import { bobAvatarUrl, type BobAvatarFormat } from "@bob-supply/sdk";

export type BobAvatarProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  readonly seed: string;
  readonly format?: BobAvatarFormat;
};

export function BobAvatar({
  seed,
  format,
  alt = `${seed} avatar`,
  ...props
}: BobAvatarProps): ReactElement {
  return <img {...props} src={bobAvatarUrl(seed, { format })} alt={alt} />;
}
