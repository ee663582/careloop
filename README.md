# CARELOOP

CARELOOP is a responsive healthcare coordination prototype. Its patient symptom checker uses interactive adult body surface references, and the existing fictional patient and clinician workflows remain available in the connected care workspace.

## Run the demo

1. Install Node.js 20 or newer.
2. Run `npm install` and `npm run dev`.
3. Sign in using **Continue as demo patient** or **Continue as demo professional**. Both demo accounts use the password `Careloop123!` if using the form. All demo people and records are fictional.

The CARELOOP splash lasts five seconds on a fresh load. A saved demo or Supabase session is restored after the splash. Demo symptom entries are stored in browser local storage. Do not enter real health information in demo mode.

## Patient and clinician journeys

Patient access opens with an adult age and body-reference setup (18 or older, Female or Male) before the 3D surface. The body surface can be rotated by drag or touch, zoomed by scroll/pinch and reset or set to front/back/side. A searchable 2D text-selection alternative is provided for accessibility and lower-performance devices. The “Other / I can’t find the location” field supports multiple free-text locations, uncertain locations and internal locations.

Saved demo symptom locations are added to the existing patient timeline, preparation brief and the clinician workspace. The original patient portal continues to provide appointments, documents, follow-up plans and settings; the clinician portal retains its patient directory, review workspace, appointment queue and follow-up management. The original workflow is served as `legacy.html` inside the authenticated shell.

## Supabase setup

The app works without Supabase using fictional demo accounts. For real sign-in:

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Only the publishable anon key belongs in browser configuration. Never put a service-role key in a `VITE_` variable or frontend file.
3. Apply `supabase/migrations/202611060001_careloop_profiles.sql` using Supabase migrations or the SQL editor.
4. Deploy `supabase/functions/id-login` and configure its standard Supabase environment values. The function resolves a patient Medical ID or clinician Unique ID on the server, then verifies the password with Supabase Auth. It returns only the Auth session, not the linked email address.
5. In Supabase Auth, enable Google, configure the Google Cloud OAuth client and secret, and add the local and production redirect URLs to both Google Cloud and Supabase Auth. The secret stays in Supabase, never in this repository.
6. Patient accounts can be created through a trusted administrator or Supabase Auth signup; the database trigger issues a Medical ID. Google sign-in uses the email already linked to the same Supabase Auth account. Clinicians must be provisioned by an administrator, then assigned a `professional_id` and `role='clinician'` through a trusted service-role operation. Do not expose admin provisioning in the app.
7. Link patient and clinician UUIDs in `care_team_links` using trusted administration. The row-level policies let patients access their own profile and symptom rows and clinicians access only linked patients’ profiles and symptoms.

### Optional Gnani voice services

When a signed-in patient opts in to Gnani voice in the symptom checker, CARELOOP sends the recorded clip to the `gnani-voice` Supabase Edge Function for transcription, and sends read-aloud text to that function for speech synthesis. The function verifies the Supabase session and keeps the Gnani API key server-side. Recordings are limited to 25 seconds in the interface and are not stored by CARELOOP. The patient reviews speech-to-text before it becomes part of a symptom report. Demo accounts continue to use browser speech features.

1. Deploy `supabase/functions/gnani-voice` after linking the Supabase project.
2. Add `GNANI_API_KEY_ID` under Supabase Edge Function secrets. Do not add the key to Render, `.env.local`, or any `VITE_` variable. Set `GNANI_TTS_MODEL` if Gnani gives your account a different model identifier; the current default follows Gnani's published Timbre API example.
3. Add the deployed Supabase project URL and anon/publishable key to Render's build environment, then rebuild. The browser sends voice requests only for authenticated Supabase accounts and only after the patient opts in.

The integration uses the published REST transcription endpoint and streaming TTS endpoint. It does not currently use a live WebSocket audio stream. Gnani account access, pricing, supported voices and model identifiers depend on the credentials and product access supplied by Gnani. See the [speech-to-text API](https://www.gnani.ai/speech-to-text-api) and [text-to-speech API](https://www.gnani.ai/text-to-speech-api).

The ID login function deliberately returns a generic error for unknown IDs and incorrect passwords. Add appropriate rate limiting, monitoring, MFA, recovery flows, consent and clinical governance before using real health data. The demo legacy portal remains fictional and browser-local; it is not a production electronic health record.

## Deploy on Render

CARELOOP is a Vite static site. Connect this repository to Render as a **Static Site** and use the included `render.yaml` Blueprint, or enter:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`

Render can deploy updates from the connected Git branch and assign an `onrender.com` address. The app can be previewed without Supabase credentials using the fictional demo accounts. For Supabase sign-in, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Render service environment before building; Vite embeds these public client settings in the site. Never add the Supabase service-role key to Render's frontend environment. Deploy the Supabase Edge Function separately. Google OAuth must also include the final Render callback URL in Google Cloud and Supabase Auth settings.

## Body model and licence

`public/models/male-surface.glb` and `female-surface.glb` are optimized single-surface exports extracted from the Human Atlas male BodyParts3D reference and female Human Reference Atlas. Only the named Skin mesh is bundled. Source reference models, processing details and licence terms are documented at [Human Atlas](https://github.com/slorksmo/Human-Atlas). The source geometries are adapted under CC BY 4.0. Attribution: BodyParts3D, © Database Center for Life Science, BodyParts3D 4.0; and Kristen Browne and Heidi Schlehlein, Human Reference Atlas / HuBMAP, *3D Reference Organ Set for Female*, v1.10. Both are licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). The viewer is an educational location reference, not a clinical tool or complete model of all body types and anatomical variation.

The GLB surface assets are lazy-loaded by the patient viewer (about 1.1 MB male and 1.4 MB female). If WebGL cannot initialize or the model fails to load, the app offers the accessible 2D location selector.

To regenerate these files from the upstream repository, run `python scripts/extract-body-surfaces.py /path/to/Human-Atlas/public/models`.

## Voice and AI integration status

No Prisma, Timbre or hosted Evon API is connected. Voice dictation uses browser speech recognition when available; it is not a Prisma connection. The old patient preparation view retains its clearly labelled mock summary. For real integrations, use server-side adapters, validate structured responses, preserve source references and obtain consent before processing health information. Keep all provider credentials server-side.

## Build

Run `npm run typecheck` and `npm run build` to check the TypeScript app and create the Vite production bundle in `dist/`.

## Safety

CARELOOP is a coordination and information-organisation prototype, not a medical service. It does not independently diagnose, prescribe or determine whether a symptom is safe. Seek qualified healthcare support for concerns and local emergency services for urgent symptoms.
