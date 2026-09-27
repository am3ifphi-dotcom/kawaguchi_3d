#!/usr/bin/env python3
"""実施設計PDF内の画像XObjectを全抽出する（純Python・Ghostscript不要）。

- DCTDecode → .jpg としてそのまま保存（劣化なし）
- FlateDecode → Predictor(1/2/PNG10-15)対応でデコードし .png 保存
  (DeviceRGB=3ch / DeviceGray=1ch、1:800図面帯は1chが多い)
- --invert で白黒反転コピー(黒地原稿用)も生成
出力: <outdir>/<objnum>.jpg|.png
使い方: python3 tools/pdf_extract_images.py refs/city_pdf/27901siryou.pdf \
        --out refs/city_pdf/_img [--invert 127] [--minwh 100 30]
"""
import re, sys, zlib, os

def chunk(t, p):
    c = t + p
    return len(p).to_bytes(4, 'big') + c + zlib.crc32(c).to_bytes(4, 'big')

def save_png(path, W, H, ctype, rows):
    raw = b''.join(bytes([0]) + r for r in rows)
    open(path, 'wb').write(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', W.to_bytes(4, 'big') + H.to_bytes(4, 'big')
                + b'\x08' + bytes([ctype]) + b'\x00\x00\x00')
        + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b''))

def main():
    pdf = sys.argv[1]
    out = 'refs/city_pdf/_img'
    invert_ids, minw, minh = set(), 60, 25
    args = sys.argv[2:]
    if '--out' in args:
        out = args[args.index('--out') + 1]
    if '--invert' in args:
        invert_ids = {int(x) for x in args[args.index('--invert') + 1].split(',')}
    if '--minwh' in args:
        i = args.index('--minwh'); minw, minh = int(args[i + 1]), int(args[i + 2])
    os.makedirs(out, exist_ok=True)
    data = open(pdf, 'rb').read()
    objs = {}
    for m in re.finditer(rb'(\d+)\s+0\s+obj(.*?)endobj', data, re.S):
        objs[int(m.group(1))] = m.group(2)
    n = 0
    for num, body in obj.items() if False else objs.items():
        if b'/Subtype' not in body or b'/Image' not in body:
            continue
        d = body[:body.find(b'stream')]
        mw, mh = re.search(rb'/Width\s*(\d+)', d), re.search(rb'/Height\s*(\d+)', d)
        if not (mw and mh):
            continue
        W, H = int(mw.group(1)), int(mh.group(1))
        if W < minw or H < minh:
            continue
        s0 = body.find(b'stream') + 6
        while body[s0] in b'\r\n ':
            s0 += 1
        s1 = body.find(b'endstream', s0)
        raw_body = body[s0:s1].rstrip(b'\r\n')
        filt = re.search(rb'/Filter\s*/?\s*([A-Za-z]+)', d)
        filt = filt.group(1) if filt else b'?'
        if filt == b'DCTDecode':
            with open(f'{out}/{num:04d}.jpg', 'wb') as f:
                f.write(raw_body)
            n += 1
        elif filt == b'FlateDecode':
            try:
                raw = zlib.decompress(raw_body)
            except Exception:
                continue
            cs = re.search(rb'/ColorSpace\s*/?\s*([A-Za-z]+)', d)
            mp = re.search(rb'/Predictor\s*(\d+)', d)
            pred = int(mp.group(1)) if mp else 1
            nc = 3 if (cs and cs.group(1) == b'DeviceRGB') else 1
            stride = W * nc
            rows, off, prev = [], 0, bytearray(stride)
            ok = True
            for y in range(H):
                try:
                    if pred >= 10:
                        f = raw[off]; off += 1
                        row = bytearray(raw[off:off + stride]); off += stride
                        for x in range(stride):
                            a = row[x - nc] if x >= nc else 0
                            b = prev[x]; c = prev[x - nc] if x >= nc else 0
                            if f == 1: row[x] = (row[x] + a) & 0xFF
                            elif f == 2: row[x] = (row[x] + b) & 0xFF
                            elif f == 3: row[x] = (row[x] + ((a + b) // 2)) & 0xFF
                            elif f == 4:
                                p = a + b - c
                                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                                row[x] = (row[x] + pr) & 0xFF
                        prev = row
                    elif pred == 2:
                        row = bytearray(raw[off:off + stride]); off += stride
                        for i in range(stride):
                            row[i] = (row[i] + prev[i]) & 0xFF
                        prev = row
                    else:
                        row = bytearray(raw[off:off + stride]); off += stride
                    rows.append(bytes(row))
                except Exception:
                    ok = False
                    break
            if not ok:
                continue
            save_png(f'{out}/{num:04d}_{W}x{H}.png', W, H, 2 if nc == 3 else 0, rows)
            n += 1
            if num in invert_ids:
                inv = [bytes(255 - v for v in r) for r in rows]
                save_png(f'{out}/{num:04d}_{W}x{H}_inv.png', W, H, 2 if nc == 3 else 0, inv)
    print(f'extracted: {n} images -> {out}')

if __name__ == '__main__':
    main()
