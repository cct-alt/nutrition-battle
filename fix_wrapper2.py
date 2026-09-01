# This is a simple fix - read the file, find the position, and wrap the event listeners
with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the first event listener
search_str = "$('#btnCreate').addEventListener('click'"
pos = content.find(search_str)

if pos > 0:
    before = content[:pos]
    after = content[pos:]
    new_content = before + "\n\nfunction initEventListeners() {\n  try {\n" + after
    new_content = new_content + "\n\n} catch (e) {\n  console.error('事件監聽器註冊失敗:', e);\n}\n\nif (document.readyState === 'loading') {\n  document.addEventListener('DOMContentLoaded', initEventListeners);\n} else {\n  initEventListeners();\n}\n"
    with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Done - wrapped event listeners in initEventListeners with DOMContentLoaded')
else:
    print('Not found - search string:', repr(search_str))
    print('Content length:', len(content))