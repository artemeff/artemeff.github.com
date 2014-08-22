---
layout:     post
title:      Erlang и Relx
date:       2014-08-21 05:05:00 +0400
---

За все свое время знакомства с Erlang мне не нравилось что в нем почти нет [CoC](http://en.wikipedia.org/wiki/Convention_over_configuration), особенно это касалось релизов. Есть мануалы для rebar, можно сделать ручками, но нельзя просто взять и `rebar deploy`. Эту проблему хочется решить, хотя бы для простых проектов.

Чтобы не разгребать кучу bash скриптов и не читать мануалы по ребару, можно воспользоваться утилитой [Relx](http://relx.org/) &mdash; она позволяет быстро собрать релиз, обновление и упаковать все это в архив `.tar.gz`; все это с минимальными настройками и почти без мануалов. Сама утилита очень простая, но мне ее для своих проектов хватает за глаза.

### Приложенька

Для тестов нам надо создать простейшее приложение, пусть это будет [key-value база данных](https://github.com/artemeff/dummy/tree/v1).

В [relx.config](https://github.com/artemeff/dummy/blob/v1/relx.config) мы указываем версию релиза с его названием и зависимостями, в нашем случае это `dummy` первой версии и `sasl` для горячего обновления кода. 

> Чтобы подробнее узнать про конфигурацию relx можно посмотреть [этот пример](https://github.com/erlware/relx/blob/master/examples/relx.config), там все доступные опции приведены с комментариями.

Соберем первую версию:

```bash
# скомпилируем код приложения
$ ./rebar compile
# создадим первый релиз
$ ./relx release
# стартуем ноду
$ _rel/dummy/bin/dummy start
# подключаемся
$ _rel/dummy/bin/dummy remote_console
```

И немного поиграемся:

```erlang
(dummy@127.0.0.1)1> dummy_db:version().
1
(dummy@127.0.0.1)2> dummy_db:get(a).
not_found
(dummy@127.0.0.1)3> dummy_db:set(foo, bar).
{ok,foo,bar}
(dummy@127.0.0.1)4> dummy_db:get(foo).
{ok,bar}
```

Как видим - все работает. Консоль можно не закрывать, она понадобится дальше. Поменяем ответ функции `dummy_db:get(key)` когда ключа не существует с `not_found` на `{not_found, key}` и обновим все это с hot code reloading, изменив версию базы данных.

### Обновляем

Код обновленного приложения лежит в [теге v2](https://github.com/artemeff/dummy/releases/tag/v2). Мы обновили код kvdb, добавили [`.appup`](http://www.erlang.org/doc/design_principles/appup_cookbook.html) и пару строк о второй версии для relx: [v1...v2](https://github.com/artemeff/dummy/compare/v1...v2). Для горячего обновления кода сделаем следующее:

```bash
# снова компилируем
$ ./rebar compile
# собираем релиз, relup файл упаковываем в .tar.gz,
# чтобы можно было загружать на сервер
$ ./relx release relup tar
# здесь по идее нам надо было загрузить наш архив на сервер в папку с релизами
# _rel/<app_name>/releases/<new_version>/<app_name>.tar.gz
# но мы все делаем на локальной ноде, поэтому просто копируем
$ cp _rel/dummy/dummy-0.0.2.tar.gz _rel/dummy/releases/0.0.2/dummy.tar.gz
# обновляем приложение
$ _rel/dummy/bin/dummy upgrade "0.0.2/dummy"
```

Если все обновилось, то можно вернуться в нашу коноль и проверить обновление:

```erlang
% проверим версию
(dummy@127.0.0.1)5> dummy_db:version().
2
% старые данные
(dummy@127.0.0.1)6> dummy_db:get(foo).
{ok,bar}
% и код ответа
(dummy@127.0.0.1)7> dummy_db:get(a).
{not_found,a}
```

Задача решена :)

