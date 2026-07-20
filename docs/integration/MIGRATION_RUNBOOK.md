# Runbook de migrations da Integração

## Estado e limite deste runbook

A consolidação foi validada apenas no PostgreSQL local. O banco local está na
revisão `f3a6d9e2c8b1`; nenhuma migration deste lote foi executada no Supabase de
produção.

Produção permanece bloqueada até que todos os itens abaixo sejam atendidos:

- backup novo, completo e verificável do Supabase;
- teste de restauração em ambiente descartável ou staging;
- rotação da credencial de banco e do webhook expostos durante a sessão;
- configuração separada de `DATABASE_URL` e `MIGRATION_DATABASE_URL` no Render;
- janela de deploy com responsável, contagens de referência e plano de retorno.

Não executar `supabase db push`: o schema da aplicação é controlado por
Alembic/Flask-Migrate.

## Cadeia de revisões

As revisões relevantes, na ordem, são:

1. `9b7d4e2c1a60_integration_v2_foundation.py`: nome histórico da fundação;
2. `c4a8f2d19e31_integration_v2_operational_review.py`: nome histórico dos
   campos operacionais e da auditoria;
3. `d5f8c1a3b7e2_integration_quality_preservation.py`: preserva qualidade e o
   payload das métricas anteriores;
4. `f3a6d9e2c8b1_promote_integration_canonical.py`: promove tabelas, índices,
   constraints e sequences para nomes canônicos e move a tabela anterior para
   `archive.integration_metrics`.

As duas primeiras migrations conservam o nome usado na época porque revisões já
aplicadas são imutáveis. Código, rotas e tabelas ativas usam somente o domínio
canônico de Integração.

As duas revisões finais exigem PostgreSQL e falham antes da alteração quando o
manifesto, os vínculos, as tabelas de origem/destino ou as auditorias esperadas
divergem. A promoção não apaga `integration_metrics`: as 130 linhas locais foram
movidas integralmente para o schema `archive`.

## Duas conexões, duas responsabilidades

### `DATABASE_URL`: runtime

É a conexão usada normalmente pela API depois do deploy. Pode usar o pooler
recomendado pelo Supabase para a carga da aplicação, inclusive o pooler
transacional quando compatível com o driver e o padrão de consultas.

### `MIGRATION_DATABASE_URL`: DDL e manutenção

É exclusiva do processo de migration, backup e inspeções administrativas. Deve
usar a conexão direta do PostgreSQL ou o pooler em modo de sessão, sempre na
porta `5432`. Não usar o pooler transacional na porta `6543` para DDL,
`pg_dump` ou migrations longas.

As duas variáveis devem ser secrets separados no Render. Nunca gravar URL,
usuário ou senha em arquivo versionado, comando compartilhado, log ou
documentação.

## Backup obrigatório de produção

Antes de qualquer escrita no Supabase:

1. rotacione as credenciais expostas e obtenha uma conexão direta/session nova;
2. gere backups de roles, schema e dados;
3. registre em manifesto privado data, revisão Alembic, tamanho, checksum e as
   contagens críticas;
4. confirme que os arquivos não estão vazios e podem ser lidos pelas ferramentas
   PostgreSQL;
5. restaure em um banco descartável e execute as validações da aplicação.

Exemplo em PowerShell, mantendo a URL somente no ambiente do processo:

```powershell
$env:MIGRATION_DATABASE_URL = '<conexao-direta-ou-session-5432>'
pg_dump --dbname $env:MIGRATION_DATABASE_URL --format=custom --file '<caminho-privado>\pre_deploy.dump'
pg_restore --list '<caminho-privado>\pre_deploy.dump'
```

O arquivo deve ficar fora do Git e em armazenamento privado. A existência de um
dump não substitui o teste de restauração.

## Validação local já executada

O backup local imediatamente anterior à promoção está em
`backend/backups/pre_cleanup_canonical_20260719_2056.dump`. O arquivo custom do
PostgreSQL foi lido e seu checksum foi registrado fora deste documento.

Após o upgrade local para `f3a6d9e2c8b1`:

| Entidade | Antes | Depois |
| --- | ---: | ---: |
| Lojas | 161 | 161 |
| Tarefas | 617 | 617 |
| Histórico de status | 3.401 | 3.401 |
| Bloqueios | 202 | 202 |
| Métricas anteriores | 130 em `public` | 130 em `archive` |
| Auditorias de importação | 0 | 128 |
| Órfãos de FK | 0 | 0 |

