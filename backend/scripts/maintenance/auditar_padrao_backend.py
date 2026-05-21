"""Audita padroes de manutencao e escrita PT-BR no backend."""

from __future__ import annotations

import argparse
import ast
import json
import re
import tokenize
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable


BACKEND_DIR = Path(__file__).resolve().parents[2]
LARGE_FILE_LINE_LIMIT = 500

IGNORED_DIRS = {"__pycache__", ".pytest_cache", "migrations", "archive"}
SENSITIVE_PATH_PARTS = {"routes", "auth", "security", "webhooks"}

ALLOWED_EXTERNAL_TERMS = {
    "api",
    "backup",
    "backend",
    "blueprint",
    "cache",
    "cors",
    "clickup",
    "closed",
    "complete",
    "csv",
    "deep",
    "done",
    "erro",
    "eventsource",
    "failed",
    "fallback",
    "flask",
    "force",
    "frontend",
    "gemini",
    "google",
    "header",
    "jwt",
    "json",
    "local",
    "manual",
    "never",
    "openai",
    "partial",
    "postgres",
    "postgresql",
    "rbac",
    "render",
    "running",
    "shallow",
    "singleton",
    "sqlite",
    "sse",
    "sqlalchemy",
    "scrypt",
    "schema",
    "startup",
    "step",
    "store",
    "store_id",
    "systemconfig",
    "success",
    "sync",
    "timestamp",
    "totp",
    "true",
    "type",
    "webhook",
    "werkzeug",
}

ENGLISH_HINTS = {
    "allow",
    "backup",
    "check",
    "cleanup",
    "config",
    "configuration",
    "create",
    "created",
    "debug",
    "delete",
    "error",
    "fallback",
    "finish",
    "force",
    "found",
    "logic",
    "manual",
    "missing",
    "process",
    "register",
    "request",
    "response",
    "return",
    "security",
    "startup",
    "store",
    "sync",
    "timestamp",
    "update",
    "warning",
}


@dataclass
class Finding:
    tipo: str
    arquivo: str
    linha: int
    detalhe: str


def iter_python_files() -> Iterable[Path]:
    for path in BACKEND_DIR.rglob("*.py"):
        parts = set(path.parts)
        if parts.intersection(IGNORED_DIRS):
            continue
        yield path


def relative(path: Path) -> str:
    return path.relative_to(BACKEND_DIR).as_posix()


def normalized_words(text: str) -> set[str]:
    return {
        word.lower()
        for word in re.findall(r"[A-Za-z][A-Za-z_-]{2,}", text)
        if word.lower() not in ALLOWED_EXTERNAL_TERMS
    }


def has_english_hint(text: str) -> bool:
    return bool(normalized_words(text).intersection(ENGLISH_HINTS))


def collect_comments(path: Path) -> list[tuple[int, str]]:
    comments: list[tuple[int, str]] = []
    with path.open("rb") as handle:
        for token in tokenize.tokenize(handle.readline):
            if token.type == tokenize.COMMENT:
                comments.append((token.start[0], token.string.lstrip("#").strip()))
    return comments


def collect_docstrings(path: Path) -> list[tuple[int, str]]:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except SyntaxError:
        return []

    docstrings: list[tuple[int, str]] = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            doc = ast.get_docstring(node)
            if doc:
                docstrings.append((getattr(node, "lineno", 1), doc))
    return docstrings


def is_sensitive_path(path: Path) -> bool:
    lowered = relative(path).lower()
    return any(part in lowered for part in SENSITIVE_PATH_PARTS)


def audit_file(path: Path) -> list[Finding]:
    findings: list[Finding] = []
    rel = relative(path)
    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()

    if len(lines) > LARGE_FILE_LINE_LIMIT:
        findings.append(
            Finding(
                tipo="arquivo_grande",
                arquivo=rel,
                linha=1,
                detalhe=f"{len(lines)} linhas; considerar extracao incremental em rodada futura.",
            )
        )

    for line_no, comment in collect_comments(path):
        if has_english_hint(comment):
            findings.append(
                Finding(
                    tipo="comentario_possivelmente_ingles",
                    arquivo=rel,
                    linha=line_no,
                    detalhe=comment[:160],
                )
            )

    for line_no, docstring in collect_docstrings(path):
        if has_english_hint(docstring):
            findings.append(
                Finding(
                    tipo="docstring_possivelmente_ingles",
                    arquivo=rel,
                    linha=line_no,
                    detalhe=" ".join(docstring.split())[:160],
                )
            )

    if is_sensitive_path(path):
        for line_no, line in enumerate(lines, start=1):
            lowered = line.lower()
            has_print = re.search(r"\bprint\s*\(", lowered)
            has_debug = re.search(r"\bdebug\b", lowered)
            if has_print or has_debug:
                findings.append(
                    Finding(
                        tipo="debug_ou_print_em_area_sensivel",
                        arquivo=rel,
                        linha=line_no,
                        detalhe=line.strip()[:160],
                    )
                )

    return findings


def summarize(findings: list[Finding]) -> dict[str, int]:
    summary: dict[str, int] = {}
    for finding in findings:
        summary[finding.tipo] = summary.get(finding.tipo, 0) + 1
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Audita padroes PT-BR do backend.")
    parser.add_argument("--strict", action="store_true", help="Retorna codigo 1 quando houver achados.")
    parser.add_argument("--json", action="store_true", help="Mostra apenas JSON.")
    args = parser.parse_args()

    findings: list[Finding] = []
    for path in iter_python_files():
        findings.extend(audit_file(path))

    payload = {
        "backend": str(BACKEND_DIR),
        "total_achados": len(findings),
        "resumo": summarize(findings),
        "achados": [asdict(item) for item in findings],
    }

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print("Auditoria de padrao PT-BR do backend")
        print(f"Backend: {BACKEND_DIR}")
        print(f"Total de achados: {len(findings)}")
        for tipo, count in payload["resumo"].items():
            print(f"- {tipo}: {count}")
        print("\nPrimeiros achados:")
        for item in findings[:50]:
            print(f"- {item.tipo} | {item.arquivo}:{item.linha} | {item.detalhe}")
        if len(findings) > 50:
            print(f"... mais {len(findings) - 50} achados. Use --json para ver tudo.")

    return 1 if args.strict and findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
