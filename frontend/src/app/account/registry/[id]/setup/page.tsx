"use client";

import { use } from "react";
import { GuidedSetupShell } from "@/components/registry/setup/GuidedSetupShell";

interface Props {
  params: Promise<{ id: string }>;
}

export default function RegistryGuidedSetupPage({ params }: Props) {
  const { id } = use(params);
  return <GuidedSetupShell registryId={id} />;
}
