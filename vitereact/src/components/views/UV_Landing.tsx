import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Public landing page – no authentication or state required.
 * The component is a pure React.FC with a single JSX fragment.
 */
const UV_Landing: React.FC = () => {
  return (
    <>
      {/* Hero Section */}
      <section
        aria-labelledby="hero-heading"
        className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
      >
        <h1
          id="hero-heading"
          className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-gray-900 dark:text-gray-100 mb-4"
        >
          Build Your Portfolio in Minutes
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-300 mb-10">
          ImageShow lets creative professionals quickly create, curate, and
          publish stunning image galleries without writing a single line of
          code.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/signup"
            className="px-9 py-3 text-sm font-medium text-white rounded-md bg-blue-600 shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
          >
            Create Your First Gallery
          </Link>
          <Link
            to="/login"
            className="px-9 py-3 text-sm font-medium text-gray-900 rounded-md bg-gray-200 shadow-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all"
          >
            Login
          </Link>
        </div>
      </section>

      {/* Animation/Preview Block */}
      <section
        aria-label="Gallery Preview"
        className="py-12"
      >
        <h2 className="sr-only">Sample Galleries</h2>
        <div className="px-4 mx-auto max-w-7xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* 8 placeholder boxes with pulsing effect */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="w-full aspect-w-1 aspect-h-1 rounded-xl overflow-hidden shadow-lg bg-gradient-to-r from-indigo-200 to-purple-200 dark:from-indigo-700 dark:to-purple-700 animate-pulse"
            >
              {/* Empty – visual placeholder */}
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default UV_Landing;