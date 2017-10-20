---
title: JavaScript使用装饰器模式让代码伸展自如
catalog: true
date: 2017-10-15 22:44:51
subtitle:
header-img: post/IMG_2992.JPG?imageMogr2/interlace/1/quality/50
tags:
- 装饰器
- Decorator
---
前段时间一直在追**装饰器模式**，但是java的我都懂，为了扩展一个类或者其中的方法，非常的麻烦（相较于js），因为要新建一个类去装饰它，我更想知道js如何去实现的，看了网上的一些例子，发现并不是很实用，都是为了实现而实现，都没有从实际开发出发，有模仿java实现的嫌疑，模式模式，并不是固定的写法，它只是为了实现某种需求的一种思路，具体实现当然要从语言本身特性出发，废话不多说，还是从遇到的问题出发

> 最近更新了Chrome，我发现项目里很多的接口返回的数据Preview一栏里居然乱码了，也没有format，第一反应就是浏览器更新了什么东西，因为代码不会无缘无故图片全部变成这样了，因为没有format，所以第一时间就能想到响应头本来就是错的！

查看响应头后，数据类型果然全部都是text/html，拜托后端童鞋修改后果然显示正常也不乱码了（其实数据本身没有问题，就是显示乱码了），可是 很多页面出现了 JSON数据格式化错误的error信息，原因是我们之前很多的jQuery请求都没有设置相应数据类型，所以jq没有帮我们format，所以我们在`success`回调里主动`JSON.parse`了数据，现在改变了统一的相应类型，所以JSON.parse就报错了，有的页面没有报错是因为之前吃了同时的亏，有的接口json有的html格式，导致我直接
```js
success( res ) {
 let data = typeof res === 'string' ? JSON.parse( res ) : res;
}
```

这样就一劳永逸了，可是没有这么些的怎么办，几十上百个请求我都要去修改吗，那我还不如叫后端童鞋改回去呢，这不找事儿吗。

解决问题，就要从问题发生的地方着手，问题出在JSON.parse（有的地方用的是`$.parseJSON`，查看源码后发现其实使用的还是JSON.parse，就不用管它了）身上，我们就从它入手好了，我们需要扩展一下JSON.parse的行为，**装饰器模式**就登场了
```js
// 备份原先的方法
let _parseJson = JSON.parse;

// 
JSON.parse = function( text, ...args ) {
  return typeof text === 'object' ?
    text :
    _parseJson.call( this, text, ...args );
};
```

这样一来短短几行代码就能解决99%的问题了，当然这个函数前提是被全局引用。但是还有一种情况我也无能为力了，必须全局查找修改。那就是使用`eval`函数格式化的代码，什么？你说重写Object的`toString`方法？算了，这操作太骚了，我不敢，毕竟项目里使用了大量的第三方插件。