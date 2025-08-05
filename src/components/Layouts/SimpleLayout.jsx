import React from "react";
import IntelligentNavbar from "@/components/Navigation/IntelligentNavbar";

// Simple layout that just adds the intelligent navbar to any page
export default function SimpleLayout({ children, className = "" }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <IntelligentNavbar />
      <main className={`${className}`}>
        {children}
      </main>
    </div>
  );
}

// Optional: Specialized layouts for different page types
export function RequestLayout({ children }) {
  return (
    <SimpleLayout className="max-w-7xl mx-auto">
      {children}
    </SimpleLayout>
  );
}

export function FullWidthLayout({ children }) {
  return (
    <SimpleLayout className="w-full">
      {children}
    </SimpleLayout>
  );
}

export function ProfileLayout({ children }) {
  return (
    <SimpleLayout className="max-w-6xl mx-auto px-4 py-8">
      {children}
    </SimpleLayout>
  );
}