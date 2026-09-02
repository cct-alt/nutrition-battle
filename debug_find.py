with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'rb') as f:
    c = f.read()
idx = c.find(b'iOS')
with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\debug.txt', 'w', encoding='utf-8') as f:
    f.write(f'Found at: {idx}\n')
    if idx >= 0:
        f.write(f'Context: {c[max(0,idx-50):idx+60]}\n')
        line_start = c.rfind(b'\n', 0, idx) + 1
        line_end = c.find(b'\n', idx)
        if line_end == -1:
            line_end = len(c)
        f.write(f'Line: {c[line_start:idx+60]}\n')