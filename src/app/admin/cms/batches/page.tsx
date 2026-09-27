"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function BatchesIndexPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace("/admin/cms/batches/upcoming");
  }, [router]);

  return (
    <div className="p-8 text-center text-xs text-brand-text-muted">
      Redirecting to New Features &amp; Batches CMS...
    </div>
  );
}
