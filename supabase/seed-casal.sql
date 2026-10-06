-- Rodar DEPOIS de schema.sql e depois de criar os 2 usuários em
-- Authentication > Users (com "Auto Confirm User" marcado).
-- Troque os dois e-mails e os nomes abaixo.

do $$
declare
  v_casal uuid;
  v_email_1 text := 'TROCAR-email-higor@exemplo.com';
  v_email_2 text := 'TROCAR-email-esposa@exemplo.com'; -- pode ficar assim se ela ainda não tem login
begin
  insert into casais (nome) values ('Nossas finanças') returning id into v_casal;

  insert into membros (casal_id, user_id, nome)
  select v_casal, id, case email when v_email_1 then 'Higor' else 'Esposa' end
  from auth.users where email in (v_email_1, v_email_2);

  insert into categorias (casal_id, nome, tipo, cor) values
    (v_casal, 'Salário',       'entrada', '#10b981'),
    (v_casal, 'Renda extra',   'entrada', '#34d399'),
    (v_casal, 'Moradia',       'saida',   '#6366f1'),
    (v_casal, 'Contas da casa','saida',   '#0ea5e9'),
    (v_casal, 'Mercado',       'saida',   '#f59e0b'),
    (v_casal, 'Transporte',    'saida',   '#ef4444'),
    (v_casal, 'Saúde',         'saida',   '#ec4899'),
    (v_casal, 'Lazer',         'saida',   '#8b5cf6'),
    (v_casal, 'Cartão',        'saida',   '#64748b'),
    (v_casal, 'Outros',        'saida',   '#94a3b8');
end $$;
