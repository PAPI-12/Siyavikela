import cityPlate from "./atlas-base.jpg";

// A simulated route plotted on an illustrative city model, not GPS data.
const points = [
  [334, 615],
  [405, 577],
  [472, 545],
  [541, 506],
  [610, 457],
  [670, 402],
  [748, 344],
  [836, 280],
  [918, 225],
];
const route =
  "M334 615 L402 579 L475 543 L541 506 Q585 481 610 457 L670 402 L748 344 L836 280 L918 225";

function stop(x, y, key, label, tone, right = false) {
  const width = right ? 188 : 140;
  const lx = -width / 2;
  return `<g transform="translate(${x} ${y})"><circle r="17" fill="#211a1e" stroke="${tone}" stroke-width="2"/><circle r="6" fill="${tone}"/><g transform="translate(${lx} ${right ? -76 : 25})"><rect width="${width}" height="44" rx="5" fill="#211a1e" stroke="#ffe6ec" stroke-opacity=".25"/><text x="12" y="16" fill="${tone}" font-size="11" letter-spacing="1.5" font-family="monospace" font-weight="bold">${key}</text><text x="12" y="33" fill="#fff6f7" font-size="15" font-family="Inter Variable, Arial, sans-serif" font-weight="650">${label}</text></g></g>`;
}

export function atlas({
  site = "sandton",
  zoom = 1,
  active = false,
  progress = 0,
  reverse = false,
} = {}) {
  const index = Math.min(points.length - 1, Math.max(0, Number(progress) || 0));
  const [x, y] = points[reverse ? points.length - 1 - index : index];
  const target =
    site === "sandton" ? "Sandton Donor Centre" : "Rosebank Blood Drive";
  return `<div class="atlas-map" role="img" aria-label="Illustrative ${reverse ? "return" : "outbound"} route map: ${reverse ? `${target} to home` : `home to ${target}`}. No live location data.">
    <svg viewBox="0 0 1264 848" preserveAspectRatio="xMidYMid slice" class="atlas-plot" style="--atlas-zoom:${zoom}" aria-hidden="true">
      <image href="${cityPlate}" width="1264" height="848"/>
      <path d="${route}" stroke="#121414" stroke-width="17" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${route}" stroke="#ff5464" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      ${stop(334, 615, reverse ? "B / DROP-OFF" : "A / PICKUP", "Your address", reverse ? "#fff1f2" : "#ff5464")}
      ${stop(918, 225, reverse ? "A / PICKUP" : "B / DROP-OFF", target, reverse ? "#ff5464" : "#fff1f2", true)}
      ${active ? `<g transform="translate(${x} ${y}) rotate(${reverse ? 55 : -125})"><rect x="-12" y="-20" width="24" height="40" rx="8" fill="#fff1f2" stroke="#211a1e" stroke-width="3"/><rect x="-8" y="-11" width="16" height="9" rx="2" fill="#a72231"/><rect x="-8" y="9" width="16" height="5" rx="2" fill="#a72231"/></g>` : ""}
    </svg>
    <span class="atlas-compass" aria-hidden="true"><b>N</b><svg width="15" height="16" viewBox="0 0 15 16"><path d="M7.5 1 13 14 7.5 11 2 14Z" fill="currentColor"/></svg></span>
    <span class="atlas-annotation"><span></span> SIMULATED ROUTE</span>
  </div>`;
}
