import React from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/main";

const GV_403Error: React.FC = () => {
  // Individual Zustand selectors – VERY IMPORTANT to avoid infinite rerenders
  const isAuthenticated = useAppStore(
    (state) => state.authentication_state.authentication_status.is_authenticated
  );

  return (
    <>
      <div className="min-h-screen flex flex-col bg-white">
        {/* Content area – header/footer come from the layout */}
        <div className="flex-grow flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full bg-gray-50 rounded-lg shadow-lg py-10 px-6 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Access Denied
            </h1>
            <p className="text-gray-700 mb-6">
              You do not have permission to view this gallery.
            </p>

            {!isAuthenticated && (
              <>
                <p className="text-gray-600 mb-4">
                  Please sign in to access your private galleries.
                </p>
                <Link
                  to="/login"
                  className="inline-block mb-4 px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  aria-label="Sign in to view private gallery"
                >
                  Sign In
                </Link>
              </>
            )}

            <Link
              to="/"
              className="inline-block px-8 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              aria-label="Back to Home"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default GV_403Error;