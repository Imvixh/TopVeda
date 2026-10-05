import { spawn } from "child_process";

async function runMcpTest() {
  console.log("==================================================");
  console.log("STARTING PLAYWRIGHT MCP END-TO-END VERIFICATION");
  console.log("==================================================");

  const child = spawn("cmd.exe", ["/c", "npx", "-y", "@playwright/mcp@latest", "--browser", "chrome", "--headless"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let messageId = 1;
  const pendingRequests = new Map();

  function sendRequest(method, params) {
    const id = messageId++;
    const req = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      child.stdin.write(req);
    });
  }

  let buffer = "";
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep remainder
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line.trim());
        if (msg.id && pendingRequests.has(msg.id)) {
          const { resolve, reject } = pendingRequests.get(msg.id);
          pendingRequests.delete(msg.id);
          if (msg.error) reject(new Error(JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      } catch (err) {
        console.error("JSON parse error:", err.message, "Line:", line);
      }
    }
  });

  child.stderr.on("data", (chunk) => {
    // console.log("[MCP STDERR]", chunk.toString());
  });

  try {
    // 1. Initialize
    console.log("\n[STEP 1] Initializing Playwright MCP server...");
    const initRes = await sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-verifier", version: "1.0.0" },
    });
    console.log("  Server Info:", initRes.serverInfo);

    // 2. List tools
    console.log("\n[STEP 2] Querying available Playwright MCP tools...");
    const toolsRes = await sendRequest("tools/list", {});
    console.log(`  Discovered ${toolsRes.tools.length} Playwright MCP tools:`);
    toolsRes.tools.forEach((t) => {
      console.log(`    - ${t.name}: ${t.description.split(".")[0]}`);
    });

    // 3. Navigate to localhost
    console.log("\n[STEP 3] Navigating to http://localhost:3000 via browser_navigate...");
    const navRes = await sendRequest("tools/call", {
      name: "browser_navigate",
      arguments: { url: "http://localhost:3000" },
    });
    console.log("  Navigation Result:", navRes.content?.[0]?.text?.slice(0, 150) || navRes);

    // 4. Capture page snapshot
    console.log("\n[STEP 4] Capturing accessibility page snapshot via browser_snapshot...");
    const snapRes = await sendRequest("tools/call", {
      name: "browser_snapshot",
      arguments: {},
    });
    const snapText = snapRes.content?.[0]?.text || "";
    console.log("  Snapshot Length:", snapText.length, "characters");
    console.log("  Snapshot Snippet:", snapText.slice(0, 300));

    // 5. Close browser
    console.log("\n[STEP 5] Closing browser via browser_close...");
    await sendRequest("tools/call", {
      name: "browser_close",
      arguments: {},
    });
    console.log("  Browser closed cleanly.");

    console.log("\n==================================================");
    console.log("PLAYWRIGHT MCP VERIFICATION: ALL STEPS PASSED");
    console.log("==================================================");
  } catch (err) {
    console.error("Verification failed with error:", err);
  } finally {
    child.kill();
  }
}

runMcpTest();
