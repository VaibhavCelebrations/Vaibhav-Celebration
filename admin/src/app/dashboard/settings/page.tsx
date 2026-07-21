"use client";

import { useEffect, useState } from "react";
import { AdminApiError, adminFetch } from "@/lib/admin-api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { NumberInput } from "@/components/ui/fields";

type SettingRow = { key: string; value: string };

const KEYS = {
  gst: "GST_PERCENT",
  capacity: "MAX_BOOKINGS_PER_DAY",
  notice: "MIN_CONSULTATION_ADVANCE_DAYS",
} as const;

function toMap(rows: SettingRow[]) {
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export default function SettingsPage() {
  const [values, setValues] = useState({
    [KEYS.gst]: "18",
    [KEYS.capacity]: "2",
    [KEYS.notice]: "2",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    adminFetch<SettingRow[]>("/admin/settings")
      .then((rows) => {
        const map = toMap(Array.isArray(rows) ? rows : []);
        setValues({
          [KEYS.gst]: map[KEYS.gst] ?? "18",
          [KEYS.capacity]: map[KEYS.capacity] ?? "2",
          [KEYS.notice]: map[KEYS.notice] ?? "2",
        });
      })
      .catch((error) =>
        toast({
          tone: "error",
          title: "Could not load settings",
          description: error instanceof AdminApiError ? error.message : undefined,
        }),
      )
      .finally(() => setLoading(false));
  }, [toast]);

  async function save() {
    setSaving(true);
    try {
      await adminFetch("/admin/settings", {
        method: "PUT",
        body: {
          settings: Object.entries(values).map(([key, value]) => ({
            key,
            value: String(value),
          })),
        },
      });
      toast({ tone: "success", title: "Operational settings saved" });
    } catch (error) {
      toast({
        tone: "error",
        title: "Could not save settings",
        description: error instanceof AdminApiError ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const number = (key: string) => Number(values[key as keyof typeof values] ?? 0);

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Settings"
        title="Operational Settings"
        description="Control business-wide billing, availability, and consultation defaults."
      />
      <div className="card space-y-4 p-5">
        {loading ? (
          <p className="text-sm text-(--color-text-muted)">Loading settings…</p>
        ) : (
          <>
            <label className="block text-sm font-medium">
              GST percentage
              <NumberInput
                value={number(KEYS.gst)}
                onChange={(value) => setValues({ ...values, [KEYS.gst]: String(value) })}
                min={0}
              />
            </label>
            <label className="block text-sm font-medium">
              Default daily booking capacity
              <NumberInput
                value={number(KEYS.capacity)}
                onChange={(value) => setValues({ ...values, [KEYS.capacity]: String(value) })}
                min={0}
              />
            </label>
            <label className="block text-sm font-medium">
              Minimum consultation notice (days)
              <NumberInput
                value={number(KEYS.notice)}
                onChange={(value) => setValues({ ...values, [KEYS.notice]: String(value) })}
                min={0}
              />
            </label>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn btn-primary px-4 py-2 text-sm"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
