/**
 * HTML Email Template: Owner Notification of New Admin Application
 */
export function getOwnerNotificationTemplate({
  ownerEmail,
  applicantName,
  applicantEmail,
  applicantPhone,
  applicationId,
  reviewUrl,
}: {
  ownerEmail: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  applicationId: string;
  reviewUrl: string;
}) {
  return {
    subject: `[TopVeda] New Admin Application Submitted: ${applicantName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Admin Application</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FBF9F5; margin: 0; padding: 24px; color: #1E293B; }
    .card { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .brand { font-size: 20px; font-weight: 800; color: #1E293B; margin-bottom: 24px; }
    .brand span { color: #E85D04; }
    .badge { display: inline-block; background: #FFEDD5; color: #C2410C; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px; }
    h1 { font-size: 18px; font-weight: 700; margin: 0 0 16px 0; color: #0F172A; }
    p { font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .info-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin: 20px 0; }
    .info-row { font-size: 13px; margin-bottom: 8px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { font-weight: 600; color: #64748B; width: 110px; display: inline-block; }
    .info-value { font-weight: 600; color: #0F172A; }
    .btn { display: inline-block; background: #E85D04; color: #FFFFFF !important; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 10px; text-decoration: none; margin-top: 16px; }
    .footer { font-size: 11px; color: #94A3B8; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">TOP<span>VEDA</span></div>
    <div class="badge">ADMIN APPLICATION</div>
    <h1>New Administrator Application Submitted</h1>
    <p>A new applicant has verified their email, uploaded their government identification document, and submitted an application for the Administrator role on TopVeda.</p>
    
    <div class="info-box">
      <div class="info-row"><span class="info-label">Full Name:</span> <span class="info-value">${applicantName}</span></div>
      <div class="info-row"><span class="info-label">Gmail:</span> <span class="info-value">${applicantEmail}</span></div>
      <div class="info-row"><span class="info-label">Phone:</span> <span class="info-value">${applicantPhone}</span></div>
      <div class="info-row"><span class="info-label">Application ID:</span> <span class="info-value">${applicationId}</span></div>
    </div>

    <p>Please log in as Super Administrator to inspect the uploaded identity document and either approve or reject this application.</p>
    
    <div style="text-align: center;">
      <a href="${reviewUrl}" class="btn" target="_blank">Review Application in TopVeda</a>
    </div>

    <div class="footer">
      This notification was sent to ${ownerEmail}. Authenticated Super Admin role is required to review.
    </div>
  </div>
</body>
</html>
    `,
  };
}
