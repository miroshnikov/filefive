const path = require('path')
const util = require('node:util')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');

const config = {
  entry: './src/index.tsx',
  output: {
      path: path.resolve(__dirname, '../dist/public'),
      filename: 'index.js',
      clean: true
  },
  resolve: {
      extensions: [ '.tsx', '.ts', '...' ],
      symlinks: false
  },   
  cache: false,   
  devtool: 'cheap-source-map',
  devServer: {
    static: './dist/public',
    port: 1331,
    proxy: {
      '/api': 'http://localhost:3113',
      '/events': {
        target: 'http://localhost:3113',
        ws: true
      },
    }
  },
  plugins: [
    new HtmlWebpackPlugin({}),
    new FaviconsWebpackPlugin({
      logo: './src/assets/logo.svg',
      mode: 'webapp',
      favicons: {
        appName: 'FileFive',
        appShortName: 'F5',
        appDescription: 'SFTP/FTP client, dual-panel file manager',
        developerName: 'Max Miroshnikov',
        developerURL: 'https://github.com/miroshnikov'
      }
    })
  ],
  module: {
      rules: [
          { test: /\.tsx?$/, use: 'ts-loader' },
          { test: /\.css$/,  use: ["style-loader", 'css-loader'] },

          { 
            test: /\.less$/,
            include: path.resolve(__dirname, "src/ui"),
            use: [ 
              "style-loader", 
              {
                  loader: 'css-loader',
                  options: { modules: { namedExport: false }, importLoaders: 1 }
              },
              "less-loader" 
            ] 
          },

          { 
            test: /\.less$/,    
            exclude: path.resolve(__dirname, "src/ui"),
            use: [ 
              "style-loader", 
              {
                  loader: 'css-loader',
                  options: {
                    modules: { mode: 'global', exportGlobals: true, namedExport: false },
                    importLoaders: 1
                  }
              },
              "less-loader" 
            ] 
          },

          { test: /\.svg$/, use: ['@svgr/webpack'] }
      ]
  }
}

module.exports = (env, argv) => {
  console.log('isDev', argv.mode == 'development')
  console.log( util.inspect(config,true,null) )
  return config
}
