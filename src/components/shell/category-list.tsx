"use client";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntryPoint } from "@/components/highlight";
import { day, inr, time } from "@/lib/format";
import type { Item } from "@/lib/services/inventory";

export function CategoryList({ items, basePath }: { items: Item[]; basePath: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground text-center pt-12">Nothing available right now.</p>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base truncate">{item.title}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1 truncate">
                  <MapPin className="size-3 shrink-0" />{item.subtitle}
                </CardDescription>
              </div>
              {item.tags[0] && <Badge variant="secondary" className="shrink-0">{item.tags[0]}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {item.starts_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {day(item.starts_at)}
                    {item.kind !== "dining" ? `, ${time(item.starts_at)}` : ""}
                  </span>
                )}
                <span className="font-medium text-foreground">{inr(item.price)}{item.kind === "dining" ? "/head" : ""}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* EP2 — "Go together" beside the Book button */}
                <EntryPoint n={2}>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`${basePath}/${item.id}?plan=1`}>Go together</Link>
                  </Button>
                </EntryPoint>
                <Button size="sm" asChild>
                  <Link href={`${basePath}/${item.id}`}>Book</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
