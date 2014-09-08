---
layout:     post
title:      Assets с MAD в Erlang проектах
date:       2014-09-08 16:17:00 +0400
---

Недавно решал проблему с [компиляцией статики в Erlang](/2014/09/04/rebar-npm-static-files.html) приложениях и, думаю, разобрался. За пару дней нашел хорошую замену Sprockets, написанную для nodejs, сделал пару [кастомных бинарников](https://github.com/artemeff/mincer-erl) и сделал [pull request с новой командой для mad](https://github.com/synrc/mad/pull/11). А так как мой английский уровня школьника, я решил написать статью на русском, ожидая, что из нее скомпилируют документацию :)

### Asset Pipeline

В файлы статики мы можем инклюдить другие файлы, например в `application.js`:

```javascript
//= require main
//= require lib/jquery
//= require_self
```

Будут включены `main.js`, `lib/jquery.js` из `priv/source/js`, а затем и сам `application.js`. Почитать об этом подробнее можно в [документации mincer](https://github.com/nodeca/mincer#the-directive-processor).

Поддерживаются Stylus, LESS, Sass (только scss синтаксис), CoffeeScript, React JSX. CSS файлы обрабатываются autoprefixer и сжимаются с помощью csso, а JS файлы сжимаются утилитой uglifyjs. Подробнее о языках и как именовать файлы можно почитать [здесь](https://github.com/nodeca/mincer#using-engines).

### MAD

Модуль [`mad_static`](https://github.com/synrc/mad/blob/master/src/mad_static.erl) в mad собирает информацию о компиляции необходимых ассетов из rebar.config с ключем `static`:

```erlang
% rebar.config

{static, [
  {files, ["application.js", "application.css"]},
  {assets_port, 3005}
]}.
```

В `files` мы указываем какие файлы компилировать из директорий `priv/source/js` и `priv/source/css`. Значение `assets_port` указывает на каком порту нужно запускать сервер для компиляции в реальном времени, если параметр не указан - запускается на порту 3000.

Чтобы все это дело скомпилировать нужно запустить `mad static`, в результате в директории `priv/static` будут лежать два файла &mdash; `application.css` и `application.js`.

`mad static watch` запускает сервер: 

```
GET http://localhost:3000/application.js
GET http://localhost:3000/application.css
```

Только тут есть проблема, если выйти с помощью Ctrl+C то сервер не остановится и порт будет занят до тех пор, пока не сделать еще один запрос к нему. Решить эту проблему так и не смог.

Скоро будет плагин для Rebar.
