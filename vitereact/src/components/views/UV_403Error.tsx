// src/views/UV_403Error.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';

const UV_403Error: React.FC = () => {
  /* Optional: read authentication state to decide whether to show the Login link.
     In practice this view is only reached when the user is not authenticated,
     but checking the flag makes the component future‑proof. */
  const isAuthenticated = useAppStore(
    state => state.authentication_state.authentication_status.is_authenticated
  );

  return (
    <>
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center space-y-6">
          <h1 className="text-4xl font-extrabold text-gray-900">
            Forbidden
          </h1>
          <div
            className="text-gray-600"
            aria-live="polite"
          >
            <p>
              You do not have permission to view this gallery.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
            <Link
              to="/"
              className="inline-block w-full sm:w-auto px-6 py-3 text-base font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Back to Home
            </Link>

            {/* Show the login prompt only when the user is not authenticated */}
            {!isAuthenticated && (
              <Link
                to="/login"
                className="inline-block w-full sm:w-auto px-6 py-3 text-base font-medium text-indigo-600 bg-white border border-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_403Error;