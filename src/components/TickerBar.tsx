import { useEffect, useState } from "react";
import { getTicker } from "@/services/firestore";
import type { Ticker as TickerType } from "@/types";

interface TickerBarProps {
  text?: string;
  color?: string;
  bgColor?: string;
  active?: boolean;
  speed?: number;
}

export default function TickerBar({ text, color, bgColor, active, speed }: TickerBarProps) {
  const [globalTicker, setGlobalTicker] = useState<TickerType | null>(null);

  useEffect(() => {
    if (text === undefined) {
      getTicker().then(setGlobalTicker).catch(() => {});
    }
  }, [text]);

  const ticker = text !== undefined
    ? { text, color: color || "#FFD700", bgColor: bgColor || "#1a1a2e", active: active !== false, speed: speed || 20 }
    : globalTicker;

  if (!ticker || !ticker.active || !ticker.text.trim()) return null;

  const duration = (ticker.speed || 20) + "s";

  return (
    <div
      className="overflow-hidden whitespace-nowrap rounded-lg py-2 px-4 text-sm font-medium"
      style={{ backgroundColor: ticker.bgColor || "#1a1a2e", color: ticker.color, border: `1px solid ${ticker.color}40` }}
    >
      <div dir="ltr" className="inline-block" style={{ minWidth: "100%", animation: `marquee ${duration} linear infinite`, whiteSpace: "nowrap" }}>
        {ticker.text}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
