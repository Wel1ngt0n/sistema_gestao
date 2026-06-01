import io
import re
import unicodedata
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd

from app.models import Store
from app.services.metrics import MetricsService


CAMPOS_PERMITIDOS = {
    "implantador",
    "rede",
    "tipo_loja",
    "financeiro_status",
    "cnpj",
    "delivered_with_quality",
    "teve_retrabalho",
}

MAPA_CABECALHOS = {
    "cnpj": "cnpj",
    "documento": "cnpj",
    "cnpj_loja": "cnpj",
    "implantador": "implantador",
    "responsavel": "implantador",
    "analista": "implantador",
    "rede": "rede",
    "grupo": "rede",
    "nome_rede": "rede",
    "tipo_loja": "tipo_loja",
    "tipo": "tipo_loja",
    "tipo_de_loja": "tipo_loja",
    "status_financeiro": "financeiro_status",
    "financeiro_status": "financeiro_status",
    "financeiro": "financeiro_status",
    "mensalidade": "financeiro_status",
    "paga_mensalidade": "financeiro_status",
    "entregue_com_qualidade": "delivered_with_quality",
    "entregue_qualidade": "delivered_with_quality",
    "qualidade": "delivered_with_quality",
    "retrabalho": "teve_retrabalho",
    "teve_retrabalho": "teve_retrabalho",
}

VALORES_BOOLEANOS = {
    "sim": True,
    "s": True,
    "true": True,
    "1": True,
    "x": True,
    "ok": True,
    "yes": True,
    "nao": False,
    "n": False,
    "false": False,
    "0": False,
    "no": False,
}


def normalizar_texto(valor: Any) -> str:
    texto = str(valor or "").strip().lower()
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    texto = re.sub(r"[^a-z0-9]+", "_", texto).strip("_")
    return texto


def normalizar_cnpj(valor: Any) -> str:
    return re.sub(r"\D", "", str(valor or ""))


def valor_vazio(valor: Any) -> bool:
    if valor is None:
        return True
    texto = str(valor).strip()
    return texto == "" or texto.lower() in {"nan", "none", "null"}


def interpretar_booleano(valor: Any) -> Optional[bool]:
    if isinstance(valor, bool):
        return valor
    texto = normalizar_texto(valor)
    if texto in VALORES_BOOLEANOS:
        return VALORES_BOOLEANOS[texto]
    return None


def ler_planilha(arquivo) -> pd.DataFrame:
    nome = (arquivo.filename or "").lower()
    conteudo = arquivo.read()
    arquivo.stream.seek(0)

    if not conteudo:
        raise ValueError("Arquivo vazio.")

    if nome.endswith(".csv"):
        ultimo_erro = None
        for encoding in ("utf-8-sig", "utf-8", "latin1"):
            try:
                return pd.read_csv(io.BytesIO(conteudo), dtype=str, sep=None, engine="python", encoding=encoding)
            except Exception as exc:
                ultimo_erro = exc
        raise ValueError(f"Nao foi possivel ler o CSV: {ultimo_erro}")

    if nome.endswith(".xlsx") or nome.endswith(".xls"):
        try:
            return pd.read_excel(io.BytesIO(conteudo), dtype=str)
        except Exception as exc:
            raise ValueError(f"Nao foi possivel ler a planilha Excel: {exc}") from exc

    raise ValueError("Formato invalido. Envie um arquivo .csv, .xlsx ou .xls.")


def mapear_colunas(df: pd.DataFrame) -> Dict[str, str]:
    colunas: Dict[str, str] = {}
    for coluna in df.columns:
        chave = MAPA_CABECALHOS.get(normalizar_texto(coluna))
        if chave and chave in CAMPOS_PERMITIDOS and chave not in colunas:
            colunas[chave] = coluna
    return colunas


def ajustar_valor_campo(campo: str, valor: Any, modo: str, status_financeiro_padrao: str) -> Optional[Any]:
    if campo == "cnpj":
        cnpj = normalizar_cnpj(valor)
        return cnpj or None

    if campo in {"delivered_with_quality", "teve_retrabalho"}:
        return interpretar_booleano(valor)

    if campo == "financeiro_status":
        if modo == "financeiro_pagantes":
            return status_financeiro_padrao
        texto = str(valor or "").strip()
        return texto or None

    texto = str(valor or "").strip()
    return texto or None


