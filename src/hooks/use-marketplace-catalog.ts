"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { bundles as staticBundles, individuals as staticIndividuals } from "@/app/marketplace/data";
import type { MarketplaceItem } from "@/app/marketplace/data/types";
import {
  buildPlanComparisonRows,
  mergeMarketplaceCatalog,
  normalizeSystemLimits,
  type SystemLimitsConfig,
} from "@/lib/marketplace-catalog";

export interface UseMarketplaceCatalogResult {
  limits: SystemLimitsConfig;
  rawLimitsDoc: any;
  bundles: MarketplaceItem[];
  individuals: MarketplaceItem[];
  allItems: MarketplaceItem[];
  remoteDocs: any[];
  comparisonRows: Array<{ feature: string; free: string; paid: string }>;
  isLoading: boolean;
}

export function useMarketplaceCatalog(options?: {
  includeInactive?: boolean;
}): UseMarketplaceCatalogResult {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const includeInactive = Boolean(options?.includeInactive);

  const [rawLimitsDoc, setRawLimitsDoc] = useState<any>(null);
  const [remoteDocs, setRemoteDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isAuthenticated = Boolean(user?.uid && !user.isAnonymous);

  useEffect(() => {
    if (isUserLoading) return;

    // Authenticated workspace / owner: attach live Firestore listeners with safe fallback
    if (firestore && isAuthenticated) {
      setIsLoading(true);
      let pending = 2;
      const markDone = () => {
        pending = Math.max(0, pending - 1);
        if (pending === 0) setIsLoading(false);
      };

      const unsubLimits = onSnapshot(
        doc(firestore, "system", "config", "limits", "default"),
        (snap) => {
          setRawLimitsDoc(snap.exists() ? { id: snap.id, ...snap.data() } : null);
          markDone();
        },
        () => {
          // Graceful fallback to DEFAULT_SYSTEM_LIMITS if remote rules restrict non-owner reads
          markDone();
        }
      );

      const unsubCatalog = onSnapshot(
        collection(firestore, "system", "config", "marketplace"),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setRemoteDocs(items);
          markDone();
        },
        () => {
          // Graceful fallback to static catalog if remote rules restrict non-owner list
          markDone();
        }
      );

      return () => {
        unsubLimits();
        unsubCatalog();
      };
    }

    // Unauthenticated public visitor (/pricing, /marketplace): hydrate via safe server endpoint
    let cancelled = false;
    setIsLoading(true);
    fetch("/api/public/catalog", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (cancelled || !payload?.ok) return;
        if (payload.limitsDoc) setRawLimitsDoc(payload.limitsDoc);
        if (Array.isArray(payload.marketplaceDocs)) setRemoteDocs(payload.marketplaceDocs);
      })
      .catch(() => {
        // Silent fallback to built-in catalog
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [firestore, isUserLoading, isAuthenticated]);

  const limits = useMemo(() => normalizeSystemLimits(rawLimitsDoc), [rawLimitsDoc]);

  const merged = useMemo(
    () =>
      mergeMarketplaceCatalog(staticBundles, staticIndividuals, remoteDocs, {
        limits,
        includeInactive,
      }),
    [remoteDocs, limits, includeInactive]
  );

  const comparisonRows = useMemo(
    () => buildPlanComparisonRows(limits, merged.allItems),
    [limits, merged.allItems]
  );

  return {
    limits,
    rawLimitsDoc,
    bundles: merged.bundles,
    individuals: merged.individuals,
    allItems: merged.allItems,
    remoteDocs,
    comparisonRows,
    isLoading,
  };
}
