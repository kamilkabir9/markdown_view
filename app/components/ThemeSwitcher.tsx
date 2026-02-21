import { useTheme, type Theme } from '~/contexts/ThemeContext';

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
      <div className="dropdown dropdown-end">
        <label tabIndex={0} className="btn btn-sm btn-ghost">
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
        </label>
        <ul
          tabIndex={0}
          className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300"
        >
          {themes.map(t => (
            <li key={t.value}>
              <button
                onClick={() => setTheme(t.value)}
                className={theme === t.value ? 'active' : ''}
              >
                <div>
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs opacity-70">{t.description}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
