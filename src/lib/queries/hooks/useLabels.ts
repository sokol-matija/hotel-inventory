import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import type { TablesUpdate } from '../../supabase';
import { queryKeys } from '../queryKeys';

// ─── Query definition ──────────────────────────────────────────────────────────

const labelsQuery = supabase.from('labels').select('*').order('name');

// ─── Derived types ─────────────────────────────────────────────────────────────

type LabelRow = QueryData<typeof labelsQuery>[number];

export interface Label {
  id: string;
  hotelId: string;
  name: string;
  color: string;
  bgColor: string;
  createdAt: Date;
  updatedAt: Date;
}

export type LabelCreate = Omit<Label, 'id' | 'createdAt' | 'updatedAt' | 'color' | 'bgColor'> & {
  color?: string;
  bgColor?: string;
};

export type LabelUpdate = Partial<Pick<Label, 'name' | 'color' | 'bgColor'>>;

// ─── Mapping helper ────────────────────────────────────────────────────────────

function mapLabel(row: LabelRow): Label {
  return {
    id: row.id,
    hotelId: row.hotel_id.toString(),
    name: row.name,
    color: row.color ?? '#000000',
    bgColor: row.bg_color ?? '#FFFFFF',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ─── Service functions (queryFn targets) ──────────────────────────────────────

async function fetchLabels(): Promise<Label[]> {
  const { data } = await labelsQuery.throwOnError();
  return (data ?? []).map(mapLabel);
}

async function createLabelInDB(label: LabelCreate): Promise<Label> {
  const { data } = await supabase
    .from('labels')
    .insert({
      hotel_id: parseInt(label.hotelId),
      name: label.name,
      color: label.color ?? '#000000',
      bg_color: label.bgColor ?? '#FFFFFF',
    })
    .select()
    .single()
    .throwOnError();
  return mapLabel(data);
}

async function updateLabelInDB(id: string, updates: LabelUpdate): Promise<Label> {
  const updateData: TablesUpdate<'labels'> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.bgColor !== undefined) updateData.bg_color = updates.bgColor;
  updateData.updated_at = new Date().toISOString();

  const { data } = await supabase
    .from('labels')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
    .throwOnError();
  return mapLabel(data);
}

async function deleteLabelInDB(id: string): Promise<void> {
  await supabase.from('labels').delete().eq('id', id).throwOnError();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLabels() {
  return useQuery({
    queryKey: queryKeys.labels.all(),
    queryFn: fetchLabels,
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLabelInDB,
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.labels.all() });
    },
  });
}

export function useUpdateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: LabelUpdate }) =>
      updateLabelInDB(id, updates),
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.labels.all() });
    },
  });
}

export function useDeleteLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLabelInDB,
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
