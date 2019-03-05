---
title: React高阶组件之反向继承
catalog: true
date: 2019-02-20 17:18:37
subtitle:
header-img: post/11515505465_.pic_hd.jpg
tags:
- react
---
高阶组件（HOC）相信大伙儿都不陌生，但是很少有看到介绍反向继承的。
先介绍背景：
博主有一部分的工作时间是在开发内部使用的管理系统的，渐渐发现，90%的页面具有类似的UI，像这样
![](WX20190220-172517.png)
配合自研的框架+ant design，其实实现起来已经非常的容易了，编辑好`searchFields`，`columnsFields`，然后组织数据就能渲染出搜索表单和数据列表项。有的然后大部分页面有操作，审核、编辑等等。但是几乎每做一个页面就要重复一次上面的操作，有些相同的操作，一直做就会让人很烦躁，本着解放部分劳动力的目标，开始编写高阶组件。

最开始的版本并不知道**反向继承**操作，于是有了下面的第一个版本
```jsx
function enhanceProps(config) {
  const {
    // 一些配置
  } = config;
  return WrappedComponent => class extends React.Component {
    // ...

    render() {
      const {
        // .....
        // 结构出一些数据
      } = this.props;

      const tableProps = {
        // ...编辑table的props
      };

      const searchBarProps = {
        // ...编辑searchBar的props
      };

      // 对原先的props进行扩展
      const props = {
        ...this.props,
        enhanceProps: {
          tableProps,
          searchBarProps,
        }
      };

      return <WrappedComponent {...props} />;
    }
  }
}
```
然后是使用它
```jsx
@enhanceProps()
class Page extends React.PureComponent {
  render() {
    const { enhanceProps } = this.props;
    return (
      <React.Fragment>
        <Searchbar {...enhanceProps.searchBarProps} />
        <Table {...enhanceProps.tableProps} />
      </React.Fragment>
    );
  }
}
```
这样一来虽然减少了一部分searchBarProps和tableProps的编辑，但是还是少不了去手动渲染`Searchbar`和`Table`。
>Q: 为什么不直接在高阶函数里直接渲染呢？
>A: 不利于扩展，因为每个页面表格最后一列的操作不一样，需要注入到tableProps里面，并且也不能通过高阶函数的配置传入，因为无法根据react的状态变化来更新数据

所以上面那个方式导致了我们使用它的意愿不是很强，因为并没有解放掉这些多次重复的样板代码。经过一番搜索后发现了高阶函数的**反向继承**这一使用方式，简单来说其实就是当前组件会被当作“父类来使用”，渲染出口交由高阶组件来承担。这样做的好处就是:
>我们可以声明式的提供一些函数或属性给高阶函数使用，而高阶函数也可以直接数据抽象出的部分，以达到完全解放手动去render SearchBar和table

于是后面改进后成了这样
```jsx
function withBasePage(config) {
  const {
    // 还是一些配置
  } = config;
  return WrappedComponent => class extends WrappedComponent {
    static displayName = `withBasePage(${WrappedComponent.displayName || WrappedComponent.name})`

    render() {
      const {
        // 结构出一些数据
        // .....
      } = this.props;

      const tableProps = {
        // ...编辑table的props
        // 🎉🎉🎉🎉🎉🎉🎉🎉🎉直接取得从父类继承过来的属性
        operateField = this.operateField
        // more ...
      };

      const searchBarProps = {
        // ...编辑searchBar的props
      };

      return (
        <React.Fragment>
          <Searchbar {...searchBarProps} />
          <Table {...tableProps} />
          {super.render()}
        </React.Fragment>
      );
    }
  };
}
```
如果是一些静态的配置，我们可以通过config传入，如果是动态的，就可以通过声明函数的形式声明在类上，甚至我们可以直接全部声明在组件上，然后高阶组件通过`this`取得，如果页面是一个最简单的，就只有查询功能，我们配置好searchFields和columnsFields后就可以像下面这样
```js
@withBasePage()
class Page extends PureComponent {
  render() {
    return null;
  }
}
```
其他的就什么都不用做了

#### 总结
普通的高阶函数只能提前处理props，组件后面的事就无法干涉了。
使用反向继承不仅可以满足前面的功能，还能后置处理组件的render，在一些情况下非常的有用和灵活。
前者更适合对组件的属性的预处理，后者则适合高阶组件需要从被修饰的组件实例中访问某些属性和方法时使用。
