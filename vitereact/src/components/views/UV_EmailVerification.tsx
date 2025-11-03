// src/views/UV_EmailVerification.tsx
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

/**
 * Interpolated API endpoint:
 * ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api
 */
const API_BASE = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;

/**
 * Verifies an email token via the backend.
 * Returns a promise that resolves on success, rejects on error.
 */
const verifyEmailToken = async (token: string) => {
  const url = `${API_BASE}/auth/verify-email/${token}`;
  await axios.get(url, { headers: { 'Content-Type': 'application/json' } });
};

/**
 * UI Component: UV_EmailVerification
 */
const UV_EmailVerification: React.FC = () => {
  /* --- Route param --------------------------------------------------- */
  const { token } = useParams<{ token: string }>();

  /* --- Component state ================================================= */
  const [resendLoading, setResendLoading] = useState(false);

  /* --- React‑Query to perform the verification ------------------------------------------------ */
  const {
    data,   // unused but part of the tuple
    error,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['verify-email', token],
    queryFn: () => {
      if (!token) throw new Error('No token provided');
      return verifyEmailToken(token);
    },
    enabled: !!token,
    retry: 1,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  /* --- Effect: automatically trigger verification on mount ------------------------ */
  useEffect(() => {
    if (token && !data) {
      refetch();
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [token]);

  /* --- Handlers ------------------------------------------------------- */
  const handleResend = async () => {
    setResendLoading(true);
    try {
      // In the absence of a specific resend endpoint, we simply retry verification.
      await refetch();
    } finally {
      setResendLoading(false);
    }
  };

  /* --- Render -------------------------------------------------------- */

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Email Verification
            </h2>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* Loading State */}
          {/* ------------------------------------------------------------------ */}
          {isLoading && (
            <div className="flex flex-col items-center space-y-4">
              <svg
                className="animate-spin h-12 w-12 text-indigo-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-label="Verification in progress"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-gray-600">Verifying your email...</p>
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* Success State */}
          {/* ------------------------------------------------------------------ */}
          {!isLoading && !isError && data !== undefined && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-md">
              <h3 className="text-lg font-semibold mb-2">
                Your account has been activated!
              </h3>
              <p className="mb-4">
                You can now sign in and start building your galleries.
              </p>
              <div className="flex justify-center space-x-4">
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/profile"
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Go to profile
                </Link>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* Error State */}
          {/* ------------------------------------------------------------------ */}
          {!isLoading && isError && (
            <div aria-live="polite">
              <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-md">
                <h3 className="text-lg font-semibold mb-2">
                  Verification failed
                </h3>
                <p className="mb-4">
                  {error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred.'}
                </p>
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {resendLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-label="Resending"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Resending…
                    </>
                  ) : (
                    'Try again'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_EmailVerification;