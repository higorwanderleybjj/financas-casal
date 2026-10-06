-- Etapa 4 (cartão): guarda a data real da compra.
-- Em lançamentos de cartão, `data` passa a ser o vencimento da fatura.
alter table lancamentos add column if not exists data_compra date;
