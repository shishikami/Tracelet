import { Highlight, themes } from "prism-react-renderer";

interface HighlightedCodeProps {
  code: string;
  label: string;
  language: string;
  showLineNumbers: boolean;
}

export default function HighlightedCode({
  code,
  label,
  language,
  showLineNumbers,
}: HighlightedCodeProps) {
  return (
    <Highlight theme={themes.oneDark} code={code} language={language}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`${className} overflow-x-auto py-5 text-[13px] leading-6 sm:text-sm sm:leading-7`}
          style={{ ...style, background: "transparent" }}
          aria-label={label}
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
  );
}
