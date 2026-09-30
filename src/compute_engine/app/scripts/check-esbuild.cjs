const path = require('node:path');
const appRoot = path.join(__dirname, '..');
const eb = require(path.join(appRoot, 'node_modules', 'electron-builder', 'package.json'));
const deps = { ...(eb.dependencies || {}), ...(eb.optionalDependencies || {}) };
console.log('electron-builder depends on esbuild:', Object.keys(deps).includes('esbuild') ? 'YES' : 'NO');
console.log('electron-builder esbuild version:', deps.esbuild || '(none)');
const app = require(path.join(appRoot, 'package.json'));
console.log('app devDependencies esbuild:', app.devDependencies?.esbuild || '(none)');
