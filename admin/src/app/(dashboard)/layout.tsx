import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <div
        style={{
          flex: 1,
          marginLeft: 248,
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
          backgroundColor: "var(--color-surface)",
        }}
      >
        <Topbar />

        <main
          id="main-content"
          style={{
            flex: 1,
            padding: "2rem 2rem 3rem",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
