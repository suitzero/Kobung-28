module.exports = {
  extends: ['expo'],
  globals: {
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    fetch: 'readonly',
    FormData: 'readonly',
    console: 'readonly',
    process: 'readonly',
    require: 'readonly'
  },
  rules: {
     'import/no-unresolved': 'off',
     'import/namespace': 'off',
     'import/named': 'off',
     'no-undef': 'off'
  }
};
