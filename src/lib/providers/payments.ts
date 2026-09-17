/**
 * Payment provider interface (UPI mandate / pre-auth in prod, e.g. Razorpay). Mock here.
 * Deterministic failure hook for tests/demos: a reference ending in "-fail" is declined.
 */
export interface PaymentProvider {
  authorise(amount: number, ref: string): { ok: true; intent_ref: string } | { ok: false; reason: string };
  capture(intent_ref: string): { ok: boolean };
  refund(intent_ref: string): { ok: boolean };
}
export const mockPayments: PaymentProvider = {
  authorise(amount, ref) {
    if (ref.endsWith("-fail")) return { ok: false, reason: "Bank declined the UPI mandate" };
    if (amount <= 0) return { ok: false, reason: "Nothing to charge" };
    return { ok: true, intent_ref: `mock_pi_${Math.random().toString(36).slice(2, 10)}` };
  },
  capture: () => ({ ok: true }),
  refund: () => ({ ok: true }),
};
export const payments: PaymentProvider = mockPayments; // swap by PAYMENTS_PROVIDER env in prod
