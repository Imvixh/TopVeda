import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

let envContent = "";
for (const envFile of [".env.local", ".env.production", ".env"]) {
  const p = path.join(rootDir, envFile);
  if (fs.existsSync(p)) envContent += "\n" + fs.readFileSync(p, "utf8");
}

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
};

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: users } = await adminClient.auth.admin.listUsers();
  const { data: profiles } = await adminClient.from("profiles").select("*");
  console.log("Auth users count:", users?.users?.length);
  console.log("Auth users:", users?.users?.map((u) => ({ id: u.id, email: u.email })));
  console.log("Profiles count:", profiles?.length);
  console.log("Profiles:", profiles);
}

main().catch(console.error);
