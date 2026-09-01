with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

pos = content.find("$('#btnCreate').addEventListener('click'")
print('Position:', pos)
if pos > 0:
    print('Found')
    pos2 = content.find('initEventListeners')
    print('initEventListeners at:', pos2)
else:
    print('Not found')