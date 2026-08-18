import { useEffect, useState } from "react";
import { getTicker } from "@/services/firestore";
import type { Ticker as TickerType } from "@/types";

interface TickerBarProps {
  text?: string;
  color?: string;
  bgColor?: string;
  active?: boolean;
  speed?: number;
  fontSize?: string;
}

export default function TickerBar({ text, color, bgColor, active, speed, fontSize }: TickerBarProps) {
  const [globalTicker, setGlobalTicker] = useState<TickerType | null>(null);

  useEffect(() => {
    if (text === undefined) {
      getTicker().then(setGlobalTicker).catch(() => {});
    }
  }, [text]);

  const ticker = text !== undefined
    ? { text, color: color || "#FFD700", bgColor: bgColor || "#1a1a2e", active: active !== false, speed: speed || 20, fontSize: fontSize || "14px" }
    : globalTicker;

  if (!ticker || !ticker.active || !ticker.text.trim()) return null;

  const duration = ticker.speed || 20;
  const animName = `ticker-scroll-${duration}`;

  return (
    <>
      <style>{`
        @keyframes ${animName} {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
      <div
        className="overflow-hidden rounded-lg text-sm font-medium"
        style={{
          backgroundColor: ticker.bgColor || "#1a1a2e",
          color: ticker.color,
          border: `1px solid ${ticker.color}40`,
          fontSize: ticker.fontSize || "14px",
          padding: "0.5em 1em",
          lineHeight: 1.6,
        }}
      >
        <div
          className="whitespace-nowrap inline-block"
          style={{
            animation: `${animName} ${duration}s linear infinite`,
            willChange: "transform",
          }}
          dir="auto"
        >
          {ticker.text}
        </div>
      </div>
    </>
  );
}
