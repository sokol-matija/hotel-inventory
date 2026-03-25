import {
  assertEquals,
  assertMatch,
} from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  formatZKIDateTime,
  formatXMLDateTime,
  normalizeVatRate,
  parseResponse,
} from './_pure.ts';

// ── formatZKIDateTime ─────────────────────────────────────────────────────────

Deno.test('formatZKIDateTime: pads single-digit day, month, hour, minute, second', () => {
  // Jan 5 2026 08:03:09 — every component needs padding
  const date = new Date(2026, 0, 5, 8, 3, 9);
  assertEquals(formatZKIDateTime(date), '05.01.2026 08:03:09');
});

Deno.test('formatZKIDateTime: no padding needed for double-digit components', () => {
  // Dec 31 2026 23:59:59
  const date = new Date(2026, 11, 31, 23, 59, 59);
  assertEquals(formatZKIDateTime(date), '31.12.2026 23:59:59');
});

Deno.test('formatZKIDateTime: midnight is formatted as 00:00:00', () => {
  const date = new Date(2026, 4, 15, 0, 0, 0);
  assertEquals(formatZKIDateTime(date), '15.05.2026 00:00:00');
});

Deno.test('formatZKIDateTime: uses space separator between date and time', () => {
  const result = formatZKIDateTime(new Date(2026, 5, 1, 12, 0, 0));
  assertMatch(result, /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2}$/);
});

// ── formatXMLDateTime ─────────────────────────────────────────────────────────

Deno.test('formatXMLDateTime: pads single-digit components', () => {
  const date = new Date(2026, 0, 5, 8, 3, 9);
  assertEquals(formatXMLDateTime(date), '05.01.2026T08:03:09');
});

Deno.test('formatXMLDateTime: no padding needed for double-digit components', () => {
  const date = new Date(2026, 11, 31, 23, 59, 59);
  assertEquals(formatXMLDateTime(date), '31.12.2026T23:59:59');
});

Deno.test('formatXMLDateTime: uses T separator (not space like ZKI)', () => {
  const result = formatXMLDateTime(new Date(2026, 5, 1, 12, 0, 0));
  assertMatch(result, /^\d{2}\.\d{2}\.\d{4}T\d{2}:\d{2}:\d{2}$/);
});

// ── normalizeVatRate ──────────────────────────────────────────────────────────

Deno.test('normalizeVatRate: 13% standard Croatian accommodation rate', () => {
  // gross 113.00, vat 13.00 → base 100 → 13/100 = 13%
  assertEquals(normalizeVatRate(113.00, 13.00), 13);
});

Deno.test('normalizeVatRate: 25% standard rate', () => {
  assertEquals(normalizeVatRate(125.00, 25.00), 25);
});

Deno.test('normalizeVatRate: 5% reduced rate', () => {
  assertEquals(normalizeVatRate(105.00, 5.00), 5);
});

Deno.test('normalizeVatRate: 0% VAT-exempt', () => {
  assertEquals(normalizeVatRate(100.00, 0.00), 0);
});

Deno.test('normalizeVatRate: non-standard rate falls back to 13%', () => {
  // gross 110, vat 10 → base 100 → 10% inferred → not in [25,13,5,0] → fallback 13
  assertEquals(normalizeVatRate(110.00, 10.00), 13);
});

Deno.test('normalizeVatRate: zero base amount (totalAmount == vatAmount) falls back to 13%', () => {
  // base = 100 - 100 = 0 → ternary default → 13
  assertEquals(normalizeVatRate(100.00, 100.00), 13);
});

Deno.test('normalizeVatRate: floating-point 13% within tolerance', () => {
  // Real-world: gross 56.64, VAT ≈ 6.54 → inferred ≈ 13.00...
  const gross = 56.64;
  const vat = gross - gross / 1.13;
  assertEquals(normalizeVatRate(gross, vat), 13);
});

// ── parseResponse ─────────────────────────────────────────────────────────────

const JIR = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

Deno.test('parseResponse: extracts JIR from successful response (no namespace)', () => {
  const xml = `<soap:Envelope><soap:Body><RacunOdgovor><Jir>${JIR}</Jir></RacunOdgovor></soap:Body></soap:Envelope>`;
  const result = parseResponse(xml);
  assertEquals(result, { success: true, jir: JIR });
});

Deno.test('parseResponse: extracts JIR from successful response (tns namespace)', () => {
  const xml = `<soap:Envelope><soap:Body><tns:RacunOdgovor><tns:Jir>${JIR}</tns:Jir></tns:RacunOdgovor></soap:Body></soap:Envelope>`;
  const result = parseResponse(xml);
  assertEquals(result, { success: true, jir: JIR });
});

Deno.test('parseResponse: extracts error code and message (no namespace)', () => {
  const xml = `<soap:Envelope><soap:Body><SifraGreske>v100</SifraGreske><PorukaGreske>Invalid OIB</PorukaGreske></soap:Body></soap:Envelope>`;
  const result = parseResponse(xml);
  assertEquals(result, { success: false, error: 'v100: Invalid OIB' });
});

Deno.test('parseResponse: extracts error code and message (tns namespace)', () => {
  const xml = `<soap:Envelope><soap:Body><tns:SifraGreske>v200</tns:SifraGreske><tns:PorukaGreske>Racun vec postoji</tns:PorukaGreske></soap:Body></soap:Envelope>`;
  const result = parseResponse(xml);
  assertEquals(result, { success: false, error: 'v200: Racun vec postoji' });
});

Deno.test('parseResponse: error without message falls back to "Unknown error"', () => {
  const xml = `<SifraGreske>v300</SifraGreske>`;
  const result = parseResponse(xml);
  assertEquals(result, { success: false, error: 'v300: Unknown error' });
});

Deno.test('parseResponse: unrecognised response returns failure', () => {
  const xml = `<soap:Envelope><soap:Body></soap:Body></soap:Envelope>`;
  const result = parseResponse(xml);
  assertEquals(result, { success: false, error: 'No JIR or error found in response' });
});

Deno.test('parseResponse: error takes precedence over JIR if both present', () => {
  // Shouldn't happen in practice but error regex runs first
  const xml = `<SifraGreske>v999</SifraGreske><PorukaGreske>Err</PorukaGreske><Jir>${JIR}</Jir>`;
  const result = parseResponse(xml);
  assertEquals(result.success, false);
});
