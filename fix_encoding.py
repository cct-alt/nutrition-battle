# Fix the garbled iOS comment line in app.js
with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The garbled line is at line 907 (index 906 in 0-indexed)
# Replace the garbled comment with the correct one
old_comment = '/* ---------- ?+�� iOS ?T�?n�<h�/?_t??h�? ---------- */'
new_comment = '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */'

if old_comment in content:
    content = content.replace(
        '/* ---------- ?+�� iOS ?T�?n�<h�/?_t??h�? ---------- */',
        '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */'
    )
    with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed using exact match')
else:
    # Fallback: find any line with iOS and garbled chars
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'iOS' in line and ('雙擊' in line or '縮放' in line or '選字' in line):
            lines[i] = '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */'
            with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'w', encoding='utf-8') as f:
                f.write('\n'.join(lines))
            print('Fixed via line replacement')
            break
    else:
        print('Pattern not found')

# Write result to file for verification
with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\fix_result.txt', 'w', encoding='utf-8') as f:
    with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        f.write(lines[906][:80] + '\n')