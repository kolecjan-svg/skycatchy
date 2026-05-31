const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Limit watched directories to just source folders (not all of node_modules)
// to avoid EMFILE (too many open files) on systems with low kern.maxfilesperproc.
// node_modules is still used for resolution; it's only excluded from the watcher.
config.watchFolders = [
  path.resolve(__dirname, 'app'),
  path.resolve(__dirname, 'components'),
  path.resolve(__dirname, 'hooks'),
  path.resolve(__dirname, 'lib'),
  path.resolve(__dirname, 'types'),
  path.resolve(__dirname, 'constants'),
  path.resolve(__dirname, 'assets'),
];

// Exclude node_modules from haste map to reduce file descriptor usage
config.resolver = {
  ...config.resolver,
  blockList: [
    /node_modules\/.*\/node_modules\/.*/,
  ],
};

module.exports = config;
