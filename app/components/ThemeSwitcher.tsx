import { useTheme, type Theme } from '~/contexts/ThemeContext';
import { Button, Dropdown, Label } from '@heroui/react';

const themes: { value: Theme; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Tailwind Typography' },
  { value: 'github', label: 'GitHub', description: 'GitHub markdown style' },
  { value: 'dark', label: 'Dark', description: 'Dark mode theme' },
  { value: 'minimal', label: 'Minimal', description: 'Clean minimal style' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Theme:</span>
      <Dropdown>
        <Dropdown.Trigger>
          <Button variant="ghost" size="sm">
            {themes.find(t => t.value === theme)?.label || 'Default'}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu
            selectionMode="single"
            selectedKeys={new Set([theme])}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as Theme;
              if (selected) setTheme(selected);
            }}
          >
            {themes.map(t => (
              <Dropdown.Item key={t.value} id={t.value} textValue={t.label}>
                <Label>
                  <div>
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs opacity-70">{t.description}</div>
                  </div>
                </Label>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
