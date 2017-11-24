---
title: 使用递归函数对树形菜单进行搜索
catalog: true
date: 2017-11-24 13:55:24
subtitle: 
header-img: post/IMG_3161.JPG
tags:
- recursion
---

之前对递归函数的理解还仅仅停留在书面，就是说从来没有在实际中用到过，不知道是运气好还是运气不好，做了这么久开发居然没碰到这种需求。不过倒是在`jQuery`的源码里目睹了使用递归算法的地方，`jQuery.extend`方法相信很多高玩都用过，用于拷贝对象，并且提供了深拷贝，这里的递归就是为了能够遍历对象内的对象内的对象内的对象...，这种数据我们总不能一直写下去把 😂，况且逻辑还是重复的。所以这里使用递归算法就巧妙的解决了这个问题。近日朋友在解决一个菜单搜索时遇到一个问题，这么个样子

![效果图](20171124140432.jpg)

需求是匹配到关键字的菜单及其子菜单显示出来，就是说只要当前的菜单项匹配到了，那子菜单也全部显示。
天真的我以为用个`[].fitler`函数就行了，直到我看到了数据是这样的
```json
[ {
  text: "菜单1",
  nodes: [ {
    text: "菜单1—菜单1"
    nodes: ...
  }, {
    text: "菜单1—菜单2"
    nodes: ...
  } ]
}, {
  text: "菜单2",
  nodes: [ {
    text: "菜单2—菜单1"
    nodes: ...
  } ]
} ]
```
就是说不知道菜单里有多少子菜单，所以去遍历就必须得用递归调用，将符合条件的菜单保留，好在最后解决了这个问题，下面贴出代码

```js
/**
 * 
 * @param {*} arrayData 需要递归的数据 
 * @param {*} searchText 搜索关键字
 */
function recursionSearch( arrayData, searchText ) {
  // 声明一个新的数组，不去操作原先的数据
  let newArry = [];
  // 第一层数据直接是菜单，所以不需要取nodes
  arrayData = arrayData.nodes || arrayData
  // 循环读取菜单数据
  for ( let i = 0, item; item = arrayData[ i++ ]; ) {

    // 菜单名称模糊查询
    if ( item.text && item.text.indexOf( searchText ) > -1 ) {
      // 条件满足就直接保留，不需要再遍历查找子菜单的项目
      newArry.push( item );
    } else {
      // 判断是否还有子菜单
      if ( item.nodes ) {
        // 子菜单存在，再走一次这个流程，将筛选出来的数据直接重新赋值给nodes
        let result = recursionSearch( item, searchText );
        if ( result.length ) {
          item.nodes = result;
          // 将结果放进新的item
          newArry.push( item )
        }
      }
    }
  }
  // 把筛选结果返回出去
  return newArry;
}
```
结果终究是出来了，居然花了一个多小时，中间一度要放弃了，但是秉着“老司机”的光环坚持弄出来了，还是蛮开心的。令人汗颜的是花了这么久。(lll￢ω￢)