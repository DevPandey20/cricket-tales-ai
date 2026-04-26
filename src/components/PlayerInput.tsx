import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AVAILABLE_PLAYERS } from "@/lib/ipl-data";

interface PlayerInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  optional?: boolean;
}

/**
 * Universal player-name input with combined suggestions:
 *  - Live suggestions from Supabase (ball_by_ball) — real Cricsheet names
 *  - Falls back to the hardcoded AVAILABLE_PLAYERS list when DB is silent
 */
export const PlayerInput = ({
  value,
  onChange,
  placeholder = "e.g. Virat Kohli or V Kohli",
  label,
  optional,
}: PlayerInputProps) => {
  const [dbSuggestions, setDbSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setDbSuggestions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ball_by_ball")
        .select("batter")
        .ilike("batter", `%${q}%`)
        .limit(40);
      if (cancelled || !data) return;
      const uniq = Array.from(new Set(data.map((r: any) => r.batter as string))).slice(0, 6);
      setDbSuggestions(uniq);
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  const localSuggestions =
    value.trim().length >= 2
      ? AVAILABLE_PLAYERS.filter((p) =>
          p.toLowerCase().includes(value.trim().toLowerCase()),
        ).slice(0, 4)
      : [];

  const merged = Array.from(new Set([...dbSuggestions, ...localSuggestions])).slice(0, 8);

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label} {optional && <span className="opacity-60">(optional)</span>}
        </label>
      )}
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {merged.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {merged.map((s) => (
            <Badge
              key={s}
              variant="secondary"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
              onClick={() => onChange(s)}
            >
              {s}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
