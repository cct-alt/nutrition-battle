with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'rb') as f:
    content = f.read()

# Find the garbled iOS comment line
idx = content.find(b'iOS')
if idx >= 0:
    # Find the start of the line
    line_start = content.rfind(b'\n', 0, idx) + 1
    line_end = content.find(b'\n', idx)
    if line_end == -1:
        line_end = len(content)
    old_line = content[line_start:line_end]
    print('Found at:', idx)
    print('Old line:', old_line)
    
    new_line = b'/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */\n'
    new_content = content[:line_start] + new_line + content[line_end:]
    
    with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'wb') as f:
        f.write(new_content)
    print('Fixed!')
else:
    print('iOS not found')