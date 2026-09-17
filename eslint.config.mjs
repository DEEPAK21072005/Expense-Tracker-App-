import { FlatCompat } from '@eslint/eslintrc';
import { globalIgnores } from 'eslint/config';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.extends('next/core-web-vitals'),
  globalIgnores(['.next/**', 'node_modules/**', 'legacy/**', 'prisma/migrations/**']),
];
