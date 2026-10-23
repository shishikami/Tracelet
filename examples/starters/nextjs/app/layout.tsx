import type { ReactNode } from "react";
import { TraceletClient } from "./tracelet-client";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <TraceletClient />
        {children}
      </body>
    </html>
  );
}
