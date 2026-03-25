/**
 * Pure utility functions for Croatian fiscalization.
 * Extracted into a separate module so they can be unit-tested
 * without importing the edge function entry point (which starts serve()).
 */

export const ALLOWED_VAT_RATES = [25, 13, 5, 0] as const;

/** Format a date for the ZKI data string: "dd.MM.yyyy HH:mm:ss" */
export function formatZKIDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

/** Format a date for SOAP XML nodes: "dd.MM.yyyyTHH:mm:ss" */
export function formatXMLDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}.${month}.${year}T${hours}:${minutes}:${seconds}`;
}

/**
 * Infer and normalise the VAT rate from a gross total and VAT amount.
 * Falls back to 13% if the inferred rate is not in the Croatian allowed set.
 */
export function normalizeVatRate(totalAmount: number, vatAmount: number): number {
  const baseAmount = totalAmount - vatAmount;
  const inferredRate = baseAmount > 0 ? (vatAmount / baseAmount) * 100 : 13;
  const rounded = Number(inferredRate.toFixed(2));
  const isAllowed = ALLOWED_VAT_RATES.some((r) => Math.abs(r - rounded) < 0.01);
  return isAllowed ? rounded : 13;
}

/** Parse the Croatian Tax Authority (FINA) SOAP XML response. */
export function parseResponse(responseBody: string): {
  success: boolean;
  jir?: string;
  error?: string;
} {
  const errorMatch =
    responseBody.match(/<SifraGreske>(.+?)<\/SifraGreske>/) ||
    responseBody.match(/<tns:SifraGreske>(.+?)<\/tns:SifraGreske>/);
  const messageMatch =
    responseBody.match(/<PorukaGreske>(.+?)<\/PorukaGreske>/) ||
    responseBody.match(/<tns:PorukaGreske>(.+?)<\/tns:PorukaGreske>/);

  if (errorMatch) {
    return {
      success: false,
      error: `${errorMatch[1]}: ${messageMatch ? messageMatch[1] : 'Unknown error'}`,
    };
  }

  const jirMatch =
    responseBody.match(/<Jir>(.+?)<\/Jir>/) ||
    responseBody.match(/<tns:Jir>(.+?)<\/tns:Jir>/);

  if (jirMatch) {
    return { success: true, jir: jirMatch[1] };
  }

  return { success: false, error: 'No JIR or error found in response' };
}
