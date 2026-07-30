import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (typeof window !== 'undefined' && localStorage.getItem('tp_theme') as 'light' | 'dark') || 'light',

  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: nextTheme });

    if (typeof window !== 'undefined') {
      localStorage.setItem('tp_theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },

  setTheme: (theme: 'light' | 'dark') => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('tp_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }
}));
