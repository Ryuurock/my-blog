---
title: 如何保证ajax按你想要的顺序执行？
catalog: true
date: 2017-07-12 12:09:34
subtitle: 回调回调回调回调。。。。。flag、flag、flag、flag、flag...
header-img: post/IMG_2544.JPG
tags:
- Promise
- async await
---

前端的蓬勃发展和要求越来越高的用户体验，使得现在的web页面越来越依赖`ajax`，无处不在的ajax，无处不在的回调，使得你的代码越写越丑，还容易陷入`回调地狱`，比如这样：
```javascript
$.get('/test', function() {
  
  // do something

  $.get('/test2', function() {
  
    // do something

    $.get('/test3', function() {
  
      // do something

      $.get('/test4', function() {
  
        // do something

        $.get('/test5', function() {
          
        })
      })
    })
  })

});
```
今天我们的主题是谈谈多个ajax（当然不仅仅是ajax，包括所有的异步操作）的情况，如何能保证预期的执行顺序。

> 案例：`ajax2` 返回的结果需要去匹配`ajax1`中返回的结果

ajax1返回了如下数据：
```javascript
{
  '10001': '成都',
  '10002': '德阳',
  ...
}
```
ajax2返回了如下数据：
```javascript
{
  cityCode: '10001'
}
```
可能一般开发者会这样写：
```javascript
var tempData = null;
// 获取第一个接口的数据
$.get( '/example1', function( data ) {
  tempData = data
} )
// 获取第二个接口的数据
$.get( '/example2', function( data ) {
  // 匹配code
  var cityName = tempData[ data.cityCode ];
  console.log( cityName )
} )
```
然后你发现好像对了，就这么完成了？多测试几次你就会发现，怎么有时候报错，有时候又正确呢？
那是因为这两个请求都是独立的，互不影响，若接口2响应速度比接口1快，那铁定是要报错的，因为这个时候`tempData`还未被接口1赋值，仍然是初始化的`null`，如果你发现了问题，并且有点开发经验那你可能就会这样解决：
```javascript
var tempData = null;
var tempData2 = null;
var cityName = null;
// 获取第一个接口的数据
$.get( '/example1', function( data ) {
  tempData = data;
  if ( cityName === null && tempData2 ) {
    cityName = data[ tempData2.cityCode ];
  }
} )
// 获取第二个接口的数据
$.get( '/example2', function( data ) {
  tempData2 = data;
  // 匹配code
  if ( tempData ) {
    cityName = tempData[ data.cityCode ];
  }
} )
```
然后便解决了`燃眉之急`，好接下来，需求变了要求增加一个接口，接口2不仅要去匹配接口1，还要去匹配接口3，甚至更多接口，我们都要这样去写吗。好即使是您很有耐心，也很细心，但是作为程序员，有想过假如有人来维护你的代码，他的心情吗.....此处省略一万字

于是`jQuery`的`$.when`隆重登场
`$.when`方法接收不定个`deferred`类型的对象作为参数
```javascript
$.when( 
  $.ajax( '/example1' ),
  $.ajax( '/example2' ), 
  $.ajax( '/example3' )
).then( function( data ) {
  // do something
} );
```
从语法上你可以很清晰的看到注释的地方就是我们三个ajax返回后的回调函数，在这里你可以慢慢地做你基于这三个响应数据任何事，不必担心他们哪个因为响应时间过慢出现报错，你要问我怎么分别拿到三个回调的数据，那我只能说为什么不先尝试以下呢~

好也许你不知道你此时到底要传递多少个ajax进去，3个、4个、5个都有可能，那你一定听说过'apply'方法：
```javascript
var ajaxArray = [ $.ajax( '/example1' ) ];

// 这里或许因为某个条件要添加一个ajax
if ( condition ) {
  ajaxArray.push( $.ajax( '/example2' ) );
}
// 这里或许又因为某个条件要添加一个ajax
if ( condition2 ) {
  ajaxArray.push( $.ajax( '/example3' ) );
}
```

```javascript
$.when.apply( $, ajaxArray ).then( function( data ) {
  // do something
} );
```
代码是不是干净整洁又大方？比起一堆flag让人容易理解多了，写代码就是拼良心，嗯~

