import * as React from "react";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function MatchedText(props: { text: string; query?: string }) {
  const { text, query } = props;
  const q = (query ?? "").trim();
  if (!q) return <>{text}</>;

  // Split query into words (keep it simple)
  const words = q.split(/\s+/).filter(Boolean).slice(0, 6);
  if (!words.length) return <>{text}</>;

  const re = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "ig");
  const parts = text.split(re);

  return (
    <>
      {parts.map((p, i) => {
        const isMatch = words.some((w) => p.toLowerCase() === w.toLowerCase());
        return isMatch ? <mark key={i}>{p}</mark> : <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}
