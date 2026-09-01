// This script wraps the event listeners in initEventListeners
const fs = require('fs');
const path = 'C:\\Users\\cct\\Documents\\Default Project\\nutrition-battle\\public\\app.js';
const content = fs.readFileSync(path, 'utf8');

const pos = content.indexOf("$('#btnCreate').addEventListener('click'");
if (pos > 0) {
    const before = content.substring(0, pos);
    const after = content.substring(pos);
    const newContent = before + "\n\nfunction initEventListeners() {\n  try {\n" + after;
    const newContent2 = newContent + "\n\n} catch (e) {\n  console.error('事件監聽器註冊失敗:', e);\n}\n\nif (document.readyState === 'loading') {\n  document.addEventListener('DOMContentLoaded', initEventListeners);\n} else {\n  initEventListeners();\n}\n";
    fs.writeFileSync(path, newContent2, 'utf8');
    console.log('Done');
} else {
    console.log('Not found');
}