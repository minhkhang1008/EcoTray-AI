"""NumPy port of lib/ptnk-features.mjs (getRois + extractFeatures).

Used by scripts/train_ecotray_vision.py when Node/jpeg-js is unavailable
(`--features python`). Pixel decoding uses Pillow instead of jpeg-js, so values
can differ from the Node extractor in the last decimals; the Node extractor
remains the default and the artifact records which one produced it.
Keep this file in sync with lib/ptnk-features.mjs.
"""
import numpy as np

KEYS = ['rice', 'main', 'veg', 'soup']


def get_rois(veg_pos='TR'):
    return {
        'rice': [0.37, 0.5, 0.94, 0.93],
        'main': [0.3, 0.06, 0.67, 0.46],
        'veg': [0.05, 0.06, 0.28, 0.46] if veg_pos == 'TL' else [0.69, 0.06, 0.94, 0.46],
        'soup': [0.04, 0.49, 0.34, 0.94],
    }


CANONICAL_TRAY_CORNERS = [[0.03, 0.05], [0.93, 0.05], [0.93, 0.96], [0.03, 0.96]]


def homography(src, dst):
    a, b = [], []
    for (x, y), (u, v) in zip(src, dst):
        a.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        a.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    return np.append(np.linalg.solve(np.array(a, float), np.array(b, float)), 1.0)


def valid_corners(corners):
    return (isinstance(corners, list) and len(corners) == 4 and
            all(isinstance(p, list) and len(p) == 2 and all(-0.1 <= v <= 1.1 for v in p) for p in corners))


def warp_to_canonical(rgb, corners):
    """Same mapping as warpToCanonical in lib/ptnk-features.mjs (nearest neighbour, black outside)."""
    if not valid_corners(corners):
        raise ValueError('Bốn góc khay không hợp lệ.')
    h, w, _ = rgb.shape
    H = homography(CANONICAL_TRAY_CORNERS, corners)
    u = (np.arange(w) + 0.5) / w
    v = (np.arange(h) + 0.5) / h
    U, V = np.meshgrid(u, v)
    d = H[6] * U + H[7] * V + H[8]
    sx = np.floor((H[0] * U + H[1] * V + H[2]) / d * w).astype(np.int64)
    sy = np.floor((H[3] * U + H[4] * V + H[5]) / d * h).astype(np.int64)
    ok = (sx >= 0) & (sy >= 0) & (sx < w) & (sy < h)
    out = np.zeros_like(rgb)
    out[ok] = rgb[sy[ok], sx[ok]]
    return out


def extract_features(rgb, box):
    """rgb: uint8 array HxWx3. Returns the 6-value vector in featureOrder."""
    h, w, _ = rgb.shape
    x1, y1, x2, y2 = (int(np.floor(v * (w if i % 2 == 0 else h))) for i, v in enumerate(box))
    a = rgb[y1:y2, x1:x2].astype(np.float64) / 255
    if a.size == 0:
        raise ValueError('Vùng khay rỗng.')
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    v = a.max(-1)
    sat = np.where(v == 0, 0, (v - a.min(-1)) / np.where(v == 0, 1, v))
    gray = 0.299 * r + 0.587 * g + 0.114 * b
    left = np.concatenate([gray[:, :1], gray[:, :-1]], 1)  # Math.max(x1, x-1)
    up = np.concatenate([gray[:1], gray[:-1]], 0)          # Math.max(y1, y-1)
    tex = np.abs(gray - left) + np.abs(gray - up)
    utensil = (v < 0.16) & (sat < 0.25)
    metal = (sat < 0.14) & (v >= 0.18) & (v < 0.78)
    return [
        float(np.mean(~metal & ~utensil)),
        float(np.mean((v >= 0.7) & (sat < 0.22) & ~utensil)),
        float(np.mean((sat >= 0.16) & (tex > 0.03) & ~utensil)),
        float(sat.mean()),
        float(tex.mean()),
        1.0,
    ]
