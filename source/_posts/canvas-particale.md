---
title: canvas粒子效果初探
catalog: true
date: 2018-05-18 10:41:04
subtitle: 我是谁我在哪儿
header-img: post/IMG_3951.JPG
tags:
- canvas
---
在这之前对`canvas`这个标签还一直停留在
* 效果炫酷
* api复杂难懂

好吧，直到今天我也是这么觉得，但是好在已经有很多详细的文档和例子来帮我们理解这些api。
今天我们要做的canvas粒子效果如下图所示
<video src="video.mp4" controls></video>

**踩坑：**
canvas这个标签，设置宽高的时候是要使用标签的`width`和`height`属性来设置的，不能通过`style`的宽高来设置，否则会造成绘制出来的图形很模糊并且位置产生偏移

废话不多说，本次的粒子动画用到的canvas的api有
* clearRect(x, y, width, height) 清除画布上一个方形的区域，参数一看就懂系列
* drawImage(Image: image, x, y, height, width) 在画布上绘制一张图片，第一个参数是一个image对象，可以使用Image构造函数来生成
* arc(x, y, r, sAngle, eAngle, counterclockwise)

  圆的中心的 x 坐标。
  y	圆的中心的 y 坐标。
  r	圆的半径。
  sAngle	起始角，以弧度计。（弧的圆形的三点钟位置是 0 度）。
  eAngle	结束角，以弧度计。
  counterclockwise	可选。规定应该逆时针还是顺时针绘图。False = 顺时针，true = 逆时针。
* getImageData(0, 0, width, height) 获取画布上一块区域的图片信息

`getImageData`返回的对象里面包含了一个data属性，data属性是一个数组，返回了该区域内的所有像素点信息，以i~i+3为一组描述一个像素的rgba，例如
```js
const context = document.getElementById('canvas').getContext('2d');
const data = context.getImageData(0,0,1,1).data;
const red = data[0],
  green = data[1],
  blue = data[2],
  alpha = data[3];
```
我们获取了1*1个像素点的信息，返回一个长度为4的数组，四个颜色分别对应红、黄、蓝和透明度，都是0~255的范围，不过这里的alpha通道和css有点不一样，css的alpha通道是0~1。

总结一下整个思路

1. 绘制一张图到画布上
2. 获取像素点（对返回的像素点进行固定间隔的跳跃式获取，即可得到一组马赛克式的像素数据），并相对于整个画布随机出每个像素点的初始位置分散时随机位置。
3. 分散像素点（不断更新所有点的位置）

第一步我们就先画一张图在canvas上吧
```html
<canvas id="canvas1" style="margin: 0 auto;"></canvas>
```
```js
const canvas = document.getElementById('canvas1')
const width = 300,
  height = width * .75
const imgHeight = height * 0.6,
  imgWidth = imgHeight;

canvas.width = width
canvas.height = height
const context = canvas.getContext('2d');
const image = new Image();
image.src = 'avatar.png';
// image.width = imgWidth
// image.height = imgHeight

image.onload = function() {
  context.drawImage(image, width / 2 - imgWidth / 2, height / 2 - imgHeight / 2, imgWidth, imgHeight)
}
```

效果如下
<canvas id="canvas1" style="margin: 0 auto;"></canvas>
<script>
const width = 300,
  height = width * .75
const imgHeight = height * 0.6,
  imgWidth = imgHeight;
let fn = null;
(function() {
  const canvas = document.getElementById('canvas1')

  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d');
  const image = new Image();
  image.src = 'avatar.png';
  // image.width = imgWidth
  // image.height = imgHeight
  
  image.onload = function() {
    context.drawImage(image, width / 2 - imgWidth / 2, height / 2 - imgHeight / 2, imgWidth, imgHeight)
    fn && fn();
  }
}());
</script>
现在我们便绘制了一张图到canvas上面，是一张完整的图，然后我们现在将像素点取出来以一定间隔进行拼装

