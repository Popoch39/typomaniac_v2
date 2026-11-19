import type { CSSProperties } from "react";

/** An inline style that also sets CSS custom properties, typed so that a `--name` key is accepted. */
export type CustomPropertyStyle = CSSProperties & Record<`--${string}`, string>;
