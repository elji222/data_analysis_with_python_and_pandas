const { getDefaultConfig } = require('expo/metro-config');

const UI_BUILD = '2026-06-30';

const config = getDefaultConfig(__dirname);
config.cacheVersion = UI_BUILD;

module.exports = config;
