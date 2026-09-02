# Fix the garbled iOS comment line in app.js
with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'rb') as f:
    content = f.read()

# Find the garbled line
idx = content.find(b'iOS')
if idx >= 0:
    print('Found at:', idx)
    print('Context:', content[max(0,idx-40):idx+60])
    
    # Find the start and end of the line
    line_start = content.rfind(b'\n', 0, idx) + 1
    line_end = content.find(b'\n', idx)
    if line_end == -1:
        line_end = len(content)
    
    print('Line:', content[content.rfind(b'\n', 0, idx)+1:idx+60])
    
    # Replace the line
    new_line = b'/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */\n'
    new_content = content[:content.rfind(b'\n', 0, idx)+1] + b'/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */\n' + content[content.find(b'\n', idx)+1:]
    
    with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'wb') as f:
        f.write(new_content)
    
    print('Fixed!')
else:
    print('Not found')