/**
 * TopVeda Clean Maintenance Page Template (HTTP 503)
 */

export function renderMaintenanceHtml(message?: string): string {
  const displayMsg =
    message ||
    "TopVeda is currently undergoing scheduled platform upgrades. We will be back online shortly.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maintenance Mode | TopVeda</title>
  <link rel="icon" href="/icon.png" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #FAFAF9;
      --card-bg: #FFFFFF;
      --text-main: #18181B;
      --text-muted: #71717A;
      --orange: #FF6B00;
      --border: #E4E4E7;
      --font: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: var(--font);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 1.5rem;
      padding: 2.5rem 2rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 2rem;
      font-weight: 800;
      font-size: 1.25rem;
      letter-spacing: -0.02em;
    }
    .brand-icon {
      width: 28px;
      height: 28px;
    }
    .brand span {
      color: var(--orange);
    }
    .icon-wrapper {
      width: 64px;
      height: 64px;
      background: #FFF7ED;
      border: 1px solid #FFEDD5;
      border-radius: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem auto;
      color: var(--orange);
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.02em;
      margin-bottom: 0.75rem;
    }
    p {
      color: var(--text-muted);
      font-size: 0.875rem;
      line-height: 1.6;
      margin-bottom: 1.75rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.35rem 0.85rem;
      background: #F4F4F5;
      border: 1px solid var(--border);
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      background-color: var(--orange);
      border-radius: 50%;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: .4; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <svg class="brand-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="22" fill="#FF6B00"/>
        <path d="M50 24L76 38L50 52L24 38L50 24Z" fill="white"/>
        <path d="M34 44.5V60.5C34 60.5 40 67 50 67C60 67 66 60.5 66 60.5V44.5L50 53.5L34 44.5Z" fill="white" fill-opacity="0.9"/>
        <path d="M76 43V58" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
      </svg>
      Top<span>Veda</span>
    </div>

    <div class="icon-wrapper">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>

    <h1>Site is in Maintenance Mode</h1>
    <p>${displayMsg}</p>

    <div class="badge">
      <span class="pulse-dot"></span>
      System Upgrade in Progress • Please check back soon
    </div>
  </div>
</body>
</html>`;
}
