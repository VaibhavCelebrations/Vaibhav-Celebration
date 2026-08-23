import { AdminShell } from "@/components/AdminShell";
import { AdminSessionProvider } from "@/components/AdminSessionContext";
import { ToastProvider } from "@/components/ui/Toast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionProvider>
      <ToastProvider>
        <AdminShell>{children}</AdminShell>
      </ToastProvider>
    </AdminSessionProvider>
  );
}

