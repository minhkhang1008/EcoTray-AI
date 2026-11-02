"""Bring new PTNK tray photos into the project (draft -> label in the editor -> merge -> retrain).

  1) python scripts/ingest_ptnk_photos.py <folder> [--date YYYY-MM-DD] [--combo "Tên thực đơn"]
       Copies the originals to public/ptnk-trays/, writes upright 800x600 previews to
       public/ptnk-normalized/ and a DRAFT at data/ptnk-intake.json. The live catalog
       (data/ptnk-trays.json) is not touched, so nothing unlabeled can reach the UI or the model.
  2) Label the draft in tools/label-editor.html ("Mở file JSON khác" -> data/ptnk-intake.json).
     SAVE it from the editor ("Lưu vào file…" and pick data/ptnk-intake.json, or "Tải file JSON đã sửa"
     and move the download to data/ptnk-intake.json). Edits live only in the browser until then.
  3) python scripts/ingest_ptnk_photos.py --merge [--combo "Tên thực đơn"]
       refuses while any photo still needsLabel; --combo fills only the photos that have no menu yet
  4) .venv/bin/python scripts/train_ecotray_vision.py     # retrain + new validation

  --fix NAME --rotation {0,90,-90,180}   redo one preview if it is the wrong way up (clears its corners)

Photos from the ESP32-CAM do NOT belong here (different layout, no hand labels): see docs/STATION-WEIGHED-DATA.md.
"""
import argparse
import collections
import datetime
import hashlib
import json
import pathlib
import re
import shutil
import sys

from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from train_ecotray_vision import normalize_image  # noqa: E402

DEFAULT_COMBO = 'Chưa gắn thực đơn'
ROTATIONS = (0, 90, -90, 180)
NAME = re.compile(r'^IMG_(\d{4})(\d{2})(\d{2})_\d{6}(?:_\d+)?\.jpe?g$', re.I)


def sha(path):
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()


def paths(root):
    return dict(catalog=root / 'data/ptnk-trays.json', intake=root / 'data/ptnk-intake.json',
                originals=root / 'public/ptnk-trays', normalized=root / 'public/ptnk-normalized')


def photo_date(path, override):
    if override:
        return override
    m = NAME.match(path.name)
    if m:
        return f'{m[1]}-{m[2]}-{m[3]}'
    exif = Image.open(path).getexif().get_ifd(0x8769).get(0x9003)  # DateTimeOriginal
    if exif:
        return datetime.datetime.strptime(exif, '%Y:%m:%d %H:%M:%S').strftime('%Y-%m-%d')
    raise SystemExit(f'{path.name}: không đọc được ngày chụp; thêm --date YYYY-MM-DD.')


def default_rotation(path):
    w, h = ImageOps.exif_transpose(Image.open(path)).size
    # portrait phone photos were mostly stored with -90 in the existing catalog; landscape with 0.
    return -90 if h > w else 0


def load(p):
    return json.loads(p.read_text()) if p.exists() else {}


def save(p, data):
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def ingest(args, P):
    catalog, intake = load(P['catalog']), load(P['intake'])
    sources = sorted(f for f in pathlib.Path(args.folder).iterdir() if f.suffix.lower() in ('.jpg', '.jpeg'))
    if not sources:
        raise SystemExit('Không thấy ảnh .jpg trong thư mục.')
    known = {sha(P['originals'] / k): k for k in [*catalog, *intake] if (P['originals'] / k).exists()}
    by_date = collections.defaultdict(collections.Counter)
    for m in catalog.values():
        by_date[m['date']][m['combo']] += 1
    P['originals'].mkdir(parents=True, exist_ok=True)
    P['normalized'].mkdir(parents=True, exist_ok=True)
    added, skipped = [], []
    for src in sources:
        digest = sha(src)
        if digest in known:
            skipped.append(f'{src.name} (trùng nội dung với {known[digest]})')
            continue
        name = src.name
        if name in catalog or name in intake or (P['originals'] / name).exists():
            raise SystemExit(f'{name}: trùng tên với ảnh khác nội dung; đổi tên rồi chạy lại.')
        date = photo_date(src, args.date)
        combo = args.combo or (by_date[date].most_common(1)[0][0] if by_date[date] else DEFAULT_COMBO)
        rotation = default_rotation(src)
        shutil.copy2(src, P['originals'] / name)
        normalize_image(P['originals'] / name, rotation, P['normalized'] / name)
        intake[name] = {
            'veg_pos': 'TR', 'y': [0, 0, 0, 0], 'combo': combo, 'group': name, 'date': date,
            'referenceOnly': False, 'labelSource': 'pending-intake', 'needsLabel': True,
            'rotation': rotation, 'soupBowl': 'present', 'flags': [], 'note': '',
            'comboConfidence': 'chưa xác nhận',
        }
        added.append(name)
    save(P['intake'], dict(sorted(intake.items())))
    print(f'Đã thêm {len(added)} ảnh vào bản nháp {P["intake"].name}; bỏ qua {len(skipped)}.')
    for s in skipped:
        print('  bỏ qua:', s)
    unknown = [n for n in added if intake[n]['combo'] == DEFAULT_COMBO]
    if unknown:
        print(f'  {len(unknown)} ảnh chưa có thực đơn (ngày chưa có trong danh mục): gõ ở ô "Thực đơn" trong editor hoặc chạy lại với --combo.')
    print('Bước tiếp: mở tools/label-editor.html (python3 -m http.server 8000), "Mở file JSON khác" -> data/ptnk-intake.json.')


