# Scripts De Manutencao Ativos

Esta pasta deve conter apenas scripts usados em operacao, manutencao recorrente ou auditoria do backend.

## Mantidos Aqui
- `auditar_padrao_backend.py`: auditoria de padrao PT-BR e higiene de manutencao.
- `patch_db.py`: patch seguro de schema.
- `reset_db_v2.py`: reset completo de banco para ambiente controlado.
- `force_sync_store.py`: sincronizacao manual de uma loja.
- `debug_sync_task.py`: diagnostico de tarefa ClickUp.
- `debug_store_status.py`: diagnostico de fluxo/status de loja.
- `verify_v3.py`: verificacao basica dos modulos V3.
- `analyze_metrics_cli.py`: relatorio operacional via CLI.
- `check_auth.py`: verificacao de autenticacao/chaves.
- `inspect_steps.py`: inspecao de etapas.
- `fix_normalization.py`: correcao de normalizacao de status.

Scripts pontuais antigos foram movidos para `backend/archive/one_off_scripts/`.
