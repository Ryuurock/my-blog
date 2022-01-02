---
title: scratch 应用体积优化之——微前端化 scratch extensions
catalog: true
date: 2021-11-31 13:49:56
subtitle:
header-img:
tags:
  - scratch
  - 微前端
---

## 前言
`微前端` 的实现好像也用不到什么突然出现的新技术，或者有什么高深莫测的概念，可近两年它就火了。早在 2016 年被 Thought Works 提出后，也好像没有掀起什么波澜，直到 19 年 20 年，`qiankun` 等一众微前端的框架出现后这个词才渐渐热起来。在这个概念提出前，也有 `iframe` 这样的解决方案达到了类似的效果，只是它不够标准化，也没有一个高大上的名字，我们只管叫它*应用嵌套*或者就叫*嵌套一个页面*（论起名字的重要性）。

## 背景
前东家的老板在“双减”出现前，开始做领域内（少儿编程）的转型，由卖课转向做“少儿编程社区”。我作为公司内的 scratch 砖家在第一个版本上线后自然而然地开始做 scratch 在各个页面和端上的性能优化，希望它在无缓存状态能够加载得更快。

## 行动
### 寻找一击即中的优化方向
已上线的版本早在课程系统重构的时候就已经做了一版 scratch 瘦身了，无非就是使用 `webpack-bundle-analyzer` 跑一圈看看哪里有大体积文件，有重复的 npm 包，然后对症下药解决问题。由于没有足够的时间，看到 [scratch-vm/src/extensions](https://github.com/LLK/scratch-vm/tree/develop/src/extensions) 下的一堆扩展我是比较无奈的，尤其是 music 下面一堆 .mp3 文件，为了保证原汁原味的scratch，它自带的能力我们一般是不会去做移除的。scratch 的扩展打个比方就好像一个 npm 源，里面有无数的第三方包，但是你不可能一个项目需要把所有包全部装上把。scratch 的现状就是这样的——不管你用不用，我都给你怼上了，随着我们加更多扩展，js 就会越来越大。

> 尝试过 dynamic import 方案，作为个包来说，不能做到开箱即用。如果转译后发布，则需要拷贝 chunks。如果跳过 dynamic import 语法发布，需要在主应用里添加转译路径

和产品聊了后续的规划后，得知“丰富的扩展”也是我们后续要主打的一个特色，所以这个优化点能给当下和未来的带来非常直接的收益。
### 实施
#### 创建新的项目
不管是 monorepo 还是独立的仓库，我们都需要单独创建一个项目，带来的最大好处就是`独立部署`。
#### 定义数据解构
```ts
interface ExtensionMap {
  [extensionId: string]: {
    // 将扩展的实现作为异步内容
    Extension: () => import();
    // 扩展的名称等作为同步内容
    info: {
      name: string;
      extensionId: string;
      iconURL: string;
      insetIconURL: string;
      description: string;
      disabled: boolean;
    }
  }
}
```
我们以最大的内置扩展`music`为例进行迁移，得到这样的一个对象
```ts
export default {
  music: {
    Extension: () => import('./extensions/music'),
    info: {
      name: '音乐',
      extensionId: 'music',
      // ...
    }
  }
} as ExtensionMap
```
#### 编写 webpack 配置
首先你需要固定 webpack 产出的主文件的名字，如果不这么做的话，将导致入口变成动态的。
```js
const webpackConfig = {
  entry: {
    main: './src/index.js'
  },
  output: {
    filename: ({ contentHashType, chunk }) => {
      return `static/js/${contentHashType === 'javascript' && chunk.name === 'main' ? '[name].js' : '[name].[contenthash:8].js'}`
    }
  }
  ...
}
```
我们只需要固定入口文件的名字，产生的其他 chunks 依然让他带上 hash，这样可以利用缓存。

#### 部署
将 webpack 的构建产物部署到服务器，让我们能够访问到主文件如 `https://yousite.com/scratch-extension/main.js`
如果不是协商缓存的策略那么路径应该是
```js
`https://yousite.com/scratch-extension/main.js?v=${Date.now()}`
```

#### 修改 scratch 的扩展加载逻辑
首先我们找到 [scratch 的扩展加载逻辑](https://github.com/LLK/scratch-vm/blob/980e65c01d8e828671d621446a172922a9eec15e/src/extension-support/extension-manager.js?_pjax=%23js-repo-pjax-container%2C%20div%5Bitemtype%3D%22http%3A%2F%2Fschema.org%2FSoftwareSourceCode%22%5D%20main%2C%20%5Bdata-pjax-container%5D#L142-L165)

简单解释下这里的流程
1. 尝试从内置扩展列表中查找扩展并加载
2. 扩展在内置列表不存在则从网络直接加载

然后我们在`扩展在内置列表不存在`这条逻辑后面插入一段从我们组件服务，下面是伪代码

```js
new Promise(resolve => {
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://yousite.com/scratch-extension/main.js?v=${Date.now()}`
  script.onload = resolve
})
  .then(({ default: remoteExtensions }) => {
    const { Extension } = remoteExtensions[extensionURL]
    // continue
  })
```
## 收益
- 扩展作为一个单独的服务，独立开发，独立部署，构建即生效，减少发布到私有源再更新其他项目的的成本
- 扩展的 js 代码真正做到按需加载，新的扩展几乎不影响 main.js 和 scratch 本身的大小。
- 减少主应用的构建工具在这里花费的时间

## 复盘
将扩展服务的入口文件 hard coding 到代码里始终不太优雅，如果有必要，我们可以将 scratch-extensions 作为 package 发布，然后在代码里 import，然后通过 webpack 的 external 能力，在主应用上配置scratch-extensions 的外部链接来将它提取出去。甚至我们可以配合 webpack5 的 [Module Federation（模块联邦）](https://webpack.docschina.org/concepts/module-federation/#containerplugin-low-level)达到一样的效果
