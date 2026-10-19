import { useState } from "react";
import { CodeBlock } from "@/components/code-block";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n";

const packageManagers = [
  { name: "npm", command: "npm install tracelet-browser" },
  { name: "pnpm", command: "pnpm add tracelet-browser" },
  { name: "yarn", command: "yarn add tracelet-browser" },
] as const;

export function InstallCommand() {
  const en = useLocale() === "en";
  const [selected, setSelected] = useState<(typeof packageManagers)[number]["name"]>("npm");
  const command = packageManagers.find((manager) => manager.name === selected)?.command ?? packageManagers[0].command;

  return (
    <div>
      <div className="mb-2 flex gap-1" role="tablist" aria-label={en ? "Package manager" : "包管理器"}>
        {packageManagers.map((manager) => (
          <button
            key={manager.name}
            type="button"
            role="tab"
            id={`install-${manager.name}-tab`}
            aria-controls="install-command-panel"
            aria-selected={selected === manager.name}
            className={cn(
              "rounded-lg px-3 py-1.5 font-mono text-xs transition-colors",
              selected === manager.name ? "bg-emerald-300 text-slate-950" : "text-slate-400 hover:bg-white/5 hover:text-white",
            )}
            onClick={() => setSelected(manager.name)}
          >
            {manager.name}
          </button>
        ))}
      </div>
      <div id="install-command-panel" role="tabpanel" aria-labelledby={`install-${selected}-tab`}>
        <CodeBlock code={command} language="shell" />
      </div>
    </div>
  );
}
