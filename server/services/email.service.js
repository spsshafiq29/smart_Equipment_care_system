try {
  if (process.loadEnvFile) {
    process.loadEnvFile('.env.local');
  }
} catch {
  // ignore
}

import nodemailer from 'nodemailer';

// Email outbox log for auditing and fallback inspection
export const emailOutbox = [];

// Lazy-initialized transporter
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.BREVO_USER || '';
  const pass = process.env.SMTP_PASS || process.env.BREVO_API_KEY || '';

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return transporter;
}

/**
 * Base email layout with university aesthetic
 */
function renderEmailLayout({ title, subtitle, contentHtml, badgeText, badgeColor = '#f59e0b' }) {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050d1f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050d1f; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #0b152e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px; background: linear-gradient(135deg, #0b152e 0%, #132247 100%); border-bottom: 1px solid #1e293b;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #f59e0b; margin-bottom: 6px;">
                      University IT & Lab Facilities
                    </div>
                    <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      SECS <span style="font-size: 14px; font-weight: 500; color: #94a3b8;">· Smart Equipment Care</span>
                    </div>
                  </td>
                  ${
                    badgeText
                      ? `<td align="right">
                          <span style="display: inline-block; padding: 6px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${badgeColor}; background-color: rgba(245, 158, 11, 0.1); border: 1px solid ${badgeColor}; border-radius: 9999px;">
                            ${badgeText}
                          </span>
                        </td>`
                      : ''
                  }
                </tr>
              </table>
            </td>
          </tr>

          <!-- Banner / Title -->
          <tr>
            <td style="padding: 32px 36px 16px 36px;">
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                ${title}
              </h1>
              ${
                subtitle
                  ? `<p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.5;">${subtitle}</p>`
                  : ''
              }
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 16px 36px 36px 36px; line-height: 1.6; font-size: 14px; color: #cbd5e1;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #070e20; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
              <p style="margin: 0 0 6px 0;">This is an automated university notification from SECS (Smart Equipment Care System).</p>
              <p style="margin: 0;">© ${currentYear} University Equipment & Facility Management. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Low-level send routine with fallback and safe logging
 */
export async function sendMail({ to, subject, html, text }) {
  const from = process.env.SMTP_FROM || `"SECS University Care" <${process.env.SMTP_USER || 'spsshafiq95@gmail.com'}>`;
  const mailRecord = {
    id: `mail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    to,
    from,
    subject,
    sentAt: new Date().toISOString(),
    status: 'queued',
  };

  try {
    const client = getTransporter();
    const info = await client.sendMail({
      from,
      to,
      subject,
      text: text || subject,
      html,
    });

    mailRecord.status = 'delivered';
    mailRecord.messageId = info.messageId;
    emailOutbox.unshift(mailRecord);
    console.log(`[EMAIL DISPATCHED] To: ${to} | Subject: "${subject}" | ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId, mailRecord };
  } catch (err) {
    mailRecord.status = 'failed';
    mailRecord.error = err.message;
    emailOutbox.unshift(mailRecord);
    console.warn(`[EMAIL NOTICE - Brevo SMTP] Unable to deliver live mail to ${to}: ${err.message}`);
    // Return gracefully so user flows don't crash
    return { success: false, error: err.message, mailRecord };
  }
}

/**
 * 1. FORGOT PASSWORD NOTIFICATION
 */
export async function sendPasswordResetEmail({ to, name = 'Valued User', code, expiresMinutes = 15 }) {
  const title = 'Password Reset Verification Code';
  const subtitle = 'Complete your password recovery request';

  const contentHtml = `
    <p>Hello <strong style="color: #ffffff;">${name}</strong>,</p>
    <p>We received a request to reset the password for your university account associated with <strong style="color: #f59e0b;">${to}</strong>.</p>
    
    <div style="margin: 28px 0; padding: 24px; background-color: #070e20; border: 1px solid #334155; border-radius: 12px; text-align: center;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 8px;">
        6-Digit Verification Code
      </div>
      <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f59e0b; font-family: monospace;">
        ${code}
      </div>
      <div style="font-size: 12px; color: #ef4444; margin-top: 10px;">
        ⏱️ This code expires in ${expiresMinutes} minutes
      </div>
    </div>

    <p style="font-size: 13px; color: #94a3b8;">
      Enter this code in the password reset window to choose a new password. If you did not make this request, please disregard this email or report it to University IT immediately.
    </p>
  `;

  const html = renderEmailLayout({
    title,
    subtitle,
    contentHtml,
    badgeText: 'SECURITY CODE',
    badgeColor: '#f59e0b',
  });

  return sendMail({
    to,
    subject: `🔐 ${code} is your SECS Password Reset Code`,
    html,
    text: `Your SECS password reset code is: ${code}. Valid for ${expiresMinutes} minutes.`,
  });
}

/**
 * 2. ADMIN CREATES HIGHER AUTHORITY ACCOUNT
 */
