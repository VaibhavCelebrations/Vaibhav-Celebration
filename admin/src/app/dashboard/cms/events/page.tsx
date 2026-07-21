"use client";

import { useEffect, useState } from "react";
import { ResourceScreen } from "@/components/ResourceScreen";
import { adminFetch } from "@/lib/admin-api-client";
import { eventsRepo } from "@/lib/data/resources";

const FALLBACK_TEMPLATES = [
  { value: "CLASSIC_HERO", label: "Classic Hero", description: "Traditional hero-led event landing page." },
  { value: "EDITORIAL_SPLIT", label: "Editorial Split", description: "Story-led split layout with imagery." },
  { value: "FESTIVE_IMMERSIVE", label: "Festive Immersive", description: "High-impact, immersive celebration layout." },
];

export default function EventsPage() {
  const [templates, setTemplates] = useState<Array<{ value: string; label: string; description?: string }>>(FALLBACK_TEMPLATES);
  useEffect(() => {
    adminFetch<Array<{ key?: string; value?: string; name?: string; label?: string; description?: string }>>("/events/templates")
      .then((items) => setTemplates(items.map((item) => ({ value: item.key ?? item.value ?? item.name ?? "", label: item.label ?? item.name ?? item.key ?? "Template", description: item.description }))))
      .catch(() => setTemplates(FALLBACK_TEMPLATES));
  }, []);
  return <ResourceScreen title="Events" noun="Event" description="Manage public events and their landing-page presentation." repo={eventsRepo} fields={["title", "slug", "description", "status", "isActive"]} statusKey="pageTemplate" statusOptions={templates} />;
}
