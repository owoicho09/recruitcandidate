import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
        <Script id="x-pixel-base" strategy="afterInteractive">
          {`!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');twq('config','rd8dx');`}
        </Script>
        <TooltipProvider delayDuration={200}>
          <ToastProvider>{children}</ToastProvider>
        </TooltipProvider>
        <Analytics />
      </body>
    </html>
  );
}
