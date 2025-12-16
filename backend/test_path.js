const path = require('path');
const fs = require('fs');

console.log('__dirname:', __dirname);
const publicPath = path.join(__dirname, 'public');
console.log('Public Path:', publicPath);
const dashboardPath = path.join(publicPath, 'dashboard.html');
console.log('Dashboard Path:', dashboardPath);
console.log('Exists:', fs.existsSync(dashboardPath));
