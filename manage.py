import os
import subprocess
import sys
import time
from datetime import datetime

# Configurações de Caminho
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

# Caminho relativo para scripts de manutenção (v2.5)
SCRIPTS_DIR = "scripts/maintenance"

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    clear_screen()
    print("="*60)
    print("   🕹️  GERENCIADOR DO SISTEMA DE GESTÃO (CLICKUP v2.5)   ")
    print("="*60)
    print("")

def run_script_backend(script_name, docker=False, args=""):
    """
    Executa um script Python localizado em backend/scripts/maintenance/
    """
    target_path = f"{SCRIPTS_DIR}/{script_name}"
    
    if docker:
        print(f"\n🐳 Executando no Docker: {script_name}...")
        cmd = f'docker-compose exec -T backend python {target_path} {args}'
    else:
        print(f"\n🖥️  Executando Localmente: {script_name}...")
        # Verificar se arquivo existe
        full_path = os.path.join(BACKEND_DIR, 'scripts', 'maintenance', script_name)
        if not os.path.exists(full_path):
            print(f"❌ Erro: Script não encontrado em {full_path}")
            input("ENTER para voltar...")
            return

        cmd = f'cd backend && python {target_path} {args}'

    os.system(cmd)
    input("\n✅ Pressione ENTER para voltar...")

# ==============================================================================
# MENUS
# ==============================================================================

def menu_principal():
    print_header()
    print("   1. 🚀  INICIAR      - Rodar Sistema")
    print("   2. 💾  DADOS        - Banco de Dados")
    print("   3. 🔄  SYNC         - Sincronização")
    print("   4. 🔎  DIAGNÓSTICO  - Verificadores")
    print("   5. 🛠️   MANUTENÇÃO   - Limpeza")
    print("   0. ❌  SAIR         - Sair")
    print("")
    return input("Escolha uma opção: ")

# --- 1. SITEMA ---
def menu_iniciar():
    print_header()
    print("--- 🚀 MENU INICIAR ---")
    print("   1. Rodar Localmente (Backend + Frontend)")
    print("   2. Rodar via Docker (docker-compose up)")
    print("   3. Reiniciar Docker com Rebuild (Deep Restart)")
    print("   4. Ver Logs do Docker (Backend)")
    print("   0. Voltar")
    return input("\nEscolha: ")

def handle_iniciar():
    while True:
        op = menu_iniciar()
        if op == '1': run_local()
        elif op == '2': run_docker()
        elif op == '3': restart_docker()
        elif op == '4': os.system('docker-compose logs -f backend')
        elif op == '0': break

# --- 2. DADOS ---
def menu_dados():
    print_header()
    print("--- 💾 MENU DADOS ---")
    print("   1. Fazer Backup (Dump SQL)")
    print("   2. Restaurar Banco (Importar SQL)")
    print("   3. Abrir Shell SQL (psql)")
    print("   4. Atualizar Schema (Safe Patch) [🛡️ Recomendado]")
    print("   5. Resetar Banco (Apaga Tudo!) [⚠️ PERIGO]")
    print("   0. Voltar")
    return input("\nEscolha: ")

def handle_dados():
    while True:
        op = menu_dados()
        if op == '1': db_backup()
        elif op == '2': db_restore()
        elif op == '3': db_shell()
        elif op == '4': run_script_backend('patch_db.py', docker=True)
        elif op == '5': run_script_backend('reset_db_v2.py', docker=True)
        elif op == '0': break

# --- 3. SYNC ---
def menu_sync():
    print_header()
    print("--- 🔄 MENU SYNC chao---")
    print("   1. Forçar Sync de uma Loja (Pelo ID)")
    print("   2. Debugar Tarefa ClickUp (JSON Dump)")
    print("   3. Debugar Status de Loja (Fluxo)")
    print("   0. Voltar")
    return input("\nEscolha: ")

def handle_sync():
    while True:
        op = menu_sync()
        if op == '1':
            sid = input("Digite o ID da Loja (Banco): ")
            run_script_backend('force_sync_store.py', docker=True, args=sid)
        elif op == '2':
            tid = input("Digite o ID da Tarefa ClickUp: ")
            run_script_backend('debug_sync_task.py', docker=True, args=tid)
        elif op == '3':
            sid = input("Digite o ID da Loja: ")
            run_script_backend('debug_store_status.py', docker=True, args=sid)
        elif op == '0': break

