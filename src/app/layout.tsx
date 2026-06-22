import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Progress BBX",
  description: "Daily progress dashboard for the BlackBox team",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bbx-bg text-bbx-text antialiased">{children}</body>
    </html>
  );
}
