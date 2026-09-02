with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 907 is index 906 (0-indexed)
print(f"Line 907 before: {repr(lines[906][:100])}")

lines[906] = '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */\n'

with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'w', encoding='utf-8', newline='\n') as f:
    f.writelines(lines)

with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    print('Fixed:', repr(lines[906][:80]))