export const metadata = {
  title: "AutoTrace",
  description: "Decentralized vehicle history and maintenance tracking"
};

import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
