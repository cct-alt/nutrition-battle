// This script appends the missing closing code to app.js
const fs = require('fs');
const path = 'C:\\Users\\cct\\Documents\\Default Project\\nutrition-battle\\public\\app.js';

const content = fs.readFileSync(path, 'utf8');

// Check if the closing code already exists
if (content.includes('if (document.readyState === \'loading\')')) {
    console.log('Already fixed');
    process.exit(0);
}

// Append the missing closing code
const additionalCode = `
/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

console.log('所有事件監聽器已註冊');
  } catch (e) {
    console.error('事件監聽器註冊失敗:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEventListeners);
} else {
  initEventListeners();
}
`;

const newContent = content + additionalCode;
fs.writeFileSync(path, newContent, 'utf8');
console.log('Fixed: Added missing closing code to app.js');