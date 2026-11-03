"""Read-only project inventory; explicit packaging never uploads or removes files.

Python 3.12+ (junction detection). Run from any directory. See
docs/operations/PRESERVATION.md. Secret detection is a conservative aid, not a
guarantee: review newly introduced paths before authorizing future uploads.
"""
import argparse
import collections
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BASELINE = "aaf6a8298c829f025ae2bb89270fcb7e2921019f"
GENERATED_ROOTS = {"node_modules", ".next", ".pnpm-store", "dist", "logs",
                   "test-results", "playwright-report", "coverage", "__pycache__"}
UNIQUE_OLD_REPORTS = {
    ".data/raid-stat-baseline/artifacts/reports/history/WORKSPACE_RELOCATION-2026-10-14.json",
    ".data/raid-stat-baseline/artifacts/reports/npc/kalos-audit.json",
    ".data/raid-stat-baseline/artifacts/reports/raid-stat-tuned-endgame.json",
    ".data/raid-stat-baseline/artifacts/reports/raid-threshold-endgame.json",
    ".data/raid-stat-baseline/artifacts/reports/raid-winrate-by-floor.json",
}
PATTERNS = [
    ("private-key", re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("credential-value", re.compile(rb'''["'](?:password_hash|passwordHash|access_token|refresh_token|api_key|client_secret|session_token|sessionToken)["']\s*:\s*["'][^"']{8,}["']''', re.I)),
    ("provider-token", re.compile(rb"(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-proj-[A-Za-z0-9_-]{30,})")),
    ("personal-email", re.compile(rb"@(?:gmail|naver|hotmail|outlook)\.(?:com|net)", re.I)),
    ("private-tunnel", re.compile(rb"https://[a-z0-9-]+\.trycloudflare\.com", re.I)),
]


def git(*args):
    return subprocess.check_output(["git", "-c", "core.longpaths=true", *args], cwd=ROOT)


def dump(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def digest(path, screen=False):
    h = hashlib.sha256()
    findings = set()
    tail = b""
    with open(path, "rb") as f:
        while block := f.read(1024 * 1024):
            h.update(block)
            if screen:
                data = tail + block
                low = data.lower()
                possible = {"private-key": b"private key" in low,
                            "credential-value": any(k in low for k in (b"password", b"token", b"api_key", b"client_secret")),
                            "provider-token": b"gh" in data or b"sk-proj-" in data,
                            "personal-email": any(k in low for k in (b"@gmail.", b"@naver.", b"@hotmail.", b"@outlook.")),
                            "private-tunnel": b"trycloudflare" in low}
                findings.update(name for name, pattern in PATTERNS if possible[name] and pattern.search(data))
                tail = data[-4096:]
    return h.hexdigest(), sorted(findings)


def classify(path, tracked):
    low = path.lower()
    name = low.rsplit("/", 1)[-1]
    private_name = (name.startswith(".env") and name != ".env.example") or low.endswith((".env", ".sqlite", ".sqlite-wal", ".sqlite-shm", ".db", ".pem", ".key", ".pfx"))
    if path in tracked and not private_name:
        return "Git", None, "현재 추적 파일 유지; 큰 생성물이 추적되면 별도 검토"
    if any(p in GENERATED_ROOTS for p in low.split("/")[:-1]):
        return "폐기 후보", None, "명백한 의존성/빌드/캐시 하위 파일; 삭제하지 않음"
    if low.startswith(".data/tests/") or low.startswith((".data/e2e.sqlite", ".data/title-reference-qa.sqlite")):
        return "폐기 후보", None, "명시된 테스트 DB/fixture 출력; 개인 저장과 구분"
    # Private data takes priority even if a future change accidentally tracks it.
    if private_name:
        return "민감정보 업로드 금지", None, "환경/DB/인증 파일; 내용 미수집"
    if low.startswith((".data/backups/", ".data/transfers/", ".data/cache/tls-diagnostics/")):
        return "민감정보 업로드 금지", None, "개인 저장/이전/운영 진단; 내용 미수집"
    if path in tracked:
        return "Git", None, "현재 추적 파일 유지"
    if low.startswith(("scripts/", "docs/", "src/", "tests/", "e2e/")) and low.endswith((".py", ".md", ".ts", ".tsx", ".mjs", ".json")):
        return "Git", None, "신규 개발 파일: Git 편입 후보; 추적 여부는 tracked 필드 참조"
    if path == "artifacts/qa/previews/player-trainer/original-sheet.png":
        return "Drive 보존", "assets", "생성형 AI 뒷모습 시트 원본; Git의 축소 runtime과 다른 복구 필수 원본"
    if path in UNIQUE_OLD_REPORTS:
        return "Archive", "history", "과거 작업 사본 안 유일한 분석 원자료; 현행 Git/보존 후보 해시와 중복 아님"
    parts = low.split("/")
    if parts[0] in GENERATED_ROOTS or low.startswith(("artifacts/temporary/", "artifacts/windows-release/", "artifacts/build-progression-audit/test-temp/")):
        return "폐기 후보", None, "의존성/빌드/배포/임시 검증 출력; 삭제하지 않음"
    if low.startswith(("external/pokemon-ip/", "public/vendor/", "public/sprites/", "public/assets/external-generated/")):
        return "Drive 보존", "assets", "Git 제외 runtime/원본; 동일 bytes 오프라인 복구"
    if low.startswith((".data/cache/import/", ".data/cache/forms/")):
        return "Drive 보존", "assets", "가변 upstream·과거 다운로드 원본/CSV/라이선스 예외 보존"
    if low.startswith("artifacts/build-progression-audit/"):
        if low.endswith((".log", ".gz")):
            return "폐기 후보", None, "반복 검증 로그/원본 JSONL의 압축 복사; 원본은 별도 보존"
        return "Drive 보존", "analysis", "v2 진행 구조의 고정 입력/원자료/비교 근거"
    if low.startswith(("artifacts/experiments/", "artifacts/progression-audit/", "artifacts/reports/")) or low in {"artifacts/readme.md", "artifacts/index.md", "artifacts/index.json"}:
        if low.endswith((".log", ".gz")):
            return "폐기 후보", None, "일시 로그 또는 별도 보존 JSONL의 압축 복사"
        return "Archive", "history", "과거 AI/밸런스/의사결정의 비Git 원자료; 현행 정책 아님"
    if low.startswith("artifacts/qa/assets/") and low.endswith((".json", ".csv", ".md", ".txt", ".html")):
        return "Drive 보존", "analysis", "자산 출처/라이선스/coverage 감사 근거"
    if low.startswith(("artifacts/audits/", "artifacts/qa/")):
        return "로컬 유지", None, "세션 dump/플레이 캡처 포함 가능; 일반 Drive 보존 제외, 필요시 별도 검토"
    if low.startswith(".data/"):
        return "로컬 유지", None, "개인 운영/과거 작업 사본/일회성 진단; 일반 Drive 보존 제외"
    if low.endswith((".tsbuildinfo", ".log")) or low == "next-env.d.ts":
        return "폐기 후보", None, "재생성 캐시/로그/타입 선언"
    return "로컬 유지", None, "미분류 신규 파일: Git 편입/원본 보존을 사람 검토; 자동 업로드 금지"


def describe(path, package):
    if path == "artifacts/qa/previews/player-trainer/original-sheet.png":
        return {"purpose": "AI 생성 원본 1983x793, runtime 384x128과 별개", "source": "프로젝트 built-in imagegen; docs/references/THIRD_PARTY.md의 2026-10-12 기록",
                "license": "project-original/generated-for-project; 원본 프롬프트 미보존, 외부 IP 표현 범위 확인 필요",
                "ip_status": "확인 필요", "clone_only": False}
    if package == "assets":
        return {"purpose": "외부 원본 및 runtime 복원", "source": "Git의 docs/assets/manifests, scripts/assets/*/sources.lock.json 및 팩별 sources/REUSE/LICENSES 참조",
                "license": "Pokémon/커뮤니티 그림: 확인 필요; 동봉 LicenseRef-FAIR-USE는 권리자 허가 아님; 파일별 고지 보존",
                "ip_status": "교체 필요" if not path.endswith((".csv", ".html", ".ts")) else "확인 필요",
                "clone_only": False}
    return {"purpose": "분석·의사결정 추적 및 과거 결과 재검증", "source": "동일 디렉터리의 report/manifest 및 관련 Git script; 당시 commit은 원자료를 유지",
            "license": "프로젝트 분석 결과; 포함 Pokémon 명칭·데이터 권리는 별도 확인 필요",
            "ip_status": "확인 필요", "clone_only": False}


def scan(output, previous):
    tracked = set(git("ls-files", "-z").decode("utf-8").split("\0")) - {""}
    all_paths = []
    counters = collections.Counter()
    groups = collections.defaultdict(lambda: {"count": 0, "bytes": 0})
    entries, links, errors = [], [], []
    for base, dirs, files in os.walk(ROOT, followlinks=False, onerror=lambda e: errors.append({"path": os.path.relpath(e.filename, ROOT), "error": type(e).__name__})):
        for d in list(dirs):
            target = Path(base) / d
            audit_output = target == ROOT / "artifacts" / "preservation"
            if d == ".git" or target.is_junction() or target.is_symlink() or target == output or audit_output:
                dirs.remove(d)
                if d != ".git" and target != output and not audit_output:
                    links.append(target.relative_to(ROOT).as_posix())
        for name in sorted(files):
            target = Path(base) / name
            path = target.relative_to(ROOT).as_posix()
            if target.is_symlink():
                links.append(path)
                continue
            try:
                st = target.stat()
                all_paths.append(path)
                category, package, reason = classify(path, tracked)
                counters["total"] += 1
                counters["tracked" if path in tracked else "non_git"] += 1
                if category == "폐기 후보":
                    counters["regenerable"] += 1
                    key = path.split("/")[0] + ":" + category
                    groups[key]["count"] += 1
                    groups[key]["bytes"] += st.st_size
                    continue
                entry = {"path": path, "bytes": st.st_size, "category": category,
                         "tracked": path in tracked, "reason": reason}
                if category != "민감정보 업로드 금지":
                    entry["sha256"], findings = digest(target, bool(package) or (category == "Git" and path not in tracked))
                    if findings:
                        entry.update(category="민감정보 업로드 금지", reason="내용 검사 보류: " + ", ".join(findings))
                        entry.pop("sha256", None)
                        package = None
                if package:
                    entry.update(package=package, restore_path=path, **describe(path, package))
                entries.append(entry)
            except OSError as exc:
                errors.append({"path": path, "error": type(exc).__name__})
    ignore_result = subprocess.run(["git", "-c", "core.longpaths=true", "check-ignore", "--stdin", "-z"], cwd=ROOT,
                                   input=("\0".join(all_paths) + "\0").encode("utf-8"), capture_output=True)
    if ignore_result.returncode not in (0, 1):
        raise RuntimeError("git check-ignore failed")
    ignored = set(ignore_result.stdout.decode("utf-8").split("\0")) - {""}
    counters["ignored"] = len(ignored)
    for entry in entries:
        entry["ignored"] = entry["path"] in ignored
    manifest = {"schema_version": 1, "status": "local-audit-complete; Drive receipt maintained separately",
                "as_of": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).isoformat(),
                "baseline_commit": BASELINE, "head": git("rev-parse", "HEAD").decode().strip(),
                "branch": git("branch", "--show-current").decode().strip(),
                "git_status": git("status", "--short").decode("utf-8"),
                "since_baseline": git("diff", "--name-status", BASELINE, "HEAD").decode("utf-8"),
                "scope": "workspace physical regular files; .git and directory links excluded; generated files grouped; artifacts/preservation audit outputs excluded",
                "counts": dict(counters), "generated_groups": dict(groups), "skipped_links": links,
                "errors": errors, "files": sorted(entries, key=lambda e: e["path"])}
    output.mkdir(parents=True, exist_ok=True)
    dump(output / "PRESERVATION_MANIFEST.json", manifest)
    if previous:
        old = {e["path"]: e for e in json.loads(previous.read_text(encoding="utf-8"))["files"]}
        new = {e["path"]: e for e in entries}
        diff = {"previous": str(previous), "head": manifest["head"], "baseline_commit": BASELINE,
                "added": sorted(new.keys() - old.keys()), "missing_report_only": sorted(old.keys() - new.keys()),
                "changed": sorted(p for p in old.keys() & new.keys() if any(old[p].get(k) != new[p].get(k) for k in ["bytes", "sha256", "category", "tracked"]))}
        dump(output / "DELTA.json", diff)
    print(json.dumps({"counts": manifest["counts"], "categories": dict(collections.Counter(e["category"] for e in entries)),
                      "packages": dict(collections.Counter(e.get("package") for e in entries)), "errors": errors,
                      "skipped_links": len(links)}, ensure_ascii=False))
    return manifest


def package_files(manifest, output, package, entries=None, archive_name=None):
    entries = entries if entries is not None else [e for e in manifest["files"] if e.get("package") == package]
    date = manifest["as_of"][:10]
    archive = output / (archive_name or ({"assets": "포켓몬_복구필수자료_",
                         "analysis": "진행구조_v2_분석원자료_",
                         "history": "과거실험_의사결정_원자료_"}[package] + date + ".zip"))
    # Exclusive mode prevents accidental package duplication/overwrite on reruns.
    with zipfile.ZipFile(archive, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as z:
        for entry in entries:
            path = ROOT / entry["path"]
            if digest(path)[0] != entry["sha256"]:
                raise RuntimeError("Changed since inventory: " + entry["path"])
            z.write(path, entry["path"])
        z.writestr("PRESERVATION_MANIFEST.json", json.dumps({"baseline_commit": BASELINE, "head": manifest["head"], "as_of": manifest["as_of"], "package": package, "files": entries}, ensure_ascii=False, indent=2))
        z.writestr("RESTORE_README.md", "# 복원\n\n기준 commit: " + BASELINE + "\n\n먼저 Git clone 후 기준 commit을 확인합니다. 새 임시 폴더에 압축을 풀고 각 파일의 bytes/SHA-256을 manifest와 대조합니다. 경로는 프로젝트 루트 상대 경로입니다. 기존 파일과 다른 경우 덮어쓰지 말고 별도 검토합니다. 자산 팩은 Node 24+ 및 pnpm 11.19.0 설치 후 `pnpm install --frozen-lockfile`, `pnpm assets:verify`로 확인합니다. 분석 패키지는 과거 원자료이며 당시 manifest/보고서의 소스 버전을 따릅니다. 개인 DB/환경/인증 파일은 포함하지 않습니다. 자세한 절차는 Git의 docs/operations/PRESERVATION.md 및 Drive 프로젝트 인덱스를 따릅니다.\n")
    verify_archive(archive)
    return {"name": archive.name, "bytes": archive.stat().st_size, "sha256": digest(archive)[0], "files": len(entries), "verified": True}


def verify_archive(archive):
    with zipfile.ZipFile(archive) as z:
        manifest = json.loads(z.read("PRESERVATION_MANIFEST.json"))
        for entry in manifest["files"]:
            h = hashlib.sha256()
            n = 0
            with z.open(entry["path"]) as f:
                while block := f.read(1024 * 1024):
                    h.update(block)
                    n += len(block)
            if n != entry["bytes"] or h.hexdigest() != entry["sha256"]:
                raise RuntimeError("Archive mismatch: " + entry["path"])
        if set(z.namelist()) != {e["path"] for e in manifest["files"]} | {"PRESERVATION_MANIFEST.json", "RESTORE_README.md"}:
            raise RuntimeError("Unexpected archive entry")
    print("Verified " + str(archive))


def package_for_drive(manifest, output, package):
    """Standalone logical ZIPs; connector currently accepts at most 100 MiB."""
    entries = [e for e in manifest["files"] if e.get("package") == package]
    date = manifest["as_of"][:10]
    if package == "assets":
        predicate = lambda e: e["path"].startswith("public/")
        names = ["포켓몬_런타임자산_", "포켓몬_원본_라이선스_AI_"]
    elif package == "history":
        predicate = lambda e: e["path"].startswith(("artifacts/experiments/ai/", "artifacts/experiments/balance/"))
        names = ["과거실험_AI_밸런스_", "과거실험_샘플_이전진행_결정_"]
    else:
        return [package_files(manifest, output, package)]
    results = []
    for selected, name in zip([True, False], names):
        subset = [e for e in entries if predicate(e) == selected]
        result = package_files(manifest, output, package, subset, name + date + ".zip")
        if result["bytes"] > 100 * 1024 * 1024:
            raise RuntimeError("Connector limit exceeded; review a smaller logical split: " + result["name"])
        results.append(result)
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--compare", type=Path)
    parser.add_argument("--baseline-commit", default=BASELINE, help="Explicitly approved baseline only; never advances automatically")
    parser.add_argument("--package", nargs="+", choices=["assets", "analysis", "history"], help="Explicitly selected local packages, never uploads")
    parser.add_argument("--verify-package", type=Path)
    args = parser.parse_args()
    BASELINE = git("rev-parse", "--verify", args.baseline_commit + "^{commit}").decode().strip()
    if args.verify_package:
        verify_archive(args.verify_package)
    else:
        if not args.output:
            parser.error("--output is required")
        output = args.output.resolve()
        if (output / "PRESERVATION_MANIFEST.json").exists():
            parser.error("Choose a new output directory; never overwrite an existing baseline")
        manifest = scan(output, args.compare)
        if manifest["errors"]:
            raise RuntimeError("Inventory incomplete; packaging blocked")
        if args.package:
            dump(output / "PACKAGE_CHECKSUMS.json", [entry for p in args.package for entry in package_for_drive(manifest, output, p)])
