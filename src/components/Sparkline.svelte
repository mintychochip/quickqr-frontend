<script lang="ts">
  import { cn } from '@/lib/utils';

  type Props = {
    points: number[];
    class?: string;
    width?: number;
    height?: number;
    label?: string;
  };

  let {
    points,
    class: className = '',
    width = 64,
    height = 20,
    label = 'Scan trend over the last six hours',
  }: Props = $props();

  const geometry = $derived.by(() => {
    const values = points.length > 0 ? points : [0];
    const max = Math.max(...values);
    const min = Math.min(...values);
    const flat = max === min;
    const pad = 2;
    const span = Math.max(1, max - min);
    const coords = values.map((value, index) => ({
      x: pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2),
      y: flat ? height / 2 : height - pad - ((value - min) / span) * (height - pad * 2),
    }));
    const line = coords
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ');
    const last = coords[coords.length - 1];
    return {
      line,
      area: `${line} L${last.x.toFixed(2)} ${height} L${coords[0].x.toFixed(2)} ${height} Z`,
      last,
    };
  });
</script>

<svg
  viewBox={`0 0 ${width} ${height}`}
  class={cn('sparkline', className)}
  role="img"
  aria-label={label}
>
  <path d={geometry.area} fill="currentColor" opacity="0.1" />
  <path
    d={geometry.line}
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    vector-effect="non-scaling-stroke"
  />
  <circle cx={geometry.last.x} cy={geometry.last.y} r="1.8" fill="currentColor" />
</svg>

<style>
  /* In `@layer components` so a caller's `h-6 w-20` utility wins over this default. */
  @layer components {
    .sparkline {
      height: 1rem;
      width: 3.5rem;
      overflow: visible;
    }
  }
</style>
