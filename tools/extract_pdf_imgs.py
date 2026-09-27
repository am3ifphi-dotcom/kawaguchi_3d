#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
extract_pdf_imgs.py — refs系PDFから埋め込みJPEG(DCTDecode)を純Pythonで全抽出する復旧ツール
背景: refs/ならびに/tmp, /home/user直下は周期的に揮発するため、抽出先を問わず即時再生成する。
使い方:
    python3 tools/extract_pdf_imgs.py [--out DIR] [--pdf GITOBJ ...]
既定: --out /home/user/pdf_imgs, --pdf 27901siryou.pdf P02.pdf (origin/main から読む)
外部依存なし(numpy/PIL/poppler不要)。
"""
import os, struct, subprocess, argparse, sys

def jpg_size(b):
    i = 2
    while i < len(b) - 9:
        if b[i] != 0xFF:
            i += 1; continue
        m = b[i + 1]
        if m in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack('>HH', b[i + 5:i + 9]); return w, h
        ln = struct.unpack('>H', b[i + 2:i + 4])[0]
        i += 2 + ln
    return None

def extract(pdf_bytes):
    out, pos = [], 0
    while True:
        s = pdf_bytes.find(b'stream', pos)
        if s < 0: break
        e = pdf_bytes.find(b'endstream', s)
        if e < 0: break
        hdr = pdf_bytes[max(0, s - 600):s]
        body = pdf_bytes[s + 6:e]
        if body[:2] == b'\r\n': body = body[2:]
        elif body[:1] == b'\n': body = body[1:]
        pos = e + 9
        if b'DCTDecode' in hdr and body[:2] == b'\xff\xd8':
            out.append(body.rstrip(b'\r\n'))
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='/home/user/pdf_imgs')
    ap.add_argument('--pdf', nargs='*', default=['27901siryou.pdf', 'P02.pdf'])
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    total = 0
    idx_lines = []
    for pi, name in enumerate(args.pdf):
        try:
            data = subprocess.run(['git', 'show', f'origin/main:{name}'],
                                  capture_output=True, check=True).stdout
        except subprocess.CalledProcessError:
            # ローカルワーキングツリーに直接ある場合
            if os.path.exists(name):
                data = open(name, 'rb').read()
            else:
                print(f'skip: {name} が見つかりません', file=sys.stderr); continue
        imgs = extract(data)
        stem = '' if pi == 0 else f'p{pi+1}_'
        for n, body in enumerate(imgs):
            w, h = jpg_size(body) or (0, 0)
            fn = f'{stem}{n:04d}_{w}x{h}.jpg'
            open(os.path.join(args.out, fn), 'wb').write(body)
            idx_lines.append(f'{fn} {len(body)}')
            total += 1
        print(f'{name}: {len(imgs)}枚')
    idx_lines.sort(key=lambda l: -int(l.rsplit(' ', 1)[1]))
    open(os.path.join(args.out, 'index.txt'), 'w').write('\n'.join(idx_lines))
    print(f'合計 {total}枚 -> {args.out} (index.txt更新)')

if __name__ == '__main__':
    main()
