#!/usr/bin/env python3
"""부록에서 '듣기 지문' 구간을 잡는다.

신판 부록은 쪽 머리글에 절 이름이 찍힌다. 그 머리글이 있는 쪽을 모으면
간지·목차에 걸리지 않고 구간이 잡힌다(간지에는 절 목록 전체가 찍혀 오탐).
구판 부록도 같은 편집이라 같은 방법이 통한다.
"""
import re, sys
from global_text import GlobalPdf
import fitz

APX = "/Users/soohyeon/Documents/2608-yonsei_renewal/book"
OLD = "/Users/soohyeon/Documents/2606-yonsei3week_parse/work"
SECTIONS = ["번역", "문법 활용연습", "듣기 지문", "모범 답안", "색인"]


def head_of(t):
    """쪽 첫 줄(머리글)."""
    for line in t.split("\n"):
        s = line.strip()
        if s:
            return s
    return ""


def sections(pages_text):
    """{절이름: [쪽번호]} — 머리글이 절 이름 하나만인 쪽."""
    out = {}
    for p, t in pages_text.items():
        h = head_of(t)
        for s in SECTIONS:
            if h == s or h.replace(" ", "") == s.replace(" ", ""):
                out.setdefault(s, []).append(p)
    return out


def new_pages(b):
    gp = GlobalPdf(f"{APX}/(최종본)연세글로벌한국어_{b}급_부록-최종(26.8.10).pdf")
    return {p: gp.text(p) for p in range(1, len(gp) + 1)}, gp


def old_pages(b):
    d = fitz.open(f"{OLD}/book{b}/appendix.pdf")
    return {p + 1: d[p].get_text() for p in range(d.page_count)}, d


if __name__ == "__main__":
    for b in range(1, 9):
        npt, _ = new_pages(b)
        opt, _ = old_pages(b)
        ns, os_ = sections(npt), sections(opt)
        def fmt(s):
            v = s.get("듣기 지문", [])
            return f"{len(v):3d}쪽 (p{v[0]}~{v[-1]})" if v else "  0쪽"
        print(f"{b}급  신판 부록 {len(npt):3d}쪽 · 듣기 {fmt(ns)}   |   "
              f"구판 부록 {len(opt):3d}쪽 · 듣기 {fmt(os_)}")
        if b == 1:
            print("     신판 절 구성:", {k: len(v) for k, v in ns.items()})
            print("     구판 절 구성:", {k: len(v) for k, v in os_.items()})
