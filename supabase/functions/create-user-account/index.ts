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

    console.log('[71-I.QA3-FIX.R4][create-user-account] Creating user:', { email, role, agency_id });

    // [71-I.QA3-FIX.R4] Validate input
    if (!email || !password) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: email, password',
          code: 'MISSING_FIELDS'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // [71-I.QA3-FIX.R4] Validate role
    if (!role || !['master', 'agency_owner', 'staff'].includes(role)) {
      return new Response(
        JSON.stringify({ 
          error: 'INVALID_ROLE',
          message: 'Role must be master, agency_owner, or staff'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // [71-I.QA3-FIX.R4] staff and agency_owner require agency_id
    if ((role === 'staff' || role === 'agency_owner') && !agency_id) {
      return new Response(
        JSON.stringify({ 
          error: 'MISSING_AGENCY_ID_FOR_STAFF',
          message: 'Agency ID is required for staff and agency_owner roles'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // [71-I.QA3-FIX.R4] master should not have agency_id
    const finalAgencyId = role === 'master' ? null : agency_id;

    // [71-I.QA3-FIX.R4] Create auth user with admin client
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
      console.error('[71-I.QA3-FIX.R4][create-user-account] Auth creation failed:', createError);
      return new Response(
        JSON.stringify({ 
          error: 'AUTH_SIGNUP_FAILED',
          message: createError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ 
          error: 'AUTH_SIGNUP_FAILED',
          message: 'User creation returned no user object'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('[71-I.QA3-FIX.R4][create-user-account] Auth user created:', newUser.user.id);

    // [71-I.QA3-FIX.R4] Create user role entry with validated agency_id
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role,
        agency_id: finalAgencyId,
      });

    if (roleInsertError) {
      console.error('[71-I.QA3-FIX.R4][create-user-account] Role insertion failed:', roleInsertError);
      // Try to clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ 
          error: 'USER_ROLES_INSERT_FAILED',
          message: roleInsertError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('[71-I.QA3-FIX.R4][create-user-account] User role created for:', newUser.user.id);

    // [71-I.QA3-FIX.R4] Log the action
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
          agency_id: finalAgencyId,
        },
        created_by: user.id,
        agency_id: finalAgencyId,
      });

    console.log(`[71-I.QA3-FIX.R4][create-user-account] Account created successfully: ${email}, role: ${role}, agency: ${finalAgencyId}`);

    return new Response(
      JSON.stringify({
        success: true,
        ok: true,
        user_id: newUser.user.id,
        email: newUser.user.email,
        role,
        agency_id: finalAgencyId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[71-I.QA3-FIX.R4][create-user-account] Error:', error);
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
