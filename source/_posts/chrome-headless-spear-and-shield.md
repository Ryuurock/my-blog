---
title: Chrome Headless下的矛与盾
catalog: true
date: 2018-02-10 09:50:21
subtitle: 加密与解密，攻与防，兵来将挡，水来土掩，瞬息万变的互联网无时无刻不在上演着这一幕
header-img: post/IMG_3346.JPG
tags:
- headless
- chrome
- puppeteer
---
上个月刚好写了一篇[puppeteer初探](/2018/01/09/puppeteer/)，讲了一些开发中使用pupeteer进行自动化操作的东西，比如绕过一些网站的人机识别验证，自动化截图等。我们示例的是阿里云的数据风控管理平台的滑动验证，单一的滑动轨迹算法刚开始能`99%`的验证成功，但是到后面系统可能识别到一个ip反复的尝试滑动引起了注意，于是把提交过去的数据进行了汇总分析，使用了数学公式进行反向的求我们的公式（官方号称**通过生物特征判定操作计算机的是人还是机器**），于是成功率在我们的反复尝试下一直下跌直到成功率小于`1%`，具体什么公式大概能猜到，线性回归？反正我数学忘干净了（也许就没存进去过😂），那么我们使用x,y轴都随机组合（`9*9`）的算法来生成滑动轨迹，让云端的算法无法验证，那么我们就有81种可能，其实严格来说比这个更多，因为包括每一步都我们都是随机的。这样一来，成功率又达到了99%以上（无法达到100%，因为真人去滑都可能被判定失败）。

可就在昨天正当我开开心心做其他事情的时候，测试那边反馈说全挂了。阿里云客户端的sdk在2018-02-09 09:23:55这个时间打包更新了。我真是*了狗了。经过我测试，在chrome受代码控制运行时，人去拉都100%失败，就是说他们知道我们处于自动测试环境，知道这个问题就简单了，我们打印了puppeteer的启动参数，发现一个叫`--enable-automation`的参数，允许自动化？干掉这个参数后再启动果然程序和人都能成功通过。

不要高兴得太早，此时我们headless模式处于禁用状态，打开headless模式，成功率又退回0%，可见这次阿里云的更新就是冲着chrome的headless模式来的，甚至我怀疑就是我们的行为导致的。在和我们PM一番伸着脖子google后，发现了[Detecting Chrome Headless](http://antoinevastel.github.io/bot%20detection/2017/08/05/detect-chrome-headless.html)这篇文章，根据文中提到的方法，我进行了除了`Modernizr`这个的测试
* User agent      这一项不用想，puppeteer api提供了修改ua的，肯定不可能是这个，false
* Languages       我打出来是`zh-cn`，也许是chromuim更新了，false
* WebGL           false
* Missing image   false

当我看到`Plugins`这一项时，菊花一紧，妈蛋多半是这个了，我在headless模式打出navigator.plugins.length == 0果然为true，应该是headless模式下禁用了，心想完了，无解了，浏览器属性肯定是不允许修改的。

永不言弃的我们再一通google，发现了[MAKING CHROME HEADLESS UNDETECTABLE](https://intoli.com/blog/making-chrome-headless-undetectable/)和[IT IS *NOT* POSSIBLE TO DETECT AND BLOCK CHROME HEADLESS](https://intoli.com/blog/not-possible-to-block-chrome-headless/)这两篇文章，是同一个人写的。前者是检测headless模式，后者是headless模式防止被检测（我就笑笑不说话😄），后者中提到一个puppeteer的api叫`evaluateOnNewDocument`，在page这个class下，page指代标签页，看文档后我才恍然大悟，原来puppeteer的文档有描述过此类问题的处理办法，下面我将它贴出来
> page.evaluateOnNewDocument(pageFunction, ...args)
> * pageFunction <function|string> Function to be evaluated > in browser context
> * ...args <...Serializable> Arguments to pass to > pageFunction
> * returns: <Promise>
Adds a function which would be invoked in one of the > following scenarios: 
> * whenever the page is navigated
> * whenever the child frame is attached or navigated. In > this case, the function is invoked in the context of > the newly attached frame
> The function is invoked after the document was created > but before any of its scripts were run. This is useful > to amend the JavaScript environment, e.g. to seed > Math.random.
> 
> An example of overriding the navigator.languages > property before the page loads:
```js
// preload.js

// overwrite the `languages` property to use a custom getter
Object.defineProperty(navigator, "languages", {
  get: function() {
    return ["en-US", "en", "bn"];
  };
});

// In your puppeteer script, assuming the preload.js file is in same folder of our script
const preloadFile = fs.readFileSync('./preload.js', 'utf8');
await page.evaluateOnNewDocument(preloadFile);
```
在dom生成或插入前，我们重写navigator下的languages属性的getter，`defineProperty`这个api是ES5加入的，目前pupeteer提供的Chromuim的版本也不用担心兼容问题。讲道理，我感觉这是浏览器的bug，曲线修改系统属性？也不管了，我照着文档里提到的几个属性把它们的getter都重写了，虽然文档描述的这个api更像是一个事件（The function is invoked after the document was created but before any of its scripts were run. ）,但是我们还是将这些代码放到了page.goto之前，懒得再去试放到后面行不行。

在这一些准备好后，我们开启了headless模式，结果在意料之中，问题便由此解决，也不知道阿里云下次更新后，这个办法会不会被封掉，等他们封掉后也许Chromuim和puppeteer又更新了😊。