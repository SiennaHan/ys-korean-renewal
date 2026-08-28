"""기관 발급 코드의 글자 규칙 — 만들기와 정규화.

**Crockford Base32 다.** 혼동 문자를 뺀 알파벳을 직접 만들지 않고 이것을 쓰는
이유는 문자를 뺐기 때문만이 아니라 **입력 정규화가 명세로 정해져 있기 때문**이다.
학생이 `O` 를 쳤을 때 `0` 으로 고칠지 거절할지를 우리가 판단하지 않아도 된다.

    O · o → 0        I · i · L · l → 1        나머지는 대문자로

`U` 가 빠진 것도 Crockford 의 이유 그대로다 — 우연히 욕설이 생기는 것을 막는다.
교수가 칠판에 적고 학교가 게시판에 붙이는 물건이라 실제로 문제가 된다.

길이 8 이면 32**8 ≈ 1.1e12 다. 시도 제한(IP 당 10분에 실패 10회)과 곱하면
아무 코드나 하나 맞히는 데 걸리는 시간이 실용적으로 무한하다. 유효 코드가
십만 장 규모로 커지면 그때 `CODE_LEN` 을 늘린다 — 값이 여기 한 곳에만 있다.

**체크문자를 넣지 않는다.** 공격자는 체크문자를 계산할 수 있으므로 무차별 대입
방어에 기여가 0 이고, 학생이 칠판에서 옮겨 적을 글자만 하나 늘어난다.
**학교 약자 접두어도 붙이지 않는다** — 엔트로피가 줄고 코드만 보고 어느 학교인지 샌다.
"""
import re
import secrets

# Crockford Base32 — I · L · O · U 가 없다
ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
CODE_LEN = 8

# 정규화 표. 키는 대문자로 올린 뒤에 본다
_CONFUSED = {"O": "0", "I": "1", "L": "1"}

_NOT_ALNUM = re.compile(r"[^0-9A-Za-z]")


def generateCode() -> str:
    """저장하는 꼴로 만든다 — 하이픈 없이 대문자 8자.

    `random` 이 아니라 `secrets` 다. 이 값이 유료 범위를 여는 열쇠라
    예측 가능한 난수를 쓰면 안 된다.
    """
    return "".join(secrets.choice(ALPHABET) for _ in range(CODE_LEN))


def normalizeCode(raw: str) -> str:
    """사람이 친 것을 저장된 꼴로 되돌린다.

    `abcd-efgh` · `ABCD EFGH` · `abcdefgh` 가 모두 같은 코드가 된다.
    혼동 문자를 고치므로 `0` 을 `O` 로 잘못 옮겨 적어도 통한다.

    **길이를 여기서 검사하지 않는다.** 짧거나 긴 값은 그대로 돌려보내고
    조회에서 못 찾는 것으로 끝난다 — 「형식이 틀렸다」와 「없는 코드다」를
    갈라 말하면 공격자에게 알파벳을 알려 주는 셈이 된다.
    """
    if not raw:
        return ""
    s = _NOT_ALNUM.sub("", str(raw)).upper()
    return "".join(_CONFUSED.get(c, c) for c in s)


def formatCode(code: str) -> str:
    """보여 주는 꼴 — `ABCD-EFGH`. 저장은 항상 하이픈 없이 한다."""
    c = (code or "").upper()
    if len(c) != CODE_LEN:
        return c
    half = CODE_LEN // 2
    return f"{c[:half]}-{c[half:]}"
