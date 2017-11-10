---
title: 使用gulp来管理我们“身不由己”的项目代码
catalog: true
date: 2017-11-09 23:59:49
subtitle: gulp似乎退居二线了
header-img: post/IMG_3090.JPG
tags:
- gulp
---

想当年，呸。。。 也就几年前吧，根本不知道代码还能压缩这回事，原来压缩是为了减少文件体积，提高载入速度，降低服务器压力，原来变量混淆是为了代码不被随便盗走修改（可能有那么点点这个用？）开始接触前端后，认识到了有`grunt`这种东西，当时觉得好流弊，原来前端也能自动化了，再往后看哪时的新星`gulp`已经出来，据说是因为gulp更简单，代码易懂也清晰，管道操作非常的简单明了，于是就成了后起之秀。再后来我接触到了`webpack`一切皆模块的思想又一次革命，gulp又似乎GG了，不过，不是所有的项目都采用了规范的模块化开发思路，好多项目都还是处于手写script标签来引入js的状态，所以这里说“身不由己”。但是这个时候代码压缩、缓存问题将导致多余的工作。所以gulp的引入还是蛮重要的，于是我们今天就来讲讲，如何打包`html js css`都独立的网页

大概目录应该是这样的
```
├─build
└─src
    ├─css
    ├─html
    ├─img
    └─js
```

根据情况不同每个工程可能还有其他的目录，这里就不添加了使用gulp需要用到`gulp`命令，当然你也可以安装在当前目录进入`node_modules/gulp`下去运行，全局安装gulp
```shell
npm install gulp -g
```
项目本身会依赖到`gulp,gulp-autoprefixer,gulp-clean-css,gulp-uglify,gulp-rev-all,gulp-html-minify,gulp-useref`，东西有点多，每个包都有它的作用哦，下面我们就开始写代码来打包我们的代码

```js
// gulpfile.js
const revAll = require( 'gulp-rev-all' )
const useref = require( 'gulp-useref' )
const minifyCss = require( 'gulp-clean-css' )
const filter = require( 'gulp-filter' )
const htmlmini = require( 'gulp-html-minify' )
const base64 = require( 'gulp-base64' )

gulp.task( 'build', function() {
  var jsFilter = filter( '**/*.js', { restore: true } ),
    cssFilter = filter( '**/*.css', { restore: true } ),
    htmlFilter = filter( [ '**/*.html' ], { restore: true } )

  gulp.src( [ htmlSrc, `./src/html/**/*.html` ] )
    .pipe( useref( {
      noconcat: true
    } ) ) // 解析html中的构建块
    .pipe( jsFilter ) // 过滤所有js
    .pipe( uglify() ) // 压缩js
    .pipe( jsFilter.restore )
    .pipe( cssFilter ) // 过滤所有css
    .pipe( minifyCss() ) // 压缩优化css
    .pipe( base64( {
      maxImageSize: 20 * 1024,
      baseDir: './src',
      extensions: [ 'jpg', 'png' ],
    } ) )
    .pipe( cssFilter.restore )
    .pipe( revAll.revision( { // 生成版本号
      dontRenameFile: [ '.html' ], // 不给 html 文件添加版本号
      dontUpdateReference: [ '.html' ] // 不给文件里链接的html加版本号
    } ) )
    .pipe( htmlFilter ) // 过滤所有html
    .pipe( htmlmini() ) // 压缩html
    .pipe( htmlFilter.restore )
    .pipe( gulp.dest( 'build' ) )
} )
```
其实这里最重要的就是`useref`这个模块，这个模块能静态分析出html里依赖的js和css文件然后进行打包处理，所以只要路径正确，这里就非常的智能，直接给文件做了`hash`指纹处理，只有更新过的文件才会被重命名，这样在html更新后就能准确的通知客户端更新，而不被缓存困扰。
我们在这里还引入了`gulp-base64`这个包是为了对一些小图片进行打包处理，减少客户端的请求以提高性能

基于gulp的流处理方式，我们还可以引入`less`文件处理，`babel`转译器等插件，这里就不详述了

当然gulp能干的不仅仅是这些，因为webpack从项目本身来说只能服务当前的项目，当多个不同的项目需要管理时就需要用到gulp + webpack的方式来管理。