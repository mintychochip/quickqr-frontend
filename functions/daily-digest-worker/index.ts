import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Daily digest configuration
const DIGEST_LOOKBACK_HOURS = 24;
const MAX_QR_CODES_PER_DIGEST = 50; // Limit to prevent huge emails

interface UserDigestPrefs {
  user_id: string;
  email_address: string | null;
  digest_time: string; // HH:MM format
}

interface QRHealthChange {
  qr_id: string;
  qr_name: string;
  short_code: string;
  destination_url: string;
  previous_status: string | null;
  current_status: string;
  changed_at: string;
  error_message: string | null;
  http_status: number | null;
  check_count: number;
}

interface DigestSummary {
  total_qrs: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
  changed_count: number;
  new_issues: QRHealthChange[];
  resolved_issues: QRHealthChange[];
  ongoing_issues: QRHealthChange[];
}

// Get users who have enabled daily digests and it's their digest time
async function getUsersForDigest(supabaseClient: any): Promise<UserDigestPrefs[]> {
  const now = new Date();
  const currentHour = now.getHours().toString().padStart(2, '0');
  const currentMinute = Math.floor(now.getMinutes() / 30) * 30; // Check every 30 min window
  const currentTimePrefix = `${currentHour}:${currentMinute.toString().padStart(2, '0')}`;

  // Get users with daily digest enabled whose digest time matches current window
  const { data: prefs, error } = await supabaseClient
    .from('user_health_notification_prefs')
    .select('user_id, email_address, digest_time')
    .eq('daily_digest_enabled', true)
    .eq('email_enabled', true)
    .ilike('digest_time', `${currentTimePrefix}%`);

  if (error) {
    console.error('Error fetching digest preferences:', error);
    return [];
  }

  // For users without explicit email, we need to fetch from auth
  const usersNeedingAuthEmail = (prefs || [])
    .filter((p: UserDigestPrefs) => !p.email_address)
    .map((p: UserDigestPrefs) => p.user_id);

  let authEmails: Record<string, string> = {};
  if (usersNeedingAuthEmail.length > 0) {
    // Get emails from auth.users
    const { data: authUsers, error: authError } = await supabaseClient
      .from('users')
      .select('id, email')
      .in('id', usersNeedingAuthEmail);

    if (!authError && authUsers) {
      authEmails = authUsers.reduce((acc: Record<string, string>, u: any) => {
        acc[u.id] = u.email;
        return acc;
      }, {});
    }
  }

  // Merge auth emails into prefs
  return (prefs || []).map((p: UserDigestPrefs) => ({
    ...p,
    email_address: p.email_address || authEmails[p.user_id] || null,
  })).filter((p: UserDigestPrefs) => p.email_address); // Only include users with valid emails
}

