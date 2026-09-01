with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the garbled comment line - replace any line containing iOS and garbled chars
import re
content = re.sub(r'/\*.*iOS.*\*/', '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */', content)

with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed')