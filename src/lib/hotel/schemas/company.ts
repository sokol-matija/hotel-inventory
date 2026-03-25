import { z } from 'zod';

/**
 * Croatian OIB check digit validation using ISO 7064 MOD 11,10.
 * Takes the first 10 digits, runs the algorithm, and verifies the 11th digit.
 */
function isValidOIBChecksum(oib: string): boolean {
  if (!/^\d{11}$/.test(oib)) return false;

  let product = 10;
  for (let i = 0; i < 10; i++) {
    const sum = (parseInt(oib[i]) + product) % 10;
    const adjusted = sum === 0 ? 10 : sum;
    product = (adjusted * 2) % 11;
  }

  const checkDigit = product === 1 ? 0 : 11 - product;
  return checkDigit === parseInt(oib[10]);
}

export const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  oib: z
    .string()
    .min(1, 'OIB is required')
    .regex(/^\d{11}$/, 'OIB must be exactly 11 digits')
    .refine(isValidOIBChecksum, 'Invalid Croatian OIB checksum'),
  address: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  contactPerson: z.string(),
  email: z
    .string()
    .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Invalid email address'),
  phone: z.string(),
  fax: z.string(),
  pricingTierId: z.string(),
  roomAllocationGuarantee: z.number().int().min(0),
  isActive: z.boolean(),
  notes: z.string(),
});

export type CompanyFormValues = z.infer<typeof companySchema>;
