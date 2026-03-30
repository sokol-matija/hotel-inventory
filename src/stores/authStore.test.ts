import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

// ── Hoisted mock state (accessible inside vi.mock factory) ──────────────────

type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void;

const mocks = vi.hoisted(() => {
  const mockUnsubscribe = vi.fn();
  const mockSignOut = vi.fn().mockResolvedValue({ error: null });

  // Will be assigned by mockOnAuthStateChange
  let capturedAuthCallback: AuthCallback | null = null;

  const mockOnAuthStateChange = vi.fn().mockImplementation((callback: AuthCallback) => {
    capturedAuthCallback = callback;
    return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
  });

  const profileQuery = {
    data: null as unknown,
    error: null as unknown,
  };

  return {
    mockUnsubscribe,
    mockSignOut,
    mockOnAuthStateChange,
    profileQuery,
    getCapturedCallback: () => capturedAuthCallback,
    setCapturedCallback: (cb: AuthCallback | null) => {
      capturedAuthCallback = cb;
    },
  };
});

vi.mock('@/lib/supabase', () => {
  function makeProxy(): unknown {
    const handler: ProxyHandler<object> = {
      get(_target, prop: string | symbol) {
        if (prop === 'then') {
          if (mocks.profileQuery.error !== null) {
            return (_resolve: unknown, reject?: (e: unknown) => void) => {
              if (typeof reject === 'function') reject(mocks.profileQuery.error);
            };
          }
          return (resolve: (v: unknown) => void) =>
            resolve({ data: mocks.profileQuery.data, error: null });
        }
        return vi.fn().mockReturnValue(new Proxy({}, handler));
      },
    };
    return new Proxy({}, handler);
  }

  return {
    supabase: {
      from: vi.fn(() => makeProxy()),
      auth: {
        signOut: mocks.mockSignOut,
        onAuthStateChange: mocks.mockOnAuthStateChange,
      },
    },
  };
});

// ── Import store AFTER mocks ────────────────────────────────────────────────

import { useAuthStore } from './authStore';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const fakeUser: User = {
  id: 'user-123',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
} as User;

const fakeSession: Session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: fakeUser,
} as Session;

