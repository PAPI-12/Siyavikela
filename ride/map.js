const minor = [
  "M-30 57 Q149 89 233 38 T465 14 L660 49",
  "M-20 102 Q151 129 241 83 T478 43 L680 91",
  "M-15 147 Q154 170 250 126 T487 91 L665 130",
  "M-20 204 Q141 216 255 177 T513 137 L668 185",
  "M-30 250 Q146 269 278 215 T532 181 L675 235",
  "M-30 296 Q168 322 288 264 T535 230 L680 282",
  "M-30 344 Q162 374 318 303 T555 280 L678 330",
  "M-36 395 Q169 427 337 353 T564 329 L673 377",
  "M-36 442 Q173 468 343 396 T564 380 L680 428",
  "M7 -40 Q35 124 54 248 T96 484",
  "M55 -30 Q77 100 98 253 T149 465",
  "M100 -20 Q130 125 145 245 T194 470",
  "M151 -20 Q180 107 193 243 T253 480",
  "M200 -20 Q219 97 244 232 T300 462",
  "M250 -25 Q267 102 297 216 T357 454",
  "M301 -28 Q316 84 351 198 T413 449",
  "M348 -32 Q368 85 400 177 T462 456",
  "M400 -27 Q414 72 450 163 T506 471",
  "M448 -22 Q462 63 502 152 T560 477",
  "M501 -29 Q513 64 557 169 T619 486",
  "M554 -25 Q578 104 618 209 T670 469",
  "M612 -23 Q636 127 679 208",
];
const major = [
  "M-24 364 C113 369 204 344 273 306 S400 212 487 202 S613 230 690 250",
  "M-15 128 C110 153 171 162 258 112 S428 19 513 31 S615 54 677 70",
  "M60 -25 C95 67 108 122 116 190 S132 315 183 454",
  "M360 -30 C394 61 408 125 451 189 S534 292 550 455",
  "M-30 227 C68 223 156 210 241 191 S391 122 494 122 S602 150 686 148",
];
const baseLines = (paths, color, width) =>
  `<g stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round">${paths.map((d) => `<path d="${d}"/>`).join("")}</g>`;
const blocks = Array.from({ length: 52 }, (_, i) => {
  const x = (i * 73 + 22) % 650,
    y = (i * 47 + 10) % 423;
  return `<rect x="${x}" y="${y}" width="${13 + (i % 11)}" height="${5 + (i % 8)}" rx="2" fill="${i % 3 ? "#dedcd4" : "#e8e4da"}" opacity=".63" transform="rotate(${i % 2 ? -13 : 13} ${x} ${y})"/>`;
}).join("");
const pin = (x, y, fill, inside) =>
  `<g transform="translate(${x} ${y})" filter="url(#pinshadow)"><path d="M0 1c-2-3-13-11-13-20a13 13 0 1 1 26 0C13-10 2-2 0 1Z" fill="${fill}" stroke="white" stroke-width="2"/><g transform="translate(-6 -25)" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inside}</g></g>`;
const home = '<path d="m1 6 5-4 5 4M2.5 5v6h7V5M5 11V8h2v3"/>';
const cross = '<path d="M6 2v8M2 6h8" stroke-width="2"/>';
const points = [
  [171, 314],
  [239, 299],
  [296, 274],
  [353, 232],
  [400, 201],
  [443, 186],
  [478, 170],
  [472, 146],
  [463, 127],
];
const route =
  "M171 314 L232 301 Q269 294 296 274 L387 209 Q408 194 443 186 L471 177 Q481 173 478 162 L463 127";
