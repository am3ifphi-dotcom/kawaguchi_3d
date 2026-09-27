#!/usr/bin/env python3
"""PDFのベクター図形（CAD図面）を純PythonでPNG化する簡易レンダラ。

標準ライブラリのみ使用。目的: 市公開の実施設計図PDFの線画を
環境(Ghostscript等なし)で可視化し、図面を直接読み取れるようにすること。

対応: m/l/c/v/y/re/h パス / q Q cm / XObject Do(入れ子) / FlateDecode /
Content配列 / MediaBox継承 / ObjStm(基本形)。
制限: 文字は描かない(線画のみ)。画像XObjectは無視。曲線は直線近似。

使い方: python3 tools/pdf_render.py <pdf> <page(1始まり)> [scale]
出力: refs/city_pdf/_render_<name>_p<page>.png
"""
import re, sys, zlib, os
from fractions import Fraction  # (未使用だが整数演算の保険として)


def load_objects(data: bytes):
    """obj番号 -> (dict_bytes, stream_bytes or None)"""
    objs = {}
    for m in re.finditer(rb'(\d+)\s+(\d+)\s+obj\b', data):
        num = int(m.group(1))
        start = m.end()
        # endobj を探す（stream内に "endobj" バイト列が来る事故を避けるため簡易に最短一致）
        e = data.find(b'endobj', start)
        if e < 0:
            continue
        body = data[start:e]
        sm = re.search(rb'(<<.*?>>)\s*stream\r?\n?', body, re.S)
        if sm:
            dictb = sm.group(1)
            s0 = sm.end()
            s1 = body.find(b'endstream', s0)
            raw = body[s0:s1].rstrip(b'\r\n')
            objs[num] = (dictb, raw)
        else:
            objs[num] = (body, None)
    return objs


def inflate(raw: bytes, dictb: bytes):
    try:
        if b'/FlateDecode' in dictb:
            return zlib.decompress(raw)
    except Exception:
        # 先頭/末尾のゴミを許容して再試行
        for off in range(3):
            try:
                return zlib.decompress(raw[off:])
            except Exception:
                pass
    return raw


def expand_objstm(objs):
    """ObjStm(圧縮オブジェクト群)を展開して objs に戻す。"""
    for num, (dictb, raw) in list(objs.items()):
        if dictb and b'/ObjStm' in dictb and raw:
            d = inflate(raw, dictb)
            mn = re.search(rb'/N\s*(\d+)', dictb)
            mf = re.search(rb'/First\s*(\d+)', dictb)
            if not (mn and mf):
                continue
            n, first = int(mn.group(1)), int(mf.group(1))
            head = d[:first].split()
            for i in range(0, min(len(head) - 1, n * 2), 2):
                onum, off = int(head[i]), int(head[i + 1])
                nxt = int(head[i + 3]) if i + 3 < len(head) else len(d) - first
                objs[onum] = (d[first + off:first + nxt], None)
    return objs


def find_pages(objs):
    """ページ(単体)オブジェクトを /Kids 木の順で列挙。"""
    catalog = None
    for num, (dictb, raw) in objs.items():
        if dictb and b'/Type /Catalog' in dictb:
            m = re.search(rb'/Pages\s*(\d+)\s+0\s+R', dictb)
            if m:
                catalog = int(m.group(1))
                break
    order = []

    def walk(num):
        dictb, _ = objs.get(num, (b'', None))
        if re.search(rb'/Type\s*/\s*Page\b', dictb) and not re.search(rb'/Type\s*/\s*Pages\b', dictb):
            order.append(num)
            return
        mk = re.search(rb'/Kids\s*\[(.*?)\]', dictb, re.S)
        if mk:
            for km in re.finditer(rb'(\d+)\s+0\s+R', mk.group(1)):
                walk(int(km.group(1)))

    if catalog is not None:
        walk(catalog)
    else:  # fallback: 直接拾う
        for num, (dictb, raw) in objs.items():
            if dictb and re.search(rb'/Type\s*/\s*Page\b', dictb) and not re.search(rb'/Type\s*/\s*Pages\b', dictb):
                order.append(num)
    return order


