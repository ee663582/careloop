import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  try {
    const { role, id, password } = await req.json();
    if (!['patient', 'clinician'].includes(role) || typeof id !== 'string' || typeof password !== 'string' || id.length > 128 || password.length > 256) throw new Error('invalid');
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const field = role === 'patient' ? 'medical_id' : 'professional_id';
    const { data: profile, error } = await admin.from('profiles').select('id,role').eq(field, id.trim()).eq('role', role).maybeSingle();
    if (error || !profile) throw new Error('invalid');
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id);
    const email = userData.user?.email;
    if (userError || !email) throw new Error('invalid');
    const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: anon }, body: JSON.stringify({ email, password }) });
    if (!authResponse.ok) throw new Error('invalid');
    return new Response(await authResponse.text(), { status: 200, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'ID or password could not be verified.' }, { status: 400, headers: { ...cors, 'Cache-Control': 'no-store' } });
  }
});
