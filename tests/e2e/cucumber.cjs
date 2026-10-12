// ts-node compiles the suite as CommonJS with this folder's tsconfig; the root
// one targets Next's bundler and cannot be loaded by Node directly.
process.env.TS_NODE_PROJECT ??= 'tests/e2e/tsconfig.json';

module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['tests/e2e/features/support/*.ts', 'tests/e2e/features/step-definitions/*.ts'],
    format: ['@serenity-js/cucumber'],
    paths: ['tests/e2e/features/**/*.feature'],
  },
};
