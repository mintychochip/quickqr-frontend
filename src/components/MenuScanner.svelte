<script lang="ts">
  import Dialog from '@/lib/components/ui/dialog.svelte';
  import Button from '@/lib/components/ui/button.svelte';
  import { decodeQrImageData, menuLocationFromScan } from '@/lib/scanQr';

  type Props = {
    open?: boolean;
  };

  let { open = $bindable(false) }: Props = $props();

  let videoEl = $state<HTMLVideoElement | null>(null);
  let errorMsg = $state('');
  let stream: MediaStream | null = null;
  let frame = 0;
  let looking = false;

  function stopCamera() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    looking = false;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    if (videoEl) videoEl.srcObject = null;
  }

  function openPayload(payload: string | null) {
    const path = payload ? menuLocationFromScan(payload) : null;
    if (!path) {
      errorMsg = payload ? 'That QR is not a quickqr menu.' : 'No menu code found in that image.';
      return;
    }
    stopCamera();
    open = false;
    window.location.assign(path);
  }

  function tick() {
    if (!looking || !videoEl || videoEl.readyState < 2) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const width = videoEl.videoWidth;
    const height = videoEl.videoHeight;
    if (width < 1 || height < 1) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0, width, height);
    const payload = decodeQrImageData(ctx.getImageData(0, 0, width, height));
    if (payload) {
      const path = menuLocationFromScan(payload);
      if (path) {
        openPayload(payload);
        return;
      }
      errorMsg = 'That QR is not a quickqr menu.';
    }
    frame = requestAnimationFrame(tick);
  }

  async function startCamera() {
    errorMsg = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      errorMsg = 'This browser has no camera access. Choose a photo of the code instead.';
      return;
    }
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (!open) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = next;
      if (videoEl) {
        videoEl.srcObject = next;
        await videoEl.play();
      }
      looking = true;
      frame = requestAnimationFrame(tick);
    } catch {
      errorMsg = 'Camera is blocked. Allow camera access, or choose a photo of the code.';
    }
  }

  async function onPhoto(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    errorMsg = '';
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        errorMsg = 'Could not read that image.';
        return;
      }
      ctx.drawImage(bitmap, 0, 0);
      openPayload(decodeQrImageData(ctx.getImageData(0, 0, canvas.width, canvas.height)));
    } catch {
      errorMsg = 'Could not read that image.';
    }
  }

  $effect(() => {
    if (!open) {
      stopCamera();
      errorMsg = '';
      return;
    }
    void startCamera();
    return () => stopCamera();
  });
</script>

<Dialog bind:open class="menu-scanner-dialog">
  {#snippet children({ close })}
    <div data-testid="menu-scanner" class="menu-scanner-content">
      <div>
        <h2 class="menu-scanner-title">Scan a menu</h2>
        <p class="menu-scanner-desc">
          Point the camera at a quickqr menu code. The menu on this site opens.
        </p>
      </div>
      {#if errorMsg}
        <p data-testid="menu-scanner-error" class="menu-scanner-error">{errorMsg}</p>
      {/if}
      <video
        bind:this={videoEl}
        data-testid="menu-scanner-video"
        class="menu-scanner-video-el"
        autoplay
        muted
        playsinline
      ></video>
      <label class="menu-scanner-file-label">
        Photo of a code
        <input
          data-testid="scan-menu-file"
          class="menu-scanner-file-input"
          type="file"
          accept="image/*"
          onchange={onPhoto}
        />
      </label>
      <Button type="button" variant="outline" class="menu-scanner-close-btn" onclick={close}>Close</Button>
    </div>
  {/snippet}
</Dialog>
<style>
  @layer components {
    .menu-scanner-content {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .menu-scanner-title {
      font-size: 1rem;
      font-weight: 500;
      letter-spacing: -0.03em;
    }

    .menu-scanner-desc {
      margin-top: 0.25rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
      color: var(--muted-foreground);
    }

    .menu-scanner-error {
      font-size: 0.875rem;
      color: var(--destructive);
    }

    .menu-scanner-video-el {
      height: 13rem;
      width: 100%;
      border-radius: calc(var(--radius) * 1.4);
      background-color: var(--ink);
      object-fit: cover;
    }

    .menu-scanner-file-label {
      display: block;
      font-size: 0.875rem;
      color: var(--muted-foreground);
    }

    .menu-scanner-file-input {
      margin-top: 0.25rem;
      display: block;
      width: 100%;
      font-size: 0.875rem;
      color: var(--foreground);
    }
  }

  /* unlayered */

  :global(.menu-scanner-dialog) {
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
  }

  :global(.menu-scanner-close-btn) {
    width: 100%;
  }

  @media (min-width: 40rem) {
    .menu-scanner-video-el {
      height: 16rem;
    }

    :global(.menu-scanner-dialog) {
      max-width: 28rem;
    }
  }
</style>