def fix(args, P):
    intake = load(P['intake'])
    if args.fix not in intake:
        raise SystemExit(f'{args.fix} không có trong bản nháp (chỉ sửa được ảnh chưa merge).')
    if args.rotation is None:
        raise SystemExit('Thiếu --rotation {0,90,-90,180}.')
    normalize_image(P['originals'] / args.fix, args.rotation, P['normalized'] / args.fix)
    intake[args.fix]['rotation'] = args.rotation
    intake[args.fix].pop('trayCorners', None)  # corners were marked on the old orientation
    save(P['intake'], intake)
    print(f'{args.fix}: đã xoay {args.rotation}°, xóa 4 góc khay (cần đánh dấu lại). Tải lại editor.')


def validate(name, m, originals, normalized):
    errors = []
    if m.get('needsLabel'):
        errors.append('chưa gán nhãn')
    y = m.get('y')
    if not (isinstance(y, list) and len(y) == 4 and all(isinstance(v, (int, float)) and 0 <= v <= 100 for v in y)):
        errors.append('y phải gồm 4 số 0–100')
    if m.get('veg_pos') not in ('TL', 'TR'):
        errors.append('veg_pos phải là TL hoặc TR')
    if m.get('rotation') not in ROTATIONS:
        errors.append('rotation không hợp lệ')
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', str(m.get('date', ''))):
        errors.append('date không hợp lệ')
    if not str(m.get('combo', '')).strip() or m.get('combo') == DEFAULT_COMBO:
        errors.append('chưa có thực đơn')
    if m.get('labelSource') == 'pending-intake':
        errors.append('labelSource vẫn là pending-intake')
    for label, base in (('ảnh gốc', originals), ('ảnh chuẩn hóa', normalized)):
        if not (base / name).exists():
            errors.append(f'thiếu {label}')
    return errors


def merge(args, P):
    catalog, intake = load(P['catalog']), load(P['intake'])
    if not intake:
        raise SystemExit('Không có bản nháp data/ptnk-intake.json để merge.')
    if args.combo:
        for m in intake.values():
            if not str(m.get('combo', '')).strip() or m.get('combo') == DEFAULT_COMBO:
                m['combo'] = args.combo.strip()
    bad = {n: e for n, m in intake.items() if (e := validate(n, m, P['originals'], P['normalized']))}
    if bad:
        for n, e in bad.items():
            print(f'  {n}: {"; ".join(e)}')
        untouched = sum(m.get('needsLabel') or m.get('labelSource') == 'pending-intake' for m in intake.values())
        if untouched == len(intake):
            print('\nCả bản nháp vẫn nguyên trạng ban đầu: có vẻ các chỉnh sửa trong editor CHƯA được lưu ra file.\n'
                  'Trong editor bấm "Lưu vào file…" và chọn data/ptnk-intake.json, hoặc "Tải file JSON đã sửa" rồi chép file tải về đè lên data/ptnk-intake.json.')
        raise SystemExit(f'Chưa merge: {len(bad)}/{len(intake)} ảnh chưa đạt. Sửa trong editor, lưu file, rồi chạy lại.')
    clash = [n for n in intake if n in catalog]
    if clash:
        raise SystemExit(f'Trùng tên trong danh mục: {clash[:3]}')
    groups = {m['group'] for m in catalog.values()}
    for n, m in intake.items():
        if m['group'] not in groups and m['group'] not in intake:
            raise SystemExit(f'{n}: nhóm {m["group"]} không tồn tại.')
    catalog.update({n: {k: v for k, v in m.items() if k != 'needsLabel'} for n, m in intake.items()})
    save(P['catalog'], dict(sorted(catalog.items())))
    P['intake'].unlink()
    print(f'Đã merge {len(intake)} ảnh. Danh mục có {len(catalog)} ảnh, {len({m["group"] for m in catalog.values()})} nhóm.')
    print('Bước tiếp: .venv/bin/python scripts/train_ecotray_vision.py && npm test && npm run build')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('folder', nargs='?')
    ap.add_argument('--date')
    ap.add_argument('--combo')
    ap.add_argument('--merge', action='store_true')
    ap.add_argument('--fix')
    ap.add_argument('--rotation', type=int, choices=ROTATIONS)
    ap.add_argument('--root', default=str(ROOT), help=argparse.SUPPRESS)
    args = ap.parse_args()
    P = paths(pathlib.Path(args.root))
    if args.date and not re.match(r'^\d{4}-\d{2}-\d{2}$', args.date):
        raise SystemExit('--date phải có dạng YYYY-MM-DD.')
    if args.merge:
        merge(args, P)
    elif args.fix:
        fix(args, P)
    elif args.folder:
        ingest(args, P)
    else:
        ap.print_help()


if __name__ == '__main__':
    main()
