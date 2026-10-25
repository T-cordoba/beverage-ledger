const HEX = /^#[0-9a-f]{6}$/i;

export const isHexColor = (value: string) => HEX.test(value);

/** `#d4af37` → `[212, 175, 55]`. Assumes `isHexColor`. */
export function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** WCAG relative luminance, 0 for black to 1 for white. */
function luminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Blends towards white for a dark colour and towards black for a light one. */
export function hoverShade(rgb: [number, number, number], amount = 0.15): [number, number, number] {
  const target = luminance(rgb) < 0.5 ? 255 : 0;
  return rgb.map((channel) => Math.round(channel + (target - channel) * amount)) as [
    number,
    number,
    number,
  ];
}
