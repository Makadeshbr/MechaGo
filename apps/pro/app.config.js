const baseConfig = require("./app.json");

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;

module.exports = {
  ...baseConfig,
  expo: {
    ...baseConfig.expo,
    android: {
      ...baseConfig.expo.android,
      config: {
        ...(baseConfig.expo.android?.config ?? {}),
        googleMaps: {
          apiKey: googleMapsApiKey ?? "",
        },
      },
    },
  },
};