def get_page_attrs(num, objs):
    """MediaBox / Resources / Contents を親から継承解決。"""
    chain = [num]
    cur = num
    for _ in range(4):
        mp = re.search(rb'/Parent\s*(\d+)\s+0\s+R', objs.get(cur, (b'', None))[0])
        if not mp:
            break
        cur = int(mp.group(1))
        chain.append(cur)
    mediabox = res = contents = None
    for cnum in chain:
        dictb, _ = objs.get(cnum, (b'', None))
        if mediabox is None:
            mm = re.search(rb'/MediaBox\s*\[([^\]]+)\]', dictb)
            if mm:
                mediabox = [float(x) for x in mm.group(1).split()[:4]]
        if res is None:
            mr = re.search(rb'/Resources\s*(\d+)\s+0\s+R', dictb)
            if mr:
                res = objs.get(int(mr.group(1)), (b'', None))[0]
            elif b'/Resources' in dictb:
                mr2 = re.search(rb'/Resources\s*(<<.*?>>)', dictb[dictb.find(b'/Resources'):], re.S)
                if mr2:
                    res = mr2.group(1)
        if contents is None and cnum == num:
            mc = re.search(rb'/Contents\s*(\d+)\s+0\s+R', dictb)
            if mc:
                contents = [int(mc.group(1))]
            else:
                ma = re.search(rb'/Contents\s*\[(.*?)\]', dictb, re.S)
                if ma:
                    contents = [int(x) for x in re.findall(rb'(\d+)\s+0\s+R', ma.group(1))]
    return mediabox, res, contents or []


def mat_mult(m1, m2):
    a1, b1, c1, d1, e1, f1 = m1
    a2, b2, c2, d2, e2, f2 = m2
    return [a1 * a2 + b1 * c2, a1 * b2 + b1 * d2,
            c1 * a2 + d1 * c2, c1 * b2 + d1 * d2,
            e1 * a2 + f1 * c2 + e2, e1 * b2 + f1 * d2 + f2]


TOKEN = re.compile(rb'/[A-Za-z0-9_.#]+|[-+]?(?:\d*\.\d+|\d+)|[A-Za-z*\'"]+|\[|\]')


def parse_stream(data: bytes, ctm, xobjects, objs, segs, depth=0):
    """コンテンツストリームを走査して線分 [(x0,y0,x1,y1)]（ユーザ空間→CTM変換前）を収集。"""
    if depth > 3:
        return
    # フォントの具象: 16進文字列<...>・リテラル(...)を無害な[]に潰す
    # (hex中の数字/A-F文字が偽の数値・演算子化してCTMや座標を壊す事故の防止)
    data = re.sub(rb'(?<!<)<[0-9A-Fa-f\s]*>(?!>)', b'[]', data)
    data = re.sub(rb'\((?:[^()\\]|\\.)*\)', b'[]', data)
    data = re.sub(rb'BT.*?ET', b' ', data, flags=re.S)
    stack = []
    cur = None  # current point (user space)
    gs = [list(ctm)]

    def xform(p):
        a, b, c, d, e, f = gs[-1]
        return (a * p[0] + c * p[1] + e, b * p[1] + d * p[0] + f)

    for t in TOKEN.findall(data):
        if re.match(rb'^[-+0-9.]', t) or t.startswith(b'/'):
            stack.append(t)
            continue
        op = t
        nums = []
        while stack and not stack[-1].startswith(b'/'):
            s = stack.pop()
            if s not in (b'[', b']'):
                nums.append(float(s))
        name = stack.pop() if stack and stack[-1].startswith(b'/') else None
        nums.reverse()
        try:
            if op == b'q':
                gs.append(list(gs[-1]))
            elif op == b'Q':
                if len(gs) > 1:
                    gs.pop()
            elif op == b'cm' and len(nums) == 6:
                gs[-1] = mat_mult(nums, gs[-1])
            elif op == b'm' and len(nums) == 2:
                cur = (nums[0], nums[1])
            elif op == b'l' and len(nums) == 2 and cur is not None:
                p0, p1 = xform(cur), xform((nums[0], nums[1]))
                segs.append((p0[0], p0[1], p1[0], p1[1]))
                cur = (nums[0], nums[1])
            elif op == b're' and len(nums) == 4:
                x, y, w, h = nums
                pts = [(x, y), (x + w, y), (x + w, y + h), (x, y + h), (x, y)]
                for i in range(4):
                    p0, p1 = xform(pts[i]), xform(pts[i + 1])
                    segs.append((p0[0], p0[1], p1[0], p1[1]))
                cur = (x, y)
            elif op in (b'c', b'v', b'y') and cur is not None:
                # 曲線は両端を結ぶ直線で近似（800%ズームでの微細線は潰れて良い）
                end = (nums[-2], nums[-1]) if len(nums) >= 4 else cur
                p0, p1 = xform(cur), xform(end)
                segs.append((p0[0], p0[1], p1[0], p1[1]))
                cur = end
            elif op == b'Do' and name is not None and xobjects:
                key = name.decode('latin1')
                if key in xobjects:
                    ref, mtx = xobjects[key]
                    dictb, raw = objs.get(ref, (b'', None))
                    if raw:
                        if b'/Subtype' in dictb and b'/Image' in dictb:
                            continue
                        mm = re.search(rb'/Matrix\s*\[([^\]]+)\]', dictb)
                        m2 = [float(x) for x in mm.group(1).split()] if mm else [1, 0, 0, 1, 0, 0]
                        xo = parse_xobjects(dictb, objs)
                        saved = gs[-1]
                        gs[-1] = mat_mult(m2, gs[-1])
                        parse_stream(inflate(raw, dictb), gs[-1], xo or xobjects,
                                     objs, segs, depth + 1)
                        gs[-1] = saved
        except Exception:
            pass


