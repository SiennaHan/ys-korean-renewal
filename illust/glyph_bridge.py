#!/usr/bin/env python3
"""cmap도 CID 정보도 없는 서브셋 폰트의 글리프→문자 대응을 외곽선으로 복원한다.

문제: 글로벌 PDF의 RixSMjL 등 일부 폰트는
  - Encoding=Identity-H, CIDSystemInfo Ordering=Identity  → CID 표를 못 쓴다
  - TrueType 서브셋에 cmap 테이블이 없다               → 폰트 자체로도 못 쓴다
  - ToUnicode도 불완전                                → 결국 U+FFFD로 나온다

착안: 같은 서체(RixSMjL)가 3주완성 PDF에도 박혀 있고 그쪽은 텍스트가 깨끗하다.
서브셋이 달라 글리프 번호는 안 맞지만 **외곽선은 같은 서체라 동일**하다.
그래서 3주완성 쪽에서 (글리프 외곽선 → 문자)를 만들고, 글로벌 쪽 글리프의
외곽선을 그 표에 넣어 문자를 되찾는다.

빌려오는 것은 폰트의 문자표뿐이고 본문이 아니다. 신판에서 문장이 바뀐 자리도
글자 단위로 정확히 복원된다.
"""
import os, json, hashlib, functools
from io import BytesIO
import fitz

BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = f"{HERE}/glyph_bridge.json"
APPENDIX_CACHE = f"{HERE}/glyph_bridge_appendix.json"
APX_NEW = "/Users/soohyeon/Documents/2608-yonsei_renewal/book"
BAD = "�"


def outline_key(glyf, hmtx, name):
    """글리프 외곽선의 지문. 좌표·윤곽 끝점·플래그 + 폭."""
    try:
        g = glyf[name]
    except Exception:
        return None
    h = hashlib.md5()
    try:
        h.update(str(hmtx.metrics[name][0]).encode())
    except Exception:
        h.update(b"0")
    if getattr(g, "isComposite", lambda: False)():
        for c in g.components:
            h.update(f"{c.glyphName}|{getattr(c,'x',0)}|{getattr(c,'y',0)}".encode())
        h.update(b"COMPOSITE")
    else:
        if g.numberOfContours == 0:
            return None                      # 빈 글리프(공백)는 지문이 될 수 없다
        h.update(bytes(g.flags))
        h.update(str(list(g.coordinates)).encode())
        h.update(str(list(g.endPtsOfContours)).encode())
    return h.hexdigest()


def _load(path, want):
    """PDF에서 원하는 폰트들의 (버퍼, gid→문자) 수집."""
    from fontTools.ttLib import TTFont
    doc = fitz.open(path)
    bufs, obs = {}, {}
    for pno in range(doc.page_count):
        page = doc[pno]
        for f in page.get_fonts(full=True):
            nm = f[3].split("+")[-1]
            if nm in want and nm not in bufs:
                try:
                    _, ext, _, buf = doc.extract_font(f[0])
                    if buf[:4] == b"\x00\x01\x00\x00":
                        bufs[nm] = buf
                except Exception:
                    pass
        for sp in page.get_texttrace():
            nm = sp["font"]
            if nm not in want:
                continue
            d = obs.setdefault(nm, {})
            for c in sp["chars"]:
                ch = chr(c[0])
                if ch != BAD and not ch.isspace():
                    d.setdefault(c[1], ch)
    return bufs, obs


