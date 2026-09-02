# Fix the garbled iOS comment line
with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
print(f"Line 907: {repr(lines[906][:100])}")

# Fix line 907 (index 906)
lines[906] = '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */\n'

with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'w', encoding='utf-8', newline='\n') as f:
    f.writelines(lines)

# Verify
with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    print('Fixed:', repr(lines[906][:80]))