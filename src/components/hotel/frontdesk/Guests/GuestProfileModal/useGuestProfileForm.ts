import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Guest } from '../../../../../lib/queries/hooks/useGuests';
import { useCreateGuest, useUpdateGuest } from '../../../../../lib/queries/hooks/useGuests';
import type { TablesInsert } from '@/lib/supabase';
import { guestFormSchema, guestToForm, emptyForm } from './formHelpers';
import type { FormData } from './formHelpers';

interface UseGuestProfileFormOptions {
  guest?: Guest | null;
  initialData?: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
  mode: 'view' | 'edit' | 'create';
  isOpen: boolean;
  onSave?: (guest: Guest) => void;
  onClose: () => void;
}

export function useGuestProfileForm({
  guest,
  initialData,
  mode,
  isOpen,
  onSave,
  onClose,
}: UseGuestProfileFormOptions) {
  const createGuestMutation = useCreateGuest();
  const updateGuestMutation = useUpdateGuest();

  const form = useForm<FormData>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: guest ? guestToForm(guest) : emptyForm(initialData),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const [isEditing, setIsEditing] = React.useState(mode === 'edit' || mode === 'create');

  // Re-initialize form when guest/open changes.
  useEffect(() => {
    reset(guest ? guestToForm(guest) : emptyForm(initialData));
    setIsEditing(mode === 'edit' || mode === 'create');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guest?.id, isOpen]);

  const onSubmit = async (data: FormData) => {
    try {
      const insertPayload: TablesInsert<'guests'> = {
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: `${data.first_name} ${data.last_name}`.trim(),
        email: data.email || null,
        phone: data.phone || null,
        nationality: data.nationality || null,
        preferred_language: data.preferred_language || null,
        has_pets: data.has_pets,
        is_vip: data.is_vip,
        notes: data.notes || null,
      };

      if (mode === 'create') {
        await createGuestMutation.mutateAsync(insertPayload);
      } else if (guest) {
        await updateGuestMutation.mutateAsync({ id: guest.id, updates: insertPayload });
      }

      // Build a minimal Guest-shaped object for the onSave callback
      if (onSave && guest) {
        onSave({
          ...guest,
          ...data,
          email: data.email ?? null,
          phone: data.phone ?? null,
          nationality: data.nationality ?? null,
          preferred_language: data.preferred_language ?? null,
          notes: data.notes ?? null,
          display_name: `${data.first_name} ${data.last_name}`.trim(),
          full_name: `${data.first_name} ${data.last_name}`.trim(),
        });
      }

      setIsEditing(false);
      onClose();
    } catch (error) {
      console.error('Failed to save guest:', error);
    }
  };

  return {
    register,
    control,
    handleSubmit,
    watch,
    errors,
    isSubmitting,
    isEditing,
    setIsEditing,
    onSubmit,
  };
}
