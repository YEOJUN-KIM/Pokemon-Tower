import {fileURLToPath} from 'node:url';
const projectRoot=fileURLToPath(new URL('.',import.meta.url));
/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  outputFileTracingRoot: projectRoot,
  turbopack: {root: projectRoot},
  outputFileTracingIncludes: {'/api/*': ['node_modules/pokemon-showdown/package.json', 'node_modules/pokemon-showdown/dist/**/*', 'node_modules/pokemon-showdown/config/**/*']},
  devIndicators: false,
  serverExternalPackages: ['pokemon-showdown'],
  poweredByHeader: false,
  outputFileTracingExcludes: {'/*': ['./.data/**/*', './logs/**/*', './test-results/**/*']},
};
export default config;
