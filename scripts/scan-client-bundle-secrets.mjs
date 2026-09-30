import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const clientDirs = [
  path.join(rootDir, ".next", "static", "chunks"),
  path.join(rootDir, ".next", "static", "css"),
  path.join(rootDir, "dist", "client"),
  path.join(rootDir, ".open-next", "assets"),
];

const prohibitedPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /SUPABASE_SECRET_KEY/i,
  /service_role/i,
  /TURNSTILE_SECRET_KEY/i,
  /PRIVATE_KEY/i,
  /BEGIN RSA PRIVATE KEY/i,
];

let scannedFiles = 0;
let leaksFound = [];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".json") || entry.name.endsWith(".html"))) {
      scannedFiles++;
      const content = fs.readFileSync(fullPath, "utf8");
      for (const pattern of prohibitedPatterns) {
        if (pattern.test(content)) {
          // Verify if it's a false positive or actual secret leak
          leaksFound.push({ file: fullPath, pattern: pattern.toString() });
        }
      }
    }
  }
}

for (const d of clientDirs) {
  scanDir(d);
}

console.log("=========================================");
console.log("CLIENT BUNDLE SECRET SCAN");
console.log("=========================================");
console.log(`Scanned ${scannedFiles} client bundle files across client directories.`);

if (leaksFound.length > 0) {
  console.error("❌ LEAKS FOUND:", leaksFound);
  process.exit(1);
} else {
  console.log("✅ ZERO private secrets found in client bundle files.");
  process.exit(0);
}
