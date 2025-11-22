/**
 * ESLint 9 Flat Configuration
 *
 * This configuration uses ESLint 9's native flat config format.
 * It directly imports eslint-config-next without using the FlatCompat compatibility layer,
 * which resolves circular structure errors from eslint-plugin-react.
 *
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 * @see https://nextjs.org/docs/app/building-your-application/configuring/eslint
 */

const nextConfig = require('eslint-config-next');

module.exports = [
  // Ignore patterns (must come first)
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'dist/**',
      '.cache/**',
      'public/**',
      'coverage/**',
      'lintAndTypeError_Check/**',
      'output/**',
      '*.config.js',
      '*.config.ts',
    ],
  },

  // Spread Next.js config directly (already ESLint 9 flat config)
  // eslint-config-next@16.x exports a proper flat config array
  ...nextConfig,

  // Custom rule overrides
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
