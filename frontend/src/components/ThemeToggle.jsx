import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="w-10 h-10 rounded-xl bg-white/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-teal-500 hover:text-white transition-all cursor-pointer shadow-sm relative group"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 transition-transform group-hover:rotate-[15deg]" />
      ) : (
        <Sun className="w-5 h-5 transition-transform group-hover:rotate-[15deg]" />
      )}
    </Button>
  );
};

export default ThemeToggle;