def carregar_lojas_por_cnpj() -> Tuple[Dict[str, Store], List[str]]:
    lojas_por_cnpj: Dict[str, Store] = {}
    cnpjs_duplicados: List[str] = []

    for loja in Store.query.all():
        cnpj = normalizar_cnpj(loja.cnpj)
        if not cnpj:
            continue
        if cnpj in lojas_por_cnpj:
            cnpjs_duplicados.append(cnpj)
            continue
        lojas_por_cnpj[cnpj] = loja

    return lojas_por_cnpj, sorted(set(cnpjs_duplicados))


def importar_planilha_monitor(
    arquivo,
    modo: str = "atualizacao_campos",
    atualizar_nao_listadas: bool = False,
    status_financeiro_padrao: str = "Pago",
) -> Dict[str, Any]:
    df = ler_planilha(arquivo)
    if df.empty:
        raise ValueError("A planilha nao possui linhas para importar.")

    colunas = mapear_colunas(df)
    if "cnpj" not in colunas:
        raise ValueError("A planilha precisa ter uma coluna de CNPJ para localizar as lojas.")

    if modo not in {"atualizacao_campos", "financeiro_pagantes"}:
        raise ValueError("Modo de importacao invalido.")

    if modo == "atualizacao_campos":
        campos_para_atualizar = [campo for campo in colunas.keys() if campo != "cnpj"]
        if not campos_para_atualizar:
            raise ValueError("Nenhum campo atualizavel foi encontrado na planilha.")
    else:
        campos_para_atualizar = ["financeiro_status"]

    lojas_por_cnpj, cnpjs_duplicados = carregar_lojas_por_cnpj()
    service = MetricsService()

    atualizadas = 0
    linhas_ignoradas = 0
    nao_encontradas: List[str] = []
    cnpjs_processados: Set[str] = set()
    campos_alterados: Dict[str, int] = {campo: 0 for campo in campos_para_atualizar}

    for _, linha in df.iterrows():
        cnpj_linha = normalizar_cnpj(linha.get(colunas["cnpj"]))
        if not cnpj_linha:
            linhas_ignoradas += 1
            continue

        cnpjs_processados.add(cnpj_linha)
        loja = lojas_por_cnpj.get(cnpj_linha)
        if not loja:
            nao_encontradas.append(cnpj_linha)
            continue

        houve_mudanca = False
        for campo in campos_para_atualizar:
            valor_bruto = linha.get(colunas.get(campo)) if campo in colunas else None
            novo_valor = ajustar_valor_campo(campo, valor_bruto, modo, status_financeiro_padrao)

            if novo_valor is None and modo == "atualizacao_campos":
                continue

            valor_atual = getattr(loja, campo)
            if campo in {"delivered_with_quality", "teve_retrabalho"}:
                if novo_valor is None or bool(valor_atual) == bool(novo_valor):
                    continue
                service.log_change(loja, campo, valor_atual, bool(novo_valor), source="importacao_planilha")
                setattr(loja, campo, bool(novo_valor))
            else:
                valor_atual_texto = "" if valor_vazio(valor_atual) else str(valor_atual).strip()
                novo_valor_texto = "" if valor_vazio(novo_valor) else str(novo_valor).strip()
                if valor_atual_texto == novo_valor_texto:
                    continue
                service.log_change(loja, campo, valor_atual, novo_valor_texto, source="importacao_planilha")
                setattr(loja, campo, novo_valor_texto)

            campos_alterados[campo] += 1
            houve_mudanca = True

        if houve_mudanca:
            atualizadas += 1

    lojas_desmarcadas = 0
    if modo == "financeiro_pagantes" and atualizar_nao_listadas:
        for cnpj, loja in lojas_por_cnpj.items():
            if cnpj in cnpjs_processados:
                continue
            novo_status = "Nao paga mensalidade"
            if (loja.financeiro_status or "").strip() == novo_status:
                continue
            service.log_change(
                loja,
                "financeiro_status",
                loja.financeiro_status,
                novo_status,
                source="importacao_planilha_financeiro",
            )
            loja.financeiro_status = novo_status
            campos_alterados["financeiro_status"] += 1
            lojas_desmarcadas += 1

    return {
        "arquivo": arquivo.filename,
        "modo": modo,
        "linhas_total": int(len(df.index)),
        "lojas_atualizadas": atualizadas,
        "linhas_ignoradas": linhas_ignoradas,
        "nao_encontradas": sorted(set(nao_encontradas))[:50],
        "nao_encontradas_total": len(set(nao_encontradas)),
        "cnpjs_duplicados_no_sistema": cnpjs_duplicados[:50],
        "cnpjs_duplicados_no_sistema_total": len(cnpjs_duplicados),
        "campos_alterados": campos_alterados,
        "lojas_desmarcadas_nao_pagantes": lojas_desmarcadas,
    }
