module.exports = function (api) {
  api.cache(true);

  const isDev = process.env.NODE_ENV === 'development';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      require.resolve('expo-router/babel'),
      ...(!isDev
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
        : []),
    ],
  };
};