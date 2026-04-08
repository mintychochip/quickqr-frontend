import QRCode from 'qrcode';

export interface LogoOverlayOptions {
  logoDataUrl: string;
  size?: number; // Size in pixels (default: 60)
  shape?: 'square' | 'circle' | 'rounded';
  padding?: number; // White padding around logo (default: 4)
}

/**
 * Applies a logo overlay to a QR code canvas
 * Returns a new canvas with the logo centered
 */
export async function applyLogoOverlay(
  qrCanvas: HTMLCanvasElement,
  logoOptions: LogoOverlayOptions
): Promise<HTMLCanvasElement> {
  const { logoDataUrl, size = 60, shape = 'square', padding = 4 } = logoOptions;
  
  // Create output canvas
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = qrCanvas.width;
  outputCanvas.height = qrCanvas.height;
  
  const ctx = outputCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // 1. Draw QR code
  ctx.drawImage(qrCanvas, 0, 0);
  
  // 2. Load logo
  const logoImg = await loadImage(logoDataUrl);
  
  // 3. Calculate center position
  const x = (outputCanvas.width - size) / 2;
  const y = (outputCanvas.height - size) / 2;
  
  // 4. Draw white background for logo area (clear QR modules)
  const bgSize = size + (padding * 2);
  const bgX = x - padding;
  const bgY = y - padding;
  
  ctx.fillStyle = '#ffffff';
  
  if (shape === 'circle') {
    // Draw circular background
    ctx.beginPath();
    ctx.arc(
      bgX + bgSize / 2,
      bgY + bgSize / 2,
      bgSize / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  } else if (shape === 'rounded') {
    // Draw rounded rectangle background
    const radius = 8;
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgSize, bgSize, radius);
    ctx.fill();
  } else {
    // Square background
    ctx.fillRect(bgX, bgY, bgSize, bgSize);
  }
  
  // 5. Draw logo with clipping if needed
  ctx.save();
  
  if (shape === 'circle') {
    // Create circular clip
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
  } else if (shape === 'rounded') {
    // Create rounded rect clip
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 6);
    ctx.clip();
  }
  
  // Draw the logo
  ctx.drawImage(logoImg, x, y, size, size);
  
  ctx.restore();
  
  return outputCanvas;
}

/**
 * Generates a QR code with logo overlay
 * Returns data URL of the final image
 */
export async function generateQRWithLogo(
  content: string,
  logoDataUrl: string,
  options: {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    logoSize?: number;
    logoShape?: 'square' | 'circle' | 'rounded';
  } = {}
): Promise<string> {
  const {
    width = 300,
    margin = 2,
    errorCorrectionLevel = 'H', // Must be H for logos
    logoSize = 60,
    logoShape = 'square'
  } = options;
  
  // Create canvas for QR
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = width;
  
  // Generate QR code
  await QRCode.toCanvas(canvas, content, {
    width,
    margin,
    errorCorrectionLevel,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
  
  // Apply logo overlay
  const finalCanvas = await applyLogoOverlay(canvas, {
    logoDataUrl,
    size: logoSize,
    shape: logoShape
  });
  
  // Return as data URL
  return finalCanvas.toDataURL('image/png');
}

/**
 * Helper to load an image from data URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load logo image'));
    img.src = src;
  });
}

/**
 * Upload logo to Supabase Storage
 */
export async function uploadLogoToStorage(
  file: File,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { supabase } = await import('../config/supabase');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('logos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      return { url: null, error: error.message };
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);
    
    return { url: publicUrl, error: null };
  } catch (err) {
    return { 
      url: null, 
      error: err instanceof Error ? err.message : 'Failed to upload logo' 
    };
  }
}
