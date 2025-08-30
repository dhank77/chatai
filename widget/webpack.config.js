const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'chatbot.js',
    library: 'ChatbotWidget',
    libraryTarget: 'umd',
    globalObject: 'this',
    clean: true,
    publicPath: '/'
  },
  resolve: {
    extensions: ['.ts', '.js', '.css']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist')
    },
    port: 5173,
    hot: true,
    open: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    }
  }
};