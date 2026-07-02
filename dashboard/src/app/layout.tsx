import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SalesDataProvider } from "../context/SalesDataContext";
import { LayoutWrapper } from "../components/layout/LayoutWrapper";
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
  title: "SuperMart Grocery Sales - Enterprise Retail Sales Analytics & Data Science Platform",
  description: "Modern enterprise-grade retail sales analytics and machine learning platform for SuperMart, featuring time-series forecasting, customer segmentation, anomaly detection, statistical testing, and explainable AI.",
  keywords: "supermart, retail analytics, sales dashboard, data science, machine learning, forecasting, clustering, anomaly detection, shap, next.js, react, recharts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="h-full bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased overflow-hidden select-text" suppressHydrationWarning>
        <SalesDataProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </SalesDataProvider>
      </body>
    </html>
  );
}
