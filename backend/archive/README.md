# Arquivo do Backend

Esta pasta guarda itens uteis para consulta historica, diagnostico pontual ou recuperacao futura, mas que nao fazem parte do runtime principal do backend.

## O Que Fica Fora Do Runtime
- `one_off_scripts/`: scripts antigos de diagnostico, verificacao pontual, patches historicos ou consultas especificas.
- `tests/`: testes HTTP destrutivos/externos que dependem de uma API rodando manualmente.
- `sample_exports/`: CSVs de exemplo ou exportacoes antigas que nao sao carregadas pela aplicacao.

## Regra
- Nao importar arquivos desta pasta no codigo de producao.
- Se algum item voltar a ser rotina operacional, mover de volta para `scripts/maintenance/` e documentar o uso.
- Scripts usados pelo `manage.py` foram mantidos em `scripts/maintenance/`.
