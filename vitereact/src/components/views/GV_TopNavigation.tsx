// src/components/GV_TopNavigation.tsx
import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';

/**
 * Top navigation bar shown on every page.
 */
const GV_TopNavigation: React.FC = () => {
  /* ---- Store selectors ---- */
  const currentUser = useAppStore(
    (state) => state.authentication_state.current_user
  );
  const logoutUser = useAppStore((state) => state.logout_user);
  const toggleTheme = useAppStore((state) => state.toggle_theme);
  const themeMode = useAppStore((state) => state.theme_mode.mode);

  /* ---- Navigation ---- */
  const navigate = useNavigate();

  /* ---- Local search state ---- */
  const [searchTag, setSearchTag] = useState('');

  /* ---- Handlers ---- */
  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const tag = searchTag.trim();
    if (!tag) return;
    navigate(`/search?tag=${encodeURIComponent(tag)}`);
    setSearchTag('');
  };

  const handleLogout = () => {
    logoutUser();
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  /* ---- Render ---- */
  return (
    <>
      <nav className="sticky top-0 z-50 bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-semibold text-gray-900">
                ImageShow
              </Link>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Search - only when user is authenticated */}
              {currentUser && (
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center"
                  aria-label="Search by tag"
                >
                  <input
                    type="search"
                    placeholder="Search by tag"
                    className="block w-56 rounded-md border-gray-300 py-1.5 px-3 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={searchTag}
                    onChange={(e) => setSearchTag(e.target.value)}
                    aria-label="Tag search"
                  />
                </form>
              )}

              {/* Navigation links */}
              <Link
                to="/"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </Link>
              {currentUser && (
                <>
                  <Link
                    to="/dashboard"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/gallery/create"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Create Gallery
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-red-600 hover:text-red-800 px-3 py-2 rounded-md text-sm font-medium"
                    aria-label="Sign out"
                  >
                    Sign Out
                  </button>
                </>
              )}
              {!currentUser && (
                <Link
                  to"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign In
                </Link>
              )}

              {/* Dark‑mode toggle */}
              <button
                onClick={handleToggleTheme}
                className="p-2 rounded-md text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Toggle dark mode"
              >
                {themeMode === 'light' ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20"
                    fill="currentColor"
                  >
                    <path
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.36a1 1 0 011.42 1.42l-.74.74a1 1 0 11-1.42-1.42l.74-.74zM18 9a1 1 0 110 2h-1a1 1 0 110-2h1zm-2.36 4.22a1 1 0 011.42 1.42l-.74.74a1 1 0 01-1.42-1.42l.74-.74zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.22-2.36a1 1 0 01-1.42 1.42l-.74-.74a1 1 0 011.42-1.42l.74.74zM2 10a1 1 0 110-2h1a1 1 0 110 2H2zm2.36-4.22a1 1 0 011.42-1.42l.74.74a1 1 0 01-1.42 1.42l-.74-.74z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a8 8 0 000 16 8 8 0 010-16zm1 12a1 1 0 01-.923-.781l-.077-.234v-2a1 1 0 111.9 0v2a1 1 0 01-.923.978l-.077.022z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default GV_TopNavigation;