/**
 * tests/setup.js
 *
 * Loads data.js and game.js into the Jest global scope via require() so that
 * Istanbul can instrument them and report accurate coverage.
 *
 * game.js references the data constants directly (closure over module scope),
 * so we must expose them as globals BEFORE requiring game.js.
 */

const path = require('path');
const root = path.join(__dirname, '..');

// 1. Load data constants and push them onto global so game.js can reference them.
const data = require(path.join(root, 'js', 'data.js'));
Object.assign(global, data);   // PARTIES, PROVINCES, REGIONS, …

// 2. Load game engine (it reads PARTIES, PROVINCES, etc. from global scope).
const { GameEngine } = require(path.join(root, 'js', 'game.js'));
global.GameEngine = GameEngine;
