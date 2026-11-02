import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Price Advisor — know before you buy",
  description:
    "Paste a product link. See its real price history, compare across platforms, and ask questions grounded in real reviews.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-paper text-ink font-body antialiased">
          <NavBar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
