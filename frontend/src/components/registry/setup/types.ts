import type { GiftRegistryDetailDto } from "@/lib/shop-types";

export type SetupStepId = "welcome" | "details" | "products" | "review" | "preview" | "publish";

export const SETUP_STEPS: Array<{ id: SetupStepId; label: string }> = [
  { id: "welcome", label: "Welcome" },
  { id: "details", label: "Details" },
  { id: "products", label: "Add Gifts" },
  { id: "review", label: "Review" },
  { id: "preview", label: "Preview" },
  { id: "publish", label: "Publish" },
];

export type StepProps = {
  registry: GiftRegistryDetailDto;
  onUpdated: (registry: GiftRegistryDetailDto) => void;
  goNext: () => void;
  goBack: () => void;
  goTo: (step: SetupStepId) => void;
  refresh: () => Promise<void>;
};
