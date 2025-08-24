/*********************************************************************
 * UV_Profile – “User Profile” View
 *  - Authentication required
 *  - Avatar: 1:1 crop mention, ≤2 MB, instant preview
 *  - Name, bio (≤500 chars), contact link (URL)
 *  - Save button → PUT /api/users/me
 *  - Inline validation, error handling, loading states
 *********************************************************************/

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

type AvatarError = string | null;

/**
 * API base URL (frontend env uses VITE_ prefix)
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_PATH = `${BASE_URL}/api`;

/**
 * Types
 */
interface UserProfile {
  user_id: string;
  email: string;
  name: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  contact_link: string | null;
  created_at: string;
  updated_at: string;
}

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * UV_Profile Component
 */
const UV_Profile: React.FC = () => {
  /** ==== Global State (Zustand) ====
   * 1. Individual selectors only
   */
  const currentUser = useAppStore(
    (state) => state.authentication_state.current_user
  );
  const authToken = useAppStore(
    (state) => state.authentication_state.auth_token
  );
  const updateLocalProfile = useAppStore(
    (state) => state.update_user_profile
  );
  const pushNotification = useAppStore(
    (state) => state.push_notification
  );

  /** ==== Local Form State ==== */
  const [name, setName] = useState<string>(currentUser?.name ?? '');
  const [bio, setBio] = useState<string>(currentUser?.bio ?? '');
  const [contactLink, setContactLink] = useState<string>(
    currentUser?.contact_link ?? ''
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(
    currentUser?.profile_photo_url ?? ''
  );

  /** ==== Validation Messages ==== */
  const [nameError, setNameError] = useState<string>('');
  const [bioError, setBioError] = useState<string>('');
  const [contactError, setContactError] = useState<string>('');
  const [avatarError, setAvatarError] = useState<AvatarError>(null);
  const [globalError, setGlobalError] = useState<string>('');

  /** ==== React Query Mutation for Profile Update ==== */
  const mutation = useMutation<
    UserProfile,
    unknown,
    void,
    unknown
  >(
    async () => {
      if (!authToken) throw new Error('No auth token');

      const formData = new FormData();
      // Only include fields that the user actually changed
      if (name !== currentUser?.name) formData.append('name', name);
      if (bio !== currentUser?.bio) formData.append('bio', bio);
      if (contactLink !== currentUser?.contact_link)
        formData.append('contact_link', contactLink);
      if (avatarFile) formData.append('profile_photo', avatarFile);

      const resp = await axios.put<UserProfile>(
        `${API_PATH}/users/me`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return resp.data;
    },
    {
      onSuccess: (data) => {
        updateLocalProfile(data);
        pushNotification({
          id: Math.random().toString(36).substr(2, 9),
          type: 'success',
          text: 'Profile updated successfully.',
          timeout: 4000,
        });
      },
      onError: (error: any) => {
        const msg =
          error.response?.data?.message ||
          error.message ||
          'Failed to update profile.';
        setGlobalError(msg);
        pushNotification({
          id: Math.random().toString(36).substr(2, 9),
          type: 'error',
          text: msg,
          timeout: 4000,
        });
      },
    }
  );

  /** ==== Handlers ==== */
  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    if (!e.target.files?.length) return;

    const file = e.target.files[0];

    // Size validation
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError('Avatar must be ≤ 2 MB.');
      return;
    }

    // MIME type validation
    if (!ALLOWED_MIME.includes(file.type)) {
      setAvatarError('Unsupported image format.');
      return;
    }

    // File dimensions check (client‑side)
    const img = new Image();
    img.onload = () => {
      if (img.width !== img.height) {
        setAvatarError('Avatar must be square (1:1 aspect ratio).');
      } else {
        setAvatarFile(file);
        // Create preview URL
        const reader = new FileReader();
        reader.onload = () => {
          setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    img.onerror = () => {
      setAvatarError('Invalid image file.');
    };
    img.src = URL.createObjectURL(file);
  };

  const validateForm = (): boolean => {
    let valid = true;
    setNameError('');
    setBioError('');
    setContactError('');
    setGlobalError('');

    if (!name.trim()) {
      setNameError('Name is required.');
      valid = false;
    }
    if (bio.length > 500) {
      setBioError('Bio must be ≤ 500 characters.');
      valid = false;
    }
    if (contactLink.trim()) {
      try {
        new URL(contactLink.trim());
      } catch {
        setContactError('Must be a valid URL.');
        valid = false;
      }
    }
    if (avatarError) {
      valid = false;
    }
    return valid;
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    mutation.mutate();
  };

  /** ==== Sync local state with possible changes from store (unlikely but safe) ==== */
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name ?? '');
      setBio(currentUser.bio ?? '');
      setContactLink(currentUser.contact_link ?? '');
      setAvatarPreview(currentUser.profile_photo_url ?? '');
    }
  }, [currentUser]);

  /** ==== Render ====
   *  All UI is within a single <>
   */
  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <nav className="mt-4 sm:mt-0">
              <Link
                to="/dashboard"
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                Back to Dashboard
              </Link>
            </nav>
          </header>

          <form onSubmit={submitForm} noValidate>
            {globalError && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4"
                aria-live="polite"
              >
                {globalError}
              </div>
            )}

            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
              <label
                htmlFor="avatar"
                className="absolute -top-8 left-0 text-sm text-gray-700"
              >
                Avatar
              </label>
              <div className="relative">
                <img
                  src={
                    avatarPreview ||
                    'https://via.placeholder.com/150?text=No+avatar'
                  }
                  alt="Avatar preview"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                />
                <label
                  htmlFor="avatar"
                  className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full cursor-pointer"
                >
                  <svg
                    className="h-8 w-8 text-gray-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </label>
              </div>
              <input
                id="avatar"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onAvatarChange}
              />
              {avatarError && (
                <p className="mt-2 text-sm text-red-600">{avatarError}</p>
              )}
            </div>

            {/* Name */}
            <div className="mb-4">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  nameError ? 'border-red-500' : ''
                }`}
                value={name}
                onChange={(e) => {
                  setNameError('');
                  setName(e.target.value);
                }}
                placeholder="John Doe"
                maxLength={100}
                required
              />
              {nameError && (
                <p className="mt-1 text-sm text-red-600">{nameError}</p>
              )}
            </div>

            {/* Bio */}
            <Name="mb-4">
              <label
                htmlFor="bio"
                className="block text-sm font-medium text-gray-700"
              >
                Bio
              </label>
              <textarea
                id="bio"
                rows={3}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  bioError ? 'border-red-500' : ''
                }`}
                value={bio}
                onChange={(e) => {
                  setBioError('');
                  setBio(e.target.value);
                }}
                placeholder="Tell us about yourself..."
                maxLength={500}
              />
              {bioError && (
                <p className="mt-1 text-sm text-red-600">{bioError}</p>
              )}
            </div>

            {/* Contact Link */}
            <div className="mb-6">
              <label
                htmlFor="contactLink"
                className="block text-sm font-medium text-gray-700"
              >
                Contact Link (optional)
              </label>
              <input
                id="contactLink"
                type="url"
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  contactError ? 'border-red-500' : ''
                }`}
                value={contactLink}
                onChange={(e) => {
                  setContactError('');
                  setContactLink(e.target.value);
                }}
                placeholder="https://example.com"
              />
              {contactError && (
                <p className="mt-1 text-sm text-red-600">{contactError}</p>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={mutation.isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {mutation.isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
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
                    Saving…
                  </>
                ) : (
                  'Save Profile'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UV_Profile;