// Get health changes for a specific user in the past 24 hours
async function getUserHealthChanges(
  supabaseClient: any,
  userId: string
): Promise<DigestSummary> {
  const since = new Date(Date.now() - DIGEST_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  // Get all QR codes for this user with their latest health status
  const { data: qrCodes, error: qrError } = await supabaseClient
    .from('qr_codes')
    .select(`
      id,
      name,
      short_code,
      destination_url,
      qr_health_checks!left(
        status,
        checked_at,
        error_message,
        http_status
      ),
      qr_health_configs!left(
        enabled
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_QR_CODES_PER_DIGEST);

  if (qrError || !qrCodes) {
    console.error('Error fetching QR codes:', qrError);
    return {
      total_qrs: 0,
      healthy_count: 0,
      warning_count: 0,
      critical_count: 0,
      changed_count: 0,
      new_issues: [],
      resolved_issues: [],
      ongoing_issues: [],
    };
  }

  const summary: DigestSummary = {
    total_qrs: qrCodes.length,
    healthy_count: 0,
    warning_count: 0,
    critical_count: 0,
    changed_count: 0,
    new_issues: [],
    resolved_issues: [],
    ongoing_issues: [],
  };

  // Process each QR code
  for (const qr of qrCodes) {
    const checks = qr.qr_health_checks || [];
    const latestCheck = checks[0];
    const previousCheck = checks.find((c: any) => new Date(c.checked_at) < new Date(since));

    const currentStatus = latestCheck?.status || 'unknown';
    const previousStatus = previousCheck?.status || null;

    // Count by status
    if (currentStatus === 'healthy') summary.healthy_count++;
    else if (currentStatus === 'warning') summary.warning_count++;
    else if (currentStatus === 'critical') summary.critical_count++;

    // Check if status changed in the lookback window
    const statusChanged = latestCheck && new Date(latestCheck.checked_at) >= new Date(since) &&
      previousStatus !== null && previousStatus !== currentStatus;

    if (statusChanged) {
      summary.changed_count++;
      const change: QRHealthChange = {
        qr_id: qr.id,
        qr_name: qr.name || 'Unnamed QR',
        short_code: qr.short_code,
        destination_url: qr.destination_url,
        previous_status: previousStatus,
        current_status: currentStatus,
        changed_at: latestCheck.checked_at,
        error_message: latestCheck.error_message,
        http_status: latestCheck.http_status,
        check_count: checks.length,
      };

      // Categorize the change
      if (previousStatus === 'healthy' && (currentStatus === 'warning' || currentStatus === 'critical')) {
        summary.new_issues.push(change);
      } else if ((previousStatus === 'warning' || previousStatus === 'critical') && currentStatus === 'healthy') {
        summary.resolved_issues.push(change);
      } else {
        summary.ongoing_issues.push(change);
      }
    } else if (currentStatus === 'warning' || currentStatus === 'critical') {
      // Include ongoing issues that haven't changed but are still problematic
      summary.ongoing_issues.push({
        qr_id: qr.id,
        qr_name: qr.name || 'Unnamed QR',
        short_code: qr.short_code,
        destination_url: qr.destination_url,
        previous_status: currentStatus,
        current_status: currentStatus,
        changed_at: latestCheck?.checked_at || since,
        error_message: latestCheck?.error_message || null,
        http_status: latestCheck?.http_status || null,
        check_count: checks.length,
      });
    }
  }

  return summary;
}

// Record digest delivery
async function recordDigestDelivery(
  supabaseClient: any,
  userId: string,
  email: string,
  summary: DigestSummary,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const { error } = await supabaseClient
    .from('daily_digest_deliveries')
    .insert({
      user_id: userId,
      email_address: email,
      total_qrs: summary.total_qrs,
      healthy_count: summary.healthy_count,
      warning_count: summary.warning_count,
      critical_count: summary.critical_count,
      new_issues_count: summary.new_issues.length,
      resolved_issues_count: summary.resolved_issues.length,
      status: success ? 'sent' : 'failed',
      error_message: errorMessage || null,
    });

  if (error) {
    console.error('Error recording digest delivery:', error);
  }
}

// Send digest email via Resend
async function sendDigestEmail(
  email: string,
  summary: DigestSummary
): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping digest email');
    return false;
  }

  const statusEmoji = summary.critical_count > 0 ? '🔴' : summary.warning_count > 0 ? '🟡' : '🟢';
  
  // Build issues list HTML
  let issuesHtml = '';
  
  if (summary.new_issues.length > 0) {
    issuesHtml += `<h3>🔴 New Issues (${summary.new_issues.length})</h3><ul>`;
    for (const issue of summary.new_issues.slice(0, 10)) {
      issuesHtml += `
        <li>
          <strong>${issue.qr_name}</strong> (${issue.short_code})<br>
          Status changed from ${issue.previous_status} → ${issue.current_status}<br>
          ${issue.error_message ? `Error: ${issue.error_message}<br>` : ''}
          <a href="https://quickqr.app/qr/${issue.qr_id}">View QR Code</a>
        </li>
      `;
    }
    if (summary.new_issues.length > 10) {
      issuesHtml += `<li>... and ${summary.new_issues.length - 10} more new issues</li>`;
    }
    issuesHtml += '</ul>';
  }

  if (summary.resolved_issues.length > 0) {
    issuesHtml += `<h3>✅ Resolved Issues (${summary.resolved_issues.length})</h3><ul>`;
    for (const issue of summary.resolved_issues.slice(0, 10)) {
      issuesHtml += `
        <li>
          <strong>${issue.qr_name}</strong> (${issue.short_code})<br>
          Status changed from ${issue.previous_status} → ${issue.current_status}
        </li>
      `;
    }
    if (summary.resolved_issues.length > 10) {
      issuesHtml += `<li>... and ${summary.resolved_issues.length - 10} more resolved issues</li>`;
    }
    issuesHtml += '</ul>';
  }

  if (summary.ongoing_issues.length > 0 && summary.new_issues.length === 0) {
    issuesHtml += `<h3>⚠️ Ongoing Issues (${summary.ongoing_issues.length})</h3><ul>`;
    for (const issue of summary.ongoing_issues.slice(0, 5)) {
      issuesHtml += `
        <li>
          <strong>${issue.qr_name}</strong> (${issue.short_code}) - ${issue.current_status}<br>
          ${issue.error_message ? `Error: ${issue.error_message}<br>` : ''}
          <a href="https://quickqr.app/qr/${issue.qr_id}">View QR Code</a>
        </li>
      `;
    }
    issuesHtml += '</ul>';
  }

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'QuickQR Health <health@quickqr.app>',
        to: email,
        subject: `${statusEmoji} Your Daily QR Health Digest - ${dateStr}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Daily QR Health Digest</h2>
            <p style="color: #666;">${dateStr}</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Summary</h3>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px;"><strong>Total QR Codes:</strong></td>
                  <td style="padding: 8px;">${summary.total_qrs}</td>
                </tr>
                <tr style="color: #22c55e;">
                  <td style="padding: 8px;"><strong>🟢 Healthy:</strong></td>
                  <td style="padding: 8px;">${summary.healthy_count}</td>
                </tr>
                <tr style="color: #eab308;">
                  <td style="padding: 8px;"><strong>🟡 Warning:</strong></td>
                  <td style="padding: 8px;">${summary.warning_count}</td>
                </tr>
                <tr style="color: #ef4444;">
                  <td style="padding: 8px;"><strong>🔴 Critical:</strong></td>
                  <td style="padding: 8px;">${summary.critical_count}</td>
                </tr>
                <tr>
                  <td style="padding: 8px;"><strong>Status Changes (24h):</strong></td>
                  <td style="padding: 8px;">${summary.changed_count}</td>
                </tr>
              </table>
            </div>

            ${issuesHtml}

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <a href="https://quickqr.app/dashboard" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Full Dashboard
              </a>
              <p style="margin-top: 20px; font-size: 12px; color: #999;">
                You're receiving this because you enabled daily digests in your QR health notification settings.<br>
                <a href="https://quickqr.app/settings/notifications">Manage notification preferences</a>
              </p>
            </div>
          </div>
        `,
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('Failed to send digest email:', err);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  // Auth check - verify cron secret if provided
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');

  if (expectedSecret && cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ 
        error: 'SUPABASE_SERVICE_ROLE_KEY not configured' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    const startTime = Date.now();
    const stats = {
      users_processed: 0,
      emails_sent: 0,
      emails_failed: 0,
      total_qrs_checked: 0,
    };

    // Get users who need digests right now
    const users = await getUsersForDigest(supabaseClient);
    console.log(`Found ${users.length} users for daily digest`);

    // Process each user
    for (const user of users) {
      try {
        // Get health summary for this user
        const summary = await getUserHealthChanges(supabaseClient, user.user_id);
        stats.total_qrs_checked += summary.total_qrs;

        // Send digest email
        const sent = await sendDigestEmail(user.email_address!, summary);
        
        // Record delivery
        await recordDigestDelivery(
          supabaseClient,
          user.user_id,
          user.email_address!,
          summary,
          sent,
          sent ? undefined : 'Failed to send email'
        );

        if (sent) {
          stats.emails_sent++;
          console.log(`Digest sent to ${user.email_address} (${summary.total_qrs} QR codes)`);
        } else {
          stats.emails_failed++;
          console.log(`Failed to send digest to ${user.email_address}`);
        }

        stats.users_processed++;

        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err) {
        console.error(`Error processing digest for user ${user.user_id}:`, err);
        stats.emails_failed++;
      }
    }

    const duration = Date.now() - startTime;

    const response = {
      success: true,
      stats,
      duration_ms: duration,
      processed_at: new Date().toISOString(),
    };

    console.log('Daily digest worker completed:', response);

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Daily digest worker error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
