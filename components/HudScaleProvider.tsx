import { createContext, useContext, useMemo, type ReactNode } from 'react';

type HudScaleContextValue = {
  textScale: number;
  hudScale: number;
  scaleText: (size: number) => number;
  scaleHud: (size: number) => number;
};

const HudScaleContext = createContext<HudScaleContextValue>({
  textScale: 1,
  hudScale: 1,
  scaleText: (size) => size,
  scaleHud: (size) => size,
});

function parseScale(value: string | number, fallback = 1) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function HudScaleProvider({
  textScale,
  hudScale,
  children,
}: {
  textScale: string | number;
  hudScale: string | number;
  children: ReactNode;
}) {
  const resolvedTextScale = parseScale(textScale);
  const resolvedHudScale = parseScale(hudScale);
  const value = useMemo(
    () => ({
      textScale: resolvedTextScale,
      hudScale: resolvedHudScale,
      scaleText: (size: number) => Math.round(size * resolvedTextScale),
      scaleHud: (size: number) => Math.round(size * resolvedHudScale),
    }),
    [resolvedHudScale, resolvedTextScale]
  );

  return <HudScaleContext.Provider value={value}>{children}</HudScaleContext.Provider>;
}

export function useHudScale() {
  return useContext(HudScaleContext);
}
