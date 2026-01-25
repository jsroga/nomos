const js = require('@eslint/js')
const typescript = require('@typescript-eslint/eslint-plugin')
const typescriptParser = require('@typescript-eslint/parser')
const react = require('eslint-plugin-react')
const reactHooks = require('eslint-plugin-react-hooks')
const reactCompiler = require('eslint-plugin-react-compiler')
const prettier = require('eslint-config-prettier')

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.cursor/**',
      '.claude/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      'public/scripts/**/*.min.js',
      'public/scripts/**/*.js',
      '**/*.min.js',
    ],
  },
  js.configs.recommended,
  // Configuration for .mjs files (Node scripts)
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: 'readonly',
        JSX: 'readonly',
        NodeJS: 'readonly',
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react: react,
      'react-hooks': reactHooks,
      'react-compiler': reactCompiler,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...prettier.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-require-imports': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off', // Allow quotes/apostrophes in JSX for readability
      'react/jsx-no-comment-textnodes': 'off', // Allow comment-like text in JSX
      'react/no-unknown-property': [
        'error',
        {
          ignore: [
            // React Three.js (@react-three/fiber) props
            'args',
            'position',
            'rotation',
            'geometry',
            'material',
            'intensity',
            'castShadow',
            'receiveShadow',
            'userData',
            'frustumCulled',
            'transparent',
            'side',
            'depthWrite',
            'map',
            'metalness',
            'roughness',
            'emissive',
            'emissiveIntensity',
            'toneMapped',
            'object',
            // styled-jsx props
            'jsx',
            'global',
          ],
        },
      ],
      semi: ['error', 'never'],
      quotes: ['error', 'single'],
      indent: 'off',
      'react-compiler/react-compiler': 'warn', // Optimization hints, not bugs
      'react-hooks/set-state-in-effect': 'warn', // Often intentional for syncing external state
      'react-hooks/immutability': 'off', // Allow mutating values for imperative APIs (THREE.js, etc.)
      'react-hooks/purity': 'off', // Allow Date.now(), Math.random() for animations/timestamps
      'react-hooks/preserve-manual-memoization': 'off', // Allow React compiler to skip optimization
      '@typescript-eslint/no-empty-object-type': 'off', // Allow {} types
      'no-empty': 'off', // Allow empty catch blocks with comments
      'no-control-regex': 'off', // Allow control characters in regex for input sanitization
      'no-useless-escape': 'off', // Allow escapes in regex for clarity
      'no-case-declarations': 'off', // Allow lexical declarations in case blocks
      'no-undef': 'off', // TypeScript handles this
      'no-unused-vars': 'off', // Using TypeScript version
      'no-redeclare': 'off', // TypeScript handles this (allows Zod schema + type pattern)
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
]
