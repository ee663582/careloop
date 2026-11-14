import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  const apiKey = Deno.env.get('GNANI_API_KEY_ID');
  if (!authorization || !apiKey) return json({ error: 'Voice service is not configured or you are not signed in.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return json({ error: 'Voice service is not configured.' }, 503);
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return json({ error: 'Please sign in to use CARELOOP voice services.' }, 401);

  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const audio = form.get('audio_file');
      if (!(audio instanceof File) || audio.size === 0 || audio.size > 15 * 1024 * 1024) {
        return json({ error: 'Audio was empty or too large. Record a shorter clip and try again.' }, 400);
      }
      const language = String(form.get('language_code') ?? 'hi-IN');
      const providerForm = new FormData();
      providerForm.set('audio_file', audio, audio.name || 'patient-voice.webm');
      providerForm.set('language_code', language);
      providerForm.set('preferred_language', language);
      providerForm.set('format', 'transcribe');
      providerForm.set('itn_native_numerals', 'true');
      const response = await fetch('https://api.vachana.ai/stt/v3', {
        method: 'POST', headers: { 'X-API-Key-ID': apiKey }, body: providerForm,
      });
      const result = await response.json();
      if (!response.ok || result.success === false || typeof result.transcript !== 'string') {
        console.error('Gnani STT request failed', response.status, result.request_id ?? '');
        return json({ error: 'Speech transcription failed. Please try again or type your symptoms.' }, 502);
      }
      return json({ transcript: result.transcript, requestId: result.request_id });
    }

    const body = await request.json();
    if (body.action !== 'synthesize' || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 5000) {
      return json({ error: 'Provide a short text passage to read aloud.' }, 400);
    }
    const language = typeof body.language === 'string' ? body.language : 'hi-IN';
    const voice = Deno.env.get('GNANI_TTS_VOICE') ?? (typeof body.voice === 'string' ? body.voice : 'Karan');
    const response = await fetch('https://api.vachana.ai/api/v1/tts/sse', {
      method: 'POST',
      headers: { 'X-API-Key-ID': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_config: { bitrate: '192k', container: 'mp3', encoding: 'linear_pcm', num_channels: 1, sample_rate: 44100, sample_width: 2 },
        model: Deno.env.get('GNANI_TTS_MODEL') ?? 'vachana-voice-v3',
        text: body.text.trim(), voice,
      }),
    });
    if (!response.ok) {
      console.error('Gnani TTS request failed', response.status);
      return json({ error: 'Read-aloud could not be generated. Please try again.' }, 502);
    }
    const sse = await response.text();
    const chunks = [...sse.matchAll(/event:\s*audio_chunk\s*\n(?:[^\n]*\n)*?data:\s*([A-Za-z0-9+/=]+)/g)].map((match) => match[1]);
    if (!chunks.length) return json({ error: 'The voice provider returned no audio. Please try again.' }, 502);
    const decoded = chunks.map((chunk) => Uint8Array.from(atob(chunk), (char) => char.charCodeAt(0)));
    const joined = new Uint8Array(decoded.reduce((size, chunk) => size + chunk.length, 0));
    let offset = 0;
    for (const chunk of decoded) { joined.set(chunk, offset); offset += chunk.length; }
    const binary = Array.from(joined, (byte) => String.fromCharCode(byte)).join('');
    const mimeType = binary.startsWith('RIFF') ? 'audio/wav' : binary.startsWith('ID3') ? 'audio/mpeg' : 'audio/mpeg';
    return json({ audioBase64: btoa(binary), mimeType });
  } catch (error) {
    console.error('Gnani voice proxy error', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'Voice service is temporarily unavailable. You can type or read the text instead.' }, 502);
  }
});
