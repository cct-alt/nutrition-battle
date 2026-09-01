with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the garbled comment
content = content.replace(
    '/* ---------- ?+�� iOS ?T�?n�<h�/?_t??h�? ---------- */',
    '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */'
)

with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed')