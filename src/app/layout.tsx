import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { publicEnv } from "@/lib/env-public";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.appUrl),
  title: {
    default: "RecruitCandidates — Turn applications into a vetted shortlist",
    template: "%s · RecruitCandidates",
  },
  description:
    "RecruitCandidates gives your company a branded career page, screens every application against the role, manages assessments and video interviews, and presents qualified candidates in one workspace.",
  openGraph: {
    title: "RecruitCandidates — Turn applications into a vetted shortlist",
    description:
      "Branded career pages, AI-assisted CV screening, assessments, and video interviews — all in one workspace.",
    images: ["/logo-full.png"],
    siteName: "RecruitCandidates",
  },
  twitter: {
    card: "summary_large_image",
    title: "RecruitCandidates — Turn applications into a vetted shortlist",
    images: ["/logo-full.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider delayDuration={200}>
          <ToastProvider>{children}</ToastProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
