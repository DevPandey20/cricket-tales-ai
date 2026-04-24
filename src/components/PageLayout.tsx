import { ReactNode } from "react";
import { AppNav } from "./AppNav";

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export const PageLayout = ({ children, title, subtitle }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      {title && (
        <div className="border-b bg-gradient-to-br from-primary via-primary to-primary/80 px-4 py-10 text-primary-foreground">
          <div className="mx-auto max-w-6xl">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-primary-foreground/80">{subtitle}</p>}
          </div>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
};
