# Finanças do casal

App de controle financeiro (PWA) para uso a dois. Next.js 16 + Supabase.

## Rodar local
1. `cp .env.example .env.local` e preencher com URL e anon key do Supabase.
2. No SQL Editor do Supabase: rodar `supabase/schema.sql`.
3. Em Authentication > Users: criar os 2 usuários (Auto Confirm). Em Sign In / Providers, desligar "Allow new users to sign up".
4. Editar e rodar `supabase/seed-casal.sql`.
5. `npm run dev` e abrir http://localhost:3000.
