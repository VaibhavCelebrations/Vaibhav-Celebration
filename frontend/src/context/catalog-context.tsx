"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PackageCard, ThemeCard } from "@/lib/cms/types";

export type CatalogData = {
  themes: ThemeCard[];
  packages: PackageCard[];
  themesBySlug: Record<string, ThemeCard>;
  packagesBySlug: Record<string, PackageCard>;
};

const CatalogContext = createContext<CatalogData>({
  themes: [],
  packages: [],
  themesBySlug: {},
  packagesBySlug: {},
});

export function CatalogProvider({
  themes,
  packages,
  children,
}: {
  themes: ThemeCard[];
  packages: PackageCard[];
  children: ReactNode;
}) {
  const themesBySlug = Object.fromEntries(themes.map((t) => [t.slug, t]));
  const packagesBySlug = Object.fromEntries(packages.map((p) => [p.slug, p]));

  return (
    <CatalogContext.Provider value={{ themes, packages, themesBySlug, packagesBySlug }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  return useContext(CatalogContext);
}
