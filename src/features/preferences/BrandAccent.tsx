'use client';

import { useEffect } from 'react';
import { useAuth } from '@/features/auth';
import { hexToRgb, hoverShade, isHexColor } from '@/lib/utils';
import { usePreferences } from './usePreferences';

const channels = (rgb: [number, number, number]) => rgb.join(' ');

/**
 * Paints the organization's colour over the product's accent while inside the
 * app. Skipped under high contrast: that palette's accent is chosen for
 * legibility, and a brand colour has no such guarantee.
 */
export function BrandAccent() {
  const { organization } = useAuth();
  const { preferences } = usePreferences();
  const brandColor = organization?.brandColor;
  const applies = brandColor && isHexColor(brandColor) && preferences.contrast !== 'high';

  useEffect(() => {
    if (!applies) return;

    const root = document.documentElement.style;
    const rgb = hexToRgb(brandColor);
    root.setProperty('--color-accent', channels(rgb));
    root.setProperty('--color-accent-hover', channels(hoverShade(rgb)));

    return () => {
      root.removeProperty('--color-accent');
      root.removeProperty('--color-accent-hover');
    };
  }, [applies, brandColor]);

  return null;
}
