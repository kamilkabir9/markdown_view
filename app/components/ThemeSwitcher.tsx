import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { cn } from '~/lib/utils';
import { useTheme, type Theme } from '~/contexts/ThemeContext';

const themes: { value: Theme; label: string; description: string }[] = [
  { value: 'default', label: 'Editorial', description: 'Warm, balanced manuscript styling' },
  { value: 'github', label: 'Reference', description: 'Sharper technical contrast and structure' },
  { value: 'dark', label: 'Night', description: 'Low-light reading with restrained accent' },
  { value: 'minimal', label: 'Paper', description: 'Dry, tactile pages for longer notes' },
];

interface ThemeSwitcherProps {
  compact?: boolean;
  className?: string;
}

export function ThemeSwitcher({ compact = false, className }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={cn('w-full sm:w-auto', compact ? 'min-w-[8.5rem]' : 'min-w-[11rem]', className)}>
      <Select
        value={theme}
        onValueChange={(value) => {
          if (value) setTheme(value as Theme);
        }}
      >
        <SelectTrigger
          className={cn(
            'h-auto w-full rounded-sm border-border/70 bg-background hover:bg-surface',
            compact ? 'px-2.5 py-1.5' : 'px-3 py-2',
          )}
        >
          <SelectValue className="text-sm font-semibold text-foreground">
            {(value: Theme | null) => {
              const selected = themes.find((item) => item.value === value);
              if (!selected) return compact ? 'Theme' : 'Select theme';
              return compact ? selected.label : `${selected.label} theme`;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[18rem] rounded-sm">
          <SelectGroup>
            {themes.map((item) => (
              <SelectItem key={item.value} value={item.value} className="rounded-sm py-2">
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{item.label} theme</span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
