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
          // Permite el idiom `const { [k]: _omitido, ...resto } = obj`.
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',

      // Ver CLAUDE.md §5: los imports van siempre por el alias @/.
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

      // Ver CLAUDE.md §5: nada quemado. Los colores y el z-index salen de tokens,
      // no de valores arbitrarios de Tailwind.
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

  // Prettier va al final: desactiva las reglas de estilo que colisionan con el formateador.
  ...compat.extends('prettier'),
];

export default eslintConfig;
