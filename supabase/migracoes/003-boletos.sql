-- Boletos: guarda o arquivo (PDF ou imagem) no Supabase Storage e a linha digitável no lançamento.
-- Rode uma vez no SQL Editor do Supabase, ANTES de publicar o código novo.

alter table lancamentos add column if not exists anexo_path text;
alter table lancamentos add column if not exists linha_digitavel text;
alter table lancamentos add column if not exists beneficiario text;

-- Bucket privado: só quem é do casal vê, e só dentro da pasta do próprio casal (casal_id/arquivo).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('boletos', 'boletos', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists boletos_ler on storage.objects;
drop policy if exists boletos_enviar on storage.objects;
drop policy if exists boletos_apagar on storage.objects;

create policy boletos_ler on storage.objects for select to authenticated
  using (bucket_id = 'boletos' and (storage.foldername(name))[1] in (select c::text from public.meus_casais() c));
create policy boletos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'boletos' and (storage.foldername(name))[1] in (select c::text from public.meus_casais() c));
create policy boletos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'boletos' and (storage.foldername(name))[1] in (select c::text from public.meus_casais() c));

select 'ok' as resultado;
