---
title: 记一次博客从http到https的迁移（nginx的使用）
catalog: true
date: 2018-06-09 12:15:19
subtitle:
header-img:
tags:
- nginx
---
最近心血来潮，想把一件一直没干的事情干了——把博客迁移到国外的vps。至于为什么迁，一是国内的vps租不起，二是在国内假网站那漫长的备案时间就够感人了，三是放到github.io上面百度的spider爬不到，影响我优秀的博客的曝光率（#手动滑稽）。多方查证后，原来是因为百度的爬取频率太高，给服务器造成压力，所以github不喜欢这样的spider，所以直接403了。
反正最近什么都到期了，去年注册的`.me`域名到期了，vps块到期了，去年底抢的免费阿里云vps到期了。为了省去域名迁移的麻烦并且还要给迁移费，所以就直接重新换一个域名，换一个服务商，免得到时候连解析到国外的空间都要设置什么门槛。下面就来说说整个博客的切换步骤
#### 域名注册
这个没啥好说的，给钱就行，而且我这个奇葩域名也没人和我抢注吧，也不像是有啥商业价值的样子，安安心心付款后等待了10分钟左右，域名就到手了。
之前我的vps是拿来架设科学上网工具的，每月的流量也用不完，反正闲着也是闲着，何不放点东西上去
#### 在服务器安装nginx
当然第一步就是下载安装包[https://nginx.org/en/download.html](https://nginx.org/en/download.html)
```bash
$ wget https://nginx.org/download/nginx-1.14.0.tar.gz
```
然后解压
```bash
$ tar -zxvf nginx-1.14.0.tar.gz
```
进入目录
```bash
$ cd nginx-1.14.0
```
配置(我们这里是为了升级到https，当然要附带上ssl模块)
```bash
$ ./configure --with-http_ssl_module 
```
编译安装
```bash
$ make
$ make install
```
如果一切顺利，nginx就安装好了，当然，如果因为系统原因报一些缺胳膊少腿的错，就先补上响应的系统组件
#### 配置nginx
先不忙启动nginx，我们还需要修改配置，打开`/usr/local/nginx/conf/nginx.conf`文件
```bash
vi /usr/local/nginx/conf/nginx.conf
```
我们要对443端口做监听和修改，示例配置在最后，我们取消注释后就行，其他配置项都不用改，只需要修改`server_name`、`ssl_certificate`、`ssl_certificate_key`这三项，后面两个就是我们的证书，一般我们都是找的免费证书，这里有一个免费证书申请网站[https://freessl.org/](https://freessl.org/)，注册登录后按照它的步骤来，就能直接申请到免费的证书
```bash
server {
  listen       443 ssl;
  # 配置你的域名
  server_name  ryuurock.com;
  # 这里就是我们证书的路径，下载后放到服务器上
  ssl_certificate      /home/ssl/full_chain.pem;
  ssl_certificate_key  /home/ssl/private.key;

  ssl_session_cache    shared:SSL:1m;
  ssl_session_timeout  5m;

  ssl_ciphers  HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers  on;

  location / {
    # 这里放我们的静态资源路径，就是我们的博客
    root   /home/wwwroot;
    # 这里是我们的入口文件
    index  index.html index.htm;
  }
}

```
这样配置后，再启动我们的nginx
```bash
$ /usr/local/nginx/sbin/nginx
```
#### 打开端口白名单
然后浏览器输入网址`https://ryuurock.com`，发现并不能访问，因为我们少了一个步骤，**打开端口**，一般防火墙默认是没有打开443端口的
```bash
$ firewall-cmd --zone=public --add-port=443/tcp --permanent
$ firewall-cmd --zone=public --add-port=80/tcp --permanent
```
`--zone`是作用域，`--add-port`是打开的端口和访问类型，`--permanent`是永久生效，这里我们顺便把80端口也打开
还有重要的一步就是修改端口配置后需要重启防火墙，不然是无法生效的
```bash
$ firewall-cmd --reload
```
这里还有一些其他的命令一并记录下
```bash
# 停止防火墙
$ systemctl stop firewalld.service
# 禁止防火墙开机启动
$ systemctl disable firewalld.service
# 移除端口
$ firewall-cmd --zone= public --remove-port=80/tcp --permanent
```
#### 全站https
然后我们发现可以打开网页了，但是为啥小绿锁没出现？因为网页里还有部分请求是http打头的，想要显示为安全和那把小绿锁，就需要全站https，但是我每篇文章的头图都是放在七牛的，七牛默认不支持https，需要自定义域名上传ssl证书才能https访问，并且需要一个已备案的域名，遂对七牛说再见。使用七牛的批量下载工具将所有头图下载到hexo目录里，再修改统一的路径配置，还有一些第三方的js资源 将`http://`改成`//`，这样就兼容了，不过前提是它也同时支持http和https。

#### 强制跳转https
有时候我们想要http强制跳转到https（参考百度首页），就需要对nginx配置再作修改，主要是修改80端口的地方
```bash
server {
  listen       80;
  server_name  ryuurock.com;
  return       301 https://$server_name$request_uri;
}
```
这样我们就能强制http请求跳转到https了。
#### 开启gzip提高第一次加载速度
本来资源就在国外，这导致到国内的响应速度很慢，为了相对的提高一点速度，还是有必要开启gzip加速的
```bash
http {
  gzip on;
  gzip_min_length 1k;
  gzip_comp_level 4;
  gzip_types  text/plain application/javascript text/css application/xml text/javascript application/x-httpd-php image/jpeg image/gif;
}
```
上面的配置就是对一些文件类型进行压缩，`gzip_comp_level`是压缩等级，数字越大压缩率越大，但是也会加重cpu的负担，介于我的小vps 4就够了。
至此，本次迁移和一些nginx的使用就到此结束了，当然nginx只是一些入门的使用，应付一些静态资源部署还是够了，包括一些url正则匹配，反向代理，多域名部署等，在今后遇到类似使用场景时再作记录。