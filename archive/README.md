# Arquivo Local Do Projeto

Esta pasta guarda itens que nao fazem parte do runtime nem da documentacao ativa.

## Conteudo Atual
- `local_backups/`: backups SQL locais/temporarios.
- `prototipos/`: pacotes paralelos, paginas experimentais e entregas soltas fora do frontend oficial.
- `rascunhos/`: scripts de apoio e verificacoes locais que nao fazem parte do fluxo operacional.
- `referencias_visuais/`: imagens, prints e materiais de apoio para consulta de layout.

## Regra
- Nao usar esta pasta como dependencia da aplicacao.
- Backups sensiveis continuam ignorados pelo Git via `*.sql`.
- O arquivo `backup_completo.sql` permanece na raiz porque o `manage.py` usa esse nome como padrao no fluxo de restore.
- Se algum item arquivado voltar a ser operacional, mover de volta para a pasta correta do sistema e registrar a mudanca na documentacao ativa.
