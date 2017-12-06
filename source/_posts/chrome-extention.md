---
title: 记一次chrome扩展开发
catalog: true
date: 2017-11-27 21:21:54
subtitle: 
header-img: post/IMG_3167.JPG
tags:
- chrome extention
---
讲真，在这之前我甚至不知道chrome的插件是由`javascript`驱动的，最近因为为了优化产品的体验，开始从chrome插件来下手，因为chrome插件能强势侵入别家的网页，篡改任何你想篡改的东西，甚至可以将`http`的请求和响应数据进行修改。官方文档需要梯子， [360翻译的文档](http://open.chrome.360.cn/)（不是一般的老，看网页布局就知道了）, [百度翻译的文档](https://chajian.baidu.com/developer/extensions/getstarted.html).废话不多说，先来看看入口吧
chrome插件最重要的是一个叫`manifest.json`的文件，文件描述了整个扩展的行为：
* 整个扩展需要的权限（网络请求，标签页读取等）
* 扩展的icon
* 扩展的contentScript、background、popup资源路径
* ...
`contentScript`是注入到页面的js代码，但是它执行于一个隔离的环境，变量函数等与现有网页不会互相污染。
`background`是一个背景
> 背景页是一个运行在扩展进程中的HTML页面。它在你的扩展的整个生命周期都存在，同时，在同一时间只有一个实例处于活动状态。

上面这句话是官方文档翻译后的描述，很符合“背景”这个名字，在后台，安安静静，相对一个整个浏览器的这个扩展，只有一个实例。
`popup`这个页面就是我们在点击扩展按钮时弹出的一个html页面，它可以与其他两个进行通信。

其实我们要做的是，将微信等平台通过`iframe`的形式嵌入到我们页面，且不让用户看到，通过代码来操作iframe内的内容，使用户在使用我们产品的同时，能够保留保留微信后台的体验。

经过我的整理，整个扩展与我们页面的交互流程大致应该是这样的
1. 当页面发起一个请求，判断插件是否安装成功
2. 若安装有扩展则再通知扩展需要的操作
3. 扩展插入iframe后注入contentScript
4. contentScript执行再通知扩展，扩展再通知我们的页面获取结果

当然这只是一个大致流程，扩展的`contentScript`与页面唯一的通信方法则是触发某个dom的原生事件或自定义事件，再传入所需的数据。**发布/订阅模式**看来真的是万能啊。

当然，为了其他人开发的方便性和可维护性，我建立了一个单独的模块`chromeExtentionHandler`，由这个模块统一管理与扩展的交互（这也是发布/订阅模式的弊端，过多的订阅发布，容易造成困扰，降低代码可读性）

监听来自扩展的事件，只需要一处就够了，扩展通过带过来的数据来告知模块需要发布或处理怎样的数据，所以定义的页面端的模块传入数据是这样的
```json
{
  "event": "",
  "platform": "",
  "data": {}
}
```
所以我在事件监听处是这么写的
```js
document.body.addEventListener( 'extensionBrowerEvent', function( { detail } ) {
  let jsonDetail = null;
  try {
    jsonDetail = typeof detail === 'object' ? ( detail || {} ) : JSON.parse( detail );
  } catch ( error ) {
    return;
  }
  let { event, data, platform } = jsonDetail;

  let eventHandlers = platformHandler[ platform ];
  let namespaceEvent = `${platform}.${event}`;

  if ( eventHandlers ) {
    // 根据平台来获取相关的事件处理
    let handlerItem = eventHandlers[ namespaceEvent ];
    handlerItem ? handlerItem( data ) : events.emit( namespaceEvent, data );
  } else {
    events.emit( namespaceEvent, data );
  }
}, false );
```
`event`就是用来描述此次扩展消息的名称的，因为可能会存在多个平台操作的问题，所以`platform`用来标记平台名称，比如`wechat`，data当然是此次消息需要的数据。`namespaceEvent`是用来描述命名空间了，为了对不同平台相同的事件进行区分。
这些事件中，有些需要模块来处理，有些需要模块调用者来处理，所以在上面的`if`逻辑里，就是用扩展通知的数据去匹配定义在对象里的函数进行处理，处理后再由函数决定是否发布此事件，若没有匹配到，则直接在此发布事件，说明此事件应由模块调用者自己处理。举个例子，扩展发出的数据是这样的
```json
{
  "event": "scanCode",
  "platform": "wechat",
  "data": null
}
```
于是我们在平台为`wechat`的模块里定义了它的处理函数
```js
{
  'wechat.scanCode'( data ) {
    // do something

    events.emit( 'wechat.scanCode', data );
  }
}
```
通过上面的事件函数就能匹配到这里的函数再执行，那么如果有一个行文是一连串的话要怎么解决呢，比如发送一篇文章的流程是，**登录》扫码》进入主页》跳转到编辑器页面》插入发送内容》...**。难道调用者都要如此去每个事件监听再处理吗。为此，我们需要提供一个行为，叫“发送文章”，像大多数轮子一样，我们只需要提供一个函数就够了，如果是异步的，则返回一个`Promise`实例。于是wechat平台下还应该有这么一个对象
```js
export default {
  sendArticle: ( function() {
    // 用户信息缓存
    let userInfoTemp = null;

    return function( articles, appID ) {

      return new Promise( ( resolve, reject ) => {
        
        // 发起一个封装好的通知插件初始化iframe的请求
        initWechatFrame();
        // 进入微信公众平台首页
        event.one( wechatConst._enteredIndex, async function() {

          // 发起获取公众号账户和密码的请求
          let { username, password } = userInfoTemp ? Promise.resolve( userInfoTemp ) : await $.ajax

          sendMessageToPulgin( {
            platform: 'wechat',
            // 这里后面会讲为什么event也有命名空间
            event: 'page.login',
            data: {
              username,
              password
            }
          } );

        } );
        
        event.one( wechatConst._enteredHome, function() {
          // 登录成功进入首页
          sendMessageToPulgin( {
            platform: 'wechat',
            event: 'page.goEditor'
          } );
        } );

        event.one( wechatConst._enteredEditor, function() {
          // 登录成功进入编辑器
          
          // some code
        } );

          // 发送成功
        event.one( wechatConst.sendSuccess, resolve );


      } ).catch( err => {
        throw new Error( err );
      } );

    };
  }() )
};
```
这里使用闭包函数是为了缓存用户信息，方便在多次操作时提高效率
为什么没有使用链式调用进行订阅，因为在这里还少一点代码没有码上，`one`方法返回一个当前订阅事件的id，为了在某个时刻对它们的订阅统一解除。虽然这里只订阅一次，但是还是有在某些情况出现重复订阅的情况，比如操作中途取消掉再操作。
至此，类似的一个行为的订阅集合，我们就能统一放到一个方法里面再导出，为模块调用者提供一套独立的业务能力，发送、预览等。

模块端就马马虎虎介绍到这里，很多细节应该是遗漏了，想到要如果要逐行的描述出来，怕是您也没什么兴趣读下去了。

接下来是扩展端，扩展端其实我已经想到了很远，甚至想到了兼容无数平台的场景，但是。。。。

扩展端我们还是尊崇一进一出原则，一个出口，一个入口。扩展端接收的消息类型更复杂，从通知扩展插入iframe，再到注入脚本到iframe内，iframe的事件通知给我们的页面都是个繁杂的过程。因为iframe的事件首先要通知给插入到iframe的脚本，脚本再通知给最外层的，也就是注入到我们页面的`contentscript`，再由它来通知给页面dom触发事件。

##### 还是先从入口说起吧。
思路是从一个`contentScript.js`文件作为入口，发送的消息还是按照平台来区分，但是`event`会多一个命名空间，用来区分事件是给通知`contentScript`的还是通知插入到iframe的`contentScript`的，这里我们为了区分每个平台就分别对应一个contentScript，查了文档，在使用下面这段代码
```js
chrome.tabs.executeScript( tabId, {
  file: fileName,
  allFrames: true
} );
```
不能单独指定到哪个iframe，所以在代码执行前需要判断当前的`hostname`。

我们如何知道页面进入了哪个地址下，然后需要做什么事呢，每个页面肯定有一个单独的url，在我们插入iframe时再绑定一个`onload`事件，每次在回调里注入我们的代码，代码立即会执行，再用`location.pathname`取得当前页面的pathname，以此名称作为函数名称来执行要做的事情（当然肯定要组织一个对象来存放映射的函数），比如通知我们的页面进入首页了，接下来需要输入密码登录。当然，可能并不是所有的网站每个页面都有个独立的pathname，比如微信后台某些页面带了查询参数来区分页面，那我们将参数取出再匹配一次，之前的pathname就不声明为函数，而声明为对象，将查询参数再匹配一次获得最终的结果。

当然为了掌握别人的页面，我们肯定也要掌握每一个网络请求，chrome扩展本身提供了对网络请求的拦截，但不幸的是没有把响应消息体给我们，所以只能采取极端手段了，将代码真正的注入到dom里来改变原生`XmlHttpRequest`对象的行为，当然，这个权限也是要在`manifest.json`里面事先声明的。
```js
XMLHttpRequest.prototype.open = ( function( original_function ) {
  return function( method, url, async ) {
    // 保存请求相关参数
    this.requestMethod = method;
    this.requestURL = url;

    this.addEventListener( "readystatechange", function() {
      if ( this.readyState === 4 ) {

        // do something


      }

    } );
    return original_function.apply( this, arguments );
  };
}( XMLHttpRequest.prototype.open ) );

XMLHttpRequest.prototype.send = ( function( original_function ) {
  return function( data ) {
    // 保存请求相关参数
    this.requestData = data;
    return original_function.apply( this, arguments );
  };
}( XMLHttpRequest.prototype.send ) );
```
这样我们就能掌握所有的ajax请求了（当然`fetch`函数除外），对一些关注的网络请求，就能进行处理，并通知给扩展，扩展再通知给页面。最后便形成了目标页面到扩展，扩展再到页面的流程了。值得注意的是：
* iframe内发起的事件带出的数据，扩展内无法接收到也不知道是什么原因，所以最后我就放置了一个`textarea`标签来作为容器，通知扩展去取。
* 自定义事件带入的数据需要{ detail: data } 这样的结构，因为在接收方需要以`event.detail`的方式去取。

说了这么久感觉讲得不是很好，所以决定直接把代码放到github吧。[仓库地址](https://github.com/Ryuurock/blog-code/tree/master/chrome-extention-demo)

