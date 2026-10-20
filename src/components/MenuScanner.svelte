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

<Dialog bind:open class="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
  {#snippet children({ close })}
    <div data-testid="menu-scanner" class="space-y-3">
      <div>
        <h2 class="text-base font-medium tracking-[-0.03em]">Scan a menu</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Point the camera at a quickqr menu code. The menu on this site opens.
        </p>
      </div>
      {#if errorMsg}
        <p data-testid="menu-scanner-error" class="text-sm text-destructive">{errorMsg}</p>
      {/if}
      <video
        bind:this={videoEl}
        data-testid="menu-scanner-video"
        class="h-52 w-full rounded-xl bg-ink object-cover sm:h-64"
        autoplay
        muted
        playsinline
      ></video>
      <label class="block text-sm text-muted-foreground">
        Photo of a code
        <input
          data-testid="scan-menu-file"
          class="mt-1 block w-full text-sm text-foreground"
          type="file"
          accept="image/*"
          onchange={onPhoto}
        />
      </label>
      <Button type="button" variant="outline" class="w-full" onclick={close}>Close</Button>
    </div>
  {/snippet}
</Dialog>
