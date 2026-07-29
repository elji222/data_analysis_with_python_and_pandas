const appJson = require('./app.json');

function isNativePlatformBuild() {
  const easPlatform = process.env.EAS_BUILD_PLATFORM;
  if (easPlatform === 'android' || easPlatform === 'ios') {
    return true;
  }

  const platformFlagIndex = process.argv.indexOf('--platform');
  if (platformFlagIndex !== -1) {
    const platform = process.argv[platformFlagIndex + 1];
    return platform === 'android' || platform === 'ios';
  }

  return false;
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  const isNativeBuild = isNativePlatformBuild();

  return {
    ...config,
    ...appJson.expo,
    web: {
      ...appJson.expo.web,
      // API routes stay on the hosted web app. Native builds only need the client bundle.
      output: isNativeBuild ? 'static' : 'server',
    },
  };
};
