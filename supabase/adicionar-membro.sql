-- Adiciona a segunda pessoa ao casal já criado.
-- Antes: criar o usuário dela em Authentication > Users (Auto Confirm User).
-- Troque o e-mail e o nome abaixo e rode no SQL Editor.

insert into membros (casal_id, user_id, nome)
select (select id from casais order by criado_em limit 1), id, 'TROCAR-nome'
from auth.users
where email = 'TROCAR-email-dela@exemplo.com'
on conflict do nothing;
