const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src/index.tsx',
    output: {
        path: path.resolve(__dirname, '../dist/public'),
        filename: 'index.js',
        clean: true
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '...' ]
    },   
    cache: false,
    devtool: 'cheap-source-map',
    devServer: {
      static: './dist/public',
      port: 1331,
      proxy: {
        '/api': 'http://localhost:3113',
        '/events': 'http://localhost:3113',
      }
    },
    plugins: [
      new HtmlWebpackPlugin({}),
    ],
    module: {
        rules: [
            { test: /\.tsx?$/, use: 'ts-loader' },
            { test: /\.css$/,  use: ["style-loader", 'css-loader'] },
            { test: /\.less$/,            
              use: [ 
                "style-loader", 
                {
                    loader: 'css-loader',
                    options: {
                      modules: { mode: 'global', exportGlobals: true }
                    }
                },
                "less-loader" 
              ] 
            },
            { test: /\.svg$/, use: ['@svgr/webpack'] }
        ]
    }
}
