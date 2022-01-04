---
title: 在web页面实现IOS的毛玻璃背景效果
catalog: true
date: 2017-10-04 00:02:41
subtitle:
header-img: post/2017100323131019.jpg
tags:
- css
- aero
---
在写这篇文章之前，的我认知还停留在web页面里是无法做到像`ios`和`MAC`下那种毛玻璃效果的，虽然我知道`filter`属性，但是因为它是通过改变整个容器的失焦而不是透明背景的高斯模糊。

今天要讲述的是两个能达到这种背景模糊效果的方法
1. `backdrop-filter`属性;
2. 通过`filter`属性配合双重背景图达到背景图能够模糊，包括滚动的时候也有背景模糊效果

`backdrop-filter`属性其实是一个草案中的属性，所以鲜为人知。但是chrome早在2016年的49版本就支持这个属性了，但默认是关闭的，可能多方面的原因使得这个属性不被默认打开，比如性能问题、草案中、实现效果等。
开启方法是在地址输入`chrome://flags/`，找到`Experimental Web Platform features `，点击启用后重启浏览器。
虽然提案中，但是还是无法阻止我们追求美的决心。下面是开启后的效果。
<div style="padding: 50px 50px;color: #fff;text-align: center;font-size: 30px;background-image: url(/covers/post/2017100323131019.jpg);background-size: cover;background-attachment: fixed;position: relative;">
  <div style="position: absolute;top: 10px;width: 100%;">我<br/>被<br/>盖<br/>住<br/>啦</div>
  <p style="padding: 50px 0;backdrop-filter:blur(10px);background-color: rgba(0,0,0,.2)">Experimental Web Platform</p>
</div>

效果是不是很赞，如果您使用的不是chrome，那么下面是预览效果截图

![效果图](20171004172449.jpg)
当然了，这种办法肯定是不能用到生产环境中的，因为除了mac和ios下的safari默认支持，其余所有浏览器要么不支持，要么默认关闭，于是下面这个办法就能兼容大多数浏览器，先来看看效果
<style type="text/css">
  .bg-demo{
    position: relative;
  }
  .bg-demo:after{
    content: ' ';
    background-image: url(/covers/post/2017100323131019.jpg);background-size: cover;background-attachment: fixed;
    position: absolute;
    left: 0;top:0;
    height: 100%;
    width: 100%;
    display: block;
    filter: blur(10px);
  }
  .bg-demo:before{
    content: ' ';
    position: absolute;
    left: 0;top:0;
    height: 100%;
    width: 100%;
    background-color: rgba(0,0,0,.1);
    z-index: 1;
  }
  .bg-demo p{position: relative;z-index: 1;margin:0}
</style>
<div style="padding: 80px 50px;color: #fff;text-align: center;font-size: 30px;background-image: url(/covers/post/2017100323131019.jpg);background-size: cover;background-attachment: fixed;position: relative;overflow: hidden;">
  <div style="position: absolute;top: 10px;width: 100%;">我<br/>被<br/>盖<br/>住<br/>啦</div>
  <div class="bg-demo" style="padding: 50px 0;">
    <p>Experimental Web Platform</p>
  </div>
</div>

优点显而易见，缺点也显而易见，因为这里的透明效果不是真正意义上的透明，只是使用了两个相同的背景图，其中一个使用filter来模糊，造成了div本身是透明的错觉。因为我们不是透明的，所以背后的文字全部被挡住了，所以我们会感觉到部分内容没有被穿透。这个效果的实现原理我相信你也可以直接F12查看到。
