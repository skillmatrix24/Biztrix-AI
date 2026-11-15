import { headers } from "next/headers";
import { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { Loader2 } from "lucide-react";
import { getBusinessIdBySlug, getPublicBusinessNode } from "@/app/actions/p0-migration";
import { getPublicFunnelData } from "@/app/actions/storefront-actions";
import { getPublicStoreProductsForSeo } from "@/lib/storefront-seo";
import { FunnelClient } from "./funnel-client";

async function resolveFunnelBusinessId(searchParams: { bId?: string; slug?: string }) {
  const headerList = await headers();
  const slugFromHeader = headerList.get("x-biztrix-slug");

  let resolvedId = (searchParams.bId || "").trim() || null;
  const resolvedSlug = (searchParams.slug || slugFromHeader || "").trim() || null;

  if (!resolvedId && resolvedSlug) {
    resolvedId = await getBusinessIdBySlug(resolvedSlug);
  }

  return { resolvedId, resolvedSlug };
}

export async function generateMetadata(props: {
  searchParams: Promise<{
    bId?: string;
    slug?: string;
    fId?: string;
    fSlug?: string;
    template?: string;
    preview?: string;
  }>;
}): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const isPreview = searchParams.preview === "1" || searchParams.preview === "true";
  const { resolvedId } = await resolveFunnelBusinessId(searchParams);

  if (!resolvedId) {
    return {
      title: "Special Offer Funnel – Biztrix",
      description: "Direct merchant offer page.",
      robots: { index: false, follow: false },
    };
  }

  const { funnel, storeSettings, isPubliclyVisible } = await getPublicFunnelData({
    businessId: resolvedId,
    funnelId: searchParams.fId,
    funnelSlug: searchParams.fSlug,
    templateId: searchParams.template,
    isPreview,
  });

  if (!funnel) {
    return {
      title: `${storeSettings?.storeName || "Online Store"} – Offer Funnel`,
      description: "Direct store promotion.",
      robots: { index: false, follow: false },
      icons: storeSettings?.faviconUrl ? { icon: storeSettings.faviconUrl } : undefined,
    };
  }

  const title = funnel.seoTitle || `${funnel.name} | ${storeSettings?.storeName || "Store"}`;
  const description =
    funnel.seoDescription ||
    `Exclusive direct offer from ${storeSettings?.storeName || "our store"}. Fast dispatch, verified stock, and easy checkout.`;
  const ogImage = storeSettings?.logoUrl || undefined;

  return {
    title: isPreview || !isPubliclyVisible ? `${title} (Preview)` : title,
    description,
    robots: isPreview || !isPubliclyVisible ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      siteName: storeSettings?.storeName || "Online Store",
      type: "website",
      images: ogImage ? [{ url: ogImage, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    icons: {
      icon: storeSettings?.faviconUrl || "/favicon.ico",
    },
  };
}

export default async function PublicFunnelPage(props: {
  searchParams: Promise<{
    bId?: string;
    slug?: string;
    fId?: string;
    fSlug?: string;
    template?: string;
    preview?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const isPreview = searchParams.preview === "1" || searchParams.preview === "true";
  const { resolvedId } = await resolveFunnelBusinessId(searchParams);

  let businessNode: Record<string, any> | null = null;
  let funnelResult: Awaited<ReturnType<typeof getPublicFunnelData>> = {
    funnel: null,
    storeSettings: null,
    isPubliclyVisible: false,
  };
  let initialProducts: Awaited<ReturnType<typeof getPublicStoreProductsForSeo>> = [];

  if (resolvedId) {
    [businessNode, funnelResult, initialProducts] = await Promise.all([
      getPublicBusinessNode(resolvedId),
      getPublicFunnelData({
        businessId: resolvedId,
        funnelId: searchParams.fId,
        funnelSlug: searchParams.fSlug,
        templateId: searchParams.template,
        isPreview,
      }),
      getPublicStoreProductsForSeo(resolvedId, 100),
    ]);
  }

  const visibleProducts = funnelResult.isPubliclyVisible ? initialProducts : [];

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-primary h-10 w-10 opacity-30" />
        </div>
      }
    >
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <FunnelClient
        businessId={resolvedId}
        initialBusiness={funnelResult.isPubliclyVisible ? businessNode : null}
        funnel={funnelResult.isPubliclyVisible ? funnelResult.funnel : null}
        storeSettings={funnelResult.storeSettings}
        initialProducts={visibleProducts}
        isPreview={isPreview}
        isPubliclyVisible={funnelResult.isPubliclyVisible}
      />
    </Suspense>
  );
}
