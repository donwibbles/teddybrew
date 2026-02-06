"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-wrap gap-3">
      {themes.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant="outline"
          onClick={() => setTheme(value)}
          className={cn(
            "flex items-center gap-2 min-w-[100px]",
            theme === value &&
              "border-primary-500 bg-primary-subtle text-primary-600 hover:bg-primary-subtle-hover hover:text-primary-700"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  );
}
