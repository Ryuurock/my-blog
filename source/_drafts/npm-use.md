---
title: npm踩坑使用
catalog: true
date: 2018-11-20 21:51:33
subtitle:
header-img:
tags: npm
---

npm想必是JavaScript技术栈的同学必备的技能，下面是是我记录的一些npm的使用。
## 命令篇
我当然不会讲npm install这种大家都知道的命令，我们来说一些大家可能很少知道的npm的使用，并且能在日常开发中派上用场

`--no-package-lock`
npm5之后加入的**package-lock.json**文件圈内一直对它褒贬不一，它的作用是锁定依赖安装结构，就是说你npm install包的时候是什么版本，除非你手动升级或降级包版本，否则都会被锁定在当时的版本。对于一些bug性的修复我们就很容易错过，对于普通的包还好，如果我们依赖一个快速迭代并且我们也需要及时更新（小版本）的包我们就可以不让npm锁定我们的包版本例如：
```bash
npm i react -S --no-package-lock
```
此时react的版本信息就不会被锁定，当然大版本还是会被锁定，因为版本信息以`^x.x.x`这样的形势保存在package.json文件内。这样做的好处就是，如果你的整个测试发布流程都是自动化的，在服务端每次构建时都会运行npm install安装了改大版本下的最新版本，已保证包的一些bug修复和补丁形式的更新

`--ignore-scripts`
这个安装参数能忽略这个包在安装时执行的脚本，npmjs官方博客告诉我们在某些时候有的恶意软件包可能会在安装时执行脚本传播病毒，我们需要在安装命令后加上这个脚本以忽略掉包里的脚本命令以保证安全，若想应用在所有的install命令可以执行
```bash
npm config set ignore-scripts true
```

## 包引用篇

可能我们平时require或者import的时候的包 要么是相对路径的包 要么是webpack alias的包，然后就是node_modules里的包，可是npm可以安装很多种形式的包，运行
```bash
npm install [<@scope>/]<pkg>
npm install [<@scope>/]<pkg>@<tag>
npm install [<@scope>/]<pkg>@<version>
npm install [<@scope>/]<pkg>@<version range>
npm install <folder>
npm install <tarball file>
npm install <tarball url>
npm install <git:// url>
npm install <github username>/<github project>
```
### scope
第一种类型@scope被称为范围包，所有npm包都有一个名字。某些包名称也有范围。范围遵循包名称的通常规则（URL安全字符，没有前导点或下划线）。在包名称中使用时，作用域前面有一个@符号，后面跟一个斜杠，例如
```bash
npm install -g @vue/cli
```
>范围是一种将相关包分组在一起的方式，也会影响npm处理包的方式。每个npm用户/组织都有自己的范围，只有您可以在范围中添加包。这意味着您不必担心有人在您之前提取您的包裹名称。因此，它也是向组织发送官方包装的好方法。

当然后面的tag，version， version range都和普通的安装方式同理
### folder
npm不仅仅支持安装远程源的包，也支持安装本地文件夹，但是该文件夹必须包含一个package.json文件，并且至少声明name、main、version这几个字段。安装本地文件夹用在什么时候呢，当项目内不方便修改webpack的alias时，并且较深层级的文件需要引用外层公共模块时，比如
```js
import log from '../../../../../log';
```
此时过多的../非常不美观，也不利于维护。此时我们的npm安装本地文件夹就能派上用场了
假如log目录有以下package.json文件
```json
// src/log/package.json
{
  "name": "log",
  "main": "index.js",
  "version": "0.1.0"
}
```
然后我们安装它
```bash
npm install file:src/log -S
```
安装好后我们就可以直接
```js
import log from 'log';
```
此时我们就能达到和webpack的alias类似的效果了
当然要取一个和node_modules下面不同名的名称，以免造成无法预知的问题。

### tarball
tarball就是tar.gz或者.tgz文件，支持直接从一个http(s)地址或一个相对路径的文件地安装，如
```bash
npm install file:tar/JSONStream-1.3.1.tgz
npm install http://registry.npm.taobao.org/abab/download/abab-1.0.4.tgz
```
第一种可能有时候作为一种临时方案，比如内网环境无法随时去下载外网的包，只好下载好放到本地目录(有点像java的jar包时代)，但是第二种我实在没想到什么情况能用🤣，都在线地址了，为啥不弄个私有仓库呢。
### <git:// url>
这种是直接拉取一个git仓库，懒人专用，也许是私有仓库，也许是公开仓库，反正没发到npm源或私有源，为了方便就直接从仓库拉
[npm 支持的 git url 格式:](https://docs.npmjs.com/files/package.json#git-urls-as-dependencies)
```text
<protocol>://[<user>[:<password>]@]<hostname>[:<port>][:][/]<path>[#<commit-ish> | #semver:<semver>]
```
例如
```text
git+ssh://git@github.com:npm/npm.git#v1.0.27
git+ssh://git@github.com:npm/npm#semver:^5.0
git+https://isaacs@github.com/npm/npm.git
git://github.com/npm/npm.git#v1.0.27
```

然后我们尝试安装
```bash
npm install git://github.com/npm/npm.git#v1.0.27
```

### [github username] / [github project]
或者有一种更简便的方式，直接安装github某个用户下的某个仓库到我们的项目，比如
```bash
npm install jquery/jquery
```
⚠这种方式似乎只能安装master分支的代码

## package.json字段篇

