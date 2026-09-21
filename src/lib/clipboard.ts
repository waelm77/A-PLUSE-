// ─── Clipboard helpers for the quiz editor ───────────────────────────────
// Word puts BOTH plain text and rich HTML on the clipboard. For equations
// (Insert → Equation) it also places a rendered PNG image. These helpers:
//   • detect/prefer pasted images (so Word equations arrive as pictures),
//   • translate HTML <sub>/<sup> (and vertical-align styles) into the safe
//     in-app markup ^…^ / ~…~ used by <RichText/>.

const BLOCK_TAGS = new Set([
  "p",
  "div",
  "li",
  "tr",
  "td",
  "th",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "section",
  "article",
]);

function endsWithNewline(out: string[]): boolean {
  return out.length > 0 && out[out.length - 1]!.endsWith("\n");
}

function convertNode(node: Node, out: string[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = (node.textContent ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/[\r\n\t\f\v\u2028\u2029]+/g, " ");
    if (t) out.push(t);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const vAlign = (el as HTMLElement).style?.verticalAlign;

  if (tag === "br") {
    if (!endsWithNewline(out)) out.push("\n");
    return;
  }
  // OMML/MathML sub/superscript runs inside equations (m:sub, m:sup).
  if (tag === "m:sub" || tag === "msub") {
    out.push("~");
    for (const c of Array.from(el.childNodes)) convertNode(c, out);
    out.push("~");
    return;
  }
  if (tag === "m:sup" || tag === "msup") {
    out.push("^");
    for (const c of Array.from(el.childNodes)) convertNode(c, out);
    out.push("^");
    return;
  }
  if (tag === "sub" || vAlign === "sub") {
    out.push("~");
    for (const c of Array.from(el.childNodes)) convertNode(c, out);
    out.push("~");
    return;
  }
  if (tag === "sup" || vAlign === "super") {
    out.push("^");
    for (const c of Array.from(el.childNodes)) convertNode(c, out);
    out.push("^");
    return;
  }
  if (BLOCK_TAGS.has(tag)) {
    if (!endsWithNewline(out)) out.push("\n");
    for (const c of Array.from(el.childNodes)) convertNode(c, out);
    if (!endsWithNewline(out)) out.push("\n");
    return;
  }
  // Any other tag (span, b, i, font, a, m:oMath…) → keep only its text.
  for (const c of Array.from(el.childNodes)) convertNode(c, out);
}

function hasImage(ev: { clipboardData: DataTransfer | null }): boolean {
  const items = ev.clipboardData?.items;
  if (!items) return false;
  return Array.from(items).some(
    (it) => it.kind === "file" && it.type.startsWith("image/")
  );
}

/** True when the paste carries an image (e.g. a copied Word equation). */
export function hasClipboardImage(ev: { clipboardData: DataTransfer | null }): boolean {
  return hasImage(ev);
}

/**
 * Decides whether a paste should be treated as an IMAGE. Rich-text copies
 * notoriously ALSO carry an image item on the Windows clipboard, so an image is
 * preferred ONLY when there is no paste-able text at all (screenshot / pasted
 * photo / older-embedded equation). Textual copies (including Word sub/sup or
 * equations) go through the markup path so the quiz can render a real preview.
 */
export function prefersClipboardImage(
  ev: { clipboardData: DataTransfer | null },
  html: string
): boolean {
  if (!hasClipboardImage(ev)) return false;
  const plain = ev.clipboardData?.getData("text") ?? "";
  return !plain.trim() && !html.trim();
}

/** Returns the first pasted image file, or null. */
export function getClipboardImageFile(ev: { clipboardData: DataTransfer | null }): File | null {
  const items = ev.clipboardData?.items;
  if (!items) return null;
  const item = Array.from(items).find(
    (it) => it.kind === "file" && it.type.startsWith("image/")
  );
  return item?.getAsFile() ?? null;
}

/** Converts clipboard HTML into the app's sub/sup markup (single string). */
export function htmlToMarkup(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: string[] = [];
  for (const c of Array.from(doc.body.childNodes)) convertNode(c, out);
  return out.join("");
}

/** Converts clipboard HTML into trimmed markup lines (used to auto-fill options). */
export function htmlToMarkupLines(html: string): string[] {
  return htmlToMarkup(html)
    .split(/\r\n|\r|\n|\u2028|\u2029/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Splits plain clipboard text into trimmed lines (used to auto-fill options). */
export function plainTextLines(plain: string): string[] {
  return plain
    .split(/\r\n|\r|\n|\u2028|\u2029/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Chooses the most faithful set of lines (2..4) to auto-fill the option
 * fields. Rich HTML is only preferred when it produces exactly the same number
 * of complete lines as the plain-text copy (the plain text never splits a
 * logical line — Word HTML sometimes splits one visible line into several
 * fragments, which would otherwise truncate the options). Falls back to plain
 * text whenever the two disagree, and to HTML otherwise.
 */
export function chooseOptionLines(html: string, plain: string): string[] {
  const htmlLines = html && html.trim() ? htmlToMarkupLines(html) : [];
  const plainLines = plainTextLines(plain);
  const take = (xs: string[]) => xs.slice(0, 4);
  if (htmlLines.length >= 2 && htmlLines.length === plainLines.length) {
    return take(htmlLines); // markup (^…^ / ~…~) preserved, lines complete
  }
  if (plainLines.length >= 2) return take(plainLines);
  return take(htmlLines);
}