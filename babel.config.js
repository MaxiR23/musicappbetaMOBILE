module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    //TODO: check.
    /* plugins: [
      ['transform-remove-console', { exclude: ['error', 'warn'] }],
    ], */
  };
};