def build(book, fonts, kind="main"):
    """구판에서 (외곽선 → 문자)를 만들고, 신판 쪽 gid에 붙인다.

    본교재와 부록은 같은 서체를 쓰지만 **서브셋이 다르다**(전 급에서 확인).
    글리프 번호가 안 맞으므로 브리지를 공유하면 조용히 틀린 글자가 나온다.
    그래서 본교재용과 부록용을 따로 만든다.
    """
    from fontTools.ttLib import TTFont
    out = {}
    # 대응표는 글리프 **외곽선**으로 잇는다. 서브셋이 달라도 같은 서체면 통하므로
    # 원본을 한 파일로 제한할 이유가 없다. 부록 한 권만 쓰면 그 권에 안 나온 글자를
    # 못 배운다 — 2~5급 색인이 그래서 절반 넘게 깨졌다. 구판 본교재까지 합쳐 배운다.
    # 서체는 급을 가리지 않는다. 한 권에서 안 나온 글자도 다른 권에는 나오므로
    # 구판 16권(본교재 8 + 부록 8)을 통째로 원본으로 삼는다. 제 권을 앞에 두어
    # 같은 외곽선이면 제 권의 판단이 먼저 서게 한다(실측 충돌은 0건).
    own = ([f"{BASE}/{book}_yonsei3week_main.pdf", f"{BASE}/work/book{book}/appendix.pdf"]
           if kind == "main" else
           [f"{BASE}/work/book{book}/appendix.pdf", f"{BASE}/{book}_yonsei3week_main.pdf"])
    rest = [f"{BASE}/{i}_yonsei3week_main.pdf" for i in range(1, 9) if i != book] + \
           [f"{BASE}/work/book{i}/appendix.pdf" for i in range(1, 9) if i != book]
    old_pdfs = own + rest
    new_pdf = (f"{BASE}/(최종본)연세글로벌한국어_{book}급_본교재-최종(26.8.10).pdf"
               if kind == "main" else
               f"{APX_NEW}/(최종본)연세글로벌한국어_{book}급_부록-최종(26.8.10).pdf")
    legacy_bufs, legacy_obs = {}, {}
    for src in old_pdfs:
        if not os.path.exists(src):
            continue
        bufs, obs = _load(src, fonts)
        for nm, buf in bufs.items():
            legacy_bufs.setdefault(nm, []).append(buf)
        for nm, d in obs.items():
            legacy_obs.setdefault(nm, []).append(d)
    global_bufs, _ = _load(new_pdf, fonts)

    for nm in fonts:
        if nm not in legacy_bufs or nm not in global_bufs or nm not in legacy_obs:
            continue
        gt = TTFont(BytesIO(global_bufs[nm]), fontNumber=0)
        if "glyf" not in gt:
            continue
        gorder, gglyf, ghm = gt.getGlyphOrder(), gt["glyf"], gt["hmtx"]

        # 구판 여러 파일에서 배운 것을 합친다: 외곽선 → 문자
        by_outline = {}
        for buf, obs in zip(legacy_bufs[nm], legacy_obs[nm]):
            lt = TTFont(BytesIO(buf), fontNumber=0)
            if "glyf" not in lt:
                continue
            lorder, lglyf, lhm = lt.getGlyphOrder(), lt["glyf"], lt["hmtx"]
            for gid, ch in obs.items():
                if 0 <= gid < len(lorder):
                    k = outline_key(lglyf, lhm, lorder[gid])
                    if k:
                        by_outline.setdefault(k, ch)

        # 글로벌: gid → 외곽선 → 문자
        m = {}
        for gid, gname in enumerate(gorder):
            k = outline_key(gglyf, ghm, gname)
            if k and k in by_outline:
                m[gid] = by_outline[k]
        if m:
            out[nm] = m
    return out


@functools.lru_cache(maxsize=2)
def load_all(kind="main"):
    path = CACHE if kind == "main" else APPENDIX_CACHE
    if os.path.exists(path):
        raw = json.load(open(path))
        return {b: {f: {int(g): c for g, c in mm.items()} for f, mm in v.items()}
                for b, v in raw.items()}
    return {}


def bridge_for(book, fontname, kind="main"):
    return load_all(kind).get(str(book), {}).get(fontname)


if __name__ == "__main__":
    # 복원 실패가 몰린 폰트들 (Identity ordering + cmap 없는 서브셋)
    # 일본어(MS-PMincho)·중국어(KaiTi)도 서브셋 TrueType이라 같은 방법이 통한다.
    # 구판에서는 0% 깨짐으로 나오므로 원본으로 삼을 수 있다.
    FONTS = ["RixSMjL", "RixSMjB", "RixVitaM", "RixVitaB", "RixVitaL",
             "NanumMyeongjo", "RixSMjM", "RixGoPR", "RixMMjL",
             "MS-PMincho", "KaiTi", "NanumGothic", "RixMGoB", "RixSMjB-KSCms-UHC-H"]
    import sys
    kind = sys.argv[1] if len(sys.argv) > 1 else "main"
    allm = {}
    for b in range(1, 9):
        m = build(b, FONTS, kind)
        allm[str(b)] = m
        print(f"{b}급:", {k: len(v) for k, v in m.items()} or "복원할 폰트 없음")
    path = CACHE if kind == "main" else APPENDIX_CACHE
    json.dump(allm, open(path, "w"), ensure_ascii=False)
    print("->", path)
