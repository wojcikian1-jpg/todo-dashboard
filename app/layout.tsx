import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todo Dashboard",
  description: "Kanban-style task management board",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
