---
title: jQuery的ajax方法拦截器
catalog: true
date: 2017-06-19 22:40:34
subtitle:
header-img: post/IMG_2440.JPG
keyword: jquery,ajax,拦截
tags:
- jquery
- ajax
---
之前因为一些原因，担任过一段时间公司的前端开发面试官，面试了很多人，问过这样两个问题：
> 如何侵入一个方法实现代理（或者叫钩子）？// 2017年10月15日修正，这里应该叫装饰器或者装饰者

> 在不修改页面业务代码只修改一处代码的情况下，如何统一处理jQuery的ajax的response数据？

其实上面两个问题本质是差不多的，不过不知道是表述不清楚，还是web前端这一块的人水平确实参差不齐，尽然没有一个让我觉得满意的答案，网上其实也有答案，不过很多都不严谨，导致ajax的默认行为遭到破坏，例如：
```javascript
var ajaxBackup = $.ajax;
$.ajax = function( opts ) {
  // do sth.
  ajaxBackup( opts );
}
```
上面的方法在大多数情况下可以使用，但是这样写的人肯定不知道ajax方法可以有两个参数`$.ajax( url, options )`，这就到导致了这种写法传入的`options`丢失了。。。 还有一个更严重的问题是，`$.ajax`方法返回的是一个类Promise对象，上面的写法直接导致了返回值为undefined。
所以我认为应该这样写才能保证ajax方法的默认行为得到保护：
```javascript
var ajaxBackup = $.ajax;

$.ajax = function( url, options ) {

  if ( typeof url === "object" ) {
    options = url;
    url = undefined;
  }

  options = options || {};

  var completeBackUp = options.complete,
    successBackup = options.success,
    errorBackup = options.error;
  var urlBackup = url;
  var optionBackup = $.extend( {}, options );

  options.complete = function() {
    // to do sth. after request is complete.

    if ( $.isFunction( completeBackUp ) ) {
      completeBackUp.apply( options.context, arguments );
    }
  }
  options.success = function( data ) {
    // to do sth. after request is successful.
    // 这里相当于做了代理，请求成功回调执行前要做的事

    // 这里则是对传入的success回调进行相应
    if ( $.isFunction( successBackup ) ) {
      successBackup.apply( options.context, arguments );
    }
  }
  options.error = function() {
    if ( $.isFunction( errorBackup ) ) {
      errorBackup.apply( options.context, arguments );
    }
  }

  // 返回原先的ajax执行结果，不影响.done .then .always等方法的链式调用
  return ajaxBackup.apply( $, arguments );
}
```