export async function sendHigherAuthorityAccountEmail({
  to,
  name,
  email,
  password,
  department = 'Academic Affairs & Institutional Oversight',
  portalUrl = 'https://smart-equipment-care-system.vercel.app',
}) {
  const title = 'Higher Authority Account Provisioned';
  const subtitle = 'Administrative access credentials and authorization details';

  const contentHtml = `
    <p>Dear <strong style="color: #ffffff;">${name}</strong>,</p>
    <p>The System Administrator has provisioned your <strong>Higher Authority</strong> administrative account on the University Smart Equipment Care System (SECS).</p>
    
    <div style="margin: 24px 0; padding: 22px; background-color: #070e20; border: 1px solid #1e293b; border-radius: 12px;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #38bdf8; margin-bottom: 14px;">
        Official Account Credentials
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #94a3b8; width: 140px;">Full Name:</td>
          <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Portal Role:</td>
          <td style="padding: 6px 0; color: #38bdf8; font-weight: 600;">Higher Authority</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Department:</td>
          <td style="padding: 6px 0; color: #cbd5e1;">${department}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Login Email:</td>
          <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Initial Password:</td>
          <td style="padding: 6px 0;">
            <code style="background-color: #1e293b; color: #f59e0b; padding: 3px 8px; border-radius: 6px; font-size: 14px; font-weight: 700;">${password}</code>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: #050d1f; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 8px;">
        Log In to Higher Authority Portal →
      </a>
    </div>

    <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
      🔒 <strong>Security Advice:</strong> Please log in to your portal and update your password immediately. As Higher Authority, your account has full approval privileges for campus repair budgets, SLA reviews, and incident escalations.
    </p>
  `;

  const html = renderEmailLayout({
    title,
    subtitle,
    contentHtml,
    badgeText: 'AUTHORITY ACCESS',
    badgeColor: '#38bdf8',
  });

  return sendMail({
    to,
    subject: `🏛️ Higher Authority Account Provisioned — ${name}`,
    html,
    text: `Your SECS Higher Authority account has been created. Email: ${email}, Temporary Password: ${password}. Portal URL: ${portalUrl}`,
  });
}

/**
 * 3. HIGHER AUTHORITY CREATES STAFF / TECHNICIAN / ACCOUNTS ACCOUNT
 */
export async function sendStaffAccountEmail({
  to,
  name,
  email,
  password,
  role = 'technician',
  department = 'Facilities & IT Management',
  labName,
  portalUrl = 'https://smart-equipment-care-system.vercel.app',
}) {
  const roleDisplay =
    role === 'technician'
      ? 'Lab Technician'
      : role === 'accounts'
        ? 'Accounts Officer'
        : role.charAt(0).toUpperCase() + role.slice(1);

  const title = 'Staff Account Created';
  const subtitle = `You have been granted ${roleDisplay} access on the campus care system`;

  const contentHtml = `
    <p>Hello <strong style="color: #ffffff;">${name}</strong>,</p>
    <p>Higher Authority has created your official staff account on the University Smart Equipment Care System (SECS).</p>
    
    <div style="margin: 24px 0; padding: 22px; background-color: #070e20; border: 1px solid #1e293b; border-radius: 12px;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #10b981; margin-bottom: 14px;">
        Staff Credentials & Assignment
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #94a3b8; width: 140px;">Full Name:</td>
          <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Designation / Role:</td>
          <td style="padding: 6px 0; color: #10b981; font-weight: 600;">${roleDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Department:</td>
          <td style="padding: 6px 0; color: #cbd5e1;">${department}</td>
        </tr>
        ${
          labName
            ? `<tr>
                <td style="padding: 6px 0; color: #94a3b8;">Assigned Lab:</td>
                <td style="padding: 6px 0; color: #f59e0b; font-weight: 600;">${labName}</td>
              </tr>`
            : ''
        }
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Login Email:</td>
          <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Initial Password:</td>
          <td style="padding: 6px 0;">
            <code style="background-color: #1e293b; color: #f59e0b; padding: 3px 8px; border-radius: 6px; font-size: 14px; font-weight: 700;">${password}</code>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #050d1f; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 8px;">
        Access Staff Portal →
      </a>
    </div>

    <p style="font-size: 12px; color: #94a3b8;">
      Please keep your credentials confidential. You can update your password at any time via the login recovery page.
    </p>
  `;

  const html = renderEmailLayout({
    title,
    subtitle,
    contentHtml,
    badgeText: roleDisplay.toUpperCase(),
    badgeColor: '#10b981',
  });

  return sendMail({
    to,
    subject: `🛠️ SECS Staff Account Credentials — ${roleDisplay} (${name})`,
    html,
    text: `Your SECS staff account has been created. Role: ${roleDisplay}, Email: ${email}, Temporary Password: ${password}. Portal URL: ${portalUrl}`,
  });
}

/**
 * 4A. ISSUE SOLVED / RESOLVED NOTIFICATION
 */
