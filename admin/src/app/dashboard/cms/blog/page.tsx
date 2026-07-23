"use client";

import { ResourceScreen } from "@/components/ResourceScreen";
import { blogRepo } from "@/lib/data/resources";

export default function BlogPage() {
  return <ResourceScreen title="Blog" noun="Post" description="Create and manage stories, announcements, and helpful celebration guides." repo={blogRepo} fields={["title", "slug", "content", "status"]} statusOptions={[{ value: "DRAFT", label: "Draft" }, { value: "PUBLISHED", label: "Published" }, { value: "UNPUBLISHED", label: "Unpublished" }]} />;
}

