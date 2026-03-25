import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import type { TablesUpdate } from '../../supabase';
import { queryKeys } from '../queryKeys';

// ─── Query builder ─────────────────────────────────────────────────────────────

function buildLabelsQuery() {
  return supabase.from('labels').select('*').order('name');
}

// ─── Derived type ─────────────────────────────────────────────────────────────
// QueryData<> stays in sync with migrations automatically — no manual interface.

export type Label = QueryData<ReturnType<typeof buildLabelsQuery>>[number];

export type LabelCreate = {
  hotel_id?: number;
  name: string;
  color?: string;
  bg_color?: string;
};

export type LabelUpdate = Partial<Pick<Label, 'name' | 'color' | 'bg_color'>>;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLabels() {
  return useQuery({
    queryKey: queryKeys.labels.all(),
    queryFn: async () => {
      const { data } = await buildLabelsQuery().throwOnError();
      return data ?? [];
    },
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (label: LabelCreate) => {
      const { data } = await supabase
        .from('labels')
        .insert({
          hotel_id: label.hotel_id ?? 1,
          name: label.name,
          color: label.color ?? '#000000',
          bg_color: label.bg_color ?? '#FFFFFF',
        })
        .select()
        .single()
        .throwOnError();
      return data;
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.labels.all() });
    },
  });
}

export function useUpdateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: LabelUpdate }) => {
      const updateData: TablesUpdate<'labels'> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.bg_color !== undefined) updateData.bg_color = updates.bg_color;
      updateData.updated_at = new Date().toISOString();

      const { data } = await supabase
        .from('labels')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
        .throwOnError();
      return data;
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.labels.all() });
    },
  });
}

export function useDeleteLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('labels').delete().eq('id', id).throwOnError();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.labels.all() });
      const previous = queryClient.getQueryData<Label[]>(queryKeys.labels.all());
      queryClient.setQueryData<Label[]>(queryKeys.labels.all(), (old = []) =>
        old.filter((l) => l.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.labels.all(), context.previous);
      }
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.labels.all() });
    },
  });
}
