import sys

with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'rb') as f:
    content = f.read()

idx = content.find(b'iOS')
if idx >= 0:
    print('Found at:', idx, file=sys.stderr)
    print('Context:', content[max(0,idx-50):idx+60], file=sys.stderr)
    line_start = content.rfind(b'\n', 0, idx) + 1
    line_end = content.find(b'\n', idx)
    if line_end == -1:
        line_end = len(content)
    print('Line:', content[line_start:idx+60], file=sys.stderr)
    new_line = b'/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */\n'
    new_content = content[:idx] + new_line + content[idx+len(b'/* ---------- ?+�� iOS ?T�?n�<h�/?_t??h�? ---------- */'):]
    with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'wb') as f:
        f.write(new_content)
    print('Fixed!', file=sys.stderr)
else:
    print('Not found', file=sys.stderr)