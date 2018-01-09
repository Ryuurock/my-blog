---
title: 搭建属于自己的web推送服务
catalog: true
date: 2017-12-10 21:31:32
subtitle: 
header-img: post/15.jpg
tags:
- websocket
- nodejs
---
上一次说`websocket`还是在“[解决Websocket并发执行的问题](/2017/09/12/page-parallel-execute)”这篇文章，不过提到的内容是在不同标签页的消息同时到来时的处理方式，不过治标不治本，还是有几率出现重复推送的问题，而且这样的代码也不是很严谨，所以这个问题只能从服务端着手了。其实在很早之前就看过`goeasy`这个第三方推送服务的`client`源码，当时就吐槽它们代码之烂，二次封装的代码居然直接修改了`socket.io`（goeasy是基于nodejs的开源库[socket.io](http://socket.io)来做的）的源码，然后添加了自己的代码，再将`goeasy`构造函数强行暴露给window，据说是为了适配不同了浏览器要求一定要动态引用他们的js代码，我猜应该是做了cdn处理吧，可恶的是还拒绝缓存，所以有时候会造成我们网站一直等待goeasy的js代码。扯远了，还是说说我们自己如何去构建一个基于channel的推送服务吧。

`socoket.io`这个库把自己封装得更像是一个聊天室，甚至里面的有属性也命名为`room`（若理解错误还请轻喷）。我们的网页应用更侧重于按用户id接收来自服务器的消息推送，因为可能存在多个标签页，所以就可能反复的订阅消息，这也是导致上面我的提到的重复推送的问题，因为我们是基于h5的`Notification`来做的，网页一旦都接收消息，就会出现几个标签页，收到几次桌面通知的问题。所以，我也是直接吸收了goeasy的设计思路，直接按channel来订阅和发送消息。文档都是摆在那儿的，网上零零碎碎的教程也不系统化，还是只能看官方文档，英语不到位也只能看会儿机翻的结果再适当切回去。

我采用的是`socket.io + express 4`的模式，其实要将二者结合起来还是非常简单的
```js
var app = require( 'express' )();
var server = require( 'http' ).createServer( app );
var io = require( 'socket.io' )( server );
server.listen( 3000 );
```
主要还是在`io`这里，我们需要处理来自客户端的连接事件
```js
io.on( 'connection', function( socket ) {
  socket
    .on( 'login', function( { channel, socketDeviceID } ) {
      // 这里至关重要，我们用这个标记这个连接是否来自同一个浏览器
      socket.socketDeviceID = socketDeviceID
      // 将这个连接合并到channel这个频道，也就是用户id
      socket.join( channel )
    } )
    .on( 'message', function( content ) {
      messageSend( io, content )
    } )
} )
```
其实这里很简单，就是监听客户端连接，然后再监听当前连接的login事件，再自动合并相同用户的连接。
为了方便理解再贴上客户端代码
```js
import io from 'socket.io-client'
let socket = io( 'localhost:3000' )

soket.emit( 'login', {
  channel: 'user1',
  socketDeviceID: 'xxxxxxx' // 这里是一个随机字符串，反正能尽量保证当前浏览器的唯一性就好了
} )
```
客户端也很简单吧。
其实麻烦的是我们要处理消息的发送就是上面的`messageSend`函数要做的事，`content`的结构因该是
```json
{
  "channel": "",
  "content": "",
  "ak": ""
}
```
用户id，发送内容和`application key`，ak是为了防止别人恶意调用。
上面的`message`事件只是为了后面的客户端提交，我们的程序服务端要发送事件应该提供更友好的发送方式，所以我们就需要一个url来提供api形式的推送`express`的路由就不赘述了，因为不是本篇文章的讲述内容。下面是`/publish`接口的处理函数
```js
messageSend( io, { channel, content, ak } ) {

  if ( ak !== 'ak' ) return Promise.resolve( 10001 )
  if ( !channel || !content ) return Promise.resolve( 10002 )
  let { event } = typeof content !== 'object' ? JSON.parse( content ) : content

  return new Promise( ( resolve, reject ) => {
    io.to( channel ).clients( function( err, clients ) {
      err && reject( err )
      let { connected } = io.of( '/' )
      let promiseArray = []
      // 我们在这里单独处理message类型的事件
      // ps: 推往客户端的内容有一个规范，event字段为必须项，用来描述内容的类型，messge|refresh等
      if ( event === 'message' ) {
        let names = {}
        // 在这里将来自同一个浏览器的连接进行合并，取最后连接上的那个连接
        clients.forEach( item => names[ connected[ item ].socketDeviceID ] = item )
        // 填充消息进行发送
        promiseArray = Object.keys( names ).map( key => messageEmit( connected[ names[ key ] ], channel, content ) )
      } else {
        promiseArray = clients.map( clientId => messageEmit( connected[ clientId ], channel, content ) )
      }
      // 将消息一并发送出去 
      // TODO，应将0以外的消息进行筛选
      Promise.all( promiseArray ).then( () => resolve( 0 ) )
    } )
  } )
}
```
这是对消息的发送对象进行处理，下面是发送逻辑
```js
/**
 * 发送消息，延迟N秒后告知发送失败
 * @param {*} socket 
 * @param {*} content 
 */
function messageEmit( socket, channel, content ) {
  let { event } = typeof content !== 'object' ? JSON.parse( content ) : content
  function pushDBData( status ) {
    let platform = channel.substr( channel.lastIndexOf( '_' ) + 1 )
    // 将消息发送结果存入等待持久化的队列
    pushArrayAdd( {
      channel,
      status,
      send_content: JSON.stringify( content ),
      push_date: Date.now(),
      event_type: event,
      platform
    } )
  }

  return new Promise( ( resolve ) => {
    let retry = retryTimes
    let timeID = setTimeout( function sendTimeout() {
      if ( !retry ) {
        resolve( 10000 )
        pushDBData( 0 )
      } else {
        retry--
        sendTimeout()
        console.log( `${new Date}用户“${channel}”消息发送超时` )
      }
    }, sendTimeout )
    socket.emit( 'message', content, function() {
      resolve( 0 )
      clearTimeout( timeID )
      pushDBData( 1 )
    } )
  } ).catch( err => { throw new Error( err ) } )
}
```
对消息发送，超出时间未收到客户端的响应递归尝试N次，一直失败则判定为失败。这里的10000和0都是对接口请求者的响应码。
接下来是对发送记录的入库
```js
exports.pushArrayAdd = function( pushItem ) {
  pushArray.push( pushItem )
  if ( pushArray.length >= 100 ) {
    console.log(`插入数据库${new Date}`)
    // 每一百条数据清空一次
    staistical.insertPushRecord( _.cloneDeep( pushArray ) )
    pushArray = []
  }
}
```
`pushArray`肯定是一个单例模式的数据，也就是我们的`dataStore`，我们肯定不能发一条就存一条，这也不专业，定时储存或达到一个量再储存是比较为数据库着想的。如果消息推送得少我们可以再启动一个定时器定时去清空一次这个队列，防止数据过久存放在内存里导致更新不及时，或服务重启导致的数据丢失。
接下来就是数据库的写入操作了，nodejs发展到今天生态已经很好了，对mysql进行操作的包与其同名，不过操作起来感觉还是过于简陋，对于`connection`都是手动拿手动释放。不过连接池这一块貌似很方便。期间用到了非常非常多的回调，mysql这个包也没有提供Promise返回（我猜的，官方推荐是回调的形式），还好我用的nodejs版本比较高，我便优雅的全部封装成Promise返回了，方便我调用，于是像`query、insert`这样的函数我就直接声明成`asycn`函数了
```js
const mysql = require( 'mysql' )
const { mysql: mysqlConfig } = require( '../config' )
const pool = mysql.createPool( mysqlConfig )
/**
 * 获取连接池中的连接
 */
module.exports = class DBBase {

  /**
   * 获取数据库连接
   */
  getConnection() {
    return new Promise( ( resolve, reject ) => {
      pool.getConnection( ( err, connection ) => ( err ? reject( err ) : resolve( connection ) ) )
    } ).catch( err => {
      console.log( err )
    } )
  }

  /**
   * 查询记录
   * 
   * @param {*} sql 
   * @param {*} condition 
   */
  async query( sql, condition ) {
    let con = await this.getConnection()
    return new Promise( ( resolve, reject ) => {
      con.query( sql, condition, ( err, result ) => {
        err ? reject( err ) : resolve( result )
        con.release()
      } )
    } )
  }

  /**
   * 插入记录
   * 
   * @param {*} sql 
   * @param {*} dataArray 
   */
  insert( sql, dataArray ) {
    return this.query( sql, [ dataArray ] )
  }
}

```
这是所有需要有数据库操作的对象的基类，这样一来我所有的操作就不用再去手动取连接，用完再释放了，下面是继承它的子类的一些简单操作
```js
class StatisticalDao extends DBBase {
  constructor() {
    super()
  }

  async insertPushRecord( arr ) {
    
    let insertData = arr.map( item => ( [
      item.push_date,
      item.send_content,
      item.status,
      item.channel,
      item.event_type,
      item.platform
    ] ) )

    return await this.insert( `insert into bigwe_notification_records( 
      push_date, 
      send_content, 
      status,
      channel,
      event_type,
      platform
    ) values ?`,
      insertData )
  }
}

module.exports = new StatisticalDao()
```
哈，Dao的结尾命名纯属情怀，想起了写java的时光。这里的`insertPushRecord`方法就是上面对队列里的数据操作时调用的方法，批量插入数据。
其实在接收来此接口请求者post过来的数据的时候还有点小插曲，先是get取得到post取不到于是加了这句
```js
const bodyParser = require( 'body-parser' )

app.use( bodyParser.json() )
app.use( bodyParser.urlencoded( { extended: true } ) )
```
html端post取到了，后面模拟真实后端post，又取不到了，原来是格式原因，`jquery`默认了我们的json格式于是以application/json的格式post，而后端的post是以`form`的格式post，于是又引入了
```js
const connectMultiparty = require( 'connect-multiparty' )
app.post( '/publish', connectMultiparty(), routerHandler.publish( io ) )
```
这样来处理form数据，真是坎坷啊。

以上则是服务端的大致情况，当然，这仅仅是能完成推送服务，还有在线人数统计等需要慢慢完善的功能。
客户端的代码则相当简单了，提供一个订阅函数就好了，并且在代码里记得`ws`断线重连后重新login，不然就接收不到消息了。
完整的代码整理后会放到github，敬请期待~ 😄