#!/usr/bin/env python3
"""제품 정책과 공통 상태표의 작은 계약.

사람이 쓰는 설명은 `project_status.json` 에 두되 상태 값은 네 개로 고정한다.
코드에서 바로 알 수 있는 상태(CI 포함 여부)는 JSON 주장과 실제 워크플로를
역대조한다. `gen_status.py` 와 `check_docs.py` 가 이 모듈을 같이 쓴다.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

STATUSES = ("완료", "부분완료", "미구현", "검증 안 됨")
FREE_DELIVERY_MODES = (
    "bundled",
    "server_prefetch_after_first_online_launch",
)


def load_contract(root: Path) -> dict:
    path = root / "docs" / "project_status.json"
    return json.loads(path.read_text(encoding="utf-8"))


def ci_jobs(root: Path) -> set[str]:
    path = root / ".github" / "workflows" / "gates.yml"
    if not path.exists():
        return set()
    body = path.read_text(encoding="utf-8", errors="replace")
    return {
        m.group(1)
        for m in re.finditer(r"^  ([a-z][a-z0-9_-]*):\s*$", body, re.M)
        if m.group(1) not in {"push", "pull_request", "workflow_dispatch"}
    }


def ci_runs(root: Path, command: str) -> bool:
    path = root / ".github" / "workflows" / "gates.yml"
    return path.exists() and command in path.read_text(encoding="utf-8", errors="replace")


def _evidence_path(value: str) -> str:
    """`path:line` 또는 `path#anchor` 를 허용할 때 파일 부분만."""
    return value.split("#", 1)[0].split(":", 1)[0]


def validate_contract(root: Path, contract: dict | None = None) -> list[str]:
    try:
        data = contract or load_contract(root)
    except (OSError, json.JSONDecodeError) as exc:
        return [f"project_status.json 을 읽을 수 없다: {exc}"]

    errors: list[str] = []
    if data.get("schema_version") != 1:
        errors.append("schema_version 은 1이어야 한다")

    definitions = data.get("status_definitions")
    if not isinstance(definitions, dict) or tuple(definitions) != STATUSES:
        errors.append("상태 정의는 완료·부분완료·미구현·검증 안 됨 네 개여야 한다")

    free = data.get("policies", {}).get("free_content_delivery", {})
    mode = free.get("mode")
    if mode not in FREE_DELIVERY_MODES:
        errors.append(f"free_content_delivery.mode 가 허용값이 아니다: {mode!r}")
    if mode == "server_prefetch_after_first_online_launch":
        if free.get("first_install_offline") is not False:
            errors.append("서버 프리페치 정책은 first_install_offline=false 여야 한다")
        if free.get("offline_after_prefetch") is not True:
            errors.append("서버 프리페치 정책은 offline_after_prefetch=true 여야 한다")
        if not (root / "app" / "src" / "shared" / "content" / "prefetch-free.ts").exists():
            errors.append("서버 프리페치 정책인데 prefetch-free.ts 가 없다")

    items = data.get("items")
    if not isinstance(items, list):
        return errors + ["items 는 배열이어야 한다"]
    by_id: dict[str, dict] = {}
    for item in items:
        if not isinstance(item, dict):
            errors.append("items 에 객체가 아닌 값이 있다")
            continue
        item_id = str(item.get("id") or "")
        if not item_id:
            errors.append("상태 항목 id 가 비었다")
            continue
        if item_id in by_id:
            errors.append(f"상태 항목 id 가 중복됐다: {item_id}")
        by_id[item_id] = item
        if item.get("status") not in STATUSES:
            errors.append(f"{item_id}: 모르는 상태 {item.get('status')!r}")
        if not item.get("label"):
            errors.append(f"{item_id}: label 이 비었다")
        if not item.get("verification"):
            errors.append(f"{item_id}: verification 이 비었다")
        evidence = item.get("evidence")
        if not isinstance(evidence, list) or not evidence:
            errors.append(f"{item_id}: evidence 가 비었다")
        else:
            for value in evidence:
                rel = _evidence_path(str(value))
                if not (root / rel).exists():
                    errors.append(f"{item_id}: 근거 파일이 없다 — {rel}")

    jobs = ci_jobs(root)
    machine_status = {
        "student_app_ci": "완료" if "app" in jobs else "미구현",
        "admin_ci": "완료" if "admin" in jobs else "미구현",
        "vertical_e2e_ci": "완료" if ci_runs(root, "pnpm e2e") else "미구현",
    }
    for item_id, expected in machine_status.items():
        actual = by_id.get(item_id, {}).get("status")
        if actual is None:
            errors.append(f"코드로 검증하는 상태 항목이 없다: {item_id}")
        elif actual != expected:
            errors.append(f"{item_id}: 상태표는 {actual}, 실제 코드는 {expected}")

    return errors


def render_contract(contract: dict) -> list[str]:
    free = contract["policies"]["free_content_delivery"]
    lines = [
        "## 정책 계약",
        "",
        "정본: `docs/project_status.json` — 사람이 쓰는 설명도 이 값을 가리키며 같은 정책을 다시 선언하지 않는다.",
        "",
        "| 정책 | 값 | 제품에서 뜻하는 것 |",
        "|---|---|---|",
        (
            "| 무료 콘텐츠 전달 | "
            f"`{free['mode']}` | 첫 설치 오프라인: **{'가능' if free['first_install_offline'] else '불가'}** · "
            f"프리페치 뒤 오프라인: **{'가능' if free['offline_after_prefetch'] else '불가'}** · "
            f"범위 정본: `{free['scope_source']}` · 번들 예외: `{free['bundled_exception']}` |"
        ),
        "",
        "## 공통 개발 상태표",
        "",
        "상태는 **완료 / 부분완료 / 미구현 / 검증 안 됨** 네 개뿐이다. 상세한 경위는 근거 문서를 보고, 현재 판정은 이 표를 본다.",
        "",
        "| ID | 영역 | 상태 | 검증 |",
        "|---|---|---|---|",
    ]
    for item in contract["items"]:
        lines.append(
            f"| `{item['id']}` | {item['label']} | **{item['status']}** | `{item['verification']}` |"
        )
    lines.append("")
    return lines


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    errors = validate_contract(root)
    if errors:
        print("project_status.json 계약 오류:")
        for error in errors:
            print(f"  - {error}")
        return 1
    print("상태 계약 통과 — 네 상태·근거 파일·실제 CI 포함 여부가 맞음")
    return 0


if __name__ == "__main__":
    sys.exit(main())
