import type { CSSProperties } from "react";

const paths = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  menus: (
    <>
      <path d="M8 3v7m-3-7v5a3 3 0 0 0 6 0V3M8 11v10M19 21V3c-4 2-4 9 0 9" />
    </>
  ),
  vision: (
    <>
      <path d="M8 5l2-2h4l2 2h4a1 1 0 0 1 1 1v13H3V6a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  log: (
    <>
      <path d="M9 4H5v17h14V4h-4M9 3h6v4H9zM8 12h8m-8 4h5" />
    </>
  ),
  data: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  filter: (
    <>
      <path d="M3 6h18M6 12h12m-8 6h4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v.5" />
    </>
  ),
  play: <path d="m9 5 11 7-11 7z" />,
  leaf: (
    <>
      <path d="M20 3C8 2 2 8 5 15s15 5 15-12ZM4 21 15 10" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
    </>
  ),
} as const;
export type IconName = keyof typeof paths;
export default function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
