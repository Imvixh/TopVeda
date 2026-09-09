/**
 * HTML Email Template: Applicant Approved
 */
export function getApplicationApprovedTemplate({
  applicantName,
  loginUrl,
}: {
  applicantName: string;
  loginUrl: string;
}) {
  return {
    subject: `Congratulations! Your TopVeda Admin Account is Approved`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Application Approved</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FBF9F5; margin: 0; padding: 24px; color: #1E293B; }
    .card { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .brand { font-size: 20px; font-weight: 800; color: #1E293B; margin-bottom: 24px; }
    .brand span { color: #E85D04; }
    .badge { display: inline-block; background: #DCFCE7; color: #15803D; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px; }
    h1 { font-size: 18px; font-weight: 700; margin: 0 0 16px 0; color: #0F172A; }
    p { font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .btn { display: inline-block; background: #E85D04; color: #FFFFFF !important; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 10px; text-decoration: none; margin-top: 16px; }
    .footer { font-size: 11px; color: #94A3B8; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">TOP<span>VEDA</span></div>
    <div class="badge">APPLICATION APPROVED</div>
    <h1>Welcome to the TopVeda Admin Team, ${applicantName}!</h1>
    <p><strong>Your account has been approved. Now you can login.</strong></p>
    <p>Your application for the TopVeda Administrator role has been thoroughly reviewed and approved by the Super Administrator.</p>
    <p>Your account profile role is now <strong>ADMIN</strong>. You can now log in through the Admin Login portal and access administrator features.</p>
    
    <div style="text-align: center;">
      <a href="${loginUrl}" class="btn" target="_blank">Login to Admin Portal</a>
    </div>

    <div class="footer">
      Thank you for partnering with TopVeda. If you have any questions, please reach out to our platform support.
    </div>
  </div>
</body>
</html>
    `,
  };
}
