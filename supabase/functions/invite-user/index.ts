import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { email, agency_id, role = 'staff' } = await req.json();

    if (!email || !agency_id) {
      return new Response(
        JSON.stringify({ error: "Email and agency_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has permission to invite (master or agency_owner/admin of this agency)
    const { data: userRole, error: roleError } = await supabaseClient
      .from("user_agency_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .or(`role.eq.master,and(agency_id.eq.${agency_id},role.in.(agency_owner,admin))`)
      .single();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You don't have permission to invite users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already invited or part of the agency
    const { data: existingInvite } = await supabaseClient
      .from("user_invites")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .eq("agency_id", agency_id)
      .in("status", ["pending", "accepted"])
      .single();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ 
          error: existingInvite.status === "accepted" 
            ? "User already part of this agency" 
            : "Invitation already sent and pending"
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate invitation token
    const token = crypto.randomUUID();

    // Create invitation
    const { data: invite, error: inviteError } = await supabaseClient
      .from("user_invites")
      .insert({
        email: email.toLowerCase(),
        agency_id,
        role,
        token,
        created_by: user.id,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Failed to create invitation:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log audit event
    await supabaseClient.rpc("log_audit", {
      _action: "invite.create",
      _target: email,
      _meta: { agency_id, role, invite_id: invite.id },
    });

    const inviteUrl = `${Deno.env.get("APP_URL") || "http://localhost:5173"}/invite/accept?token=${token}`;

    return new Response(
      JSON.stringify({
        success: true,
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          token: invite.token,
          invite_url: inviteUrl,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in invite-user function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
