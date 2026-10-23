import type { PlanId } from '@/lib/pricing';

/** Only a paid plan can be given. */
export type GiftPlan = Exclude<PlanId, 'free'>;

export type GiftStatus = 'active' | 'used up' | 'expired' | 'revoked';

/** A gift as an administrator sees it. The link's token is never part of it. */
export interface Gift {
  id: string;
  plan: GiftPlan;
  /** How long the plan lasts, counted from the moment someone claims it. */
  days: number;
  max_uses: number;
  uses: number;
  /** The link stops working after this instant. */
  redeem_by: string | null;
  /** A private label for administrators. */
  note: string;
  /** The administrator's email, or `cli` for a gift made with scripts/gift.ts. */
  created_by: string;
  created_at: string;
  revoked_at: string | null;
  status: GiftStatus;
}

/** The answer to making a gift: the only time its link exists in a form that can be copied. */
export interface GiftCreated extends Gift {
  token: string;
  link: string;
}

export interface NewGift {
  plan: GiftPlan;
  days: number;
  uses?: number;
  link_days?: number;
  note?: string;
}

/** What claiming a gift answered. `granted` is false when this person had already claimed it. */
export interface GiftClaimed {
  plan: GiftPlan;
  until: string;
  granted: boolean;
}
