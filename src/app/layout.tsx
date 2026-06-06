import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/TopNav";

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
      <body className="min-h-full">
        <TopNav />
        <main className="mx-auto w-full max-w-[1400px] px-4 py-4">{children}</main>
      </body>
    </html>
  );
}
