import type { CSSProperties } from "react";
const paths = {
  chat: "M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-3 3V11.5a10 10 0 0 1 20 0ZM7 10h.01M12 10h.01M17 10h.01",
  arrow: "m9 5-7 7 7 7M2 12h20",
  send: "m22 2-7 20-4-9L2 9 22 2ZM22 2 11 13",
  shield: "M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6",
  like: "M7 10v11H3V10h4Zm0 0 4-8c3 0 3 3 2 7h6a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H7",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  settings: "M4 7h16M4 17h16M9 4v6M15 14v6",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12M6 18 18 6",
  refresh:
    "M20 7v5h-5M4 17v-5h5M5.2 7a8 8 0 0 1 13-2L20 8M4 16l1.8 3a8 8 0 0 0 13-2",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  clock: "M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  external: "M14 3h7v7M21 3 10 14M10 3H3v18h18v-7",
  logout: "M9 3H3v18h6M10 12h12m-5-5 5 5-5 5",
  chevron: "m9 5 7 7-7 7",
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: keyof typeof paths;
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
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
