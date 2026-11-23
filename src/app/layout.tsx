import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Sora } from "next/font/google";
import { Toaster } from "sonner";
import { currentTheme } from "@/components/app-header";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const sora = Sora({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-sora" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Kuryentipid",
  description: "See what each appliance costs you and compete fairly with your barangay on % saved.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f2f3f0" }, { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }] };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = await currentTheme();
  return (
    <html lang="en" data-theme={theme === "system" ? undefined : theme} className={`${jakarta.variable} ${sora.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh text-body">
        {children}
        <Toaster
          theme="light"
          position="top-center"
          offset={16}
          toastOptions={{
            style: {
              background: "var(--color-surface)",
              color: "var(--color-text)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-sans)",
              boxShadow: "var(--shadow-sheet)",
            },
            classNames: {
              success: "[&_[data-icon]]:text-primary",
              warning: "[&_[data-icon]]:text-warning",
              error: "[&_[data-icon]]:text-error",
            },
          }}
        />
      </body>
    </html>
  );
}
