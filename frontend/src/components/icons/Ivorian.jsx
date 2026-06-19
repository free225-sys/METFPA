import React from "react";

// Line-art coat of arms of Côte d'Ivoire: shield with elephant head,
// rising sun above, flanked by palm trees. Single-weight strokes, no fill.
export function CoatOfArms({ size = 40, stroke = "#C5A028", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}
      stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {/* rising sun */}
      <circle cx="32" cy="9" r="3" />
      <path d="M32 2v-0.5M25 5l-0.4-0.4M39 5l0.4-0.4M22 10h-1M42 10h1" />
      {/* shield */}
      <path d="M16 16h32v16c0 11-8 18-16 23-8-5-16-12-16-23V16z" />
      {/* elephant head inside shield */}
      <path d="M26 26c-2 0-3.5 1.6-3.5 3.8 0 2 1 3.4 2.6 4.4M38 26c2 0 3.5 1.6 3.5 3.8 0 2-1 3.4-2.6 4.4" />
      <path d="M27 27c0-2.2 2.2-3.8 5-3.8s5 1.6 5 3.8c0 3-1.4 5.4-2.6 7-0.7 1-1.4 2.2-1.4 3.4M32 33c-1 1.8-1.6 3.6-1.6 5" />
      <path d="M30.4 38l-0.6 4M33.6 38l0.6 4" />
      {/* palm trees flanking */}
      <path d="M11 22c0 6 0 12 0 18M11 22c-2-1.5-4-1.5-5.5-0.5M11 22c2-1.5 4-1.5 5.5-0.5M11 22c-1.5-2-1.5-3.5-0.5-5M11 22c1.5-2 1.5-3.5 0.5-5" />
      <path d="M53 22c0 6 0 12 0 18M53 22c-2-1.5-4-1.5-5.5-0.5M53 22c2-1.5 4-1.5 5.5-0.5M53 22c-1.5-2-1.5-3.5-0.5-5M53 22c1.5-2 1.5-3.5 0.5-5" />
    </svg>
  );
}

export function ElephantMark({ size = 22, stroke = "#C5A028", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}
      stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 20c-2 0-3.5-1.6-3.5-4 0-3 2-5 5-5.5M26 20c2 0 3.5-1.6 3.5-4 0-3-2-5-5-5.5" />
      <path d="M8 22c-1-2-1.5-4.5-1.5-6.5C6.5 10 10.5 7 16 7s9.5 3 9.5 8.5c0 2-0.5 4.5-1.5 6.5" />
      <path d="M11 22v3M21 22v3M16 22c-1 2-1.5 3.5-1.5 5" />
      <path d="M16 22c1-2.5 1.5-4.5 1.5-6.5" />
    </svg>
  );
}
