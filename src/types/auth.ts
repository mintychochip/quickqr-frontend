import type { PlanId } from '@/lib/pricing';

export interface User {
  id: string;
  email: string;
  created_at: string;
  /** The plan in force right now. The hosted server sends these three; the Go server sends none, which reads as free. */
  plan?: PlanId;
  /** When the plan ends, or null for free. */
  plan_until?: string | null;
  /** True for an account named in the server's ADMIN_EMAILS. */
  is_admin?: boolean;
}

