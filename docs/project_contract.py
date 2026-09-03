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
CONTENT_PUBLICATION_MODES = (
    "exclude_deleted_warn_and_include_unknown",
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


# ── 공개 정책을 **돌려서** 확인한다 ─────────────────────────────────────────
#
# **소스를 grep 하는 것만으로는 정책이 지켜지는지 알 수 없다.** 아래 상수 대조는
# `DROP_STATUS = {"deleted"}` 라는 **글자**가 있는지만 본다. 그런데 상수를 그대로
# 두고 거르는 자리를 하나 더 만들면 **글자는 통과하고 행 처리만 바뀐다** —
# 그러면 「학생에게 무엇이 나가는가」가 조용히 달라진다. DEV-07 이 「정책 상수·
# **실제 행 처리까지** 깨뜨려 보는 회귀 테스트가 없다」고 적어 둔 자리다.
#
# 그래서 `drop_unshippable` 을 **불러서** 지어낸 행을 통과시켜 본다. 원장은
# 저장소에 없으므로(`.gitignore` 의 `*.xlsx`) 이 검사는 원장 없이 돈다 — CI 에서
# 도는 것이 요점이다.

#: (상태값, 나가야 하나, 모르는 상태로 보고돼야 하나)
PUBLICATION_ROWS = (
    ("reviewed", True, False),        # 검수 끝 — 나간다
    ("draft", True, False),           # 저작 중 — **나간다**(현재 정책)
    ("auto_checked", True, False),    # 형식만 확인 — 나간다
    ("fixed_v56", True, False),       # 판본 도장 — 나간다
    ("deleted", False, False),        # 지운 것 — **유일하게 막는다**
    ("draft_v99", True, True),        # 처음 보는 값 — 나가되 경고
    ("", True, False),                # 빈 칸 — 나간다
)


def _load_builder(root: Path):
    """`build-content.py` 를 모듈로 읽는다. 이름에 `-` 가 있어 import 로는 안 된다."""
    import importlib.util

    path = root / "app" / "scripts" / "build-content.py"
    spec = importlib.util.spec_from_file_location("_build_content", path)
    if spec is None or spec.loader is None:
        raise ImportError(f"{path} 를 모듈로 못 읽는다")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)          # 최상위에서 도는 것이 없다(main 은 __main__ 가드)
    return module


def check_publication_behavior(root: Path) -> list[str]:
    """정책이 **행에 실제로 적용되는지** 본다. 어긋난 것들을 준다."""
    try:
        builder = _load_builder(root)
    except Exception as exc:                 # noqa: BLE001 — 무엇이 터지든 계약 실패다
        return [f"build-content.py 를 불러 볼 수 없다: {exc}"]

    fn = getattr(builder, "drop_unshippable", None)
    if not callable(fn):
        return ["build-content.py 에 drop_unshippable 이 없다 — 정책을 돌려 볼 수 없다"]

    errors: list[str] = []
    rows = [{"item_id": f"P-{i}", "review_status": st}
            for i, (st, _, _) in enumerate(PUBLICATION_ROWS)]
    try:
        kept, dropped, unknown = fn("계약검사", rows)
    except Exception as exc:                 # noqa: BLE001
        return [f"drop_unshippable 이 터졌다: {exc}"]

    kept_ids = {r["item_id"] for r in kept}
    for i, (status, should_ship, should_warn) in enumerate(PUBLICATION_ROWS):
        shipped = f"P-{i}" in kept_ids
        label = repr(status) if status else "빈 칸"
        if shipped != should_ship:
            errors.append(
                f"공개 정책이 안 지켜진다 — review_status {label} 은 "
                f"{'나가야' if should_ship else '막혀야'} 하는데 "
                f"{'나갔다' if shipped else '막혔다'}"
            )
        if should_warn and status not in unknown:
            errors.append(f"모르는 review_status {label} 을 경고하지 않는다")
        if not should_warn and status in unknown:
            errors.append(f"아는 review_status {label} 을 모르는 값이라고 한다")

    expected_dropped = sum(1 for _, ship, _ in PUBLICATION_ROWS if not ship)
    if dropped != expected_dropped:
        errors.append(f"뺀 행 수가 {expected_dropped} 이어야 하는데 {dropped} 이다")

    # `review_status` 열이 아예 없는 시트(문법목록 등)는 손대지 않고 지나야 한다
    plain = [{"item_id": "N-0"}]
    kept2, dropped2, unknown2 = fn("열없음", plain)
    if len(kept2) != 1 or dropped2 or unknown2:
        errors.append("review_status 열이 없는 시트를 그대로 통과시키지 않는다")

    return errors


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

    publication = data.get("policies", {}).get("content_publication", {})
    publication_mode = publication.get("mode")
    if publication_mode not in CONTENT_PUBLICATION_MODES:
        errors.append(f"content_publication.mode 가 허용값이 아니다: {publication_mode!r}")
    if publication.get("excluded_review_statuses") != ["deleted"]:
        errors.append("콘텐츠 공개 제외 상태는 deleted 하나여야 한다")
    if publication.get("unknown_status_behavior") != "warn_and_include":
        errors.append("모르는 review_status 는 경고 후 포함해야 한다")
    builder_path = root / "app" / "scripts" / "build-content.py"
    if not builder_path.exists():
        errors.append("콘텐츠 공개 정책인데 build-content.py 가 없다")
    else:
        builder = builder_path.read_text(encoding="utf-8", errors="replace")
        if 'DROP_STATUS = {"deleted"}' not in builder:
            errors.append("콘텐츠 공개 정책과 build-content.py의 DROP_STATUS가 다르다")
        if "unknown.add(st)" not in builder or "warnings_status.append" not in builder:
            errors.append("build-content.py가 모르는 review_status를 경고 대상으로 수집하지 않는다")
        # **글자 대조는 여기까지다.** 나머지는 돌려서 본다 — 위 주석 참고
        errors.extend(check_publication_behavior(root))

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
    publication = contract["policies"]["content_publication"]
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
        (
            "| 원장 → 학생 JSON 공개 게이트 | "
            f"`{publication['mode']}` | 제외: "
            f"`{', '.join(publication['excluded_review_statuses'])}` · "
            "모르는 `review_status`: **경고 후 포함** · "
            f"범위: `{publication['scope']}` |"
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
