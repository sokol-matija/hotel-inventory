// Edge Function: assign-role
// Assigns a role to the current authenticated user.
// Admin role assignment requires a server-side password check.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Anon client — to verify the JWT and get the user
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { role_id, admin_password } = await req.json() as {
      role_id: number;
      admin_password?: string;
    };

    if (!role_id) {
      return new Response(JSON.stringify({ error: 'role_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service-role client — bypasses RLS for the actual insert
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Look up the admin role id by name (avoids hardcoding the numeric id)
    const { data: adminRoleRow } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    const adminRoleId = adminRoleRow?.id as number | undefined;

    // If the requested role is admin, verify the server-side password
    if (adminRoleId !== undefined && role_id === adminRoleId) {
      const serverPassword = Deno.env.get('ADMIN_PASSWORD');
      if (!serverPassword) {
        return new Response(JSON.stringify({ error: 'Admin role assignment is not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (admin_password !== serverPassword) {
        return new Response(JSON.stringify({ error: 'Incorrect admin password' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Insert the user profile (service role bypasses RLS)
    const { error: insertError } = await supabaseAdmin.from('user_profiles').insert({
      user_id: user.id,
      role_id,
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
