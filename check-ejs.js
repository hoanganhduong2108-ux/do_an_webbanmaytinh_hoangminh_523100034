const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        ejs.compile(content);
        console.log('✅ OK: ' + filePath);
    } catch(error) {
        console.log('❌ ERROR: ' + filePath);
        console.log('   Lỗi: ' + error.message);
        console.log('---');
    }
}

function walkDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDirectory(fullPath);
        } else if (file.endsWith('.ejs')) {
            checkFile(fullPath);
        }
    }
}

console.log('Đang kiểm tra tất cả file EJS...\n');
walkDirectory('./views');