---
title: 如何完美阻止浏览器的滚动事件向上冒泡
catalog: true
date: 2017-06-19 21:06:52
subtitle: 
header-img: post/IMG_2438.JPG
keyword: 事件,javascript
tags:
- 事件
- javascript
catagories: 
- javascript
---

我们都知道，浏览器的事件一般是从元素的一层一层网上冒泡的(`document.addEventListener`方法的第三个参数设置为`true`则是冒泡, `false`则是捕获)，鼠标的滚轮事件也不例外，当某个滚动区域的内容滚动到最底部时，则会往上走，找到最近的父元素，继续滚动。在某些时候这是个很不错的设定，但是当页面的可滚动区域过多的时候，便会造成不好的用户体验。给人以“到处都在动”的感觉，可能你马上会想到`event.stopPropagation()`这个方法，但是你可以先试试有用吗。#滑稽#

没错，我也是试了之后发现根本没什么卵用，所以就在网上找  代码如下：（摘自[http://blog.csdn.net/jyy_12/article/details/6878049](http://blog.csdn.net/jyy_12/article/details/6878049)）:
```javascript
$.fn.extend( {
  preventScroll: function() {
    $( this ).each( function() {
      var _this = this;
      if ( navigator.userAgent.indexOf( 'Firefox' ) >= 0 ) { //firefox  
        _this.addEventListener( 'DOMMouseScroll', function( e ) {
          _this.scrollTop += e.detail > 0 ? 60 : -60;
          e.preventDefault();
        }, false );
      } else {
        _this.onmousewheel = function( e ) {
          e = e || window.event;
          _this.scrollTop += e.wheelDelta > 0 ? -60 : 60;
          return false;
        };
      }
    } )
  }
} );
$( ".box" ).preventScroll();
```
然后问题就这么愉快的解决了！
于是我便开始愉快的开始测试，是的当当前滚动条滚动到滚动到顶部继续滚动的话，不会导致body或者其他父元素的滚动条继续滚动，但是总觉得哪里没对。不信的童鞋可以直接写代码测试一下。

其他浏览器我没有测试过，用chrome的童鞋肯定发现了，惯性呢？滚动的惯性呢？是的因为`e.preventDefault()`阻止了它的默认滚动行为，改用`this.scrollTop += e.detail > 0 ? 60 : -60`这种编程式的滚动，导致滚动没那么流畅了。肯定有人会说，再继续写代码模拟这个惯性不就好了吗？ 确实可以，但不觉得代价太大了点？是的，肯定有其他的解决办法。其实爱思考的人看到这里早已找到了答案，通过`e.detail`或者`e.wheelDelta`是可以知道鼠标滚轮是在向上还是向下滚动的，`向上滚，滚动到顶部，则e.preventDefault()，向下滚，滚动到最下面，也e.preventDefault()`，于是这个题目就这样完美的解决了，滚动的行为依然是浏览器的默认行为，但是它确实不再向上冒泡了，贴上代码：
```javascript
$.fn.extend( {
  preventScroll: function() {
    return $( this ).each( function() {
      var _this = this;
      if ( navigator.userAgent.toLowerCase().indexOf( "firefox" ) > 0 ) {
        _this.addEventListener( 'DOMMouseScroll', function( e ) {
          // 滚动到最下面，并且鼠标向上（反正是一直往下拉那个动作）
          if ( this.scrollTop + this.clientHeight == this.scrollHeight && e.detail < 0 ) {
            e.preventDefault();
            e.returnValue = false;
          }
          // 滚动到最上面，并且鼠标向下（反正是一直往上拉那个动作）
          else if ( this.scrollTop === 0 && e.wheelDelta > 0 ) {
            e.preventDefault();
            e.returnValue = false;
          }
        }, false );
      } else {
        _this.addEventListener( 'mousewheel', function( e ) {
          if ( this.scrollTop + this.clientHeight == this.scrollHeight && e.wheelDelta < 0 ) {
            e.preventDefault();
            e.returnValue = false;
          } else if ( this.scrollTop === 0 && e.wheelDelta > 0 ) {
            e.preventDefault();
            e.returnValue = false;
          }
        }, false );
      }
      return this;
    } );
  }
} );
```
是的，这个问题就这么完美解决了，可能不是最佳实现，但是确实比上面的代码要更贴近浏览器原来的样子，我们在写代码的时候对于浏览器的默认行为，不管是从代码来说还是用户体验来说，都应该抱着谨慎的态度。