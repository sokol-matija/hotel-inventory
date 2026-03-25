import { z } from 'zod';

export const pricingTierSchema = z
  .object({
    name: z.string().min(1, 'Pricing tier name is required'),
    description: z.string(),
    discountPercentage: z.number().min(0).max(100),
    minimumStay: z.number().int().min(1),
    validFrom: z.string().min(1, 'Valid from date is required'),
    validTo: z.string().min(1, 'Valid to date is required'),
    isActive: z.boolean(),
    isDefault: z.boolean(),
  })
  .refine((data) => data.validTo >= data.validFrom, {
    message: 'Valid to date must be on or after valid from date',
    path: ['validTo'],
  });

export type PricingTierFormValues = z.infer<typeof pricingTierSchema>;
