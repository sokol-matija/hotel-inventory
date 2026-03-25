// InvoiceService - Creates invoices from reservation_charges and copies lines to invoice_lines

import { supabase } from '../../supabase';
import { Invoice } from '../types';
import { generateInvoiceNumber } from '../../pdfInvoiceGenerator';

/**
 * Create an invoice for a reservation by:
 * 1. Loading reservation_charges for the reservation
 * 2. Inserting a new invoices row (with totals derived from charges)
 * 3. Copying charge rows → invoice_lines
 *
 * Returns a minimal Invoice-compatible object with id and invoiceNumber populated.
 */
export async function createInvoice(
  reservationId: string | number,
  options: { isR1?: boolean; companyId?: number; guestId?: number } = {}
): Promise<Pick<Invoice, 'id' | 'invoiceNumber'>> {
  const reservationIdNum =
    typeof reservationId === 'string' ? parseInt(reservationId, 10) : reservationId;

  // 1. Load reservation_charges for this reservation
  const { data: charges, error: chargesError } = await supabase
    .from('reservation_charges')
    .select('*')
    .eq('reservation_id', reservationIdNum)
    .order('sort_order', { ascending: true });

  if (chargesError) throw chargesError;

  const totalAmount = charges?.reduce((sum, c) => sum + Number(c.total), 0) ?? 0;
  const subtotal = charges
    ? charges.reduce((sum, c) => sum + Number(c.unit_price) * Number(c.quantity), 0)
    : 0;

  // Generate invoice number — need a minimal Reservation-like object with an id string
  const invoiceNumber = generateInvoiceNumber({
    id: reservationIdNum,
  } as import('../types').Reservation);

  // 2. Create invoices row
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      reservation_id: reservationIdNum,
      guest_id: options.guestId ?? null,
      company_id: options.companyId ?? null,
      subtotal,
      total_amount: totalAmount,
      status: 'draft',
      issue_date: new Date().toISOString().split('T')[0],
    })
    .select('id, invoice_number')
    .single();

  if (invoiceError) throw invoiceError;
  if (!invoice) throw new Error('Failed to create invoice: no data returned');

  // 3. Copy reservation_charges → invoice_lines
  if (charges && charges.length > 0) {
    const { error: linesError } = await supabase.from('invoice_lines').insert(
      charges.map((c) => ({
        invoice_id: invoice.id,
        charge_type: c.charge_type,
        description: c.description,
        quantity: Number(c.quantity),
        unit_price: Number(c.unit_price),
        total: Number(c.total),
        vat_rate: Number(c.vat_rate ?? 0.13),
        sort_order: c.sort_order ?? 0,
      }))
    );
    if (linesError) throw linesError;
  }

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
  } as Pick<Invoice, 'id' | 'invoiceNumber'>;
}
