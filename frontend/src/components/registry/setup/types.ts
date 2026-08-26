import type { GiftRegistryDetailDto } from "@/lib/shop-types";

export type SetupStepId = "details" | "cover" | "products" | "review";

export const SETUP_STEPS: Array<{ id: SetupStepId; label: string }> = [
  { id: "details", label: "Details" },
  { id: "cover", label: "Cover Image" },
  { id: "products", label: "Add Gifts" },
  { id: "review", label: "Review" },
];

export type StepProps = {
  registry: GiftRegistryDetailDto;
  onUpdated: (registry: GiftRegistryDetailDto) => void;
  goNext: () => void;
  goBack: () => void;
  goTo: (step: SetupStepId) => void;
  refresh: () => Promise<void>;
};
