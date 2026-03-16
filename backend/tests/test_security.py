import pytest
import os
import requests

# Destructive Automation Testing (QA Automation Engineer)
# -----------------------------------------------------

BASE_URL = os.getenv("API_URL", "http://localhost:5000/api")

@pytest.fixture
def api_session():
    # Cria uma sessão limpa para isolar cada teste (Data Isolation)
    return requests.Session()

class TestAuthDestructive:
    """Suíte de testes destrutivos focados na quebra da autenticação e limites (Unhappy Path)."""

    def test_sql_injection_login(self, api_session):
        """Tenta injetar SQL na tela de login para forçar Auth Bypass."""
        payload = {
            "email": "admin@empresa.com' OR '1'='1",
            "password": "qualquercoisa"
        }
        response = api_session.post(f"{BASE_URL}/auth/login", json=payload)
        
        # Testador espera que a injeção falhe com erro (Fail-Closed)
        assert response.status_code in [401, 400], "CRITICAL: SQL Injection seems to have bypassed auth!"
        data = response.json()
        assert "Credenciais inválidas" in data.get("error", "")

    def test_user_enumeration_timing(self, api_session):
        """
        Garante que o tempo de resposta entre um user válido (senha incorreta) 
        e um user inválido seja indistinguível, prevenindo coleta de e-mails válidos.
        """
        import time
        
        # Tentativa 1: Email Falso
        start = time.time()
        api_session.post(f"{BASE_URL}/auth/login", json={"email": "fake123@xyz.com", "password": "x"})
        time_fake = time.time() - start
        
        # Tentativa 2: Email Real (assumindo que 'admin@test.com' ou similar exista, mas com senha errada)
        start = time.time()
        api_session.post(f"{BASE_URL}/auth/login", json={"email": "admin@test.com", "password": "senha_incorreta_proposital"})
        time_real = time.time() - start
        
        # A diferença não deve ser tão gritante que indique qual banco fez consulta de hash
        assert abs(time_fake - time_real) < 0.3, "SECURITY: API suffers from user enumeration via timing attack."

    def test_missing_cors_headers_from_evil_domain(self, api_session):
        """Verifica se domains maliciosos recebem bloqueio nas requisições cross-origin."""
        headers = {
            "Origin": "http://evil-hacker.com"
        }
        # Tenta um "preflight" (OPTIONS)
        response = requests.options(f"{BASE_URL}/auth/login", headers=headers)
        
        # O cabeçalho CORS explícito não deve retornar o domínio do atacante (Acesso Quebrado)
        allowed_origin = response.headers.get("Access-Control-Allow-Origin")
        assert allowed_origin != "http://evil-hacker.com", "CRITICAL: CORS is trusting the attacker's origin!"
        assert allowed_origin != "*", "CRITICAL: CORS wildcard is active in production!"

    def test_auth_token_tampering(self, api_session):
        """Teste de adulteração de JWT (A04 - Cryptographic Failures)."""
        import jwt
        
        # O QA forja um token válido localmente e assina com 'secret' fraco comum
        fake_token = jwt.encode({"sub": "1", "email": "admin@test.com"}, "123456", algorithm="HS256")
        
        headers = {"Authorization": f"Bearer {fake_token}"}
        response = api_session.get(f"{BASE_URL}/auth/me", headers=headers)
        
        assert response.status_code == 401, "CRITICAL: Backend accepted a forged JWT token signed with weak/wrong secret."

# -----------------------------------------------------
# Debugging Root Cause Framework Instructions (Pós-Falha)
# -----------------------------------------------------
"""
Se algum destes testes falhar no CI/CD:
1. REPRODUCE: Capture o log exato da Exception (`Seeding Errors` ou `error_log.txt`).
2. ISOLATE: Rode o teste específico de forma isolada `pytest test_security.py::TestAuthDestructive::test_xxx`
3. 5-WHYS: (Ex: Por que a SQLi passou? -> O ORM foi bypassado? -> Foi usado sql_alchemy.text() com formatação F-String desprotegida?)
4. FIX & VERIFY: Altere o route, execute a suíte novamente para ter um Green Build.
"""
