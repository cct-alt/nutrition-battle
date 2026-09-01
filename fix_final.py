# Fix the end of app.js - add missing closing code
with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Check if already fixed
if 'initEventListeners' in content and 'DOMContentLoaded' in content:
    print('Already fixed')
else:
    # Find the end of the file (after the last event listener)
    additional = """

/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

console.log('所有事件監聽器已註冊');
  } catch (e) {
    console.error('事件監聽器註冊失敗:', e);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEventListeners);
} else {
  initEventListeners();
}
"""
    content = content.rstrip() + "\n" + additional_code
    with open(r'C:\Users\cct\Documents\Default Project\nutrition-battle\public\app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed: Added missing closing code to app.js')