import { useEffect, useState } from "react";
import { getTicker } from "@/services/firestore";
import type { Ticker as TickerType } from "@/types";

interface TickerBarProps {
  text?: string;
  color?: string;
  active?: boolean;
  speed?: number;
}

export default function TickerBar({ text, color, active, speed }: TickerBarProps) {
  const [globalTicker, setGlobalTicker] = useState<TickerType | null>(null);

  useEffect(() => {
    if (text === undefined) {
      getTicker().then(setGlobalTicker).catch(() => {});
    }
  }, [text]);

  const ticker = text !== undefined
    ? { text, color: color || "#FFD700", active: active !== false, speed: speed || 20 }
    : globalTicker;

  if (!ticker || !ticker.active || !ticker.text.trim()) return null;

  const duration = (ticker.speed || 20) + "s";

  return (
    <div
      className="overflow-hidden whitespace-nowrap rounded-lg py-2 px-4 text-sm font-medium"
      style={{ backgroundColor: ticker.color + "20", color: ticker.color, border: `1px solid ${ticker.color}40` }}
    >
      <div className="inline-block marquee-content" style={{ animation: `marquee ${duration} linear infinite` }}>
        <span>{ticker.text}</span>
        <span className="mx-8">{ticker.text}</span>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-content {
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}