# --- 4. DIAGNÓSTICO ---
def menu_diag():
    print_header()
    print("--- 🔎 MENU DIAGNÓSTICO ---")
    print("   1. Verificar Integridade Geral (Verify V3)")
    print("   2. Analisar Métricas e KPIs (Report CLI)")
    print("   3. Checar Autenticação e Chaves")
    print("   4. Inspecionar Etapas (Steps)")
    print("   0. Voltar")
    return input("\nEscolha: ")

def handle_diag():
    while True:
        op = menu_diag()
        if op == '1': run_script_backend('verify_v3.py', docker=True)
        elif op == '2': run_script_backend('analyze_metrics_cli.py', docker=True)
        elif op == '3': run_script_backend('check_auth.py', docker=True)
        elif op == '4': run_script_backend('inspect_steps.py', docker=True)
        elif op == '0': break

# --- 5. MANUTENÇÃO ---
def menu_manut():
    print_header()
    print("--- 🛠️ MENU MANUTENÇÃO ---")
    print("   1. Instalar Dependências (Pip & Npm)")
    print("   2. Corrigir Normalização de Dados")
    print("   3. Limpar Arquivos Temporários (.pyc, logs)")
    print("   0. Voltar")
    return input("\nEscolha: ")

def handle_manut():
    while True:
        op = menu_manut()
        if op == '1': install_deps()
        elif op == '2': run_script_backend('fix_normalization.py', docker=True)
        elif op == '3': clean_temp_files()
        elif op == '0': break

# ==============================================================================
# FUNÇÕES CORE
# ==============================================================================

def run_local():
    print("\n🚀 Iniciando Backend e Frontend em janelas separadas...")
    if os.name == 'nt':
        subprocess.Popen(f'start cmd /k "cd backend && python run.py"', shell=True)
        subprocess.Popen(f'start cmd /k "cd frontend && npm run dev"', shell=True)
    else:
        print("Em Linux/Mac, use tmux ou terminais manuais.")
    print("\n✅ Comandos enviados!")
    input("ENTER para voltar...")

def run_docker():
    print("\n🐳 Iniciando Docker Compose...")
    try:
        os.system('docker-compose up --build')
    except KeyboardInterrupt:
        print("\n🛑 Parando...")
    input("ENTER para voltar...")

def restart_docker():
    print("\n🔄 Iniciando RESTART COMPLETO...")
    os.system('docker-compose down')
    print("Reconstruindo...")
    os.system('docker-compose up -d --build')
    print("\n✅ Reiniciado.")
    input("ENTER para voltar...")

def db_backup():
    print("\n💾 Backup do Banco (Docker)...")
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"backup_metrics_db_{timestamp}.sql"
    cmd = f'docker-compose exec -T db pg_dump -U user -d metrics_db > {filename}'
    if os.system(cmd) == 0:
        print(f"✅ Backup criado: {filename}")
    else:
        print("❌ Erro. Docker está rodando?")
    input("ENTER...")

def db_restore():
    print("\n📥 Restore do Banco...")
    f = input("Arquivo .sql (padrão: backup_completo.sql): ") or "backup_completo.sql"
    if not os.path.exists(f):
        print("❌ Arquivo não existe.")
        input("ENTER...")
        return
    
    print("Importando...")
    if os.name == 'nt':
        cmd = f'cmd /c "type {f} | docker-compose exec -T db psql -U user -d metrics_db"'
    else:
        cmd = f'cat {f} | docker-compose exec -T -i db psql -U user -d metrics_db'
    
    os.system(cmd)
    input("✅ Fim. ENTER...")

def db_shell():
    os.system('docker-compose exec db psql -U user -d metrics_db')

def install_deps():
    print("\n📦 Backend (Pip)...")
    os.system('cd backend && pip install -r requirements.txt')
    print("\n📦 Frontend (Npm)...")
    os.system('cd frontend && npm install')
    print("\n✅ Feito.")
    input("ENTER...")

def clean_temp_files():
    print("\n🧹 Limpando...")
    # Windows commands
    if os.name == 'nt':
        os.system('del /S *.pyc 2>nul')
        os.system('del /S *.log 2>nul')
        os.system('rmdir /S /Q backend\\__pycache__ 2>nul')
    else:
        os.system('find . -name "*.pyc" -delete')
        os.system('find . -name "__pycache__" -delete')
    print("✅ Limpeza concluída.")
    input("ENTER...")

# --- Loop Principal ---
if __name__ == "__main__":
    while True:
        choice = menu_principal()
        if choice == '1': handle_iniciar()
        elif choice == '2': handle_dados()
        elif choice == '3': handle_sync()
        elif choice == '4': handle_diag()
        elif choice == '5': handle_manut()
        elif choice == '0':
            print("Saindo... 👋")
            break
        else:
            print("Opção inválida!")
            time.sleep(1)
