/**
 * Built-in sample SVG drawings for quick testing.
 */

export const SAMPLE_STAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100">
  <polygon points="0,-45 10,-15 42,-15 18,5 27,38 0,18 -27,38 -18,5 -42,-15 -10,-15"
    fill="none" stroke="black" stroke-width="2" />
</svg>`;

export const SAMPLE_CAT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -55 100 110">
  <!-- Head -->
  <circle cx="0" cy="-10" r="25" fill="none" stroke="black" stroke-width="2"/>
  <!-- Left ear -->
  <polyline points="-20,-28 -28,-48 -10,-35" fill="none" stroke="black" stroke-width="2"/>
  <!-- Right ear -->
  <polyline points="20,-28 28,-48 10,-35" fill="none" stroke="black" stroke-width="2"/>
  <!-- Left eye -->
  <ellipse cx="-10" cy="-15" rx="4" ry="5" fill="none" stroke="black" stroke-width="1.5"/>
  <!-- Right eye -->
  <ellipse cx="10" cy="-15" rx="4" ry="5" fill="none" stroke="black" stroke-width="1.5"/>
  <!-- Nose -->
  <polygon points="0,-5 -3,-1 3,-1" fill="none" stroke="black" stroke-width="1.5"/>
  <!-- Mouth -->
  <path d="M -5,2 Q 0,7 5,2" fill="none" stroke="black" stroke-width="1.5"/>
  <!-- Whiskers left -->
  <line x1="-15" y1="-3" x2="-38" y2="-8" stroke="black" stroke-width="1"/>
  <line x1="-15" y1="0" x2="-38" y2="2" stroke="black" stroke-width="1"/>
  <line x1="-15" y1="3" x2="-38" y2="12" stroke="black" stroke-width="1"/>
  <!-- Whiskers right -->
  <line x1="15" y1="-3" x2="38" y2="-8" stroke="black" stroke-width="1"/>
  <line x1="15" y1="0" x2="38" y2="2" stroke="black" stroke-width="1"/>
  <line x1="15" y1="3" x2="38" y2="12" stroke="black" stroke-width="1"/>
  <!-- Body -->
  <path d="M -15,14 Q -20,40 -10,50 Q 0,55 10,50 Q 20,40 15,14" fill="none" stroke="black" stroke-width="2"/>
  <!-- Tail -->
  <path d="M 15,40 Q 30,35 35,20 Q 38,10 32,5" fill="none" stroke="black" stroke-width="2"/>
</svg>`;

export const SAMPLE_FLOWER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100">
  <!-- Centre -->
  <circle cx="0" cy="0" r="8" fill="none" stroke="black" stroke-width="2"/>
  <!-- Petals -->
  <ellipse cx="0" cy="-22" rx="9" ry="16" fill="none" stroke="black" stroke-width="1.5"/>
  <ellipse cx="20.9" cy="-6.8" rx="9" ry="16" fill="none" stroke="black" stroke-width="1.5"
    transform="rotate(72 20.9 -6.8)"/>
  <ellipse cx="12.9" cy="17.8" rx="9" ry="16" fill="none" stroke="black" stroke-width="1.5"
    transform="rotate(144 12.9 17.8)"/>
  <ellipse cx="-12.9" cy="17.8" rx="9" ry="16" fill="none" stroke="black" stroke-width="1.5"
    transform="rotate(216 -12.9 17.8)"/>
  <ellipse cx="-20.9" cy="-6.8" rx="9" ry="16" fill="none" stroke="black" stroke-width="1.5"
    transform="rotate(288 -20.9 -6.8)"/>
  <!-- Stem -->
  <path d="M 0,8 Q 2,25 0,45" fill="none" stroke="black" stroke-width="2"/>
  <!-- Leaf left -->
  <path d="M 0,30 Q -15,25 -20,18" fill="none" stroke="black" stroke-width="1.5"/>
  <path d="M 0,30 Q -18,32 -20,18" fill="none" stroke="black" stroke-width="1.5"/>
  <!-- Leaf right -->
  <path d="M 0,38 Q 15,33 20,26" fill="none" stroke="black" stroke-width="1.5"/>
  <path d="M 0,38 Q 18,40 20,26" fill="none" stroke="black" stroke-width="1.5"/>
</svg>`;
