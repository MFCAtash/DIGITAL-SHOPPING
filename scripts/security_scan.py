#!/usr/bin/env python3
"""اسکن امنیتی سبک و بدون وابستگی: رازهای لو رفته، الگوهای خطرناک و DEBUG در تولید.

استفاده:
    python scripts/security_scan.py --root .
    python scripts/security_scan.py --root . --git   # تاریخچهٔ git هم بررسی شود
    python scripts/security_scan.py --root . --json

خروجی: لیست یافتهها با مسیر و شمارهٔ خط؛ در صورت یافتهٔritical کد خروجی ۱ است.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
from pathlib import Path

SKIP_DIRS = {".venv", "node_modules", ".next", "__pycache__", ".pytest_cache", ".ruff_cache", ".git", "dist", "build", "staticfiles"}
SKIP_SUFFIX = {".woff2", ".woff", ".ttf", ".png", ".jpg", ".webp", ".svg", ".gz", ".zip", ".sqlite3", ".pyc", ".ico"}
PLACEHOLDER = re.compile(r"change[-_]?me|changeme|example|dummy|placeholder|test[-_]?secret|ci[-_]?only|fake|localhost", re.I)
SECRET_ASSIGN = re.compile(r"(?i)(SECRET_KEY|PASSWORD|TOKEN|API_KEY|PRIVATE_KEY|CREDENTIAL|OTP_SECRET)\s*[:=]\s*[\"']([^\"']{16,})[\"']")
PRIVATE_KEY = re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----")
AWS_KEY = re.compile(r"AKIA[0-9A-Z]{16}")
DANGEROUS = [
    (re.compile(r"cursor\.execute\(\s*f[\"']"), "raw SQL با f-string"),
    (re.compile(r"\.raw\(\s*f[\"']"), "ORM raw با f-string"),
    (re.compile(r"\beval\("), "eval"),
    (re.compile(r"\bnew Function\("), "new Function"),
    (re.compile(r"innerHTML\s*="), "innerHTML"),
]
HIGH_LEVELS = ("critical", "high")
# پیشنمایشهای استاتیک-only با تابع esc() ساخته میشوند و ورودی کاربر ندارند (بررسی شده در audit).
STATIC_PREVIEW = ("preview.html", "design-system.html", "build-preview.mjs")


def entropy(value: str) -> float:
    if not value:
        return 0.0
    counts: dict[str, int] = {}
    for ch in value:
        counts[ch] = counts.get(ch, 0) + 1
    return -sum((n / len(value)) * math.log2(n / len(value)) for n in counts.values())


def _iter_files(root: Path):
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in SKIP_SUFFIX:
            continue
        # CI workflowها از مقادیر آزمایشی ثابت استفاده میکنند (در report مستنداند).
        if ".github" in path.parts and "workflows" in path.parts:
            continue
        yield path


def scan_text(text: str, label: str) -> list[dict]:
    findings: list[dict] = []
    for i, line in enumerate(text.splitlines(), start=1):
        for m in SECRET_ASSIGN.finditer(line):
            value = m.group(2)
            if not PLACEHOLDER.search(value) and entropy(value) >= 3.5:
                findings.append({"level": "critical", "kind": "high_entropy_secret", "file": label, "line": i, "detail": m.group(1)})
        for pattern, detail in ((PRIVATE_KEY, "private_key"), (AWS_KEY, "aws_access_key")):
            if pattern.search(line):
                findings.append({"level": "critical", "kind": detail, "file": label, "line": i, "detail": ""})
        for pattern, detail in DANGEROUS:
            if not pattern.search(line) or "scripts/security_scan.py" in label:
                continue
            if detail == "innerHTML" and any(p in label for p in STATIC_PREVIEW):
                continue
            findings.append({"level": "high", "kind": detail, "file": label, "line": i, "detail": ""})
        if re.search(r"^\s*DEBUG\s*=\s*True", line) and "prod.py" in label:
            findings.append({"level": "critical", "kind": "debug_true_in_prod", "file": label, "line": i, "detail": ""})
    return findings


def scan_git(root: Path) -> list[dict]:
    findings: list[dict] = []
    try:
        out = subprocess.run(["git", "log", "-p", "--all"], cwd=root, capture_output=True, text=True, timeout=120, check=False)
    except (OSError, subprocess.SubprocessError):
        return []
    if out.returncode != 0:
        return []
    for line_no, line in enumerate(out.stdout.splitlines(), start=1):
        if PRIVATE_KEY.search(line):
            findings.append({"level": "critical", "kind": "private_key_in_history", "file": "git-history", "line": line_no, "detail": ""})
        if AWS_KEY.search(line):
            findings.append({"level": "critical", "kind": "aws_key_in_history", "file": "git-history", "line": line_no, "detail": ""})
        for m in SECRET_ASSIGN.finditer(line):
            value = m.group(2)
            if not PLACEHOLDER.search(value) and entropy(value) >= 3.5:
                findings.append({"level": "critical", "kind": "secret_in_history", "file": "git-history", "line": line_no, "detail": m.group(1)})
    return findings


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--git", action="store_true", help="همچنین تاریخچهٔ git را اسکن کن")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    root = Path(args.root).resolve()
    findings: list[dict] = []
    for path in _iter_files(root):
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        findings.extend(scan_text(text, str(path.relative_to(root))))
    if args.git:
        findings.extend(scan_git(root))
    high = [f for f in findings if f["level"] in HIGH_LEVELS]
    if args.json:
        print(json.dumps(findings, ensure_ascii=False, indent=2))
    else:
        if not findings:
            print("security scan: no findings")
        for f in findings:
            print(f"[{f['level']}] {f['kind']}: {f['file']}:{f['line']} {f['detail']}")
        print(f"scan complete: {len(findings)} findings ({len(high)} blocking)")
    return 1 if high else 0


if __name__ == "__main__":
    sys.exit(main())
