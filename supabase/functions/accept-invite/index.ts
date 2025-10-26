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

    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
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

    // Get invitation
    const { data: invite, error: inviteError } = await supabaseClient
      .from("user_invites")
      .select("*")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invitation is valid
    if (invite.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Invitation already ${invite.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      // Update invitation status to expired
      await supabaseClient
        .from("user_invites")
        .update({ status: "expired" })
        .eq("id", invite.id);

      return new Response(
        JSON.stringify({ error: "Invitation has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user email matches invitation email
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return new Response(
        JSON.stringify({ 
          error: "Email mismatch: Please sign in with the invited email address",
          invited_email: invite.email 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already part of this agency
    const { data: existingRole } = await supabaseClient
      .from("user_agency_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("agency_id", invite.agency_id)
      .single();

    if (existingRole) {
      // Update invitation status
      await supabaseClient
        .from("user_invites")
        .update({ 
          status: "accepted", 
          accepted_at: new Date().toISOString() 
        })
        .eq("id", invite.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "You are already part of this agency" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user_agency_roles entry
    const { error: roleError } = await supabaseClient
      .from("user_agency_roles")
      .insert({
        user_id: user.id,
        agency_id: invite.agency_id,
        role: invite.role,
        invited_by: invite.created_by,
        invited_at: invite.created_at,
        accepted_at: new Date().toISOString(),
        is_active: true,
      });

    if (roleError) {
      console.error("Failed to create user agency role:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to accept invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update invitation status
    const { error: updateError } = await supabaseClient
      .from("user_invites")
      .update({ 
        status: "accepted", 
        accepted_at: new Date().toISOString() 
      })
      .eq("id", invite.id);

    if (updateError) {
      console.error("Failed to update invitation status:", updateError);
    }

    // Log audit event
    await supabaseClient.rpc("log_audit", {
      _action: "invite.accept",
      _target: user.email,
      _meta: { 
        agency_id: invite.agency_id, 
        role: invite.role, 
        invite_id: invite.id 
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation accepted successfully",
        agency_id: invite.agency_id,
        role: invite.role,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in accept-invite function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
