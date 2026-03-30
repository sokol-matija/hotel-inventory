import { z } from 'zod';

// ─── Zod schema ───────────────────────────────────────────────────────────────

export const guestFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z
    .string()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: 'Please enter a valid email address',
    }),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  preferred_language: z.string().optional(),
  has_pets: z.boolean(),
  is_vip: z.boolean(),
  notes: z.string().optional(),
});

export type FormData = z.infer<typeof guestFormSchema>;

// ─── Default value helpers ────────────────────────────────────────────────────

export interface InitialData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

export function guestToForm(g: {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  preferred_language: string | null;
  has_pets: boolean | null;
  is_vip: boolean | null;
  notes: string | null;
}): FormData {
  return {
    first_name: g.first_name ?? '',
    last_name: g.last_name ?? '',
    email: g.email ?? '',
    phone: g.phone ?? '',
    nationality: g.nationality ?? 'German',
    preferred_language: g.preferred_language ?? 'en',
    has_pets: g.has_pets ?? false,
    is_vip: g.is_vip ?? false,
    notes: g.notes ?? '',
  };
}

export function emptyForm(initialData?: InitialData): FormData {
  const [first, ...rest] = (initialData?.fullName ?? '').split(' ');
  return {
    first_name: initialData?.firstName ?? first ?? '',
    last_name: initialData?.lastName ?? rest.join(' ') ?? '',
    email: initialData?.email ?? '',
    phone: initialData?.phone ?? '',
    nationality: 'German',
    preferred_language: 'de',
    has_pets: false,
    is_vip: false,
    notes: '',
  };
}
