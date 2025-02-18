import { useEffect } from 'react';
import { useTaskStore } from '../store';
import { THEME } from '../constants';

export function useTheme() {
  const { theme, toggleTheme } = useTaskStore();

  useEffect(() => {
    // Update document classes based on theme
    if (theme === THEME.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Store theme preference
    localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, toggleTheme };
}