export async function sendIssueResolvedNotice({
  to,
  reporterName = 'Reporter',
  ticketId,
  equipmentType,
  labName,
  description,
  resolvedBy = 'Assigned Lab Technician',
  portalUrl = 'https://smart-equipment-care-system.vercel.app',
}) {
  const title = `Equipment Fault Resolved — ${ticketId}`;
  const subtitle = 'The reported maintenance issue has been confirmed repaired and closed';

  const contentHtml = `
    <p>Dear <strong style="color: #ffffff;">${reporterName}</strong>,</p>
    <p>Great news! The equipment fault you reported has been inspected, repaired, and confirmed fully operational.</p>
    
    <div style="margin: 24px 0; padding: 22px; background-color: #070e20; border: 1px solid #10b981; border-radius: 12px;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #10b981; margin-bottom: 14px;">
        Resolution Report
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #94a3b8; width: 140px;">Ticket ID:</td>
          <td style="padding: 6px 0; color: #f59e0b; font-weight: 700; font-family: monospace;">${ticketId}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Equipment:</td>
          <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${equipmentType}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Laboratory:</td>
          <td style="padding: 6px 0; color: #cbd5e1;">${labName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Original Report:</td>
          <td style="padding: 6px 0; color: #94a3b8; font-style: italic;">"${description}"</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Status:</td>
          <td style="padding: 6px 0;">
            <span style="background-color: rgba(16, 185, 129, 0.2); color: #10b981; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; border: 1px solid #10b981;">
              RESOLVED (CLOSED)
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Resolved By:</td>
          <td style="padding: 6px 0; color: #ffffff;">${resolvedBy}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #050d1f; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 8px;">
        View in Campus Transparency Tracker →
      </a>
    </div>

    <p style="font-size: 13px; color: #94a3b8;">
      Thank you for being proactive and reporting equipment faults. Your help keeps campus laboratories operating safely and reliably for all students and researchers.
    </p>
  `;

  const html = renderEmailLayout({
    title,
    subtitle,
    contentHtml,
    badgeText: 'RESOLVED',
    badgeColor: '#10b981',
  });

  return sendMail({
    to,
    subject: `✅ Equipment Fault Resolved: ${equipmentType} (${ticketId})`,
    html,
    text: `Ticket ${ticketId} for ${equipmentType} at ${labName} has been repaired and resolved by ${resolvedBy}.`,
  });
}

/**
 * 4B. 7-DAY UNSOLVED PROGRESS NOTIFICATION
 */
export async function sendIssue7DayStatusUpdate({
  to,
  reporterName = 'Reporter',
  ticketId,
  equipmentType,
  labName,
  currentStage,
  pendingWith,
  status,
  submittedAt,
  portalUrl = 'https://smart-equipment-care-system.vercel.app',
}) {
  const title = `7-Day Progress Update: Ticket ${ticketId}`;
  const subtitle = 'Status overview for your ongoing equipment fault report';

  const contentHtml = `
    <p>Dear <strong style="color: #ffffff;">${reporterName}</strong>,</p>
    <p>This is an automated 7-day progress update on the equipment issue you submitted on <strong style="color: #ffffff;">${submittedAt || '7 days ago'}</strong>.</p>
    <p>The repair is actively being handled through university procurement and lab maintenance workflows. Here is the current condition of your report:</p>
    
    <div style="margin: 24px 0; padding: 22px; background-color: #070e20; border: 1px solid #f59e0b; border-radius: 12px;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #f59e0b; margin-bottom: 14px;">
        Current Problem Condition & Stage
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #94a3b8; width: 140px;">Ticket ID:</td>
          <td style="padding: 6px 0; color: #f59e0b; font-weight: 700; font-family: monospace;">${ticketId}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Equipment:</td>
          <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${equipmentType}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Laboratory:</td>
          <td style="padding: 6px 0; color: #cbd5e1;">${labName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Current Status:</td>
          <td style="padding: 6px 0; color: #38bdf8; font-weight: 600;">${status}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Current Stage:</td>
          <td style="padding: 6px 0; color: #ffffff;">${currentStage || 'Under assessment'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Pending Action:</td>
          <td style="padding: 6px 0; color: #f59e0b; font-weight: 600;">${pendingWith || 'Assigned Personnel'}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: #050d1f; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 8px;">
        Track Live Progress on Public Feed →
      </a>
    </div>

    <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
      ℹ️ In accordance with campus SLA guidelines, our team has escalated this ticket to ensure budget disbursement and replacement parts are finalized as quickly as possible. You will receive another notification when work is completed.
    </p>
  `;

  const html = renderEmailLayout({
    title,
    subtitle,
    contentHtml,
    badgeText: '7-DAY STATUS CHECK',
    badgeColor: '#f59e0b',
  });

  return sendMail({
    to,
    subject: `⏳ 7-Day Update: Equipment Issue ${ticketId} (${equipmentType})`,
    html,
    text: `7-Day Update for Ticket ${ticketId} (${equipmentType} at ${labName}). Current status: ${status}, Stage: ${currentStage}, Pending With: ${pendingWith}.`,
  });
}
