import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, handleCors } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const { to, subject, html } = await req.json();

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'RESEND_API_KEY not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: to, subject, html'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Send email using Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Hotel Porec <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const result = await resendResponse.json();

    if (resendResponse.ok) {
      console.log('📧 Email sent successfully:', {
        to,
        subject,
        emailId: result.id,
        timestamp: new Date().toISOString()
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `Email sent successfully to ${to}`,
          emailId: result.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      console.error('❌ Resend API error:', result);
      return new Response(
        JSON.stringify({
          success: false,
          message: result.message || 'Failed to send email'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('❌ Edge Function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