As duas métricas sem vínculo canônico seguro permanecem no arquivo histórico;
nenhum dado foi descartado.

## Procedimento no Docker local ou staging

1. Faça um backup novo do banco alvo.
2. Consulte revisão e head sem executar bootstrap de schema:

   ```powershell
   docker compose exec -e SKIP_SCHEMA_BOOTSTRAP=1 backend flask db current
   docker compose exec -e SKIP_SCHEMA_BOOTSTRAP=1 backend flask db heads
   ```

3. Aplique em um único processo:

   ```powershell
   docker compose exec -e SKIP_SCHEMA_BOOTSTRAP=1 backend flask db upgrade
   ```

4. Confirme `f3a6d9e2c8b1 (head)`, contagens, FKs e objetos canônicos.
5. Reinicie a aplicação e execute smoke tests do Monitor, Analytics, detalhe,
   qualidade, bloqueios, Performance e Jarvis.

`SKIP_SCHEMA_BOOTSTRAP=1` impede que `db.create_all()` e reparos legados sejam
misturados à execução do Alembic.

## Preflight de produção — somente leitura

Quando backup, restauração e secrets estiverem prontos, execute com a conexão
de migration:

```powershell
$env:DATABASE_URL = $env:MIGRATION_DATABASE_URL
$env:SKIP_SCHEMA_BOOTSTRAP = '1'
flask db current
flask db heads
```

Registre as contagens de todas as tabelas envolvidas e compare o schema real
com a cadeia Alembic. Se houver schema parcial, revisão inesperada, tabela
canônica preexistente ou divergência de vínculo, interrompa o deploy. Não use
`stamp` para ocultar a divergência.

## Deploy no Render

O `render.yaml` inicia `backend/production-entrypoint.sh`. Esse entrypoint é
fail-closed:

- encerra o deploy se `MIGRATION_DATABASE_URL` estiver ausente;
- executa `flask db upgrade` com `SKIP_SCHEMA_BOOTSTRAP=1` e a conexão de
  migration;
- inicia o Gunicorn somente depois de upgrade bem-sucedido;
- mantém `DATABASE_URL` como conexão normal da aplicação.

O deploy deve manter uma unica instancia durante essa etapa. Antes de escalar
horizontalmente, mova Alembic para um pre-deploy job exclusivo para impedir que
duas instancias concorram pela mesma migration.

Configuração necessária no Render:

- `DATABASE_URL`: conexão de runtime;
- `MIGRATION_DATABASE_URL`: conexão direta/session `5432`;
- demais secrets da aplicação, todos rotacionados quando expostos;
- `FLASK_ENV=production` e origens CORS explícitas.

Não acionar o deploy enquanto o backup obrigatório do Supabase não estiver
concluído e testado.

## Verificação pós-upgrade

Confirmar:

```sql
select version_num from alembic_version;
select count(*) from integration_stores;
select count(*) from integration_tasks;
select count(*) from integration_status_history;
select count(*) from integration_block_periods;
select count(*) from integration_audit_logs
 where action = 'LEGACY_METRIC_IMPORTED';
select count(*) from archive.integration_metrics;
```

Também deve ser verdade que `public.integration_metrics` não existe, as dez
tabelas canônicas existem e as consultas de órfãos de FK retornam zero.

## Falha e rollback

- Se o preflight falhar, não aplique a migration.
- Se o upgrade falhar, preserve o banco, registre a revisão e compare objetos
  antes de uma nova tentativa.
- Não execute downgrade automaticamente em produção.
- Como primeira resposta a um problema de aplicação, reverta apenas a versão da
  aplicação se ela ainda for compatível com o schema aplicado.
- Se houver necessidade real de reverter schema/dados, faça isso em janela
  controlada a partir do backup testado; não improvise comandos destrutivos.

Referências do projeto:

- [Relatório final da limpeza](../cleanup/FINAL_REPORT.md)
- [Registro de 19/07/2026](./DAILY_2026-07-19.md)
- [Plano funcional da Integração](./PLAN.md)

Referências oficiais do Supabase:

- [Conexões PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Backup e restauração](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Migrations e deploy](https://supabase.com/docs/guides/deployment/database-migrations)
