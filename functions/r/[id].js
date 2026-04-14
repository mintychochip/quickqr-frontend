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
  const password = url.searchParams.get('password');
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  
  try {
    // Fetch QR code from Supabase using REST API
    const supabaseUrl = env.PUBLIC_SUPABASE_URL;
    const supabaseKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    
    const response = await fetch(`${supabaseUrl}/rest/v1/qrcodes?id=eq.${qrId}&select=type,content,expirytime,mode,password_hash,schedule_enabled,schedule_start,schedule_end,schedule_alternate_content`, {
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
    
    // Check password protection
    if (qrCode.password_hash) {
      if (!password) {
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Password Required</title>
            <style>
              body { font-family: system-ui; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f9fafb; }
              .container { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; }
              h2 { margin: 0 0 1rem; color: #111827; }
              input { padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; width: 200px; margin-bottom: 1rem; }
              button { padding: 0.75rem 1.5rem; background: #14b8a6; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>🔒 Password Required</h2>
              <p>This QR code is password protected.</p>
              <form method="GET">
                <input type="password" name="password" placeholder="Enter password" autofocus>
                <br>
                <button type="submit">Unlock</button>
              </form>
            </div>
          </body>
          </html>
        `, { 
          status: 401, 
          headers: { 'Content-Type': 'text/html' } 
        });
      }
      
      // Simple password check (hash comparison would be better)
      if (password !== qrCode.password_hash) {
        return new Response('Invalid password', { status: 403 });
      }
    }
    
    // Handle scheduled redirects
    let content = qrCode.content;
    if (qrCode.schedule_enabled && qrCode.schedule_start && qrCode.schedule_end) {
      const now = new Date();
      const start = new Date(qrCode.schedule_start);
      const end = new Date(qrCode.schedule_end);
      
      if (now >= start && now <= end && qrCode.schedule_alternate_content) {
        content = qrCode.schedule_alternate_content;
      }
    }
    
    // Build redirect URL early (needed for pixel firing)
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
    
    // Record scan with enhanced tracking
    if (qrCode.mode === 'dynamic') {
      const ua = request.headers.get('user-agent') || '';
      const referrer = request.headers.get('referer') || '';
      const country = request.cf?.country || 'Unknown';
      const city = request.cf?.city || 'Unknown';
      
      let os = 'Other';
      if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('Mac')) os = 'macOS';
      else if (ua.includes('Windows')) os = 'Windows';
      else if (ua.includes('Linux')) os = 'Linux';
      
      // Get lat/lng from CF if available
      const latitude = request.cf?.latitude || null;
      const longitude = request.cf?.longitude || null;
      
      // Simple IP hash for privacy
      const ipHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
      const ipHashHex = Array.from(new Uint8Array(ipHash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
      
      // Insert scan record with full tracking
      fetch(`${supabaseUrl}/rest/v1/scans`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore'
        },
        body: JSON.stringify({ 
          qrcode_id: qrId, 
          os,
          referrer,
          ip_hash: ipHashHex,
          latitude,
          longitude
        })
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
      
      // Trigger webhooks for this scan
      const scanData = {
        os,
        browser: ua.includes('Chrome') ? 'Chrome' : ua.includes('Safari') ? 'Safari' : ua.includes('Firefox') ? 'Firefox' : 'Other',
        country,
        city,
        referrer,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      };
      
      // Fire and forget webhook delivery
      fetch(`${env.APP_URL || 'https://quickqr.app'}/api/v1/webhooks/deliver`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          qr_id: qrId,
          event_type: 'qr.scan',
          scan_data: scanData,
        })
      }).catch(() => {});
      
      // Fire marketing pixels server-side for accurate tracking
      // This works even if the user has ad blockers enabled
      fetch(`${supabaseUrl}/rest/v1/pixel_settings?qr_id=eq.${qrId}&select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })
        .then(res => res.ok ? res.json() : [])
        .then(pixelSettings => {
          if (!pixelSettings || pixelSettings.length === 0) return;
          const pixels = pixelSettings[0];
          
          // Fire Facebook Pixel events
          if (pixels.facebook_enabled && pixels.facebook_pixel_id) {
            const events = pixels.facebook_events || ['PageView'];
            events.forEach(eventName => {
              fetch('https://www.facebook.com/tr/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  id: pixels.facebook_pixel_id,
                  ev: eventName,
                  dl: redirectUrl || '',
                  rl: referrer,
                  ts: Date.now().toString(),
                })
              }).catch(() => {});
            });
          }
          
          // Fire Google Ads conversion
          if (pixels.google_enabled && pixels.google_conversion_id) {
            const convData = {
              send_to: `${pixels.google_conversion_id}${pixels.google_conversion_label ? '/' + pixels.google_conversion_label : ''}`,
              event_callback: () => {},
            };
            fetch(`https://www.googleadservices.com/pagead/conversion/${pixels.google_conversion_id.replace('AW-', '')}/`, {
              method: 'GET',
            }).catch(() => {});
          }
          
          // Fire LinkedIn Insight Tag
          if (pixels.linkedin_enabled && pixels.linkedin_partner_id) {
            fetch('https://px.ads.linkedin.com/collect/', {
              method: 'GET',
              headers: { 'Referer': redirectUrl || '' },
            }).catch(() => {});
          }
        })
        .catch(() => {});
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