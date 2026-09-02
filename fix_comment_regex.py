# Fix the iOS comment line in app.js
import re

filepath = r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The garbled line is at line 907
# Replace the entire line that contains the garbled iOS comment
content = re.sub(
    r'^.*iOS.*\*/',
    '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */',
    content,
    flags=re.MULTILINE
)

with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed!')