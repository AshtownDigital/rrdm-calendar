module.exports = {
  default: {
    paths: ['tests/e2e/features/**/*.feature'],
    require: [
      'tests/e2e/step_definitions/**/*.js',
      'tests/e2e/support/**/*.js'
    ],
    format: [
      '@cucumber/pretty-formatter'
    ]
  }
};
