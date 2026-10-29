"""Deterministic Ridge fit on supplied normalized PTNK photographs.
Run: python3 -m pip install -r scripts/vision-requirements.txt
     python3 scripts/train_ecotray_vision.py
Labels are supplied visual estimates, not weighed ground truth. Related views
share a group; leave-one-group-out validation never splits related views.
Two designated calibration anchors stay in training and are not scored.
"""
import json
import pathlib
import subprocess
import numpy as np
from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEYS = ['rice', 'main', 'veg', 'soup']
EMPTY = 'IMG_20261028_115429.jpg'
FULL = 'IMG_20261029_112146.jpg'
ALPHA = 0.15

def fit(x, y):
    penalty = np.eye(6) * ALPHA
    penalty[-1, -1] = 0
    return np.linalg.solve(x.T @ x + penalty, x.T @ y)

def main():
    catalog = json.loads((ROOT / 'data/ptnk-trays.json').read_text())
    normalized = ROOT/'public/ptnk-normalized'
    normalized.mkdir(exist_ok=True)
    for filename, meta in catalog.items():
        image = ImageOps.exif_transpose(Image.open(ROOT/'public/ptnk-trays'/filename)).convert('RGB')
        image = image.rotate(meta['rotation'], expand=True).resize((800,600),Image.Resampling.LANCZOS)
        image.save(normalized/filename,quality=90)
    features = json.loads(subprocess.check_output(['node', 'scripts/extract-ptnk-features.mjs'], cwd=ROOT))
    ids = list(catalog)
    assert len(ids) == len(features) == 18
    groups = sorted({m['group'] for k, m in catalog.items() if k not in (EMPTY, FULL)})
    weights, errors, predictions = {}, {}, {}
    for i, key in enumerate(KEYS):
        x = np.array([features[k][key] for k in ids])
        y = np.array([100 if k == FULL else catalog[k]['y'][i] for k in ids])
        w = fit(x, y)
        weights[key] = w.tolist()
        def predict(w, row):
            lo = np.dot(w, features[EMPTY][key])
            hi = np.dot(w, features[FULL][key])
            if hi - lo <= 1e-6:
                raise ValueError(f'Invalid calibration anchors: {key}')
            return float(np.clip((np.dot(w, row) - lo) / (hi - lo) * 100, 0, 100))
        residuals = []
        for group in groups:
            train = [j for j, k in enumerate(ids) if catalog[k]['group'] != group]
            held = [j for j, k in enumerate(ids) if catalog[k]['group'] == group]
            fold = fit(x[train], y[train])
            for j in held:
                p = predict(fold, x[j])
                residuals.append(abs(p - y[j]))
                predictions.setdefault(ids[j], {})[key] = p
        errors[key] = float(np.mean(residuals))
    artifact = {
        'modelVersion': 'PTNK-Ridge-2026-10-29-v3', 'realTraysCount': len(ids),
        'alpha': ALPHA, 'labelSource': 'supplied-visual-estimate',
        'validation': {'method': 'leave-one-related-view-group-out; two fixed calibration anchors excluded from scoring',
                       'groups': len(groups), 'scoredImages': len(ids)-2,
                       'maeByComponent': errors, 'overallMAE': float(np.mean(list(errors.values()))),
                       'accuracyPct': None, 'heldOutPredictions': predictions},
        'featureOrder': ['non_metal_ratio','white_starch_ratio','solid_texture_ratio','mean_saturation','mean_texture','bias'],
        'weights': weights, 'features': features,
        'anchors': {'empty': EMPTY, 'full': FULL},
        'portionAssumptionsGrams': {'rice':200,'main':110,'veg':90,'soup':150},
        'nutritionFloorDemoGrams':85
    }
    (ROOT/'src/lib/ecotrayModels.json').write_text(json.dumps(artifact,ensure_ascii=False,indent=2)+'\n')
    print(f"18 images; grouped validation MAE: {artifact['validation']['overallMAE']:.2f} percentage points; no classification accuracy claimed.")

if __name__ == '__main__':
    main()
