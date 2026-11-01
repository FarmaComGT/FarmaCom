import React from 'react';

// FarmaCom's navigation symbols: a shared 24-unit grid, open corners and 1.5-unit strokes.
// They describe the pharmacy's objects rather than shopping or generic app categories.
const dibujos = {
  overview: <><path d="M4 18V6h16M4 18h16V9" /><path d="M8 14V9m4 5v-3m4 3V7M8 18v2m8-2v2" /></>,
  inventory: <><path d="M4 4v16m16-16v16M4 11h16M4 19h16M7 11V6h4v5m3 0V4h3v7M7 19v-5h3v5m3 0v-4h4v4" /></>,
  dispensing: <><path d="M3 13h18M5 13v7h14v-7M8 17h8M6 10V5h5v5m3 0V3h4v7" /><path d="M8 7h1m7-2v3m-1-1h2" /></>,
  cash: <><path d="M4 10h16v10H4zM6 10V4h12v6M8 7h8M8 15h8m-5 3h2" /></>,
  customer: <><path d="M5 4h14v16H5M3 8h4m-4 4h4m-4 4h4" /><circle cx="12" cy="9" r="2" /><path d="M9 16v-1a3 3 0 0 1 6 0v1" /></>,
  laboratory: <><path d="M4 16h16M5 16v4m14-4v4M7 4v8a2 2 0 0 0 4 0V4m-5 0h6m-5 6h4m4-6v8a2 2 0 0 0 4 0V4m-5 0h6m-5 4h4" /></>,
  reports: <><path d="M5 4h14v16H5M8 8h8M8 12h3m-3 4h3m3-4h2m-2 4h2" /></>,
  history: <><path d="M6 4h12v16l-3-2-3 2-3-2-3 2V4M9 8h6M9 11h3" /><path d="M15 12v3l2 1" /></>,
  locations: <><path d="M4 7h6v6H4zM14 13h6v7h-6M10 10h7v3M7 13v4h7M7 4v3m10 13v1" /></>,
  team: <><path d="M4 5h7v14H4M14 5h6v14h-6M7 9h1m-1 4h1m9-4h1m-1 4h1" /></>,
  help: <><path d="M4 5h7a4 4 0 0 1 4 4v11a5 5 0 0 0-4-2H4V5M15 7h5v11h-5M7 9h4m-4 4h4" /></>,
  exit: <><path d="M10 4H5v16h5M10 12h11m-4-4 4 4-4 4" /></>,
  collapse: <><path d="M4 5h16v14H4zM9 5v14m7-10-3 3 3 3" /></>,
  expand: <><path d="M4 5h16v14H4zM9 5v14m4-10 3 3-3 3" /></>,
  close: <path d="m7 7 10 10M7 17 17 7" />,
  loading: <path d="M12 4a8 8 0 1 1-8 8" />,
  chevron: <path d="m9 5 7 7-7 7" />,
};

export default function NavigationIcon({ name, size = 20, className = '' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={`navigation-icon ${className}`}>{dibujos[name] || dibujos.overview}</svg>;
}

