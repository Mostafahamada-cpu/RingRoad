// Ring Roads brand mark — reproduces the logo: an orange rounded-square ring
// enclosing a burgundy reversed "R" behind an orange "R". Rendered as inline
// SVG (heavy system font) so it scales crisply and needs no image asset.
export function logoSvg(px = 40, { ring = true } = {}) {
  const stroke = px * 0.092;
  return `
    <svg class="rr-logo" width="${px}" height="${px}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ring Roads">
      ${ring ? `<rect x="${(stroke / 2) + 4}" y="${(stroke / 2) + 4}"
        width="${120 - stroke - 8}" height="${120 - stroke - 8}" rx="44" ry="44"
        fill="none" stroke="#F97316" stroke-width="${stroke}"/>` : ''}
      <g font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="62" letter-spacing="-2">
        <text x="53" y="83" text-anchor="middle" fill="#6A003C"
          transform="translate(53,0) scale(-1,1) translate(-53,0)">R</text>
        <text x="70" y="83" text-anchor="middle" fill="#F97316">R</text>
      </g>
    </svg>`;
}
