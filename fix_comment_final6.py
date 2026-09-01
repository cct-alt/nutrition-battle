import re

with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the line with iOS
idx = content.find('iOS')
if idx >= 0:
    print(f'Found at index: {idx}')
    print('Context:', repr(content[max(0,idx-50):idx+80]))
    
    # Find the start of the comment line
    line_start = content.rfind('\n', 0, idx) + 1
    line_end = content.find('\n', idx)
    if line_end == -1:
        line_end = len(content)
    
    old_line = content[line_start:line_end]
    print('Old line:', repr(old_line))
    
    new_line = '/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */\n'
    new_content = content[:line_start] + new_line + content[line_end:]
    
    with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Fixed!')
else:
    print('iOS not found')