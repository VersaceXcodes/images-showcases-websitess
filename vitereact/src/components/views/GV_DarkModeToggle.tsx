import React from 'react';
import { useAppStore } from '@/store/main';

const GV_DarkModeToggle: React.FC = () => {
  // Individual selectors – never destructure the store object
  const mode = useAppStore(state => state.theme_mode.mode);
  const toggleTheme = useAppStore(state => state.toggle_theme);

  return (
    <>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle dark mode"
        aria-pressed={mode === 'dark'}
        className="p-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        {mode === 'light' ? (
          // Sun icon – light mode indicator
          <svg
            className="h-6 w-6 text-yellow-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              d="M10 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zM4.22 4.22a1 1 0 011.42 0l.7.7a1 1 0 11-1.42 1.42l-.7-.7a1 1 0 010-1.42zM3 10a1 1 0 100 2h1a1 1 0 100-2H3zM4.22 15.78a1 1 0 011.42 0l.7.7a1 1 0 11-1.42 1.42l-.7-.7a1 1 0 010-1.42zM10 16a1 1 0 011 1v1a1 1 0 01-2 0v-1a1 1 0 011-1zM15.78 15.78a1 1 0 01-1.42 0l-.7.7a1 1 0 011.42 1.42l.7-.7a1 1 0 010-1.42zM16 10a1 1 0 100-2h-1a1 1 0 100 2h1zM15.78 4.22a1 1 0 011.42 0l.7-.7a1 1 0 11-1.42-1.42l-.7.7a1 1 0 010 1.42z"
              fillRule="evenodd"
              clipRule="evenodd"
            />
            <circle cx="10" cy="10" r="3" fill="currentColor" />
          </svg>
        ) : (
          // Moon icon – dark mode indicator
          <svg
            className="h-6 w-6 text-gray-200"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              d="M17.293 13.293a8 8 0 11-10.586-10.586 8 8 0 0010.586 10.586z"
            />
          </svg>
        )}
      </button>
    </>
  );
};

export default GV_DarkModeToggle;