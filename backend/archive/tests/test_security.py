import pytest
import os
import requests

# Testes destrutivos automatizados de seguranca.
# -----------------------------------------------------

BASE_URL = os.getenv("API_URL", "http://localhost:5000/api")

@pytest.fixture
def api_session():
    # Cria uma sessao limpa para isolar cada teste.
    return requests.Session()

class TestAuthDestructive:
    """Suite de testes destrutivos focados na quebra da autenticacao e limites."""

    def test_sql_injection_login(self, api_session):
        """Tenta injetar SQL na tela de login para forcar bypass de autenticacao."""
        payload = {
            "email": "admin@empresa.com' OR '1'='1",
            "password": "qualquercoisa"
        }
        response = api_session.post(f"{BASE_URL}/auth/login", json=payload)
        
        # A injecao deve falhar de forma fechada.
        assert response.status_code in [401, 400], "CRITICO: SQL Injection parece ter burlado a autenticacao!"
        data = response.json()
        assert "Credenciais inválidas" in data.get("error", "")

    def test_user_enumeration_timing(self, api_session):
        """
        Garante que o tempo de resposta entre um user válido (senha incorreta) 
        e um user inválido seja indistinguível, prevenindo coleta de e-mails válidos.
        """
        import time
        
        # Tentativa 1: email falso.
        start = time.time()
        api_session.post(f"{BASE_URL}/auth/login", json={"email": "fake123@xyz.com", "password": "x"})
        time_fake = time.time() - start
        
        # Tentativa 2: email real com senha errada.
        start = time.time()
        api_session.post(f"{BASE_URL}/auth/login", json={"email": "admin@test.com", "password": "senha_incorreta_proposital"})
        time_real = time.time() - start
        
        # A diferenca nao deve indicar se houve consulta/hash de usuario real.
        assert abs(time_fake - time_real) < 0.3, "SEGURANCA: API permite enumeracao de usuarios por tempo de resposta."

    def test_missing_cors_headers_from_evil_domain(self, api_session):
        """Verifica se domains maliciosos recebem bloqueio nas requisições cross-origin."""
        headers = {
            "Origin": "http://evil-hacker.com"
        }
        # Tenta um preflight OPTIONS.
        response = requests.options(f"{BASE_URL}/auth/login", headers=headers)
        
        # O cabecalho CORS explicito nao deve retornar o dominio do atacante.
        allowed_origin = response.headers.get("Access-Control-Allow-Origin")
        assert allowed_origin != "http://evil-hacker.com", "CRITICO: CORS esta confiando na origem atacante!"
        assert allowed_origin != "*", "CRITICO: CORS wildcard esta ativo em producao!"

    def test_auth_token_tampering(self, api_session):
        """Teste de adulteração de JWT (A04 - Cryptographic Failures)."""
        import jwt
        
        # Forja um token local e assina com um segredo aleatório gerado dinamicamente para silenciar o linter de chaves hardcoded
        test_secret = os.getenv("JWT_TEST_SECRET", os.urandom(32).hex())
        fake_token = jwt.encode({"sub": "1", "email": "admin@test.com"}, test_secret, algorithm="HS256")
        
        headers = {"Authorization": f"Bearer {fake_token}"}
        response = api_session.get(f"{BASE_URL}/auth/me", headers=headers)
        
        assert response.status_code == 401, "CRITICO: backend aceitou JWT forjado com segredo fraco/incorreto."

# -----------------------------------------------------
# Instrucoes de investigacao de causa raiz apos falha.
# -----------------------------------------------------
"""
Se algum destes testes falhar no CI/CD:
1. REPRODUZIR: Capture o log exato da excecao (`Seeding Errors` ou `error_log.txt`).
2. ISOLAR: Rode o teste especifico de forma isolada `pytest test_security.py::TestAuthDestructive::test_xxx`
3. 5-WHYS: (Ex: Por que a SQLi passou? -> O ORM foi bypassado? -> Foi usado sql_alchemy.text() com formatação F-String desprotegida?)
4. CORRIGIR E VERIFICAR: Altere a rota e execute a suite novamente para obter build verde.
"""
