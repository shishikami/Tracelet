import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = "ts" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#050809] shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-2 text-xs text-slate-500">
        <span>{language}</span>
        <Button type="button" variant="ghost" size="sm" onClick={copyCode} aria-label="复制代码">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "已复制" : "复制"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-5 text-sm leading-7 text-slate-300"><code>{code}</code></pre>
    </div>
  );
}
