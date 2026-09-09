/**
 * TopVeda Transactional Email Service (Phase 3.1)
 * Decoupled provider abstraction supporting Resend API in production
 * and an honest, formatted development logger when RESEND_API_KEY is not set.
 */

import { getOwnerNotificationTemplate } from "./templates/owner-notification";
import { getApplicationApprovedTemplate } from "./templates/application-approved";
import { getApplicationRejectedTemplate } from "./templates/application-rejected";

export interface EmailSendResult {
  success: boolean;
  mocked?: boolean;
  id?: string;
  error?: string;
}

export class EmailService {
  private static getApiKey(): string | undefined {
    return process.env.RESEND_API_KEY?.trim() || undefined;
  }

  private static getFromAddress(): string {
    return process.env.EMAIL_FROM || "TopVeda <no-reply@topveda.com>";
  }

  /**
   * Internal dispatcher that calls Resend REST API or logs simulated email in development
   */
  private static async sendEmail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }): Promise<EmailSendResult> {
    const apiKey = this.getApiKey();
    const from = this.getFromAddress();

    if (!apiKey) {
      console.log("\n============================================================");
      console.log(" [DEV MOCK EMAIL SERVICE] (No real network delivery)");
      console.log(" Reason: RESEND_API_KEY environment variable is not configured.");
      console.log(` To:      ${to}`);
      console.log(` From:    ${from}`);
      console.log(` Subject: ${subject}`);
      console.log("============================================================\n");

      return {
        success: true,
        mocked: true,
      };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[EmailService] Resend API error:", data);
        return {
          success: false,
          error: data.message || "Failed to send email via Resend API.",
        };
      }

      return {
        success: true,
        id: data.id,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown email delivery error";
      console.error("[EmailService] Network delivery exception:", errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Dispatches new application alert to the configured Owner Email
   */
  public static async sendOwnerNewApplicationAlert({
    applicantName,
    applicantEmail,
    applicantPhone,
    applicationId,
    reviewUrl,
  }: {
    applicantName: string;
    applicantEmail: string;
    applicantPhone: string;
    applicationId: string;
    reviewUrl: string;
  }): Promise<EmailSendResult> {
    const ownerEmail = process.env.ADMIN_APPROVAL_OWNER_EMAIL?.trim();

    if (!ownerEmail) {
      console.warn("[EmailService] ADMIN_APPROVAL_OWNER_EMAIL not configured; skipping owner alert.");
      return { success: false, error: "ADMIN_APPROVAL_OWNER_EMAIL not configured" };
    }

    const { subject, html } = getOwnerNotificationTemplate({
      ownerEmail,
      applicantName,
      applicantEmail,
      applicantPhone,
      applicationId,
      reviewUrl,
    });

    return this.sendEmail({
      to: ownerEmail,
      subject,
      html,
    });
  }

  /**
   * Dispatches approval notification to applicant
   */
  public static async sendApplicantApprovedEmail({
    applicantName,
    applicantEmail,
    loginUrl,
  }: {
    applicantName: string;
    applicantEmail: string;
    loginUrl: string;
  }): Promise<EmailSendResult> {
    const { subject, html } = getApplicationApprovedTemplate({
      applicantName,
      loginUrl,
    });

    return this.sendEmail({
      to: applicantEmail,
      subject,
      html,
    });
  }

  /**
   * Dispatches rejection notification to applicant with reviewer reason
   */
  public static async sendApplicantRejectedEmail({
    applicantName,
    applicantEmail,
    rejectionReason,
  }: {
    applicantName: string;
    applicantEmail: string;
    rejectionReason?: string;
  }): Promise<EmailSendResult> {
    const { subject, html } = getApplicationRejectedTemplate({
      applicantName,
      rejectionReason,
    });

    return this.sendEmail({
      to: applicantEmail,
      subject,
      html,
    });
  }
}
