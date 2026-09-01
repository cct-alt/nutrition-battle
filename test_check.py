with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

print('File length:', len(content))
pos = content.find('initEventListeners')
print('initEventListeners at:', pos)

if pos > 0:
    print('Found initEventListeners')
else:
    print('initEventListeners NOT found')

# Also check for the event listener
pos2 = content.find('initEventListeners')
if pos2 > 0:
    # Show context around it
    start = max(0, pos2 - 50)
    end = min(len(content), pos2 + 100)
    print('Context:', repr(content[start:end]))