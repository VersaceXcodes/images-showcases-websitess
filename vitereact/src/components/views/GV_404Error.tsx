import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';

const GV_404Error: React.FC = () => {
  // Individual selector for theme mode
  const mode = useAppStore(state => state.theme_mode.mode);

  // Conditional classes for dark/light theme
  const containerBg = mode === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
  const textPrimary = mode === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = mode === 'dark' ? 'text-gray-300' : 'text-gray-600';
  const buttonBg = mode === 'dark' ? 'bg-blue-600' : 'bg-blue-600';
  const buttonHover = mode === 'dark' ? 'hover:bg-blue-700' : 'hover:bg-blue-700';

  return (
    <>
      {/* Page wrapper */}
      <div className={`min-h-screen flex flex-col ${containerBg}`}>
        {/* Header */}
        <nav className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link
                  to="/"
                  className={`${textPrimary} font-semibold text-lg`}
                >
                  ImageShow
                </Link>
              </div>
              {/* No additional navigation items required for this view */}
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className={`text-6xl font-extrabold ${textPrimary} mb-4`}>
              404 – Page Not Found
            </h1>
            <p className={`text-xl ${textSecondary} mb-8`}>
              The page you’re looking for doesn’t exist.
            </p>
            <img
              src="https://via.placeholder.com/400x300"
              alt="Page not found illustration"
              className="mx-auto mb-8 rounded-lg shadow-lg"
            />
            <Link
              to="/"
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${buttonBg} ${buttonHover} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              Return Home
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center">
            <p className={`text-sm ${textSecondary}`}>
              © {new Date().getFullYear()} ImageShow. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default GV_404Error;