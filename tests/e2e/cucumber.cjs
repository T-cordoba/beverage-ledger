// ts-node compiles the suite as CommonJS with this folder's tsconfig; the root
// one targets Next's bundler and cannot be loaded by Node directly.
process.env.TS_NODE_PROJECT ??= 'tests/e2e/tsconfig.json';

// Cucumber adds the configured paths to the ones given on the command line, so
// `pnpm test:e2e some.feature` would still run every feature without this.
const featuresOnTheCommandLine = process.argv.some((arg) => /\.feature(:\d+)*$/.test(arg));

module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['tests/e2e/features/support/*.ts', 'tests/e2e/features/step-definitions/*.ts'],
    format: ['@serenity-js/cucumber'],
    paths: featuresOnTheCommandLine ? [] : ['tests/e2e/features/**/*.feature'],
  },
};
