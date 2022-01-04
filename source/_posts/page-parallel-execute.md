---
title: 解决Websocket并发执行的问题
catalog: true
date: 2017-09-12 21:08:00
subtitle: setTimeout也算能线救国
header-img: post/IMG_2847.JPG
tags:
- websocket
- 并发
---
在解决掉这个问题之前，我都有点想放弃了，因为尝试的方法都不行，照惯例先来描述下问题吧。

> 为了能在所有页面能接收到服务器给用户发起的通知，所以我们在每个页面建立了`websocket`长连接来监听服务器的动静，那么问题来了，如果我开启了两个，三个甚至四个标签页，那效果你能猜到：刷刷刷一排通知烦到你直接关了通知功能。

标签页之间的通信，我了解到的目前就两种
* 通过`window.opener.window.postMessage`来对`opener`发起消息
* 通过`localStorage`或`webSQL`等媒介来通信

当然还有很多奇奇怪怪的办法，主流的办法还是采用后者，前者因为限制太多直接pass，`webSQL`有兼容性问题还是pass，所以最后选择了`localStorage`。

其实我最先的解决办法还是很简单直接的，看起来也是对的：
```js
// 比如我的消息回调函数是这样的
websocket.onmessage = function( msg ) {

  if ( localStorage.getItem( 'isNotice' ) === '1' ) return;

  localStorage.setItem( 'isNotice', '1' );
  // 进行通知
  doNotice( msg );

  // 一秒后重置为未通知，因为同时通知的时间比较接近，所以需要等待1秒左右再重置
  setTimeout( () => localStorage.setItem( 'isNotice', '0' ), 1e3 );
}
```
是不是看起来很完美，对呀我也觉得很完美，可是我们忽略了一个问题，浏览器在往磁盘写文件的时候是需要时间的，而这个Output动作相对于JavaScript的执行来说非常的耗时，两个通知的时间非常非常的接近，经过我的测试最近的达到`5ms`，还是在只测试了几次的情况。所以这短短的5ms根本来不及将数据写入到磁盘（或许原理不是这样，但在两个标签页的情况下测试结果确实是一个先通知进行磁盘写入，后通知的`localStorage.getItem( 'isNotice' )`还是等于`0`）.

于是我就想到通过`localStorage`来同步每次通知开启的情况代码太乱就不贴出来了，直接说说思路
> 标签页通常情况是一个一个打开的，那么我们就直接从websocket链接本身来解决问题，当打开一个页面时我们开启通知，然后在`localStorage`标记好通知已经开启，同时监听一个叫`onunload`的事件(就是页面在跳转或关闭时会触发的事件)，事件响应时我们标记通知websocket已经关闭，然后我们新开页面的时候就去再去监听`Storage`事件（如果通知开启过了），这个事件一旦响应，我们就再去启动`websocket`链接。连起来的逻辑就是<br/><br/>整个系统只允许开启一个`websocket`链接，开启了`websocket`的页面在关闭时去标记通知已经关闭，其他页面知道后就会再去开启一个`websocket`链接，可问题就是，只能在两个页面开启的情况下有效，因为如果有两个页面监听了`Storage`事件，那么还是会开启两次链接，即使解决了这个问题，当浏览器崩溃等非正常关闭页面时，`onunload`事件不会触发，就是说如果页面崩溃一次，那就再也见不到通知了。这很悲惨，于是我又回到了“**在开启多个websocket连接的情况，如何只通知一次消息**”这个问题

经过一番深思，我想到了“你们这么积极要通知，那好，等你们闹腾完了我再把消息拿去通知吧”，思路是这样的：

> 通知来临时我们直接将通知内容写到`Storage`，然后`setTimeout`延时来取得这个内容进行通知，然后再移除这个通知内容，但是setTimeout的时间非常关键，如果是个固定值，那也白忙活了，必须保证每个页面的延时都不一样且相差较大

```js
websocket.onmessage = function( msg ) {
  localStorage.setItem( 'notice', msg );

  setTimeout( function() {
    let noticeContent = localStorage.getItem( 'notice' )
    noticeContent && doNotice( noticeContent );
    localStorage.removeItem( 'notice' );
  }, Math.random() * 3000 )
}
```
其实只能说问题解决了一半，因为算法能力比较捉急，只能随便写个3000内的随机数，如果运气不好随机到很接近的数，还是可能会重复通知，并且页面越多，几率越大。如果你看到这里有什么好的办法，欢迎邮件或留言通知我与我互相交流。

也许要从根本解决这个问题，就只能开启一个通知吧。
