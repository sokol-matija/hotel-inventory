import { z } from 'zod';

export const editReservationSchema = z
  .object({
    check_in_date: z.string().min(1, 'Check-in date is required'),
    check_out_date: z.string().min(1, 'Check-out date is required'),
    room_id: z.number().min(1, 'Room is required'),
    status: z.string().min(1, 'Status is required'),
    booking_source: z.string().optional(),
    adults: z.number().min(1, 'At least 1 adult required'),
    children_count: z.number().min(0),
    has_pets: z.boolean(),
    parking_required: z.boolean(),
    is_r1: z.boolean(),
    company_id: z.number().nullable(),
    label_id: z.string().nullable(),
    special_requests: z.string().optional(),
    internal_notes: z.string().optional(),
  })
  .refine((data) => data.check_out_date > data.check_in_date, {
    message: 'Check-out must be after check-in',
    path: ['check_out_date'],
  });

export type EditReservationFormValues = z.infer<typeof editReservationSchema>;
