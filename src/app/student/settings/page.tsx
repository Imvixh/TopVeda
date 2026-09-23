"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function StudentSettingsPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace("/student/profile?tab=notifications");
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 text-brand-orange animate-spin" />
        <p className="text-xs font-bold text-brand-text-muted">Loading settings...</p>
      </div>
    </div>
  );
}
