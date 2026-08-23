"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RegistryListPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/account/orders");
  }, [router]);

  return (
    <div className="flex justify-center py-20">
      <Loader2 size={28} className="animate-spin text-mocha" />
    </div>
  );
}
