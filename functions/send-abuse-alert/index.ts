import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface AbuseAlertPayload {
  userId: string;
  userEmail: string;
  abuseType: string;
  severity: string;
  evidence: Record<string, unknown>;
  timestamp: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload: AbuseAlertPayload = await req.json();
  const adminEmail = Deno.env.get('ABUSE_ALERT_EMAIL');

  if (!adminEmail) {
    console.error('ABUSE_ALERT_EMAIL not configured');
    return new Response('Internal server error', { status: 500 });
  }

  const evidenceText = JSON.stringify(payload.evidence, null, 2);
  const emailBody = `
Abuse Detection Alert

A high-severity abuse incident has been auto-blocked.

User: ${payload.userEmail} (${payload.userId})
Type: ${payload.abuseType}
Severity: ${payload.severity}
Time: ${payload.timestamp}

Evidence:
${evidenceText}

View in Admin Panel: ${Deno.env.get('APP_URL') || 'https://quickqr.app'}/admin

---
QuickQR Abuse Detection System
  `.trim();

  // Use Supabase's built-in email sending via Edge Function
  // or integrate with Resend, SendGrid, etc.
  const { error } = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'QuickQR Abuse <abuse@quickqr.app>',
      to: adminEmail,
      subject: `[QuickQR] High-Severity Abuse Auto-Blocked: ${payload.abuseType}`,
      text: emailBody,
    }),
  }).then(r => r.json());

  if (error) {
    console.error('Failed to send abuse alert email:', error);
    return new Response('Failed to send alert', { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
