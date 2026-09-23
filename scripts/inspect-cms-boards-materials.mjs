import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

let envContent = "";
try {
  envContent = fs.readFileSync(path.join(rootDir, ".env.local"), "utf8");
} catch {
  envContent = fs.readFileSync(path.join(rootDir, ".env.production"), "utf8");
}

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
};

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || "https://uxkvwuavidufnqliauuj.supabase.co";
const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

const supabase = createClient(supabaseUrl, anonKey);

async function inspectCMS() {
  console.log("=== INSPECTING CMS BOARDS ===");
  const { data: boards } = await supabase.from("cms_boards").select("*").order("display_order");
  boards?.forEach(b => console.log(" Board:", b.id, b.name, b.code, b.slug, b.status));

  console.log("\n=== INSPECTING CMS CLASS LEVELS ===");
  const { data: classes } = await supabase.from("cms_class_levels").select("*").order("display_order");
  classes?.forEach(c => console.log(" Class:", c.id, c.name, c.code, c.slug, c.status));

  console.log("\n=== INSPECTING CMS BATCHES ===");
  const { data: batches } = await supabase.from("cms_batches").select("*").order("display_order");
  batches?.forEach(b => console.log(" Batch:", b.id, b.name, b.code, b.board_id, b.class_id, b.course_id, b.status));

  console.log("\n=== INSPECTING CMS STUDY MATERIALS ===");
  const { data: materials } = await supabase.from("cms_study_materials").select("*").order("display_order");
  materials?.forEach(m => console.log(" Material:", m.id, m.title, m.material_type, m.course_id, m.chapter_id, m.status, m.is_visible));
}

inspectCMS().catch(console.error);
