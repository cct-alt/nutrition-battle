import re

with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the garbled iOS comment line
content = re.sub(
    r'^.*iOS.*\*/',
    '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */',
    content,
    flags=re.MULTILINE
)

with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed!')