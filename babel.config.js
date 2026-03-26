module.exports = function (api) {
  api.cache(true);
  const isDev = api.caller(caller =>
    caller ? caller.isDev : process.env.NODE_ENV === 'development'
  );
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ...(!isDev ? [['transform-remove-console', { exclude: ['error', 'warn'] }]] : []),
    ],
  };
};