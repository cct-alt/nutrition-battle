with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix any line containing iOS and 雙擊/縮放/選字
import re
content = re.sub(r'/\*.*iOS.*雙擊.*\*/', '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */', content)
content = re.sub(r'/\*.*iOS.*縮放.*\*/', '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */', content)
content = re.sub(r'/\*.*iOS.*選字.*\*/', '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */', content)

with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed')