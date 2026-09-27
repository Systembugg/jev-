import type { ReactNode } from "react";

/** Inline SVG icon set — lucide-style, stroke 1.75, currentColor.
 *  Replaces every emoji/glyph in the UI. */

function I({
  s = 14,
  children,
  fill = false,
}: {
  s?: number;
  children: ReactNode;
  fill?: boolean;
}) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-0.15em", flex: "none" }}
    >
      {children}
    </svg>
  );
}

export const IconGear = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </I>
);

export const IconPlay = ({ s = 14 }: { s?: number }) => (
  <I s={s} fill>
    <path d="M7 4.5v15c0 .9 1 1.5 1.8 1l12-7.5c.7-.5.7-1.5 0-2L8.8 3.5c-.8-.5-1.8.1-1.8 1z" />
  </I>
);

export const IconPause = ({ s = 14 }: { s?: number }) => (
  <I s={s} fill>
    <rect x="6" y="4" width="4" height="16" rx="1.2" />
    <rect x="14" y="4" width="4" height="16" rx="1.2" />
  </I>
);

export const IconX = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M18 6 6 18M6 6l12 12" />
  </I>
);

export const IconCheck = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M20 6 9 17l-5-5" />
  </I>
);

export const IconMusic = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </I>
);

export const IconSearch = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </I>
);

export const IconHeart = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
  </I>
);

export const IconExternal = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </I>
);

export const IconBell = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </I>
);

export const IconClock = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </I>
);

export const IconList = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8" />
  </I>
);

export const IconCalc = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M8 6h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01M8 20h.01M12 20h.01M16 20h.01" />
  </I>
);

export const IconSplit = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" />
  </I>
);

export const IconConvert = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4" />
  </I>
);

export const IconPoll = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M7 15v-4M12 17V7M17 13V9" />
  </I>
);

export const IconRepeat = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </I>
);

export const IconCalendar = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </I>
);

export const IconNote = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4M10 13h6M10 17h6" />
  </I>
);

export const IconLink = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </I>
);

export const IconPlus = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M5 12h14M12 5v14" />
  </I>
);

export const IconTrash = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </I>
);

export const IconSparkles = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M9.94 15.5a2 2 0 0 0-1.44-1.43L2.37 12.49a.5.5 0 0 1 0-.96l6.13-1.58A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0l1.58 6.13a2 2 0 0 0 1.44 1.43l6.13 1.58a.5.5 0 0 1 0 .96l-6.13 1.58a2 2 0 0 0-1.44 1.43l-1.58 6.13a.5.5 0 0 1-.96 0z" />
  </I>
);

export const IconDownload = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5M12 15V3" />
  </I>
);

export const IconCopy = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </I>
);

export const IconBookmark = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </I>
);

export const IconSun = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </I>
);

export const IconCloud = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </I>
);

export const IconCloudRain = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9" />
    <path d="M16 14v6M8 15v5M12 16v6" />
  </I>
);

export const IconCloudSnow = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9" />
    <path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01" />
  </I>
);

export const IconStorm = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M6 16.3A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 .4 9" />
    <path d="m13 12-3 5h4l-3 5" />
  </I>
);

export const IconFog = ({ s = 14 }: { s?: number }) => (
  <I s={s}>
    <path d="M20 15.2A4.5 4.5 0 0 0 17.5 7h-1.8A7 7 0 1 0 4 13.9" />
    <path d="M5 18h14M8 21h8" />
  </I>
);
