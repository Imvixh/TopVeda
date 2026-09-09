/**
 * HTML Email Template: Applicant Rejected
 */
export function getApplicationRejectedTemplate({
  applicantName,
  rejectionReason,
}: {
  applicantName: string;
  rejectionReason?: string;
}) {
  return {
    subject: `Update Regarding Your TopVeda Admin Application`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Application Status Update</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FBF9F5; margin: 0; padding: 24px; color: #1E293B; }
    .card { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .brand { font-size: 20px; font-weight: 800; color: #1E293B; margin-bottom: 24px; }
    .brand span { color: #E85D04; }
    .badge { display: inline-block; background: #FEE2E2; color: #B91C1C; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px; }
    h1 { font-size: 18px; font-weight: 700; margin: 0 0 16px 0; color: #0F172A; }
    p { font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .reason-box { background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #881337; }
    .footer { font-size: 11px; color: #94A3B8; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">TOP<span>VEDA</span></div>
    <div class="badge">APPLICATION UPDATE</div>
    <h1>TopVeda Admin Application Status</h1>
    <p>Dear ${applicantName},</p>
    <p>Thank you for your interest in becoming an Administrator on TopVeda. After careful review of your submitted credentials and verification documents, we are unable to approve your Administrator application at this time.</p>
    
    ${
      rejectionReason
        ? `<div class="reason-box"><strong>Reviewer Feedback:</strong><br>${rejectionReason}</div>`
        : ""
    }

    <p>Your account remains fully active as a Student account. You may submit a new application in the future with updated credentials.</p>

    <div class="footer">
      This is an automated notification from TopVeda Platform Services.
    </div>
  </div>
</body>
</html>
    `,
  };
}
