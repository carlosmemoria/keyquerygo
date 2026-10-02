from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(__file__).resolve().parents[1]
out=root/"dist"
out.mkdir(exist_ok=True)
with ZipFile(out/"keyquerygo-chrome-0.1.0.zip","w",ZIP_DEFLATED) as z:
 for pattern in ["*.js","*.html","*.css","manifest.json","data/*.json","icons/*.png"]:
  for p in root.glob(pattern): z.write(p,p.relative_to(root))
print(out/"keyquerygo-chrome-0.1.0.zip")
