import { Check, Copy } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

const languageAliases: Record<string, string> = {
  bash: "bash",
  http: "http",
  js: "javascript",
  json: "json",
  shell: "bash",
  ts: "typescript",
  tsx: "tsx",
};

const languageLabels: Record<string, string> = {
  bash: "Shell",
  http: "HTTP",
  javascript: "JavaScript",
  json: "JSON",
  typescript: "TypeScript",
  tsx: "TSX",
};

export function CodeBlock({
  code,
  language = "ts",
  filename,
  showLineNumbers = true,
}: CodeBlockProps) {
  const en = useLocale() === "en";
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const normalizedLanguage = languageAliases[language] ?? language;
  const languageLabel = languageLabels[normalizedLanguage] ?? normalizedLanguage.toUpperCase();

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <div className="group overflow-hidden rounded-xl border border-white/10 bg-[#050809] shadow-2xl shadow-black/20">
      <div className="flex min-h-11 items-center justify-between border-b border-white/8 bg-white/[0.025] px-4 text-xs text-slate-500">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="h-4 w-px bg-white/10" aria-hidden="true" />
          <span className="truncate font-mono text-[11px] text-slate-400">
            {filename ?? languageLabel}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={copyCode}
          aria-label={copied ? (en ? "Code copied" : "代码已复制") : copyFailed ? (en ? "Copy failed, try again" : "复制代码失败，请重试") : (en ? "Copy code" : "复制代码")}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? (en ? "Copied" : "已复制") : copyFailed ? (en ? "Failed" : "复制失败") : (en ? "Copy" : "复制")}
        </Button>
      </div>
      <Highlight theme={themes.oneDark} code={code} language={normalizedLanguage}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} overflow-x-auto py-5 text-[13px] leading-6 sm:text-sm sm:leading-7`}
            style={{ ...style, background: "transparent" }}
            aria-label={en ? `${languageLabel} code example` : `${languageLabel} 代码示例`}
          >
            <code className="block min-w-max">
              {tokens.map((line, lineIndex) => (
                <span
                  {...getLineProps({ line })}
                  className="block px-4 sm:px-5"
                  key={lineIndex}
                >
                  {showLineNumbers ? (
                    <span
                      className="mr-5 inline-block w-6 select-none text-right text-slate-700"
                      aria-hidden="true"
                    >
                      {lineIndex + 1}
                    </span>
                  ) : null}
                  {line.map((token, tokenIndex) => (
                    <span {...getTokenProps({ token })} key={tokenIndex} />
                  ))}
                </span>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? (en ? "Code copied to clipboard" : "代码已复制到剪贴板") : copyFailed ? (en ? "Copy failed" : "复制失败") : ""}
      </span>
    </div>
  );
}
