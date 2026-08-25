#!/usr/bin/env python3
"""연세글로벌한국어 본교재 PDF의 깨진 텍스트 추출을 복원한다.

문제: 본문 Rix* 폰트들의 /ToUnicode CMap이 불완전해 PyMuPDF get_text()가
      한글 대부분을 U+FFFD 또는 엉뚱한 코드포인트로 내놓는다(렌더링은 정상).
해결: get_texttrace()가 글리프 코드를 그대로 준다. 임베드 폰트가 CFF CIDFont이고
      ROS가 (Adobe, Korea1, N)이면 그 코드는 Adobe-Korea1 CID이므로
      poppler-data의 cidToUnicode/Adobe-Korea1 표로 정확히 되돌릴 수 있다.
      TrueType Type0(Identity)는 임베드 폰트의 cmap을 역인덱싱해 GID→유니코드를 만든다.

정상 추출된 글자는 건드리지 않고, U+FFFD 등 깨진 자리만 복원한다.
"""
import os, re, functools
from io import BytesIO
import fitz

import glob as _glob

BAD = "�"


@functools.lru_cache(maxsize=8)
def cid_table(ordering):
    """줄 번호 N(0-base) = Adobe-{ordering} CID N 의 유니코드."""
    pats = [
        f"/opt/homebrew/Cellar/poppler/*/share/poppler/cidToUnicode/Adobe-{ordering}",
        f"/opt/homebrew/share/poppler/cidToUnicode/Adobe-{ordering}",
        f"/usr/local/share/poppler/cidToUnicode/Adobe-{ordering}",
    ]
    for pat in pats:
        for p in sorted(_glob.glob(pat), reverse=True):
            out = []
            for line in open(p):
                h = line.strip()
                out.append(chr(int(h, 16)) if h and h != "0000" else None)
            return out
    # poppler-data가 없으면 복원 없이 원문 유지
    return []


def _is_broken(ch):
    """복원 대상 문자인가. U+FFFD와, 한글 자리에 튀어나온 미배정 영역 코드."""
    return ch == BAD or (0x0500 <= ord(ch) <= 0x1FFF) or (0xE000 <= ord(ch) <= 0xF8FF)


def _decoder_for(doc, fontname_to_xref, fontname, book=None, kind="main"):
    """폰트 이름 → (glyph_code -> 유니코드) 함수. 못 만들면 None."""
    xref = fontname_to_xref.get(fontname)
    if xref is None:
        return None
    try:
        _, ext, _, buf = doc.extract_font(xref)
    except Exception:
        return None
    if not buf:
        return None

    if buf[:4] == b"\x01\x00\x04\x02" or ext == "cid":
        try:
            from fontTools.cffLib import CFFFontSet
            cff = CFFFontSet()
            cff.decompile(BytesIO(buf), None)
            td = cff[cff.fontNames[0]]
            ros = getattr(td, "ROS", None)
            if ros and ros[0] == "Adobe" and ros[1] in ("Korea1", "Japan1", "GB1", "CNS1"):
                tbl = cid_table(ros[1])
                return lambda g: tbl[g] if 0 <= g < len(tbl) else None
        except Exception:
            return None
        return None

    try:
        from fontTools.ttLib import TTFont
        tt = TTFont(BytesIO(buf), fontNumber=0, lazy=True)
        order = tt.getGlyphOrder()
        gid_of = {n: i for i, n in enumerate(order)}
        g2u = {}
        for uni, gname in ((tt.getBestCmap() or {}) if "cmap" in tt else {}).items():
            g = gid_of.get(gname)
            if g is not None and g not in g2u:
                g2u[g] = chr(uni)
        if g2u:
            return lambda g: g2u.get(g)
        # cmap 없는 서브셋 + Ordering=Identity → 폰트 안에 단서가 없다.
        # 같은 서체가 박힌 3주완성 PDF에서 외곽선으로 만든 대응표를 쓴다.
        if book:
            from glyph_bridge import bridge_for
            br = bridge_for(book, fontname, kind)
            if br:
                return lambda g: br.get(g)
        # 서브셋이라 cmap이 없으면 글리프 이름(uniXXXX / cidXXXXX)에서 되살린다.
        by_name = {}
        for i, n in enumerate(order):
            mm = re.fullmatch(r"uni([0-9A-Fa-f]{4,6})", n)
            if mm:
                by_name[i] = chr(int(mm.group(1), 16))
        return (lambda g: by_name.get(g)) if by_name else None
    except Exception:
        return None


