import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  TrendingUp,
  Settings,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Finance Dashboard",
  description: "Personal finance dashboard",
};

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-56 border-r border-border bg-card p-4 flex flex-col gap-1">
            <h1 className="text-lg font-bold px-3 py-2 mb-4">Finance</h1>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </aside>

          {/* Main content */}
          <main className="flex-1 p-8 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
