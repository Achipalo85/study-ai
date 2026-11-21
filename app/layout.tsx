import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study AI",
  description: "Il tuo assistente intelligente per lo studio"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
