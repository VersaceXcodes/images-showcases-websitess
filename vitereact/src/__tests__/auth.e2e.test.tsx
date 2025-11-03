import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

import UV_Login from '@/components/views/UV_Login';
import { useAppStore } from '@/store/main';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Auth E2E Flow (Vitest, real API)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState((state) => ({
      authentication_state: {
        ...state.authentication_state,
        auth_token: null,
        current_user: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: false,
        },
        error_message: null,
      },
    }));
  });

  it('completes full auth flow: register -> logout -> sign-in', async () => {
    const user = userEvent.setup();
    const uniqueEmail = `user${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'Test User';

    const registerUser = useAppStore.getState().register_user;
    const logoutUser = useAppStore.getState().logout_user;

    await registerUser(uniqueEmail, testPassword, testName);

    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.auth_token).toBeTruthy();
        expect(state.authentication_state.current_user?.email).toBe(uniqueEmail);
      },
      { timeout: 15000 }
    );

    logoutUser();

    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
      expect(state.authentication_state.auth_token).toBeNull();
      expect(state.authentication_state.current_user).toBeNull();
    });

    render(<UV_Login />, { wrapper: Wrapper });

    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInput = await screen.findByLabelText(/password/i);
    const submitButton = await screen.findByRole('button', { name: /sign in/i });

    await waitFor(() => {
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });

    await user.type(emailInput, uniqueEmail);
    await user.type(passwordInput, testPassword);

    await waitFor(() => expect(submitButton).not.toBeDisabled());
    await user.click(submitButton);

    await waitFor(() => expect(screen.getByText(/signing in/i)).toBeInTheDocument());

    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.auth_token).toBeTruthy();
        expect(state.authentication_state.current_user?.email).toBe(uniqueEmail);
      },
      { timeout: 15000 }
    );
  }, 45000);

  it('handles registration with unique email', async () => {
    const uniqueEmail = `user${Date.now()}@example.com`;
    const testPassword = 'SecurePass456!';

    const registerUser = useAppStore.getState().register_user;

    await registerUser(uniqueEmail, testPassword);

    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.auth_token).toBeTruthy();
        expect(state.authentication_state.current_user).toBeTruthy();
        expect(state.authentication_state.current_user?.email).toBe(uniqueEmail);
      },
      { timeout: 15000 }
    );
  }, 30000);

  it('prevents duplicate email registration', async () => {
    const uniqueEmail = `user${Date.now()}@example.com`;
    const testPassword = 'TestPass789!';

    const registerUser = useAppStore.getState().register_user;

    await registerUser(uniqueEmail, testPassword);

    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
      },
      { timeout: 15000 }
    );

    useAppStore.getState().logout_user();

    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
    });

    await expect(registerUser(uniqueEmail, testPassword)).rejects.toThrow();

    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
      expect(state.authentication_state.error_message).toBeTruthy();
    });
  }, 30000);

  it('signs in with valid credentials using UV_Login component', async () => {
    const user = userEvent.setup();
    const uniqueEmail = `user${Date.now()}@example.com`;
    const testPassword = 'ValidPass123!';

    const registerUser = useAppStore.getState().register_user;
    await registerUser(uniqueEmail, testPassword);

    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
      },
      { timeout: 15000 }
    );

    useAppStore.getState().logout_user();

    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
    });

    render(<UV_Login />, { wrapper: Wrapper });

    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInput = await screen.findByLabelText(/password/i);
    const submitButton = await screen.findByRole('button', { name: /sign in/i });

    await user.type(emailInput, uniqueEmail);
    await user.type(passwordInput, testPassword);

    await user.click(submitButton);

    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.auth_token).toBeTruthy();
      },
      { timeout: 15000 }
    );
  }, 45000);

  it('rejects sign-in with invalid credentials', async () => {
    const user = userEvent.setup();

    render(<UV_Login />, { wrapper: Wrapper });

    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInput = await screen.findByLabelText(/password/i);
    const submitButton = await screen.findByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'nonexistent@example.com');
    await user.type(passwordInput, 'WrongPassword123!');

    await user.click(submitButton);

    await waitFor(
      () => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    const state = useAppStore.getState();
    expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
    expect(state.authentication_state.auth_token).toBeNull();
  }, 30000);

  it('persists auth token and validates on initialize_auth', async () => {
    const uniqueEmail = `user${Date.now()}@example.com`;
    const testPassword = 'PersistTest123!';

    const registerUser = useAppStore.getState().register_user;
    await registerUser(uniqueEmail, testPassword);

    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.auth_token).toBeTruthy();
      },
      { timeout: 15000 }
    );

    const savedToken = useAppStore.getState().authentication_state.auth_token;

    useAppStore.setState((state) => ({
      authentication_state: {
        ...state.authentication_state,
        current_user: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: true,
        },
      },
    }));

    const initializeAuth = useAppStore.getState().initialize_auth;
    await initializeAuth();

    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.auth_token).toBe(savedToken);
        expect(state.authentication_state.current_user?.email).toBe(uniqueEmail);
      },
      { timeout: 15000 }
    );
  }, 30000);

  it('clears invalid token on initialize_auth', async () => {
    useAppStore.setState((state) => ({
      authentication_state: {
        ...state.authentication_state,
        auth_token: 'invalid-token-12345',
        authentication_status: {
          is_authenticated: false,
          is_loading: true,
        },
      },
    }));

    const initializeAuth = useAppStore.getState().initialize_auth;
    await initializeAuth();

    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
      expect(state.authentication_state.auth_token).toBeNull();
      expect(state.authentication_state.current_user).toBeNull();
      expect(state.authentication_state.authentication_status.is_loading).toBe(false);
    });
  }, 15000);
});
