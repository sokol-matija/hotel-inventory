/**
 * HTTP dispatch layer for hotel emails.
 * Calls the Supabase Edge Function `send-email` (backed by Resend API).
 * Takes a ready-to-send payload and returns a success/failure result.
 */

import { supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import type { EmailTemplate } from '@/lib/email/templates/reservationTemplates';

export interface SendEmailResult {
  success: boolean;
  message: string;
}

/**
 * Send an email via the Supabase Edge Function.
 *
 * Falls back to a simulated send if Supabase is not configured (dev convenience).
 */
export async function sendEmail(
  to: string,
  template: EmailTemplate,
  _guestName: string
): Promise<SendEmailResult> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Supabase not configured, falling back to simulation');
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return {
        success: true,
        message: `Email simulated successfully to ${to} (no Supabase configured)`,
      };
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-email`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject: template.subject,
        html: template.body,
      }),
    });

    const result = (await response.json()) as { success?: boolean; message?: string };

    if (response.ok && result.success) {
      return {
        success: true,
        message: `Email sent successfully to ${to}`,
      };
    } else {
      console.error('❌ Supabase Edge Function error:', result);
      return {
        success: false,
        message: result.message ?? 'Failed to send email via Supabase',
      };
    }
  } catch (error) {
    console.error('❌ Failed to send email via Supabase:', error);
    return {
      success: false,
      message: `Failed to send email to ${to}. Please try again.`,
    };
  }
}