export function map({
  active = false,
  progress = 0,
  reverse = false,
  site = "sandton",
  selection = false,
  zoom = 1,
} = {}) {
  const point = points[reverse ? 8 - progress : progress] || points[0];
  return `<div class="map-canvas" style="--map-zoom:${zoom}" aria-label="Simulated route map" role="img">
<svg viewBox="0 0 650 422" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" class="map-art" aria-hidden="true">
<defs><filter id="pinshadow" x="-50%" width="200%" y="-40%" height="190%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#2c2225" flood-opacity=".22"/></filter></defs>
<pattern id="park-hatch" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-2 2 2-2M0 7 7 0M5 9 9 5" fill="none" stroke="#8ca18c" stroke-width=".7" opacity=".35"/></pattern>
<rect width="650" height="422" fill="#ede9dd"/>
<path d="M0 0H163L145 41 114 62 92 104 48 116 0 112ZM0 262l58-17 37 13 24 44L95 341 43 362 0 345ZM501 246l74 14 50 45 25 2v92l-39 11-53-29-43-46ZM177 0h79l-4 33-62 27-14-16ZM269 120l45-26 36 7 13 26-28 30-55 15ZM571 0h79v40l-50-10Z" fill="#d8e4d1"/>
<path d="M0 12H150L135 40 104 60 83 96 45 107 0 103ZM511 257l60 15 47 43 32 5v72l-36 10-49-27-42-46Z" fill="url(#park-hatch)"/>
<path d="m0 73 41-13 34-32 46-8 27-20m382 422 4-27 32-24 11-42 35-34 38-17" stroke="#a8c9c9" stroke-width="5.5" fill="none"/>
${blocks}${baseLines(minor, "#e2dfd6", 7)}${baseLines(minor, "#faf8f2", 4.5)}${baseLines(major, "#ddd5c4", 12)}${baseLines(major, "#fffaf0", 8.5)}
<g font-family="Inter Variable, Arial, sans-serif" font-size="9" font-weight="650" fill="#576358" letter-spacing="1.25" text-anchor="middle">
<text x="99" y="176">${site === "sandton" ? "PARKMORE" : "PARKHURST"}</text><text x="287" y="60">${site === "sandton" ? "BENMORE GARDENS" : "PARKTOWN NORTH"}</text><text x="560" y="111">${site === "sandton" ? "SANDOWN" : "ROSEBANK"}</text><text x="394" y="330">${site === "sandton" ? "SANDHURST" : "SAXONWOLD"}</text><text x="542" y="365" fill="#74816b">${site === "sandton" ? "INGANDA PARK" : "THE PARKS"}</text><text x="54" y="296" fill="#74816b">${site === "sandton" ? "FIELD &amp; STUDY" : "DELTA PARK"}</text>
</g>
<g font-family="Inter Variable, Arial, sans-serif" font-size="8" fill="#79746b"><text x="190" y="193" transform="rotate(-12 190 193)">${site === "sandton" ? "Sandton Dr" : "Jan Smuts Ave"}</text><text x="510" y="216" transform="rotate(13 510 216)">${site === "sandton" ? "Katherine St" : "Oxford Rd"}</text><text x="400" y="82" transform="rotate(70 400 82)">${site === "sandton" ? "Rivonia Rd" : "Bolton Rd"}</text><text x="114" y="221" transform="rotate(78 114 221)">${site === "sandton" ? "Grayston Dr" : "Keyes Ave"}</text></g>
<path d="${route}" fill="none" stroke="white" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="${route}" fill="none" stroke="#ad1338" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" ${selection ? 'stroke-dasharray="6 5"' : ""}/>
${pin(171, 315, "#333135", home)}${pin(463, 127, "#ab1837", cross)}
<g font-family="Inter Variable, Arial, sans-serif" font-size="10.5" font-weight="650" fill="#262326" filter="url(#pinshadow)"><rect x="132" y="324" width="78" height="23" rx="5" fill="white"/><text x="171" y="339" text-anchor="middle" fill="#341f29">${selection ? "Pickup pin" : reverse ? "Your drop-off" : "Your pickup"}</text><rect x="379" y="64" width="146" height="26" rx="5" fill="white"/><text x="452" y="81" text-anchor="middle">${site === "sandton" ? "Sandton Donor Centre" : "Rosebank Blood Drive"}</text></g>
${active ? `<g transform="translate(${point[0]} ${point[1]})"><circle r="10" fill="#fff"/><circle r="6" fill="#a91636" stroke="#fff" stroke-width="1.5"/></g>` : ""}
</svg><span class="map-compass" aria-hidden="true"><b>N</b><svg width="14" height="16" viewBox="0 0 14 16"><path d="M7 1 13 14 7 11 1 14Z" fill="#52172b"/><path d="M7 1v10L1 14Z" fill="#bd8390"/></svg></span><span class="map-simulation">SIMULATED MAP</span></div>`;
}
