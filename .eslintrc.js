module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  extends: [
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    'no-underscore-dangle': [0],
    "class-methods-use-this": [0],
    "no-restricted-syntax": [0],
    "no-param-reassign": [0],
    "no-use-before-define": [0],
    "consistent-return": [0],
    "no-shadow": [0],
    "no-unused-vars": [0],
    "no-undef": [0],
    "no-await-in-loop": [0],
    "max-len": [0],
    "camelcase": false
  },
};
