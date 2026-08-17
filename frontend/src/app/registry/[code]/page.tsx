import type { Metadata } from "next";
import { ApiClientError } from "@/lib/api-client";
import * as shopApi from "@/lib/shop-api";
import { RegistryGuestView } from "./RegistryGuestView";

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  try {
    const seo = await shopApi.getRegistrySeo(code);
    return {
      title: seo.title,
      description: seo.description,
      robots: seo.indexable ? { index: true, follow: true } : { index: false, follow: false },
      alternates: { canonical: seo.shareUrl },
      openGraph: {
        title: seo.title,
        description: seo.description,
        url: seo.shareUrl,
        images: seo.image ? [{ url: seo.image }] : undefined,
        type: "website",
      },
    };
  } catch {
    return { title: "Gift Registry", robots: { index: false, follow: false } };
  }
}

export default async function PublicRegistryPage({ params }: Props) {
  const { code } = await params;
  try {
    const registry = await shopApi.getPublicRegistry(code);
    return <RegistryGuestView code={code} initial={registry} needsPassword={false} />;
  } catch (err) {
    const needsPassword = err instanceof ApiClientError && (err.status === 401 || err.code === "UNAUTHORIZED");
    return <RegistryGuestView code={code} initial={null} needsPassword={needsPassword} />;
  }
}
