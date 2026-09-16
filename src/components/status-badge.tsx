import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/format";

/**
 * One status vocabulary everywhere. Colour carries meaning, not decoration:
 * voting = brand (the live, act-now state) · locked/booked = success dot · draft = quiet outline ·
 * expired = warning dot · cancelled = destructive.
 */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  if (status === "voting") return <Badge className={className}>{statusLabel[status]}</Badge>;
  if (status === "cancelled") return <Badge variant="destructive" className={className}>{statusLabel[status]}</Badge>;
  const dot = status === "locked" || status === "booked" || status === "completed" ? "bg-success" : status === "expired" ? "bg-warning" : "bg-muted-foreground/60";
  return (
    <Badge variant="outline" className={cn("gap-1.5", className)}>
      <span className={cn("size-1.5 rounded-full", dot)} />
      {statusLabel[status]}
    </Badge>
  );
}