class GlobalPdf:
    """글로벌 교재 PDF 래퍼 — 텍스트 복원해서 내준다."""

    def __init__(self, path, book=None):
        self.doc = fitz.open(path)
        base = os.path.basename(path)
        m = re.search(r"연세글로벌한국어_([1-8])급", base)
        self.book = book if book is not None else (int(m.group(1)) if m else None)
        # 본교재와 부록은 같은 서체라도 서브셋이 달라 글리프 번호가 안 맞는다.
        # 브리지를 공유하면 조용히 틀린 글자가 나오므로 파일 종류를 구분한다.
        self.kind = "appendix" if "부록" in base else "main"
        self._font_xref = {}
        for pno in range(self.doc.page_count):
            for f in self.doc[pno].get_fonts(full=True):
                base = f[3].split("+")[-1]
                self._font_xref.setdefault(base, f[0])
        self._dec = {}

    def __len__(self):
        return self.doc.page_count

    def _decoder(self, fontname):
        if fontname not in self._dec:
            self._dec[fontname] = _decoder_for(
                self.doc, self._font_xref, fontname, self.book, self.kind)
        return self._dec[fontname]

    def spans(self, pno):
        """[(text, fitz.Rect, fontname)] — 1-base 페이지."""
        page = self.doc[pno - 1]
        out = []
        for sp in page.get_texttrace():
            chars = sp["chars"]
            if not chars:
                continue
            raw = "".join(chr(c[0]) for c in chars)
            if any(_is_broken(ch) for ch in raw):
                dec = self._decoder(sp["font"])
                if dec:
                    raw = "".join(
                        (dec(c[1]) or chr(c[0])) if _is_broken(chr(c[0])) else chr(c[0])
                        for c in chars
                    )
            xs = [c[3][0] for c in chars] + [c[3][2] for c in chars]
            ys = [c[3][1] for c in chars] + [c[3][3] for c in chars]
            out.append((raw, fitz.Rect(min(xs), min(ys), max(xs), max(ys)), sp["font"]))
        return out

    def chars(self, pno):
        """[(글자, fitz.Rect)] — 복원된 글자를 낱자 좌표와 함께.

        span 단위로는 '옆 칸 라벨'과 '그림 아래 낱말 상자'를 못 가른다.
        낱자 좌표가 있어야 그림 폭 안에 실제로 들어오는 글자만 골라낼 수 있다.
        """
        page = self.doc[pno - 1]
        out = []
        for sp in page.get_texttrace():
            chars = sp["chars"]
            if not chars:
                continue
            dec = None
            if any(_is_broken(chr(c[0])) for c in chars):
                dec = self._decoder(sp["font"])
            for c in chars:
                ch = chr(c[0])
                if dec and _is_broken(ch):
                    ch = dec(c[1]) or ch
                out.append((ch, fitz.Rect(c[3])))
        return out

    # 실측(1급~8급 어휘 페이지): 글자 내부 간격 ≈ 0.00, 어절 공백 ≈ 0.27,
    # 낱말 상자·표 칸 간격 ≈ 2.7 (글자폭 대비). 0.15에서 끊으면 어절이 갈린다.
    WORD_GAP = 0.15

    def tokens_in(self, pno, rect):
        """rect 안의 글자를 '어절' 단위로 묶어 [(문자열, Rect)]로."""
        hits = []
        for ch, r in self.chars(pno):
            if ch.isspace():
                continue
            cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
            if rect.x0 <= cx <= rect.x1 and rect.y0 <= cy <= rect.y1:
                hits.append((cy, r.x0, ch, r))
        if not hits:
            return []
        hits.sort(key=lambda t: (round(t[0] / 6), t[1]))
        toks, cur, curr = [], "", None
        prev = None
        for cy, x0, ch, r in hits:
            if prev is not None:
                gap = r.x0 - prev.x1
                newline = abs(cy - (prev.y0 + prev.y1) / 2) > 5
                if newline or gap > max(r.width, prev.width) * self.WORD_GAP:
                    toks.append((cur, curr))
                    cur, curr = "", None
            cur += ch
            curr = r if curr is None else (curr | r)
            prev = r
        if cur:
            toks.append((cur, curr))
        return toks

    def text(self, pno):
        return "\n".join(s[0] for s in self.spans(pno) if s[0].strip())

    def text_in(self, pno, rect):
        """rect와 겹치는 span들의 텍스트 (좌→우, 위→아래)."""
        hits = []
        for txt, r, _ in self.spans(pno):
            if not txt.strip():
                continue
            inter = fitz.Rect(r) & rect
            if inter.is_empty or r.get_area() <= 0:
                continue
            if inter.get_area() / r.get_area() > 0.5:
                hits.append((round(r.y0 / 6), r.x0, txt))
        hits.sort()
        return " ".join(h[2] for h in hits).strip()

    def page(self, pno):
        return self.doc[pno - 1]


if __name__ == "__main__":
    import sys
    g = GlobalPdf(sys.argv[1])
    for pno in [int(x) for x in sys.argv[2:]] or [46]:
        print(f"===== p{pno} =====")
        print(g.text(pno))
