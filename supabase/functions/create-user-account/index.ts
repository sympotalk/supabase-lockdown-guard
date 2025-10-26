import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  role: 'master' | 'agency_owner' | 'staff';
  agency_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is master
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'master') {
      console.error('[create-user-account] Unauthorized attempt by:', user.id, roleData?.role);
      throw new Error('Unauthorized: only MASTER can create users directly');
    }

    const { email, password, role, agency_id }: CreateUserRequest = await req.json();

    console.log('[create-user-account] Creating user:', { email, role, agency_id });

    // Validate input
    if (!email || !password || !role) {
      throw new Error('Missing required fields: email, password, role');
    }

    // Validate role
    if (!['master', 'agency_owner', 'staff'].includes(role)) {
      throw new Error('Invalid role');
    }

    // Validate master role constraint (no agency)
    if (role === 'master' && agency_id) {
      throw new Error('Master role cannot be assigned to an agency');
    }

    // Validate non-master roles require agency
    if (role !== 'master' && !agency_id) {
      throw new Error('Agency is required for non-master roles');
    }

    // Create auth user with admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        created_by: user.id,
        created_at: new Date().toISOString(),
      },
    });

    if (createError) {
      console.error('[create-user-account] Auth creation failed:', createError);
      throw new Error(`Failed to create auth user: ${createError.message}`);
    }

    if (!newUser.user) {
      throw new Error('User creation returned no user object');
    }

    console.log('[create-user-account] Auth user created:', newUser.user.id);

    // Create user role entry
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role,
        agency_id: agency_id || null,
      });

    if (roleInsertError) {
      console.error('[create-user-account] Role insertion failed:', roleInsertError);
      // Try to clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Failed to create user role: ${roleInsertError.message}`);
    }

    console.log('[create-user-account] User role created for:', newUser.user.id);

    // Log the action
    await supabaseAdmin
      .from('logs')
      .insert({
        action: 'USER_CREATED',
        actor_role: 'master',
        target_table: 'user_roles',
        payload: {
          created_user_id: newUser.user.id,
          email,
          role,
          agency_id: agency_id || null,
        },
        created_by: user.id,
        agency_id: agency_id || null,
      });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        email: newUser.user.email,
        role,
        agency_id: agency_id || null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[create-user-account] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
