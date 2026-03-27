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
        className="w-full min-w-[9.5rem] justify-between rounded-[0.85rem] border border-border/70 bg-background px-3 py-2 transition hover:border-border hover:bg-surface sm:w-auto"
      >
        <span className="text-left">
          <span className="block text-xs text-muted">Theme</span>
          <span className="block text-sm font-semibold text-foreground">{activeTheme.label}</span>
        </span>

        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 9l6 6 6-6" />
        </svg>
      </Button>

      <Dropdown.Popover placement="bottom end" className="min-w-[18rem] rounded-[1rem]">
        <Dropdown.Menu
          selectionMode="single"
          selectedKeys={new Set([theme])}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as Theme;
            if (selected) setTheme(selected);
          }}
        >
          {themes.map((item) => (
            <Dropdown.Item key={item.value} id={item.value} textValue={item.label} className="rounded-[0.8rem]">
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