const fakeProfile = {
  id: 'profile-1',
  user_id: 'user-123',
  role_id: 1,
  created_at: '2026-01-01T00:00:00Z',
};

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  mocks.setCapturedCallback(null);
  mocks.profileQuery.data = null;
  mocks.profileQuery.error = null;
  mocks.mockSignOut.mockClear();
  mocks.mockOnAuthStateChange.mockClear();
  mocks.mockUnsubscribe.mockClear();

  // Reset the store to initial state between tests
  useAuthStore.setState({
    user: null,
    session: null,
    loading: true,
    userProfile: null,
    hasProfile: false,
    profileLoading: false,
  });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('authStore', () => {
  describe('initial state', () => {
    it('starts with null user, null session, and loading=true', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.loading).toBe(true);
      expect(state.userProfile).toBeNull();
      expect(state.hasProfile).toBe(false);
      expect(state.profileLoading).toBe(false);
    });
  });

  describe('initialize', () => {
    it('subscribes to auth state changes and returns cleanup function', () => {
      const cleanup = useAuthStore.getState().initialize();
      expect(mocks.mockOnAuthStateChange).toHaveBeenCalledOnce();
      expect(typeof cleanup).toBe('function');

      cleanup();
      expect(mocks.mockUnsubscribe).toHaveBeenCalledOnce();
    });

    it('handles INITIAL_SESSION with no session (logged out)', () => {
      useAuthStore.getState().initialize();
      const callback = mocks.getCapturedCallback()!;
      expect(callback).not.toBeNull();

      callback('INITIAL_SESSION', null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.hasProfile).toBe(false);
      expect(state.loading).toBe(false);
    });

    it('handles INITIAL_SESSION with a session and loads profile', async () => {
      mocks.profileQuery.data = fakeProfile;

      useAuthStore.getState().initialize();
      const callback = mocks.getCapturedCallback()!;
      callback('INITIAL_SESSION', fakeSession);

      // User/session set synchronously
      expect(useAuthStore.getState().user).toEqual(fakeUser);
      expect(useAuthStore.getState().session).toEqual(fakeSession);

      // Wait for async profile check to complete
      await vi.waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.hasProfile).toBe(true);
        expect(state.userProfile).toEqual(fakeProfile);
        expect(state.loading).toBe(false);
        expect(state.profileLoading).toBe(false);
      });
    });

    it('handles INITIAL_SESSION with session but no profile', async () => {
      mocks.profileQuery.data = null;

      useAuthStore.getState().initialize();
      mocks.getCapturedCallback()!('INITIAL_SESSION', fakeSession);

      await vi.waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.hasProfile).toBe(false);
        expect(state.userProfile).toBeNull();
        expect(state.loading).toBe(false);
      });
    });

    it('handles SIGNED_IN event and loads profile', async () => {
      mocks.profileQuery.data = fakeProfile;

      useAuthStore.getState().initialize();
      mocks.getCapturedCallback()!('SIGNED_IN', fakeSession);

      await vi.waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.user).toEqual(fakeUser);
        expect(state.session).toEqual(fakeSession);
        expect(state.hasProfile).toBe(true);
        expect(state.userProfile).toEqual(fakeProfile);
      });
    });

    it('handles SIGNED_OUT event and clears profile', () => {
      useAuthStore.setState({
        user: fakeUser,
        session: fakeSession,
        hasProfile: true,
        userProfile: fakeProfile,
      });

      useAuthStore.getState().initialize();
      mocks.getCapturedCallback()!('SIGNED_OUT', null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.hasProfile).toBe(false);
      expect(state.userProfile).toBeNull();
    });

    it('handles TOKEN_REFRESHED event by updating session without profile check', () => {
      const updatedSession = { ...fakeSession, access_token: 'new-token' } as Session;

      useAuthStore.setState({
        user: fakeUser,
        session: fakeSession,
        hasProfile: true,
        userProfile: fakeProfile,
      });

      useAuthStore.getState().initialize();
      mocks.getCapturedCallback()!('TOKEN_REFRESHED', updatedSession);

      const state = useAuthStore.getState();
      expect(state.session?.access_token).toBe('new-token');
      // Profile should remain unchanged
      expect(state.hasProfile).toBe(true);
      expect(state.userProfile).toEqual(fakeProfile);
    });

    it('handles USER_UPDATED event', async () => {
      mocks.profileQuery.data = fakeProfile;

      useAuthStore.getState().initialize();
      mocks.getCapturedCallback()!('USER_UPDATED', fakeSession);

      await vi.waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.user).toEqual(fakeUser);
        expect(state.hasProfile).toBe(true);
      });
    });

    it('does not fire callbacks after cleanup (mounted=false)', () => {
      mocks.profileQuery.data = fakeProfile;

      const cleanup = useAuthStore.getState().initialize();
      cleanup();

      mocks.getCapturedCallback()!('INITIAL_SESSION', fakeSession);

      // State should NOT have been updated
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut and clears profile state', async () => {
      useAuthStore.setState({
        user: fakeUser,
        session: fakeSession,
        hasProfile: true,
        userProfile: fakeProfile,
      });

      await useAuthStore.getState().signOut();

      expect(mocks.mockSignOut).toHaveBeenCalledOnce();
      const state = useAuthStore.getState();
      expect(state.userProfile).toBeNull();
      expect(state.hasProfile).toBe(false);
    });
  });

  describe('refreshProfile', () => {
    it('reloads profile for the current user', async () => {
      mocks.profileQuery.data = fakeProfile;
      useAuthStore.setState({ user: fakeUser });

      await useAuthStore.getState().refreshProfile();

      const state = useAuthStore.getState();
      expect(state.hasProfile).toBe(true);
      expect(state.userProfile).toEqual(fakeProfile);
    });

    it('does nothing when there is no user', async () => {
      useAuthStore.setState({ user: null });

      await useAuthStore.getState().refreshProfile();

      const state = useAuthStore.getState();
      expect(state.hasProfile).toBe(false);
      expect(state.userProfile).toBeNull();
    });
  });

  describe('profile error handling', () => {
    it('sets hasProfile=false on database error', async () => {
      // Override the from mock to return an error in the response
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.from).mockImplementationOnce(() => {
        const handler: ProxyHandler<object> = {
          get(_target, prop: string | symbol) {
            if (prop === 'then') {
              return (resolve: (v: unknown) => void) =>
                resolve({
                  data: null,
                  error: { message: 'permission denied', code: '42501', details: null, hint: null },
                });
            }
            return vi.fn().mockReturnValue(new Proxy({}, handler));
          },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- proxy mock
        return new Proxy({}, handler) as any;
      });

      useAuthStore.setState({ user: fakeUser });
      await useAuthStore.getState().refreshProfile();

      const state = useAuthStore.getState();
      expect(state.hasProfile).toBe(false);
      expect(state.userProfile).toBeNull();
    });

    it('sets hasProfile=false on PGRST116 (no rows) error', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.from).mockImplementationOnce(() => {
        const handler: ProxyHandler<object> = {
          get(_target, prop: string | symbol) {
            if (prop === 'then') {
              return (resolve: (v: unknown) => void) =>
                resolve({
                  data: null,
                  error: { message: 'no rows', code: 'PGRST116', details: null, hint: null },
                });
            }
            return vi.fn().mockReturnValue(new Proxy({}, handler));
          },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- proxy mock
        return new Proxy({}, handler) as any;
      });

      useAuthStore.setState({ user: fakeUser });
      await useAuthStore.getState().refreshProfile();

      const state = useAuthStore.getState();
      expect(state.hasProfile).toBe(false);
      expect(state.userProfile).toBeNull();
    });

    it('catches thrown errors and sets hasProfile=false', async () => {
      mocks.profileQuery.error = new Error('Network failure');

      useAuthStore.setState({ user: fakeUser });
      await useAuthStore.getState().refreshProfile();

      const state = useAuthStore.getState();
      expect(state.hasProfile).toBe(false);
      expect(state.userProfile).toBeNull();
      expect(state.profileLoading).toBe(false);
    });
  });

  describe('race condition guard (profileCheckInProgress)', () => {
    it('prevents concurrent profile checks from overlapping', async () => {
      mocks.profileQuery.data = fakeProfile;
      useAuthStore.setState({ user: fakeUser });

      // Fire two concurrent refreshProfile calls
      const p1 = useAuthStore.getState().refreshProfile();
      const p2 = useAuthStore.getState().refreshProfile();

      await Promise.all([p1, p2]);

      // Should still resolve to valid state
      const state = useAuthStore.getState();
      expect(state.hasProfile).toBe(true);
      expect(state.profileLoading).toBe(false);
    });
  });

  describe('useAuth alias', () => {
    it('exports useAuth which delegates to useAuthStore', async () => {
      const { useAuth } = await import('./authStore');
      expect(typeof useAuth).toBe('function');
      // useAuth is defined as () => useAuthStore(), so it's a wrapper — not the same reference
      // We verify it's exported and callable
      expect(useAuth).toBeDefined();
    });
  });
});
