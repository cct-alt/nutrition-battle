with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'iOS' in line and ('雙擊' in line or '縮放' in line or '選字' in line):
        print(f'Found at line {i+1}: {repr(line[:80])}')
        lines[i] = '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */\n'
        print('Fixed')

with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed')