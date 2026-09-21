import type { ReactNode } from "react";

// Tiny safe renderer for the quiz editor markup:
//   ^text^  →  superscript        (e.g. 10^-3^)
//   ~text~  →  subscript          (e.g. H~2~O)
// Renders plain React elements only — never dangerouslySetInnerHTML.
// Lone ^ or ~ (unpaired) stay as literal characters.

function parseSegments(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let plain = "";

  const flush = () => {
    if (!plain) return;
    const parts = plain.split("\n");
    parts.forEach((seg, idx) => {
      if (idx > 0) out.push(<br key={`br-${out.length}`} />);
      if (seg) out.push(<span key={`t-${out.length}`}>{seg}</span>);
    });
    plain = "";
  };

  for (let i = 0; i < text.length; ) {
    const ch = text[i]!;
    if (ch === "^" || ch === "~") {
      const end = text.indexOf(ch, i + 1);
      if (end === -1 || text.slice(i + 1, end).includes("\n")) {
        plain += ch;
        i += 1;
        continue;
      }
      flush();
      const content = text.slice(i + 1, end);
      const Tag = ch === "~" ? "sub" : "sup";
      out.push(<Tag key={`m-${out.length}`}>{content}</Tag>);
      i = end + 1;
      continue;
    }
    plain += ch;
    i += 1;
  }
  flush();
  return out;
}

export default function RichText({ text }: { text: string }) {
  return <>{parseSegments(text ?? "")}</>;
}