def parse_xobjects(resdict: bytes, objs):
    xo = {}
    if not resdict:
        return xo
    mx = resdict.find(b'/XObject')
    if mx < 0:
        return xo
    blk = resdict[mx:mx + 4000]
    md = re.search(rb'<<(.*?)>>', blk, re.S)
    target = blk
    if md:
        target = md.group(1)
        if b'0 R' not in target:  # 間接の /XObject 12 0 R 形式
            mr = re.match(rb'\s*(\d+)\s+0\s+R', blk[len(b'/XObject'):].strip())
    mr = re.search(rb'/XObject\s*(\d+)\s+0\s+R', resdict)
    if mr:
        target = objs.get(int(mr.group(1)), (b'', None))[0]
    for m in re.finditer(rb'/([A-Za-z0-9_.#]+)\s+(\d+)\s+0\s+R', target):
        xo[m.group(1).decode('latin1')] = (int(m.group(2)), None)
    return xo


def render(segs, mediabox, scale=3.0, min_side=1600):
    if not segs:
        return None
    xs = [s[0] for s in segs] + [s[2] for s in segs]
    ys = [s[1] for s in segs] + [s[3] for s in segs]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    w0, h0 = max(x1 - x0, 1e-6), max(y1 - y0, 1e-6)
    if mediabox:  # 図形域より大きい用紙枠に合わせる
        mw = mediabox[2] - mediabox[0]
        mh = mediabox[3] - mediabox[1]
        if mw > 0 and mh > 0:
            x0 = min(x0, mediabox[0]); x1 = max(x1, mediabox[2])
            y0 = min(y0, mediabox[1]); y1 = max(y1, mediabox[3])
    wpt, hpt = x1 - x0, y1 - y0
    s = max(min_side / wpt, min_side / hpt) * scale
    W, H = min(int(wpt * s) + 8, 8000), min(int(hpt * s) + 8, 8000)
    buf = bytearray([255]) * (W * H)

    def plot(x, y):
        if 0 <= x < W and 0 <= y < H:
            buf[y * W + x] = 0

    for x0s, y0s, x1s, y1s in segs:
        X0 = int((x0s - x0) * s + 4); Y0 = H - int((y0s - y0) * s + 4)
        X1 = int((x1s - x0) * s + 4); Y1 = H - int((y1s - y0) * s + 4)
        dx, dy = abs(X1 - X0), -abs(Y1 - Y0)
        sx = 1 if X0 < X1 else -1
        sy = 1 if Y0 < Y1 else -1
        err = dx + dy
        x, y = X0, Y0
        for _ in range(200000):
            plot(x, y)
            if x == X1 and y == Y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy; x += sx
            if e2 <= dx:
                err += dx; y += sy
    return W, H, bytes(buf)


def write_png(path, W, H, gray):
    def chunk(tag, payload):
        c = tag + payload
        return len(payload).to_bytes(4, 'big') + c + zlib.crc32(c).to_bytes(4, 'big')
    raw = b''.join(b'\x00' + gray[y * W:(y + 1) * W] for y in range(H))
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', W.to_bytes(4, 'big') + H.to_bytes(4, 'big') + b'\x08\x00\x00\x00\x00')
           + chunk(b'IDAT', zlib.compress(raw, 6))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)


def main():
    pdf, page, scale = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    data = open(pdf, 'rb').read()
    objs = expand_objstm(load_objects(data))
    pages = find_pages(objs)
    print(f'pages: {len(pages)}')
    num = pages[page - 1]
    mediabox, res, contents = get_page_attrs(num, objs)
    xo = parse_xobjects(res, objs)
    segs = []
    for cref in contents:
        dictb, raw = objs.get(cref, (b'', None))
        if raw:
            parse_stream(inflate(raw, dictb), [1, 0, 0, 1, 0, 0], xo, objs, segs)
    print(f'content streams: {len(contents)}, xobjects: {len(xo)}, segments: {len(segs)}')
    out = render(segs, mediabox, scale)
    if not out:
        print('NO SEGMENTS')
        return
    W, H, buf = out
    stem = os.path.basename(pdf).rsplit('.', 1)[0]
    path = f'refs/city_pdf/_render_{stem}_p{page:02d}.png'
    write_png(path, W, H, buf)
    print(f'-> {path} ({W}x{H})')


if __name__ == '__main__':
    main()
