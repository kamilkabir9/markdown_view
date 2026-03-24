import { Button, Description, Dropdown, Label } from '@heroui/react';
import { useTheme, type Theme } from '~/contexts/ThemeContext';

const themes: { value: Theme; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Balanced editorial reader' },
  { value: 'github', label: 'GitHub', description: 'Familiar technical docs styling' },
  { value: 'dark', label: 'Dark', description: 'Low-light contrast for long sessions' },
  { value: 'minimal', label: 'Minimal', description: 'Soft paper-like reading surface' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const activeTheme = themes.find((item) => item.value === theme) || themes[0];

  return (
    <Dropdown>
      <Button
        variant="ghost"
        className="min-w-[11.5rem] justify-between rounded-full border border-border/60 bg-background/80 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-sm transition hover:border-accent/35 hover:bg-background/92"
      >
        <span className="flex items-center gap-3 text-left">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,color-mix(in_oklab,var(--accent)_16%,white),color-mix(in_oklab,var(--warning)_28%,white))] text-accent shadow-[0_10px_25px_-18px_color-mix(in_oklab,var(--accent)_70%,transparent)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v12m6-6H6" />
            </svg>
          </span>
          <span>
            <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted">Theme</span>
            <span className="block text-sm font-semibold text-foreground">{activeTheme.label}</span>
          </span>
        </span>

        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 9l6 6 6-6" />
        </svg>
      </Button>

      <Dropdown.Popover placement="bottom end" className="min-w-[18rem] rounded-[1.5rem]">
        <Dropdown.Menu
          selectionMode="single"
          selectedKeys={new Set([theme])}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as Theme;
            if (selected) setTheme(selected);
          }}
        >
          {themes.map((item) => (
            <Dropdown.Item key={item.value} id={item.value} textValue={item.label} className="rounded-[1rem]">
              <Dropdown.ItemIndicator />
              <div className="flex flex-col">
                <Label>{item.label}</Label>
                <Description>{item.description}</Description>
              </div>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
