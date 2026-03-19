import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  user_id: string;
  role_id: number;
  created_at: string;
  updated_at?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userProfile: UserProfile | null;
  hasProfile: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  initialize: () => () => void;
}

// Module-level flag to prevent concurrent profile checks
let profileCheckInProgress = false;

const checkUserProfile = async (userId: string, set: (partial: Partial<AuthState>) => void) => {
  console.log('checkUserProfile: Starting for user:', userId);

  if (profileCheckInProgress) {
    console.log('checkUserProfile: Already checking profile, skipping duplicate call');
    return;
  }

  profileCheckInProgress = true;
  set({ profileLoading: true });

  try {
    console.log('checkUserProfile: Making database query...');

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Profile query timeout after 15 seconds')), 15000)
    );

    const queryPromise = supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = (await Promise.race([queryPromise, timeoutPromise])) as any;

    console.log('checkUserProfile: Query returned', { data, error, errorCode: error?.code });

    if (error) {
      console.error('checkUserProfile: Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      if (error.code === 'PGRST116') {
        console.log('checkUserProfile: No profile found (user needs to select role)');
        set({ userProfile: null, hasProfile: false });
      } else {
        console.error('checkUserProfile: Database error:', error);
        set({ userProfile: null, hasProfile: false });
      }
    } else {
      console.log('checkUserProfile: Success! Profile data:', data);
      set({ userProfile: data, hasProfile: !!data });
    }
  } catch (error) {
    console.error('checkUserProfile: Catch block error:', error);
    set({ userProfile: null, hasProfile: false });
  } finally {
    profileCheckInProgress = false;
    set({ profileLoading: false });
    console.log('checkUserProfile: Finished');
  }
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  loading: true,
  userProfile: null,
  hasProfile: false,
  profileLoading: false,

  signOut: async () => {
    await supabase.auth.signOut();
    set({ userProfile: null, hasProfile: false });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (user) {
      await checkUserProfile(user.id, set);
    }
  },

  initialize: () => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      console.log('Initial session check:', session?.user?.email);
      set({ session, user: session?.user ?? null });

      if (session?.user) {
        await checkUserProfile(session.user.id, set);
      } else {
        set({ userProfile: null, hasProfile: false });
      }

      set({ loading: false });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      console.log('Auth state changed:', event, session?.user?.email);

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        set({ session, user: session?.user ?? null });

        if (session?.user) {
          checkUserProfile(session.user.id, set);
        } else {
          set({ userProfile: null, hasProfile: false });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  },
}));

export const useAuth = () => useAuthStore();