```js
const canvas = document.getElementById('canvas1');
const canvas2 = document.getElementById('canvas2');
canvas2.width = width
canvas2.height = height
const ctx = canvas.getContext('2d');
const ctx2 = canvas2.getContext('2d');
const imageData = ctx.getImageData(width / 2 - imgWidth / 2, height / 2 - imgHeight / 2, imgWidth, imgHeight);
// const imageData = ctx.getImageData(0, 0, width, height);
const pixData = imageData.data;
// 粒子的半径
const radius = 2;
// 像素点对象
const dots = [];
// 对数据宽高进行嵌套循环
for (let x = 0; x < imageData.width; x += radius * 2) {
  for (let y = 0; y < imageData.height; y += radius * 2) {
    // 当前像素的起始坐标 行的数据位置加上列的位置乘以4 4对应rgba的位置0，1，2，3
    let i = (y * imageData.width + x) * 4;
    if (pixData[i + 3] !== 0 && pixData[i] !== 255 && pixData[i + 1] !== 255 && pixData[i + 2] !== 255) {
      dots.push({
        x: x + (width / 2 - imgWidth / 2),
        y: y + (height / 2 - imgHeight / 2),
        ex: Math.random() * width,
        ey: Math.random() * height,
        color: `rgba(${pixData[i]}, ${pixData[i+1]},${pixData[i+2]}, 1)`
      })
    }
  }
}

dots.forEach(({
  x,
  y,
  color
}) => {
  console.log(color)
  ctx2.beginPath();
  ctx2.fillStyle = color;
  ctx2.arc(x, y, radius, 0, Math.PI * 2);
  ctx2.fill();
  ctx2.closePath();
})
```
得到下面的效果
<canvas id="canvas2" style="margin: 0 auto;"></canvas>
假如我们添加一个点击事件让粒子直接散开(直接点击上面的图片画板预览效果)
```js
document.getElementById('canvas2').addEventListener('click', function _() {
  ctx2.clearRect(0, 0, width, height);
  window.dots.forEach((dot) => {
    dot.x += (dot.x - dot.ex) * 0.05;
    dot.y += (dot.y - dot.ey) * 0.06;
    ctx2.beginPath();
    ctx2.fillStyle = dot.color;
    ctx2.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.closePath();
  })
  if (count < 0) {
    count = 60
    // 调用刚才取像素点的方法重新绘图以重置
    fn();
  } else {
    requestAnimationFrame(_);
    count--;
  }
}, false);
```
由此我们就可以延伸出许许多多的粒子动画效果了，散开，合并，随机轨迹运动等等
<script>
// 粒子的半径
const radius = 2;
const canvas = document.getElementById('canvas1');
const canvas2 = document.getElementById('canvas2');
canvas2.width = width
canvas2.height = height
const ctx = canvas.getContext('2d');
const ctx2 = canvas2.getContext('2d');
let count = 100;
document.getElementById('canvas2').addEventListener('click', function _() {
  ctx2.clearRect(0, 0, width, height);
  window.dots.forEach((dot) => {
    dot.x += (dot.x - dot.ex) * 0.05;
    dot.y += (dot.y - dot.ey) * 0.06;
    ctx2.beginPath();
    ctx2.fillStyle = dot.color;
    ctx2.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.closePath();
  })
  if (count < 0) {
    count = 60
    fn();
  } else {
    requestAnimationFrame(_);
    count--;
  }
}, false);


fn = function (){
  ctx2.clearRect(0, 0, width, height);
  const imageData = ctx.getImageData(width / 2 - imgWidth / 2, height / 2 - imgHeight / 2, imgWidth, imgHeight);
  // const imageData = ctx.getImageData(0, 0, width, height);
  const pixData = imageData.data;
  // 像素点对象
  window.dots = [];
  // 对数据宽高进行嵌套循环
  for (let x = 0; x < imageData.width; x += radius * 2) {
    for (let y = 0; y < imageData.height; y += radius * 2) {
      // 当前像素的起始坐标 行的数据位置加上列的位置乘以4 4对应rgba的位置0，1，2，3
      let i = (y * imageData.width + x) * 4;
      if (pixData[i + 3] !== 0 && pixData[i] !== 255 && pixData[i + 1] !== 255 && pixData[i + 2] !== 255) {
        window.dots.push({
          x: x + (width / 2 - imgWidth / 2),
          y: y + (height / 2 - imgHeight / 2),
          ex: Math.random() * width,
          ey: Math.random() * height,
          color: `rgba(${pixData[i]}, ${pixData[i+1]},${pixData[i+2]}, 1)`
        })
      }
    }
  }

  window.dots.forEach(({
    x,
    y,
    color
  }) => {
    ctx2.beginPath();
    ctx2.fillStyle = color;
    ctx2.arc(x, y, radius, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.closePath();
  })
};
</script>
