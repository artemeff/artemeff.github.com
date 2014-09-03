---
layout:     post
title:      Компилируем статику с Rebar и NPM
date:       2014-09-04 01:33:00 +0400
---

Давненько у меня был pet-project - [find](https://github.com/artemeff/find), идея которого до боли проста, &mdash; трекинг людей на карте. Человек заходит на сайт, вводит свое и имя комнаты, дает ссылку на комнату другу и они могут смотреть кто где находится на карте.

Тогда для этой поделки решил использовать React и Erlang для тренировки. Все было замечательно, пока я не столкнулся с проблемой - компиляция ассетов, хотелось чего-то на подобии Rails Asset Pipeline и Sprockets, но ничего тогда не нашел.

Проект на долгое время ушел в большой ящик. Совсем недавно я его оттуда достал и сразу начал решать проблему с компиляцией статических файлов. Нужен был удобный клон Assets из Rails. За ним далеко ходить не пришлось &mdash; подошел require из node.js и плагин browserify. При этом надо было уметь компилировать React с его JSX и скукоживать в один файл. С CSS все проще &mdash; понадобится только один плагин &mdash; node-sass, который умеет компилировать и сжимать.

### Rebar

У этой утилиты есть хуки, которые запускаются до или после компиляции приложения. Чтобы не вешать все на него, я решил просто выполнять `make build-static` из корня Erlang приложения:

```erlang
% rebar.config
{post_hooks, [{compile, "make build-static"}]}.
```

### NodeJS

Т.к. я использую систему модулей из nodejs, то можно использовать его как менеджер зависимостей, тем более что он стал практически стандартом де-факто для подобного рода манипуляций:

```javascript
// package.json
{
  "dependencies": {
    "uglify-js":   "~ 2.4.15",
    "react":       "~ 0.11.1",
    "react-tools": "~ 0.11.1",
    "browserify":  "~ 5.11.0",
    "node-sass":   "~ 0.9.3"
  }
}
```

### Makefile

Мой makefile до боли прост:

```makefile
PATH := node_modules/.bin:$(PATH)

build-static: notify clean npm-install jsx browserify uglify-js sass clean

notify:
  @echo "Compile static files"

clean:
  @rm -rf priv/temp

sass:
  @node-sass priv/source/css/** --output-style compressed -o priv/static/app.css > /dev/null 2>&1

jsx:
  @jsx priv/source/js priv/temp/js > /dev/null 2>&1

browserify:
  @browserify priv/temp/js/app.js > priv/temp/js/bundle.js

uglify-js:
  @uglifyjs priv/temp/js/bundle.js > priv/static/app.js 2> /dev/null

npm-install:
  @npm install > /dev/null 2>&1
```

Можно, конечно, убрать все `> /dev/null 2>&1`, чтобы было видно ошибки в случае чего, но я не хочу засорять и без того слишком информативный лог компиляции от rebar, да и почти все модули не умееют скрывать дебаг информацию.

### Структура приложения

```
.
├── makefile
├── package.json
├── rebar.config
├── priv
│   ├── source
│   │   ├── css
│   │   │   ├── app.sass
│   │   │   └── components
│   │   │       └── hello.sass
│   │   └── js
│   │       ├── app.js
│   │       └── components
│   │           └── hello.js
│   ├── static
│   │   ├── app.css
│   │   ├── app.js
│   │   ├── css
│   │   │   └── normalize.css
│   │   ├── images
│   │   └── js
│   │       ├── bullet.js
│   │       ├── store.js
│   │       └── utils.js
└── src
    ├── dummy.app.src
    ├── dummy.erl
    ├── dummy_app.erl
    └── dummy_sup.erl
```

Тут все просто, сначала компилируем jsx из `priv/source/js` и складываем результат в `priv/temp/js`, затем все файлы из `priv/temp/js` упаковываем с помощью browserify в bundle.js, скармливаем этот файл uglifyjs и кладем результат в `priv/static/app.js`. Весь процесс проходит достаточно быстро.

### Организация JS

```javascript
// priv/source/js/app.js
/** @jsx React.DOM */

var React = require('react'),
    Hello = require('./components/hello.js');

React.renderComponent(
  <Hello />, document.body
);
```

```javascript
// priv/source/js/components/hello.js
/** @jsx React.DOM */

module.exports = require('react').createClass({
  render: function() {
    return (
      <div id="hello">Hello, world!</div>
    );
  }
});
```

### Организация CSS

```sass
// priv/source/css/app.sass
@import "components/hello"

html, body
  font-family: Arial, sans-serif
  font-size: 1em
```

```sass
// priv/source/css/components/hello.sass
#hello
  margin: 20px
```

### Cowboy

Скомпилированную статику надо скормить веб-серверу:

```erlang
cowboy_router:compile([
  {'_', [ {"/", index_handler, []}
        , {"/static/[...]", cowboy_static, {priv_dir, dummy, <<"static">>, []}}
        ]}
]).
```

---

Вот примерно так я работаю с JS статикой. Все это кажется большим костылем, я бы взял и написал что-то типа Sprockets для Erlang в виде плагина для Rebar, но времени на это совсем нет, да и оно никому не надо.

Хотя можно было бы сделать что-то очень простое, чтобы смотрело в директории с исходниками статики, компилировало по правилам и выводила ошибки, если те вдруг возникнут. Может есть у кого идеи или наброски?
