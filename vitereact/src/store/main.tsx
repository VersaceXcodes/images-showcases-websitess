import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

/* ==========================================================================
   Types
   ========================================================================== */

export interface User {
  user_id: string;
  email: string;
  name: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  contact_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
  timeout?: number;
}

export interface AuthenticationState {
  current_user: User | null;
  auth_token: string | null;
  authentication_status: {
    is_authenticated: boolean;
    is_loading: boolean;
  };
  error_message: string | null;
}

export interface ThemeMode {
  mode: 'light' | 'dark';
}

export interface AppState {
  /* ---------------- Global State ---------------- */
  authentication_state: AuthenticationState;
  theme_mode: ThemeMode;
  notifications: Notification[];
  ui: { loading: boolean };

  /* ---------------- Socket ---------------- */
  socket: Socket | null;

  /* ---------------- Actions ---------------- */
  /* Auth actions */
  login_user: (email: string, password: string) => Promise<void>;
  logout_user: () => void;
  register_user: (
    email: string,
    password: string,
    name?: string
  ) => Promise<void>;
  initialize_auth: () => Promise<void>;
  clear_auth_error: () => void;
  update_user_profile: (data: Partial<User>) => void;

  /* Theme actions */
  toggle_theme: () => void;
  set_theme: (mode: 'light' | 'dark') => void;

  /* Notification actions */
  push_notification: (n: Notification) => void;
  remove_notification: (id: string) => void;

  /* Socket actions */
  connect_socket: () => void;
  disconnect_socket: () => void;
  on_socket_event: (event: string, callback: (...args: any[]) => void) => void;
}

/* ==========================================================================
   Storage & Environment
   ========================================================================== */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_PATH = `${BASE_URL}/api`;

/* ==========================================================================
   Store
   ========================================================================== */

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      /* ----- DEFAULT STATE ----- */
      authentication_state: {
        current_user: null,
        auth_token: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: true, // will be toggled on init
        },
        error_message: null,
      },

      theme_mode: { mode: 'light' },

      notifications: [],

      ui: { loading: false },

      socket: null,

      /* ----- ACTIONS ----- */

      /* -------- Auth -------- */
      login_user: async (email: string, password: string) => {
        set((s) => ({
          authentication_state: {
            ...s.authentication_state,
            authentication_status: { ...s.authentication_state.authentication_status, is_loading: true },
            error_message: null,
          },
        }));

        try {
          const resp = await axios.post(
            `${API_PATH}/auth/login`,
            { email, password_hash: password },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { user, access_token } = resp.data as { user: User; access_token: string };

          set({
            authentication_state: {
              current_user: user,
              auth_token: access_token,
              authentication_status: { is_authenticated: true, is_loading: false },
              error_message: null,
            },
          });

          /* Auto‑connect socket for authenticated users */
          get().connect_socket();
        } catch (err: any) {
          const msg =
            err.response?.data?.message ||
            err.message ||
            'Login failed';
          set((s) => ({
            authentication_state: {
              ...s.authentication_state,
              authentication_status: { is_authenticated: false, is_loading: false },
              error_message: msg,
            },
          }));
          throw new Error(msg);
        }
      },

      register_user: async (email: string, password: string, name?: string) => {
        set((s) => ({
          authentication_state: {
            ...s.authentication_state,
            authentication_status: { ...s.authentication_state.authentication_status, is_loading: true },
            error_message: null,
          },
        }));
        try {
          const payload = {
            email,
            password_hash: password,
            name: name ?? null,
            profile_photo_url: null,
            bio: null,
            contact_link: null,
          };
          const resp = await axios.post(
            `${API_PATH}/auth/signup`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { user, access_token } = resp.data as { user: User; access_token: string };

          set({
            authentication_state: {
              current_user: user,
              auth_token: access_token,
              authentication_status: { is_authenticated: true, is_loading: false },
              error_message: null,
            },
          });

          /* Auto‑connect socket */
          get().connect_socket();
        } catch (err: any) {
          const msg =
            err.response?.data?.message ||
            err.message ||
            'Registration failed';
          set((s) => ({
            authentication_state: {
              ...s.authentication_state,
              authentication_status: { is_authenticated: false, is_loading: false },
              error_message: msg,
            },
          }));
          throw new Error(msg);
        }
      },

      initialize_auth: async () => {
        const { auth_token } = get().authentication_state;
        const sb = get();
        if (!auth_token) {
          /* No token – reset loading flag */
          set((s) => ({
            authentication_state: {
              ...s.authentication_state,
              authentication_status: { ...s.authentication_state.authentication_status, is_loading: false },
            },
          }));
          return;
        }
        try {
          const resp = await axios.get<User>(
            `${API_PATH}/users/me`,
            { headers: { Authorization: `Bearer ${auth_token}` } }
          );
          set({
            authentication_state: {
              current_user: resp.data,
              auth_token,
              authentication_status: { is_authenticated: true, is_loading: false },
              error_message: null,
            },
          });
          sb.connect_socket();
        } catch {
          /* Token invalid – clear state */
          set({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: { is_authenticated: false, is_loading: false },
              error_message: null,
            },
          });
        }
      },

      logout_user: () => {
        set({
          authentication_state: {
            current_user: null,
            auth_token: null,
            authentication_status: { is_authenticated: false, is_loading: false },
            error_message: null,
          },
        });
        get().disconnect_socket();
      },

      clear_auth_error: () => {
        set((s) => ({
          authentication_state: {
            ...s.authentication_state,
            error_message: null,
          },
        }));
      },

      update_user_profile: (data: Partial<User>) => {
        const { current_user } = get().authentication_state;
        if (!current_user) return;
        set((s) => ({
          authentication_state: {
            ...s.authentication_state,
            current_user: { ...current_user, ...data },
          },
        }));
      },

      /* -------- Theme -------- */
      toggle_theme: () => {
        const { mode } = get().theme_mode;
        set(() => ({ theme_mode: { mode: mode === 'light' ? 'dark' : 'light' } }));
      },

      set_theme: (mode: 'light' | 'dark') => {
        set(() => ({ theme_mode: { mode } }));
      },

      /* -------- Notifications -------- */
      push_notification: (n: Notification) => {
        set((s) => ({ notifications: [...s.notifications, n] }));
      },

      remove_notification: (id: string) => {
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
      },

      /* -------- Socket -------- */
      connect_socket: () => {
        const { auth_token } = get().authentication_state;
        if (!auth_token) return;
        const socket = io(BASE_URL, {
          auth: { token: auth_token },
          transports: ['websocket'],
          reconnection: true,
        });
        set(() => ({ socket }));
      },

      disconnect_socket: () => {
        const s = get().socket;
        if (s) {
          s.disconnect();
        }
        set(() => ({ socket: null }));
      },

      on_socket_event: (event: string, callback: (...args: any[]) => void) => {
        const s = get().socket;
        if (s) s.on(event, callback);
      },
    }),
    {
      name: 'image-show-app-store',
      partialize: (state: AppState) => ({
        authentication_state: {
          current_user: state.authentication_state.current_user,
          auth_token: state.authentication_state.auth_token,
          authentication_status: {
            is_authenticated:
              !!state.authentication_state.current_user &&
              !!state.authentication_state.auth_token,
            is_loading: false,
          },
          error_message: null,
        },
        theme_mode: state.theme_mode,
      }),
    }
  )
);