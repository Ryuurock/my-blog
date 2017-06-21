---
title: 基于jQuery的轻量图片排版插件
catalog: true
date: 2017-06-21 22:32:33
subtitle: 一个轻量的图片排版插件
header-img: post/IMG_2454.JPG
tags:
- jQuery plugin
- javascript
---

之前因为公司项目需要，一个页面图片挺多的，并且图片的分辨率完全随机，这就对页面排版要求挺高的，目前最流行的解决方案就是使用纵向瀑布流。但是因为图片加载都是异步的，js插件在获取图片容器宽高时往往得到的都是还没完全加载的值，导致并不能达到需求要的效果。于是便抽业余时间写了这个插件，虽然最后因为种种原因没有用到这个插件，但是毕竟是自己付之劳动的成果于是就作了个记录 话不多说 直接上效果图

![效果图](result.jpg)

效果还是不赖吧 >_>

> 下面是一些配置参数能简单改变排版

* `x`: 对于每个排版的margin-right，`默认5px`;
* `y`: 对于每个排版的margin-bottom，`默认5px`;
* `target`: 相对于选择器的目标元素，`默认>*`;
* `widthOffset`: 随机宽度偏移量，值越大每个项目的最大最小宽度差值越大，`默认50`（PS：过大或负数可能会造成crush）;
* `horizontalSize`: 每行的列数，`默认4`;
* `autoFullColumns`: 最后一行如果个数不满`horizontalSize`配置的个数，是否自动填充宽度，`默认false`;
* `substractPx`: 在某些视网膜屏上，因为宽度的计算丢失精度导致每行项目的最后一个掉到下一行，造成crush，所以这个参数是在原来的基础上修复这个问题，一般情况不会用到这个配置项，`默认1px`;

***
`horizontalSize`为5的预览效果
![效果图](result2.jpg)
***
`autoFullColumns`为true的预览效果
![效果图](result3.jpg)
`x、y`为1的预览效果
![效果图](result4.jpg)
***

仓库地址[jQuery retract](https://github.com/Ryuurock/jQuery.retract)

其实插件本什么有很多不足，比如遇到人像图很可能会造成“切头切脚”的情况，因为本身使用的background-image属性展示图片，并且background-size: cover，这就造成了很多地方看不到了，最好的解决方案是使用img标签来展示，并且根据给定的一个高度来动态计算出一行图片的宽高（ps：因为图片的宽高都不等，无法做到高度一定，在给定高度后任然会在这个值左右浮动），使其正好能填充一行，这样便不会造成“切头切脚”的情况了，前提是你要提前知道这些图片的宽高，或者的等到至少一组以上的图片宽高都加载到了才行。参照[百度图片](https://image.baidu.com/search/index?tn=baiduimage&ipn=r&ct=201326592&cl=2&lm=-1&st=-1&fr=&sf=1&fmq=1459502303089_R&pv=&ic=0&nc=1&z=&se=1&showtab=0&fb=0&width=&height=&face=0&istype=2&ie=utf-8&word=%E9%A3%8E%E6%99%AF)的效果也许您就明白了。

可是万恶的百度这个组件代码是压缩的，而且并不抽象，并不抽象，并不抽象！鉴于压缩代码实在是很难一时间看明白，于是我就放弃了。

其实对于上面的需求，是有一个完美的插件的[Justified-Gallery](https://github.com/miromannino/Justified-Gallery) 不管你是否提前拥有图片宽高，它都能完美加载排版出一个“画廊”，并且支持图片预览。大神的技术真的要学习啊 /笑哭。

另外还是放上我这个项目的地址吧[jQuery-pulgin-retract]()

