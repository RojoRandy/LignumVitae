import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Mismas reglas base que apps/admin/eslint.config.js, sin las de React.
export default tseslint.config(
  { ignores: ['dist', 'prisma/migrations'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      // Descartar campos con un destructuring ({ secreto, ...resto }) es el patron para no filtrar
      // campos (p. ej. los precios crudos en public-catalog.dto.ts); el resto si debe usarse.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
);
