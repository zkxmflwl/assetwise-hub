import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    // Verify caller identity
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: authError,
    } = await anonClient.auth.getUser();
    if (authError || !caller) throw new Error("Unauthorized");

    // Verify ADMIN role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile } = await adminClient
      .from("dash_users")
      .select("role_code")
      .eq("auth_user_id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role_code !== "ADMIN") {
      throw new Error("Forbidden: ADMIN only");
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case "create-user": {
        const { user_email, user_name, department_code, role_code } = params;
        if (!user_email || !user_name)
          throw new Error("user_email and user_name required");

        const validRoles = ["ADMIN", "MANAGER", "VIEWER"];
        const finalRole = validRoles.includes(role_code) ? role_code : "VIEWER";
          throw new Error("user_email and user_name required");

        const prefix = user_email.split("@")[0];
        const defaultPassword = prefix + "1234!";

        const { data: authUser, error: createError } =
          await adminClient.auth.admin.createUser({
            email: user_email,
            password: defaultPassword,
            email_confirm: true,
          });
        if (createError) throw createError;

        const { error: insertError } = await adminClient
          .from("dash_users")
          .insert({
            auth_user_id: authUser.user.id,
            user_email,
            user_name,
            role_code: finalRole,
            department_code: department_code || null,
            must_change_password: true,
            is_active: true,
          });
        if (insertError) {
          // Rollback: delete auth user if dash_users insert fails
          await adminClient.auth.admin.deleteUser(authUser.user.id);
          throw insertError;
        }

        return new Response(
          JSON.stringify({ success: true, defaultPassword }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      case "reset-password": {
        const { auth_user_id } = params;
        const { data: userRow } = await adminClient
          .from("dash_users")
          .select("user_email")
          .eq("auth_user_id", auth_user_id)
          .single();
        if (!userRow) throw new Error("User not found");

        const prefix = userRow.user_email.split("@")[0];
        const defaultPassword = prefix + "1234!";

        const { error } = await adminClient.auth.admin.updateUserById(
          auth_user_id,
          { password: defaultPassword }
        );
        if (error) throw error;

        await adminClient
          .from("dash_users")
          .update({ must_change_password: true })
          .eq("auth_user_id", auth_user_id);

        return new Response(
          JSON.stringify({ success: true, defaultPassword }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      case "toggle-active": {
        const { auth_user_id, is_active } = params;
        const { error } = await adminClient
          .from("dash_users")
          .update({ is_active })
          .eq("auth_user_id", auth_user_id);
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "change-role": {
        const { auth_user_id, role_code } = params;
        if (!["ADMIN", "MANAGER", "VIEWER"].includes(role_code))
          throw new Error("Invalid role_code");
        const { error } = await adminClient
          .from("dash_users")
          .update({ role_code })
          .eq("auth_user_id", auth_user_id);
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "change-department": {
        const { auth_user_id, department_code } = params;
        const { error } = await adminClient
          .from("dash_users")
          .update({ department_code: department_code || null })
          .eq("auth_user_id", auth_user_id);
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
