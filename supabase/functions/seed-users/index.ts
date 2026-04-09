import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const users = [
    {
      email: "francisco.gabdpd@gmail.com",
      password: "Dmv.5050",
      nome: "Francisco Admin",
      perfil: "administrador",
    },
    {
      email: "carlos.mendes@technet.com",
      password: "Supervisor123!",
      nome: "Carlos Mendes",
      perfil: "supervisor",
    },
    {
      email: "ana.silva@technet.com",
      password: "Vendedor123!",
      nome: "Ana Silva",
      perfil: "vendedor",
    },
    {
      email: "bruno.costa@technet.com",
      password: "Consultor123!",
      nome: "Bruno Costa",
      perfil: "consultor",
    },
  ];

  const results = [];

  for (const u of users) {
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((eu) => eu.email === u.email);

    if (existing) {
      results.push({ email: u.email, status: "already_exists", id: existing.id });
      continue;
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        nome_vinculado: u.nome,
        perfil: u.perfil,
        status_aprovacao: "aprovado",
        ativo: "true",
      },
    });

    if (error) {
      results.push({ email: u.email, status: "error", error: error.message });
      continue;
    }

    // Update profile to approved
    await supabaseAdmin
      .from("profiles")
      .update({ status_aprovacao: "aprovado", ativo: true, aprovado_em: new Date().toISOString() })
      .eq("id", data.user.id);

    // Add role
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user.id, role: u.perfil });

    results.push({ email: u.email, status: "created", id: data.user.id, perfil: u.perfil });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
