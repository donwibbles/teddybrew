export function ThemeScript() {
  // This script runs before React hydration to prevent FOUC
  const script = `
    (function() {
      const STORAGE_KEY = 'hive-theme';
      const stored = localStorage.getItem(STORAGE_KEY);
      let theme = stored;

      if (!theme || (theme !== 'light' && theme !== 'dark' && theme !== 'system')) {
        theme = 'system';
      }

      let resolved = theme;
      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolved);
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
