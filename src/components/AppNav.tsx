import { NavLink } from "@/components/NavLink";
import { Trophy, Activity, Swords, Star, Sparkles, Target } from "lucide-react";

const links = [
  { to: "/", label: "Predictor", icon: Trophy },
  { to: "/simulator", label: "Simulator", icon: Activity },
  { to: "/matchups", label: "Matchups", icon: Swords },
  { to: "/fantasy", label: "Fantasy XI", icon: Star },
  { to: "/preview", label: "AI Preview", icon: Sparkles },
  { to: "/accuracy", label: "Accuracy", icon: Target },
];

export const AppNav = () => {
  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-3 overflow-x-auto">
        <NavLink
          to="/"
          end
          className="mr-3 flex shrink-0 items-center gap-2 font-bold tracking-tight"
        >
          <span className="text-xl">🏏</span>
          <span className="hidden sm:inline">IPL Edge</span>
        </NavLink>
        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeClassName="!bg-primary !text-primary-foreground hover:!bg-primary/90"
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};
