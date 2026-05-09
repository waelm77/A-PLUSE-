import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { iconMap } from "@/lib/constants";
import type { Subject } from "@/types";

interface SubjectCardProps {
  subject: Subject;
}

export default function SubjectCard({ subject }: SubjectCardProps) {
  const Icon = iconMap[subject.icon] || BookOpen;

  return (
    <Link to={`/subject/${subject.id}`}>
      <div
        className="group relative overflow-hidden rounded-3xl p-8 text-center transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl cursor-pointer card-3d glow-border"
        style={{
          background: `linear-gradient(145deg, hsl(var(--card)), ${subject.color}08)`,
          border: `1px solid ${subject.color}20`,
          boxShadow: `0 8px 32px ${subject.color}08`,
        }}
      >
        <div
          className="absolute -top-1/2 -right-1/2 h-[200%] w-[200%] rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle, ${subject.color}25 0%, transparent 70%)`,
          }}
        />
        <div className="absolute inset-0 transition-all duration-500 opacity-0 group-hover:opacity-100" style={{ background: `linear-gradient(to top, ${subject.color}15, transparent)` }} />
        <div className="relative z-10">
          <div
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg icon-3d"
            style={{
              background: `linear-gradient(145deg, ${subject.color}, ${subject.color}cc)`,
              boxShadow: `0 8px 32px ${subject.color}40, 0 2px 8px ${subject.color}20`,
            }}
          >
            <Icon className="h-10 w-10 text-white" />
          </div>
          <h3 className="mb-2 text-2xl font-extrabold" style={{ color: subject.color }}>
            {subject.name}
          </h3>
          {subject.description && (
            <p className="mx-auto max-w-[200px] text-sm text-muted-foreground leading-relaxed">
              {subject.description}
            </p>
          )}
          <div
            className="mx-auto mt-4 inline-block rounded-full px-4 py-1.5 text-sm font-semibold backdrop-blur-sm"
            style={{
              background: `${subject.color}20`,
              color: subject.color,
              border: `1px solid ${subject.color}30`,
            }}
          >
            5 أقسام
          </div>
        </div>
      </div>
    </Link>
  );
}
