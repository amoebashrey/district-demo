const TZ = "Asia/Kolkata";
export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: TZ }).replace(":00", "").toLowerCase();
export const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
export const dateRange = (a: string, b: string) => {
  const f = (d: string) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
  return a === b ? f(a) : `${f(a)} – ${f(b)}`;
};
export const countdown = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
};
export const firstName = (n: string) => n.split(" ")[0];
export const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
export const vibeLabel: Record<string, string> = { chill: "Chill", loud: "Loud", fancy: "Fancy", "cheap-and-cheerful": "Cheap & cheerful", "date-ish": "Date-ish", "big-group": "Big group" };
export const bandLabel: Record<string, string> = { "₹": "up to ₹800", "₹₹": "up to ₹1,600", "₹₹₹": "up to ₹2,800", "₹₹₹₹": "up to ₹6,000" };
export const statusLabel: Record<string, string> = { draft: "Draft", voting: "Voting", locked: "Locked", booked: "Booked", completed: "Done", cancelled: "Cancelled", expired: "Expired" };
