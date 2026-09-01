with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'rb') as f:
    content = f.read()

idx = content.find(b'iOS')
if idx >= 0:
    print('Found at:', idx)
    print('Context:', content[max(0,idx-30):idx+60])
    line_start = content.rfind(b'\n', 0, idx) + 1
    line_end = content.find(b'\n', idx)
    if line_end == -1:
        line_end = len(content)
    print('Line:', content[line_start:idx+60])
    new_line = b'/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */\n'
    new_content = content[:idx] + b'/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */\n' + content[idx+len('/* ---------- ?+�� iOS ?T�?n�<h�/?_t??h�? ---------- */'):]
    with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'wb') as f:
        f.write(new_content)
    print('Fixed!')
else:
    print('Not found')