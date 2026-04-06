export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Extract QR code ID from /r/[id] path
  const match = path.match(/^\/r\/(.+)$/);
  if (!match) {
    return context.next();
  }
  
  const qrId = match[1];
  
  try {
    // Fetch QR code from Supabase using REST API
    const supabaseUrl = env.PUBLIC_SUPABASE_URL;
    const supabaseKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    
    const response = await fetch(`${supabaseUrl}/rest/v1/qrcodes?id=eq.${qrId}&select=type,content,expirytime,mode`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (!response.ok) {
      return new Response('QR code not found', { status: 404 });
    }
    
    const data = await response.json();
    if (!data || data.length === 0) {
      return new Response('QR code not found', { status: 404 });
    }
    
    const qrCode = data[0];
    
    // Check if expired
    if (qrCode.expirytime && new Date(qrCode.expirytime) < new Date()) {
      return new Response('QR code expired', { status: 410 });
    }
    
    // Record scan (fire and forget)
    if (qrCode.mode === 'dynamic') {
      const ua = request.headers.get('user-agent') || '';
      let os = 'Other';
      if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('Mac')) os = 'macOS';
      else if (ua.includes('Windows')) os = 'Windows';
      else if (ua.includes('Linux')) os = 'Linux';
      
      // Insert scan record
      fetch(`${supabaseUrl}/rest/v1/scans`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore'
        },
        body: JSON.stringify({ qrcode_id: qrId, os })
      }).catch(() => {});
      
      // Increment count via RPC
      fetch(`${supabaseUrl}/rest/v1/rpc/increment_scan_count`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qr_id: qrId })
      }).catch(() => {});
    }
    
    // Build redirect URL
    const content = qrCode.content;
    let redirectUrl = null;
    
    switch (qrCode.type) {
      case 'url':
        redirectUrl = content?.url;
        break;
      case 'email':
        redirectUrl = content?.email ? `mailto:${content.email}` : null;
        break;
      case 'phone':
        redirectUrl = content?.phone ? `tel:${content.phone}` : null;
        break;
      case 'sms':
        redirectUrl = content?.number ? `sms:${content.number}` : null;
        break;
      case 'location':
        redirectUrl = content?.latitude && content?.longitude 
          ? `https://www.google.com/maps?q=${content.latitude},${content.longitude}` 
          : null;
        break;
      default:
        redirectUrl = null;
    }
    
    if (!redirectUrl) {
      return new Response('Invalid QR code destination', { status: 400 });
    }
    
    // Redirect
    return Response.redirect(redirectUrl, 302);
    
  } catch (error) {
    console.error('QR redirect error:', error);
    return new Response('Server error', { status: 500 });
  }
}