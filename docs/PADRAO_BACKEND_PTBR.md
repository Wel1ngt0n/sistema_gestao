# Padrao Backend PT-BR

## Objetivo
Manter o backend claro para manutencao futura, com explicacoes em PT-BR e sem quebrar contratos ja consumidos pelo frontend, banco, ClickUp ou outros servicos.

## Regra Geral
- Comentarios e docstrings devem estar em PT-BR.
- Logs operacionais devem estar em PT-BR.
- Comentarios devem explicar regra de negocio, risco, excecao ou decisao tecnica.
- Evite comentarios obvios, como "incrementa contador" ou "retorna resposta".
- Prefira nomes internos claros quando forem locais e seguros de mudar.

## Contratos Que Nao Devem Ser Traduzidos Sem Migracao
- Rotas HTTP e `url_prefix`.
- Chaves JSON enviadas ao frontend.
- Tabelas e colunas SQLAlchemy.
- Valores de status normalizados, como `IN_PROGRESS`, `DONE`, `FAILED`, `RUNNING` e `SUCCESS`.
- Variaveis de ambiente, como `JWT_SECRET_KEY`, `DATABASE_URL`, `CLICKUP_API_KEY` e `FLASK_ENV`.
- Nomes de bibliotecas, classes externas e APIs de terceiros.

## Termos Externos Permitidos
- ClickUp
- JWT
- CORS
- RBAC
- TOTP
- SSE
- API
- SQLAlchemy
- Flask
- Render
- OpenAI
- Gemini
- Google Authenticator
- Webhook
- Frontend
- Backend

## Logs e Seguranca
- Nao usar `print` em modulos de autenticacao, seguranca ou rotas sensiveis.
- Nao logar headers completos, tokens, secrets, senhas ou codigos TOTP.
- Usar `logger.info`, `logger.warning` ou `logger.error` com mensagens objetivas em PT-BR.
- Erros retornados ao cliente devem continuar genericos quando envolverem autenticacao ou autorizacao.

## Padrao Para Comentarios Bons
```python
# Mantem o fallback para EventSource, que nao permite header Authorization.
token = request.args.get("token")
```

```python
# Recalcula a conclusao porque a etapa de treinamento define entrega operacional.
self.metrics.apply_training_completion_rule(store)
```

## Padrao Para Comentarios Ruins
```python
# Set token
token = request.args.get("token")
```

```python
# Loop stores
for store in stores:
    ...
```

## Auditoria
Execute periodicamente:

```powershell
python backend/scripts/maintenance/auditar_padrao_backend.py
```

Para falhar quando houver achados:

```powershell
python backend/scripts/maintenance/auditar_padrao_backend.py --strict
```
