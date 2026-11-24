#!/usr/bin/env python3
"""Assemble zo.html (one self-contained file that works offline) from zo-src/."""
from pathlib import Path
src = Path(__file__).parent
data = "\n".join(p.read_text() for p in sorted((src / "data").glob("*.js")))
js = "const LIB = [];\n" + data + "\n" + (src / "models.js").read_text() + "\n" + (src / "app.js").read_text()
html = (src / "head.html").read_text() + "<script>\n" + js.replace("</script", "<\\/script") + "</script>\n"
(src.parent / "zo.html").write_text(html)
print("zo.html", len(html.encode()) // 1024, "KB")
