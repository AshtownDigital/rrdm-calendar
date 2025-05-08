/**
 * Webpack Configuration
 * 
 * This configuration file sets up webpack for bundling client-side JavaScript.
 */
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: {
    main: './src/js/main.js',
    dashboard: './src/js/dashboard.js',
    bcr: './src/js/bcr.js',
    funding: './src/js/funding.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'public/javascripts/dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '../stylesheets/[name].css',
    })
  ],
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'inline-source-map'
};
