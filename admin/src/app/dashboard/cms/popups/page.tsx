"use client";

import { ResourceScreen } from "@/components/ResourceScreen";
import { popupsRepo } from "@/lib/data/resources";

export default function PopupsPage() {
  return <ResourceScreen title="Popups" noun="Popup" description="Manage time-bound calls to action across public pages." repo={popupsRepo} fields={["title", "description", "isActive"]} />;
}

