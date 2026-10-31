"""Deterministic Ridge fit on supplied normalized PTNK photographs.
Run: python3 -m pip install -r scripts/vision-requirements.txt
     python3 scripts/train_ecotray_vision.py               # features from Node jpeg-js (default)
     python3 scripts/train_ecotray_vision.py --features python   # NumPy port, no Node needed
Labels are supplied visual estimates, not weighed ground truth. Related views
share a group; leave-one-group-out validation never splits related views.
The two anchor photos (0% / 100%) are ordinary training points and are not
scored. Predictions are the raw Ridge output in percent, clipped to 0–100:
v3 rescaled outputs between the two anchors, which roughly doubled the error.
"""
import argparse
import json
import pathlib
import subprocess
import sys
import numpy as np
from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from ptnk_features import KEYS, extract_features, get_rois, warp_to_canonical  # noqa: E402

EMPTY = 'IMG_20261028_115429.jpg'
FULL = 'IMG_20261029_112146.jpg'
ALPHA = 0.15
MIN_IMAGES = 18
MODEL_VERSION = 'PTNK-Ridge-2026-10-31-v4'


def fit(x, y):
    penalty = np.eye(x.shape[1]) * ALPHA
    penalty[-1, -1] = 0
    return np.linalg.solve(x.T @ x + penalty, x.T @ y)


def predict(w, row):
    return float(np.clip(np.dot(w, row), 0, 100))


def label(catalog, key, i):
    return 100.0 if key == FULL else float(catalog[key]['y'][i])


def normalize_images(catalog):
    normalized = ROOT / 'public/ptnk-normalized'
    normalized.mkdir(exist_ok=True)
    for filename, meta in catalog.items():
        source = ROOT / 'public/ptnk-trays' / filename
        if not source.exists():
            raise FileNotFoundError(f'Thiếu ảnh nguồn: {source}')
        image = ImageOps.exif_transpose(Image.open(source)).convert('RGB')
        image = image.rotate(meta['rotation'], expand=True).resize((800, 600), Image.Resampling.LANCZOS)
        image.save(normalized / filename, quality=90)
    return normalized


def features_python(catalog, normalized):
    out = {}
    for filename, meta in catalog.items():
        rgb = np.asarray(Image.open(normalized / filename).convert('RGB'))
        if rgb.shape[:2] != (600, 800):
            raise ValueError(filename + ': expected normalized 800×600')
        if meta.get('trayCorners'):
            rgb = warp_to_canonical(rgb, meta['trayCorners'])
        rois = get_rois(meta['veg_pos'])
        out[filename] = {k: extract_features(rgb, rois[k]) for k in KEYS}
    return out


def features_node():
    return json.loads(subprocess.check_output(['node', 'scripts/extract-ptnk-features.mjs'], cwd=ROOT))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--features', choices=['node', 'python'], default='node')
    args = parser.parse_args()

    catalog = json.loads((ROOT / 'data/ptnk-trays.json').read_text())
    ids = list(catalog)
    if len(ids) < MIN_IMAGES or EMPTY not in catalog or FULL not in catalog:
        raise SystemExit(f'Cần ít nhất {MIN_IMAGES} ảnh và cả hai ảnh mốc {EMPTY}, {FULL}.')
    normalized = normalize_images(catalog)
    features = features_node() if args.features == 'node' else features_python(catalog, normalized)
    assert set(features) == set(ids), 'Đặc trưng không khớp danh mục ảnh.'

    scored = [k for k in ids if k not in (EMPTY, FULL)]
    groups = sorted({catalog[k]['group'] for k in scored})
    weights, errors, baseline, predictions = {}, {}, {}, {}
    for i, key in enumerate(KEYS):
        x = np.array([features[k][key] for k in ids])
        y = np.array([label(catalog, k, i) for k in ids])
        weights[key] = fit(x, y).tolist()
        residuals, base_residuals = [], []
        for group in groups:
            train = [j for j, k in enumerate(ids) if catalog[k]['group'] != group]
            held = [j for j, k in enumerate(ids) if catalog[k]['group'] == group]
            fold = fit(x[train], y[train])
            mean_label = float(np.mean([y[j] for j in train if ids[j] not in (EMPTY, FULL)]))
            for j in held:
                p = predict(fold, x[j])
                residuals.append(abs(p - y[j]))
                base_residuals.append(abs(mean_label - y[j]))
                predictions.setdefault(ids[j], {})[key] = round(p, 2)
        errors[key] = float(np.mean(residuals))
        baseline[key] = float(np.mean(base_residuals))

    overall = float(np.mean(list(errors.values())))
    artifact = {
        'modelVersion': MODEL_VERSION, 'realTraysCount': len(ids),
        'independentTrays': len(groups), 'alpha': ALPHA,
        'alignedImages': sum(1 for m in catalog.values() if m.get('trayCorners')),
        'labelSource': ' + '.join(sorted({m.get('labelSource', 'unknown') for m in catalog.values()})),
        'featureExtractor': args.features,
        'prediction': 'raw-ridge-percent-clipped-0-100',
        'validation': {'method': 'leave-one-related-view-group-out; two anchor photos stay in training and are not scored',
                       'groups': len(groups), 'scoredImages': len(scored),
                       'maeByComponent': errors, 'overallMAE': overall,
                       'baselineMeanLabelMAE': {**baseline, 'overall': float(np.mean(list(baseline.values())))},
                       'accuracyPct': None, 'heldOutPredictions': predictions},
        'featureOrder': ['non_metal_ratio', 'white_starch_ratio', 'solid_texture_ratio', 'mean_saturation', 'mean_texture', 'bias'],
        'weights': weights, 'features': features,
        'anchors': {'empty': EMPTY, 'full': FULL},
        'portionAssumptionsGrams': {'rice': 200, 'main': 110, 'veg': 90, 'soup': 150},
        'nutritionFloorDemoGrams': 85
    }
    (ROOT / 'src/lib/ecotrayModels.json').write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + '\n')
    print(f"{len(ids)} images ({len(groups)} independent trays scored, features={args.features}); "
          f"grouped validation MAE: {overall:.2f} pp vs mean-label baseline "
          f"{artifact['validation']['baselineMeanLabelMAE']['overall']:.2f} pp; no classification accuracy claimed.")


if __name__ == '__main__':
    main()
