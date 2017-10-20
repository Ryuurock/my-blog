---
title: ECMAScript5中新增的数组遍历方法
catalog: true
date: 2017-09-21 23:09:15
subtitle:
header-img: post/IMG_2881.JPG
tags:
- ES5
---
其实在接触`javascript`之前我甚至只知道用for循环去遍历数组，直到后来知道了`for...in`去遍历，但是直到后来知道for in带来的问题（如果扩展了`prototype`，该属性会被遍历出来，造成无法预估的错误），改用了`forEach`来循环遍历数组，再到后来了解到ES6的`for...of`也能遍历数组，但是ES6对于现代浏览器还是稍稍有点过早，今天我们要说的是早已被大多数浏览器实现的ES5标准里为数组对象添加的几个实用方法：

1. forEach
2. map
3. filter
4. some
5. every
6. reduce
7. reduceRight

### forEach
forEach可能是大家最常见的遍历数组的方法了，接收一个函数作为参数，函数一共有三个参数，第一个是当前遍历出的数组元素，第二个是当前元素的下标，第三个就是数组本身了
```js
[ 1, 2 ,3, 4 ].forEach( console.log );
// 1, 0, [1, 2, 3, 4]
// 2, 1, [1, 2, 3, 4]
// 3, 2, [1, 2, 3, 4]
// 4, 3, [1, 2, 3, 4]
```
这里要注意的是，该方法执行后不会返回值，在回掉函数里返回任何值也不会被处理

### map
map函数是我接触到也是使用第二广的方法，在接触`vuejs`这种数据驱动的`MVVM`框架之前，也有用，但是用得不多，之后因为全是和数据打交道，于是便有了很多使用场景。
其实`map`见名知意就是一个印射，将当前数组印射成了一个新的数组比如，我们有一个用户数组，但是有个接口需要传入一个用户名字得数组，下面的数组并不是很符合我们的条件，我们就需要对下面数组进行编辑生成一个新的数组，于是map就派上用场了
```js
let arr = [{
  name: '张三',
  age: 22
}, {
  name: '李四',
  age: 34
}, {
  name: '王五',
  age: 27
}];

let newArr = arr.map( function( item ) {
  return item.name;
} );
// [ '张三', '李四', '王五' ]
```
注意，map方法会将回调函数产生的值印射成一个新的值，如果你不返回值，map函数就会印射为`undefined`，如果30岁以上的我不想返回出去怎么办呢，那么`filter`函数就派上用场了

### filter
还是上面的arr变量如果要过滤掉30岁以上的数据
```js
let newArr = arr.filter( function( item ) {
  return item.age > 30;
} ).map( function( item ) {
  return item.name;
} );
// [ '李四' ]
```
这里就需要两个函数配合来完成我们的需求了，先过滤再来印射新的数组

### some
some方法好像比较少用到，还是上面的数组，如果有个需求是判断上面的用户**有一个**大于30岁的，就去执行某个事情的时候就派上用场了，some方法返回的是一个boolean类型的数据
```js
let isSomeGt30 = arr.some( function( itme ) {
  return itme.age > 30;
} );
// true
```

### every
every方法和some方法正好相反，some方法是只要有一个返回值是true，那some返回的就是true，而every方法需要所有遍历的对象都返回true才是true，否则返回false，有点像`||`和`&&`的关系，


```js
let isSomeGt30 = arr.every( function( itme ) {
  return itme.age > 30;
} );
// false
```
### reduce, reduceRight
这两个函数的callback函数接受4个参数：之前值、当前值、索引值以及数组本身。initialValue参数可选，表示初始值。若指定，则当作最初使用的previous值；如果缺省，则使用数组的第一个元素作为previous初始值，同时current往后排一位，相比有initialValue值少一次迭代。reduceRight和reduce迭代顺序相反，他是从数组右边开始的
通常我们将其用于数组的求和
```js
var sum = [1, 2, 3, 4].reduce(function ( previous, current, index, array ) {
  return previous + current;
});
// 10
```

当然出于学习的目的的话，我们还应该理解这些方法的内部实现，比如作为较低版本浏览器的`polyfill`，能够更有效的帮助我们深入理解这几个函数。




