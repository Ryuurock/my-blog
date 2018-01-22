---
title: webpack下html内容相关的处理
catalog: true
date: 2018-01-20 11:25:39
subtitle: 
header-img: post/IMG_3312.JPG
tags:
- webpack
- nodejs
---
没错这次还是讲webpack，这玩意儿给前端创造了太多的灵活性了，让我们不得不好好的来学习它。
最近项目的上线第一次文件发布会漏掉一个文件，原因就是文件正好不在我们常用的目录，在合并的时候就忘记了。继上次文件结构重构后，一直还有几个模板文件在后端的目录结构里，原因就是我们在html的引用方式是采用的后端模板引标签用
```html
<include file="..."/>
```
这种写法的弊端就是必须要将文件放在后端目录里，因为上线后前端资源文件不在一个服务器。为了减少这种失误，我决定将这些模板拿走，放到我们前端目录里，达到前后端“文件分离”。
现在就使用的`html-webpack-plugin`插件来说，是部分支持ejs模板的，
但仅仅是一些变量的输出等，对于html文件的引用我们还需要单独配置`html-loader`这个插件，不幸的是配置这个loader后，html-webpack-plugin将不再支持ejs的模板处理，并且ejs-loader和html-loader并不来能完美的结合起来，因为ejs-loader返回的是一个处理函数。好了废话不多说，下面介绍下我的解决办法吧。
之所以非得使用html-loader是看中了它的url提取，它的核心函数将图片css、js等都提取出来了，在一些特殊情况这个是非常有用的，免于我们去拷贝文件。查阅官方文档后，发现它是支持es6的模板语法的，并且官方也示例了模板语法的使用，Interpolation
```js
<img src="${require(`./images/gallery.png`)}">
<div>${require('./components/gallery.html')}</div>
```

但是因为个别页面需要静态传值到模板里，暂时还无法做到去解析里面的变量。
然后我们先从主入口的模板说起：
`html-webpack-plugin`文档里有提到这个插件的事件，

#### To allow other plugins to alter the HTML this plugin executes the following events:
Async:
* html-webpack-plugin-before-html-generation
* html-webpack-plugin-before-html-processing
* html-webpack-plugin-alter-asset-tags
* html-webpack-plugin-after-html-processing
* html-webpack-plugin-after-emit

Sync:
* html-webpack-plugin-alter-chunks

这些事件都是在`html-webpack-plugin`整个生命周期中发生的，还有一些官方没有提到的，在源码里可以找到，不过对于目前来说用处不大，在这里我们用`html-webpack-plugin-before-html-processing`，就是在html加工前，我们要对里面的ejs语法进行处理，代码如下

```js
const ejs = require( 'ejs' );

module.exports = class HtmlEjsWebpackPlugin {
  constructor() {

  }

  apply( compiler ) {
    // ...
    compiler.plugin( 'compilation', function( compilation ) {

      compilation.plugin( 'html-webpack-plugin-before-html-processing', function( htmlPluginData, callback ) {
        htmlPluginData.html = ejs.render( htmlPluginData.html, {
          customData: htmlPluginData.plugin.options.customData || {}
        } );
        callback( null, htmlPluginData );
      } );

    } );

  }
};
```
这里的customData是我们的自定义数据，比如title keywords等，用来静态生成html内容。然后就是html-loader，为了方便，我们可以直接声明一个nodejs的全局函数:
```js
// 声明一个全局的ejsrennder函数
global.ejsRender = ejs.render;
```
这样我们就可以在html代码里这样写
```html
...
${ejsRender( require('$d/js/components/search_material.html'), { title: '账号' } )}
...
```
这样我们可以去html里取到传进去的变量
```html
<p><%- title %></p>
```
输出
```html
<p>账号</p>
```
这样变量相关的我们就处理完了，还有一个比较重要的是html的parse，对于一些嵌套了后端写法的地方，html-minifier是无法解析的，比如：
```html
<a <if condition="$bannerItem['activity_url']">href="{$bannerItem['activity_url']}" {$bannerItem['isblankopen'] == '1' ? 'target="_blank"' : ''}</if>></a>
```
再比如：
```html
<img src="__RESPATH__/images/hy{$_SESSION['vip']|default='0'}.png" class="vip-logo" alt="vip标识" />
```
所以我们再看文档`ignoreCustomFragments`、`customAttrSurround`、`customAttrAssign`我们需要配置这些属性，它会传给html-minifier。
```js
{
  ignoreCustomFragments: [ /<if[\s\S]*?>[\s\S]*?<\/if>/, /<%[\s\S]*?%>/, /\{\$[\s\S]*?\}/, /\{\:[\s\S]*?\}/ ],
  customAttrSurround: [
    [ /\{\$/, /\}/ ],
    [ /<if[\s\S]*?>/, /<\/if>/ ]
  ],
  customAttrAssign: [ /\{\$[\s\S]*?\}/, /\{\:[\s\S]*?\}/ ]
}
```
就是指定规则的内容不检查，直接跳过，html-minifier的文档里有详细的说明。
这样一来我们就可以完全将前后端文件拆开来了，不用受后端限制非得放在哪个文件夹，因为nodejs已经帮我们做了（html-webpack-plugin配合html-webpack-harddisk-plugin插件）。