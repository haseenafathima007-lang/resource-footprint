import React from "react";
import { Header } from "./Header.tsx";
import { Footer } from "./Footer.tsx";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-ink antialiased">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-surface-raised focus:text-primary focus:shadow-md focus:rounded-lg focus:border focus:border-border font-medium"
      >
        Skip to main content
      </a>

      <Header />

      <main id="main-content" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      <Footer />
    </div>
  );
};
