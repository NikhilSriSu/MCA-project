import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FraudShield ML Demo",
  description:
    "Next.js prototype for a machine learning-based financial fraud detection system for digital transactions."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
