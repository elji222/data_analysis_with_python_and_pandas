const appJson = require('./app.json');

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  const isNativeEasBuild =
    process.env.EAS_BUILD === 'true' &&
    (process.env.EAS_BUILD_PLATFORM === 'android' ||
      process.env.EAS_BUILD_PLATFORM === 'ios');

  return {
    ...config,
    ...appJson.expo,
    web: {
      ...appJson.expo.web,
      // API routes stay on the hosted web app. Native builds only need the client bundle.
      output: isNativeEasBuild ? 'static' : 'server',
    },
  };
};
