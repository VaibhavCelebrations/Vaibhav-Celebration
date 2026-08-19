import { RecycleBinClient } from "./RecycleBinClient";

export const metadata = {
  title: "Recycle Bin — Admin",
  description: "View and manage soft-deleted records. Restore or permanently delete with Super Admin authentication.",
};

export default function RecycleBinPage() {
  return <RecycleBinClient />;
}