也许你比较高端，还用了插件，你需要往这个插件里写入`ajax`返回的数据，但是插件加载需要很久，也许是内部有setTimeout，也许是js代码太多，但是良心开发商会为你提供ready事件供你使用。但是如果你是个强迫症： “为什么我就不能和插件同时去加载，等他ready我直接写入数据不就行了。”（嗯也许那个强迫症患者就是我）。
当你看到这里你肯定知道可以用`$.when`，去解决，但是等你写到一半，就会发现我特么怎么把插件和`when`方法对应起来，是的`when`方法的参数不是随随便便就能传的，它要的是`deferred`对象，别急jQuery肯定不会只给你造半个轮子供你使用的
```javascript


// 创建一个延迟对象
var deferred = $.Deferred();

function deferredFn( def ) {
  // 你的插件为你提供的ready回调
  plugin.ready( function() {

    // 这里表明你的异步操作已经完成了不需要在等待了
    dtd.resolve( /* 如果有需要，这里可以传出你可能需要的数据，就像$.ajax里success方法给你的data一样 */ );    
  } );

  // 返回一个promise对象，外部无法改变这个函数的状态
  return dtd.promise();
}

$.when( $.ajax( '/example' ), deferredFn( deferred/* 这里需要传入刚才创建的deferred对象 */ ) ).then( function( data ) {
  // do something
  // 这个时候也许比你在ready回调里再去发起ajax请求效率高多了吧
} );

//----------------------------

// 以上便解决非ajax对象与ajax对象结合的问题，但我觉得应该有简洁的写法对吧

$.when( $.ajax( '/example' ), ( function( dtd ) {
  plugin.ready( function() {

    dtd.resolve();
  } );
  return dtd.promise();
}( $.Deferred() ) ) ).then( function( data ) {
  // do something
  // 这个时候也许比你在ready回调里再去发起ajax请求效率高多了吧
} );
```
可能你还是对上面的`promise`,`deferred`等不是很了解，这里推荐阮一峰老师的[jQuery的deferred对象详解](http://www.ruanyifeng.com/blog/2011/08/a_detailed_explanation_of_jquery_deferred_object.html)
***
也许你比较傲娇不用`jQuery`，那办法还是有的，原生的`Promise`对象

```javascript
var promise = new Promise( function( resolve, reject ) {
  // ... some code

  if ( /* 异步操作成功 */) {
    resolve( value );
  } else {
    reject( error );
  }
} );

promise.then( function( value ) {
  // success
}, function( error ) {
  // failure
} );
```
摆脱了框架的束缚，原生写起来也是很清爽的
上面的插件ready例子就可以这样改写了
```javascript
var promise = new Promise( function( resolve, reject ) {
  // ... some code

  plugin.ready( resolve );
  // 没有error代码的话就不用管reject
} );
promise.then(function() {
  // ... some code
})
```
是否会觉的有点高大上呢
忘了说`$.when`的替代，那就是`Promise.all`方法了
```javascript
var p = Promise.all([p1, p2, p3]);
```
这里的参数类型和`$.when`稍有不同，这里传入的是一个数组对象，那我们就不必担心不定个异步参数的问题了，若想详细了解`Promise`可移步[Promise 对象](http://es6.ruanyifeng.com/#docs/promise)，嗯是的，还是阮大神的
***
看到这里的同学也是挺有耐心的，最上面的回调地狱我还没有忘，一层一层的嵌套真的很烦奥，就不能让代码堵在那？像`alert()`方法一样？答案当然是：能！
于是我们的`async`函数和`await`关键字登场了（是的，又是ES6，写代码还不用ES6和咸鱼有啥区别）
```javascript
var asyncRequest = async function () {
  var f1 = await $.ajax( '/etc/fstab' );
  var f2 = await $.ajax( '/etc/shells' );
};
```
wtf!这么简单？是的，就是这么简单，这个函数内部，就是按照你想要的、预期的、你所看到的顺序在执行，从上到下。

但是这里要注意的是`await`关键字后面必须跟一个`Promise`对象，ajax返回的也行，因为js引擎在执行时还是会根据该对象的`then`方法的状态来决定下一步如何继续，并且，如果这个对象状态变更为`reject`状态或是抛出了异常，那后面的代码是不再执行的，就和普通的代码执行逻辑一样。
`async`函数还有许多用法和技巧，如果想详细了解依然可以移步阮一峰老师的[async 函数](http://es6.ruanyifeng.com/#docs/async)

文章今天提到了`apply`函数，和其同路的还有`call`和`bind`，也许你又会说“好生僻”，可是，这都是经常用到的“神器”啊~，下一篇博文我将围绕这三个函数来讲讲他们的区别和实际使用
