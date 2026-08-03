const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  { ignores: ['.next', 'node_modules'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
