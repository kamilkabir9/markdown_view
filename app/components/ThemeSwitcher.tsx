import { useState } from 'react';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '~/components/ui/dropdown-menu';
import { useTheme, type Theme } from '~/contexts/ThemeContext';
import { ChevronDownIcon, CheckIcon } from 'lucide-react';

const themes: { value: Theme; label: string; description: string }[] = [
  { value: 'default', label: 'Editorial', description: 'Warm, balanced manuscript styling' },
  { value: 'github', label: 'Reference', description: 'Sharper technical contrast and structure' },
  { value: 'dark', label: 'Night', description: 'Low-light reading with restrained accent' },
  { value: 'minimal', label: 'Paper', description: 'Dry, tactile pages for longer notes' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const activeTheme = themes.find((item) => item.value === theme) || themes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="w-full min-w-[9.5rem] justify-between rounded-sm border border-border/70 bg-background px-3 py-2 transition hover:border-border hover:bg-surface sm:w-auto"
          />
        }
      >
        <span className="text-left">
          <span className="block text-[0.67rem] tracking-[0.12em] text-muted-foreground uppercase">Reader theme</span>
          <span className="block text-sm font-semibold text-foreground">{activeTheme.label}</span>
        </span>
        <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[18rem] rounded-sm">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => {
            if (value) setTheme(value as Theme);
          }}
        >
          {themes.map((item) => (
            <DropdownMenuRadioItem
              key={item.value}
              value={item.value}
              className="rounded-sm py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
