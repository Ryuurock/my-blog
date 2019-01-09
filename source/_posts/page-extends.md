---
title: React 页面复用 我是这么做的
catalog: true
date: 2018-12-19 20:53:38
subtitle:
header-img:
tags:
- react
---
// 使用不同路由？

如果没记错，这篇文章是第一篇和react有关的，也算是最近几个月对react的使用的一点总结吧。
之前一直使用vue，发现哇塞居然有如此好用的前端开发框架，上手快，易学习，思想接地气，后面又简单了解了react，注意，我这里说的是简单，也就是随便看了看文档，做了做demo这种程度。潜意识里觉的，react真难用，还是vue好。但是对react还是抱有一丝敬畏的。

后面随着代码越写越多，渐渐觉的其实vue应对复杂业务，挺难受的，尤其是对于开发经验不是很足的人写的代码来说，你要去维护他的代码，是很费精力的，你时常不知道`this.`出来的值不知道哪儿来的，computed？data？prop？，相信我，你会崩溃的，当然你如果把它拆小，不会出现这种情况，前提是你有这么多的精力。这些槽点是后知后觉的，用的时候似乎并没想到。

后来迁移到react技术栈，在做了非常多的内部系统的需求后，发现一个很有意思的地方，内部系统百分之八九十都是报表类型的页面，搜索条件+数据表展示+分页，并且某些页面之间几乎是完全相同的，但是又因为某些条件要使某些功能或数据不予展示。想我这么有逼格（lan）的人，怎么可能复制粘贴呢，当你有四个页面相似的时候，复制四份，然后需求改动，改四份，测试测四份，bug也要改四次，那酸爽。
## 使用继承
所有的react组件（stateless组件除外）都继承自`React.Component`，所以才有`this.props`、`this.state`等等，出于面向对象的思维，我想到了使用一个超类组件来抽象几个页面的代码，然后不同的页面去继承它以实现复用比如：
```js
class SuperComponent extends React.Component {
  state = {
    // ...
  }

  renderSearchBar = (conf) => {

    const searchBarProps = {
      // ...
    };

    return <SearchBar {...searchBarProps} />
  }

  render() {
    // 父组件不负责render，但是react不允许组件没有render方法
    return null;
  }

}

class Page extends SuperComponent {
  state = {

  }

  render() {
    return (
      <React.Frament>
        {this.renderSearchBar()}
      </React.Frament>
    );
  }
}
```
这种写法看起来似乎还不错，达到了组件复用的目的，我们可以通过给每个组件的render方法传入不同的参数以实现页面的差异化，但是总觉得哪里有点别扭，又说不出来。可能因为react官方也没推荐这种复用的写法吧。
## 将页面作为组件
当然这里也不一定使用继承，可能react官方更推荐将整个页面当成一个组件供另外一个作为`page`的组件使用，传入props，再在这个组件内去判断不同的props展开业务，因为react整个思想就是一切皆为组件。
```js
class SuperComponent extends React.Component {
  state = {
    // ...
  }

  renderSearchBar = (conf) => {

    const searchBarProps = {
      // ...
    };

    return <SearchBar {...searchBarProps} />
  }

  // render函数正常渲染
  render() {
    return (
      <React.Frament>
        {this.renderSearchBar()}
      </React.Frament>
    );
  }
}


class Page1 extends SuperComponent {
  state = {

  }

  render() {
    const diffProps = {
      // ...
    };
    return (
      <SuperComponent {...diffProps} />
    );
  }
}

class Page2 extends SuperComponent {
  state = {

  }

  render() {
    const diffProps = {
      // ...
    };
    return (
      <SuperComponent {...diffProps} />
    );
  }
}
```
## 使用动态路由
如果我们的区分条件比较少，就比较适合用这种办法，比如一个叫极速退款，一个叫普通退款，俩个页面差异可能就是字段显示不一样，请求的有些接口不一样等，通过在组件内取得路由上的参数来区分业务上的不同。这种办法也最简单粗暴直观，因为实现方式更简单那，这里就没有例子了

## 使用闭包函数来生成组件
我们将导出内容编写为一个函数，接收各种config，返回一个组件，组件内去使用传入的config
```js
function pageBuilder(cfg) {
  // @connect()
  class Page extends React.Components {
    state = {}
  }

  return Page;
}
// 在router里使用
const Page = pageBuilder({ /*  */ });
const Page2 = pageBuilder({ /*  */ });
```
这种方式可以不用注入props，不用担心props的冲突
## 使用高阶组件
高阶组件相信你并不陌生，简单一句话就是
> 传入一个组件，返回一个新组件

高阶组件更多的是对props的处理，比如react-redux的connect组件注入state，antd的Form.create注入form对象等，我们也可以将其应用到page的复用
```js
function superPage(cfg) {
  return WrappedComponent => class extends React.Component {
    static displayName = `SuperPage(${WrappedComponent.displayName || WrappedComponent.name})`

    state = {}

    renderSearchbar = () => {

    }

    renderTable = () => {

    }

    render() {
      const props = {
        ...this.props,
        // 可以在这里增强我们的props
      };
      return (
        <React.Frament>
          <WrappedComponent {...props} />
          {this.renderSearchbar()}
        </React.Frament>
      );
    }
  }
}
```
这种写法更多的好处其实是预处理我们的数据，比如antd的Table组件需要穿很多的属性才能达到我们的要求，如果我们props都是按照“规范”写的，就可以提前在这里处理好props再传回给`WrappedComponent`直接用就好了，这样就可以减少很多重复的劳动。

至此，我们会发现，react是如此的“灵活”，其实是js灵活，写react其实就都是在写js。

上面说的page的复用，其实就是组件的复用。要实现a + b = 1有无数种办法，要复用一个组件也有无数的办法，只是他们使用场景不同，更多的可能会选择使用props传值的方法，但是有时候你不想污染props，我们认为props就是props，它是为组件本身服务的，不想混入其他东西，这个时候我们就可以使用闭包函数，将“其他东西”通过函数传入与props分开来。此时我们就可以叫它configs而不是props了。当然，每种方法都有不好的地方，比如使用闭包函数返回一个新的组件，这一块对内存开销还是蛮大的。最保险的做法可能就是将页面作为组件再传入configs，在页面内通过`this.props.configs`取得，这也是react官方推荐的做法