"""Export OpenAPI schema to backend/openapi.json and repo root openapi.json — sözleşme sabit."""
import json, sys, pathlib
# ensure backend is importable regardless of cwd
here = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(here))
sys.path.insert(0, str(here.parent))
from app.main import app
schema = app.openapi()
targets = [here / "openapi.json", here.parent / "openapi.json"]
for p in targets:
    p.write_text(json.dumps(schema, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {p} ({len(schema['paths'])} paths)")
