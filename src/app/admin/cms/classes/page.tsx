import * as React from "react";
import { School } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function ClassesCmsPage() {
  return (
    <CmsPlaceholderPage
      title="Class Levels & Grades"
      section="ACADEMIC"
      description="Manage the student grade and class hierarchy (Class 9, Class 10, Class 11, Class 12, NEET/JEE Droppers)."
      icon={School}
      targetTable="cms_class_levels"
      capabilities={[
        "Standard grade level names and identification codes (e.g. CLASS_10)",
        "System slug generation for clean dynamic URL routing",
        "Display ordering to organize academic dropdowns across the portal",
        "Relational linking across courses and enrolled batches",
        "Super Admin publishing and visibility controls",
      ]}
    />
  );
}
