#!/usr/bin/env python3
"""
Script de manutencao: executor do validador de integracao do ClickUp.

Permite simular (modo audit) ou aplicar (modo fix) a rotina de validacao
da correlacao de cards entre "Cadastro Omie" e "Integracao" no ClickUp.

Uso:
    python scripts/maintenance/run_clickup_validation.py --mode audit
    python scripts/maintenance/run_clickup_validation.py --mode fix
"""

import argparse
import logging
import os
import sys

# Adiciona o diretorio do backend ao path para permitir imports locais.
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.services.clickup_integration_validator import ClickUpIntegrationValidator


class Cores:
    AZUL = "\033[94m"
    CIANO = "\033[96m"
    VERDE = "\033[92m"
    AMARELO = "\033[93m"
    VERMELHO = "\033[91m"
    FIM = "\033[0m"
    NEGRITO = "\033[1m"


def imprimir_cabecalho(texto: str) -> None:
    print(f"\n{Cores.NEGRITO}{Cores.CIANO}{'=' * 70}{Cores.FIM}")
    print(f"{Cores.NEGRITO}{Cores.CIANO}{texto.center(70)}{Cores.FIM}")
    print(f"{Cores.NEGRITO}{Cores.CIANO}{'=' * 70}{Cores.FIM}\n")


def descrever_acao(log: dict, modo: str) -> tuple[str, str]:
    resultado = log.get("result") or ""
    acao = log.get("action") or ""

    if acao == "moved_parent_to_cadastro_omie":
        sufixo = "(Simulado)" if modo == "audit" else "(Efetuado)"
        return Cores.VERMELHO, f"Rebaixado para Cadastro Omie {sufixo}"

    if acao == "no_status_change":
        if "concluida" in resultado:
            return Cores.VERDE, "Status OK (Integracao concluida)"
        return Cores.AMARELO, "Status OK (Pendente mas card pai nao avancou)"

    if resultado == "integracao_corrigida":
        sufixo = "(Simulado)" if modo == "audit" else "(Efetuado)"
        return Cores.VERDE, f"Vinculado ao card de Integracao por fallback {sufixo}"

    return Cores.AMARELO, f"Acao: {acao}"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Executa o validador de integracao dos quadros do ClickUp."
    )
    parser.add_argument(
        "--mode",
        choices=["audit", "fix"],
        default=None,
        help=(
            "Modo de execucao: 'audit' (apenas simula/relata) ou "
            "'fix' (aplica alteracao de status e comentarios no ClickUp)"
        ),
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    validator = ClickUpIntegrationValidator()

    if args.mode:
        validator.mode = args.mode.lower()

    os.environ["CLICKUP_VALIDATOR_MODE"] = validator.mode

    imprimir_cabecalho(f"VALIDADOR DE INTEGRACAO DO CLICKUP - MODO: {validator.mode.upper()}")
    print(f"Modo Atual: {Cores.NEGRITO}{Cores.AMARELO}{validator.mode.upper()}{Cores.FIM}")
    if validator.mode == "audit":
        print(f"{Cores.AZUL}Nota: Em modo AUDIT nenhuma alteracao sera feita no ClickUp.{Cores.FIM}\n")
    else:
        print(f"{Cores.VERMELHO}AVISO: Em modo FIX, os status dos cards poderao ser alterados no ClickUp!{Cores.FIM}\n")

    print("Carregando tarefas e executando validacao (pode demorar alguns segundos)...")

    try:
        logs = validator.run_validation()

        imprimir_cabecalho("RELATORIO FINAL DA VALIDACAO")
        print(f"Total de acoes registradas: {len(logs)}\n")

        if not logs:
            print(f"{Cores.VERDE}Nenhum card precisou de acoes corretivas ou auditoria.{Cores.FIM}")
        else:
            for indice, log in enumerate(logs, 1):
                card_pai = (
                    f"Card Pai ID: {log.get('card_pai_custom_id') or 'N/A'} "
                    f"(ClickUp ID: {log.get('card_pai_id')})"
                )
                resultado = log.get("result")
                integracao = log.get("integracao_id")
                cor, descricao_acao = descrever_acao(log, validator.mode)

                print(f"{Cores.NEGRITO}{indice}. {card_pai}{Cores.FIM}")
                print(f"   Resultado Logico: {cor}{resultado}{Cores.FIM}")
                print(f"   Acao Realizada:   {cor}{descricao_acao}{Cores.FIM}")
                if integracao:
                    print(f"   Card Integracao:  {integracao}")
                print("-" * 50)

        print(f"\n{Cores.VERDE}Execucao concluida!{Cores.FIM}")

    except Exception as erro:
        logging.error("Erro durante a validacao: %s", erro, exc_info=True)
        print(f"\n{Cores.VERMELHO}A execucao falhou devido a um erro.{Cores.FIM}")
        sys.exit(1)


if __name__ == "__main__":
    main()
