-- Finanças do casal: esquema completo (rodar uma vez no SQL Editor do Supabase)

create extension if not exists pgcrypto;

-- Casal: todo dado pertence a um casal, e só os membros enxergam.
create table casais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

create table membros (
  casal_id uuid not null references casais(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  primary key (casal_id, user_id)
);

create table categorias (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  cor text not null default '#10b981',
  unique (casal_id, nome, tipo)
);

create table cartoes (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id) on delete cascade,
  nome text not null,
  dia_fechamento int not null check (dia_fechamento between 1 and 31),
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  limite numeric(12,2),
  ativo boolean not null default true
);

create table contas_fixas (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id) on delete cascade,
  nome text not null,
  valor numeric(12,2) not null check (valor >= 0),
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  categoria_id uuid references categorias(id) on delete set null,
  ativa boolean not null default true
);

create table lancamentos (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida')),
  valor numeric(12,2) not null check (valor > 0),
  data date not null,
  descricao text not null default '',
  categoria_id uuid references categorias(id) on delete set null,
  cartao_id uuid references cartoes(id) on delete set null,
  conta_fixa_id uuid references contas_fixas(id) on delete set null,
  pago boolean not null default true,
  parcela_grupo uuid,
  parcela_num int,
  parcela_total int,
  criado_por uuid references auth.users(id) default auth.uid(),
  criado_em timestamptz not null default now()
);
create index on lancamentos (casal_id, data);
-- Uma conta fixa gera no máximo um lançamento por mês.
create unique index lancamentos_conta_fixa_mes
  on lancamentos (conta_fixa_id, date_trunc('month', data))
  where conta_fixa_id is not null;

create table metas (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id) on delete cascade,
  tipo text not null check (tipo in ('limite_categoria', 'poupanca')),
  nome text not null,
  categoria_id uuid references categorias(id) on delete cascade,
  valor_alvo numeric(12,2) not null check (valor_alvo > 0),
  valor_atual numeric(12,2) not null default 0
);

-- Segurança: só membro do casal lê e escreve.
create function public.meus_casais() returns setof uuid
  language sql stable security definer set search_path = public as
  $$ select casal_id from membros where user_id = auth.uid() $$;

alter table casais enable row level security;
alter table membros enable row level security;
alter table categorias enable row level security;
alter table cartoes enable row level security;
alter table contas_fixas enable row level security;
alter table lancamentos enable row level security;
alter table metas enable row level security;

create policy casais_ler on casais for select using (id in (select meus_casais()));
create policy membros_ler on membros for select using (casal_id in (select meus_casais()));

create policy categorias_all on categorias for all
  using (casal_id in (select meus_casais())) with check (casal_id in (select meus_casais()));
create policy cartoes_all on cartoes for all
  using (casal_id in (select meus_casais())) with check (casal_id in (select meus_casais()));
create policy contas_fixas_all on contas_fixas for all
  using (casal_id in (select meus_casais())) with check (casal_id in (select meus_casais()));
create policy lancamentos_all on lancamentos for all
  using (casal_id in (select meus_casais())) with check (casal_id in (select meus_casais()));
create policy metas_all on metas for all
  using (casal_id in (select meus_casais())) with check (casal_id in (select meus_casais()));
