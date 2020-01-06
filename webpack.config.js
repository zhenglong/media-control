var path = require('path');
var ExtractTextPlugin = require('mini-css-extract-plugin');
var TerserPlugin = require('terser-webpack-plugin');
var project_root = __dirname;
var src_root = path.resolve(project_root, './src');

module.exports = {
    mode: 'production',
    entry: {
        'media-control': path.resolve(src_root, './index.js')
    },
    output: {
        path: path.resolve(project_root, './dist'),
        filename: '[name].[hash:8].js'
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
                },
            },
            {
                test: /\.scss$/,
                use: [
                    {
                        loader: ExtractTextPlugin.loader
                    }, {
                        loader: 'css-loader'
                    }, {
                        loader: 'postcss-loader',
                        options: {
                            plugins: [require('autoprefixer')]
                        }
                    }, {
                        loader: 'sass-loader'
                    }
                ]
            },
            {
                test: /\.html$/,
                use: [
                    {
                        loader: 'html-loader'
                    }
                ]
            },
            {
                test: /\.(jpg|png|gif)$/,
                use: {
                    loader: 'url-loader',
                    options: {
                        limit: 4096
                    }
                },
                
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin({
            filename: '[name].[contenthash:8].css',
            chunkFilename: '[id].[contenthash:8].css'
        })
    ],
    resolve: {
        modules: [
            path.resolve(project_root, 'node_modules'),
            src_root
        ]
    },
    optimization: {
        minimizer: [
            new TerserPlugin({
                extractComments: true
            })
        ]
    }
};