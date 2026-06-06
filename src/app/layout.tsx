import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrainingGeeks",
  description: "Self-hosted training analytics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
