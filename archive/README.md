# Arquivo Local Do Projeto

Esta pasta guarda itens que nao fazem parte do runtime nem da documentacao ativa.

## Conteudo Atual
- `local_backups/`: backups SQL locais/temporarios.

## Regra
- Nao usar esta pasta como dependencia da aplicacao.
- Backups sensiveis continuam ignorados pelo Git via `*.sql`.
- Backups operacionais devem ficar em `backend/backups/` ou em armazenamento
  privado externo, nunca na raiz nem rastreados pelo Git.
- O `manage.py` exige o caminho explicito do arquivo antes de iniciar um
  restore; nao existe mais backup padrao implicito.
