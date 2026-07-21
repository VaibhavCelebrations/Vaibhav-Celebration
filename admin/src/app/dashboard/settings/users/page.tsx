import { PageHeader } from "@/components/ui/PageHeader";

export default function AdminUsersPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Settings"
        title="Admin Users"
        description="Manage access to this administration panel."
      />
      <div className="card p-5">
        <p className="font-medium text-(--color-charcoal)">
          Admin user management is not available yet.
        </p>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          This screen is ready for the admin-users API when it is introduced.
          Existing access remains protected by role-based navigation.
        </p>
      </div>
    </div>
  );
}
