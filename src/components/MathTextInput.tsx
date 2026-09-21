import { useState, type ClipboardEvent } from "react";
import { Input } from "@/components/ui/input";
import RichText from "@/components/RichText";

/**
 * Text field that shows the RAW markup (^…^ / ~…~) only while focused for
 * editing, and otherwise renders a REAL formatted preview in the field itself
 * (superscripts raised, subscripts lowered, Unicode math runs styled). This
 * way pasted science text (e.g. ¹²₆C) appears formatted right in the box.
 */
export default function MathTextInput({
  value,
  onChange,
  onPaste,
  placeholder,
  dir = "rtl",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onPaste?: (e: ClipboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  dir?: string;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const showPreview = !focused && value.trim().length > 0;

  return (
    <div className="relative min-w-0 flex-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        dir={dir}
        autoFocus={autoFocus}
        className={showPreview ? "text-transparent" : ""}
      />
      {showPreview && (
        <div
          dir="auto"
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 left-3 flex items-center overflow-hidden whitespace-nowrap text-base md:text-sm"
        >
          <RichText text={value} />
        </div>
      )}
    </div>
  );
}