import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'public/**'],
  },

  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          // Allows the `const { [k]: _omitted, ...rest } = obj` idiom.
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',

      // Imports always go through the @/ alias, see CLAUDE.md.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*'],
              message: 'Usa el alias @/ en vez de imports relativos que suban de directorio.',
            },
          ],
        },
      ],

      // Colours and z-index come from theme tokens, never from arbitrary Tailwind
      // values.
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            'JSXAttribute[name.name="className"] Literal[value=/(?:bg|text|border|ring|fill|stroke)-\\[#/]',
          message: 'Color quemado. Usa un token del tema (ver tailwind.config.js).',
        },
        {
          selector: 'JSXAttribute[name.name="className"] Literal[value=/z-\\[[0-9]/]',
          message: 'z-index arbitrario. Usa la escala de z-index del tema.',
        },
      ],
    },
  },

  // Last: turns off stylistic rules that collide with the formatter.
  ...compat.extends('prettier'),
];

export default eslintConfig;
