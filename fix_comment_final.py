with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and fix the garbled line
for i, line in enumerate(lines):
    if 'iOS' in line and '雙擊' in line and '縮放' in line:
        lines[i] = '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */\n'
        print(f'Fixed line {i+1}')
        break

with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed')