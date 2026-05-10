# Arquivo Local Do Projeto

Esta pasta guarda itens que nao fazem parte do runtime nem da documentacao ativa.

## Conteudo Atual
- `local_backups/`: backups SQL locais/temporarios.

## Regra
- Nao usar esta pasta como dependencia da aplicacao.
- Backups sensiveis continuam ignorados pelo Git via `*.sql`.
- O arquivo `backup_completo.sql` permanece na raiz porque o `manage.py` usa esse nome como padrao no fluxo de restore.
