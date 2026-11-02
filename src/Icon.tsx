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
  menu: (
    <>
      <path d="M8 3v7m-3-7v5a3 3 0 0 0 6 0V3M8 11v10M19 21V3c-4 2-4 9 0 9" />
    </>
  ),
  chart: <path d="M4 20h16M7 16v-5m5 5V6m5 10v-8" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10h16M8 3v4m8-4v4" />
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
  tray: (
    <>
      <path d="M6.5 5h11a2 2 0 0 1 1.9 1.5l2.3 10.5a2.5 2.5 0 0 1-2.4 3H4.7a2.5 2.5 0 0 1-2.4-3L4.6 6.5A2 2 0 0 1 6.5 5z" />
      <path d="M8 8.5h8a1 1 0 0 1 1 .8l1.3 6a1 1 0 0 1-1 1.2H6.7a1 1 0 0 1-1-1.2l1.3-6a1 1 0 0 1 1-.8z" />
    </>
  ),
  data: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
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
  bell: (
    <>
      <path d="M6 16V10a6 6 0 0 1 12 0v6l2 2H4zM10 21h4" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17v.5" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5v16h5M10 12h10m-4-4 4 4-4 4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </>
  ),
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
  close: <path d="M18 6 6 18M6 6l12 12" />,
  enter: (
    <>
      <path d="M9 10 4 15l5 5" />
      <path d="M20 4v7a4 4 0 0 1-4 4H4" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z" />
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
