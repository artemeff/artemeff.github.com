---
layout:     post
title:      eql и миграции РСУБД в Erlang
date:       2015-02-26 16:17:00 +0400
---

Я считаю, что в Erlang до сих пор нет хорошей библиотеки для работы с SQL базами данных. Есть хорошие конструкторы, типа [mekao](https://github.com/ddosia/mekao) и [sqerl](https://github.com/devinus/sqerl), есть попытки сделать ORM [boss_db](https://github.com/ErlyORM/boss_db) и [texas](https://github.com/emedia-project/texas); но все они подходят лишь для CRUD запросов.

Конструкторы интересные, особенно mekao &mdash; он с помощью эрланговских рекордов строит запросы, очень удобная штука когда много полей в таблице, но не умеет делать сложные запросы. Sqerl &mdash; это если не хочешь оборачивать запрос в двойные кавычки, а хочешь использовать код эрланга для генерации запросиков, тоже интересная библиотека, но умеет только CRUD.

ORM, как по мне, &mdash; недоразумение для функциональной парадигмы, писать ее для языка, где нет объектов &mdash; глупость.

Полтора месяца назад я наткнулся на очень интересную библиотеку для Clojure &mdash; [yesql](https://github.com/krisajenkins/yesql). Идея очень простая &mdash; хранить SQL запросы в файлах, с возможностью получить нужный запрос по его названию:

```sql
-- your_project/sql_queries/users.sql
-- name: user-count
-- Counts all the users.
SELECT count(*) FROM users;

-- name: user-by-id
SELECT * FROM users WHERE user_id = ?;
```

И дальше получать эти запросики с помощью простых функций:

```clojure
(defqueries "some/where/queryfile.sql")
(user-by-id db-spec 42)
```

Я, под впечатлением, сначала снова захотел попробовать себя в Clojure, но потом одумался и решил написать нечто подобное для Erlang. Правда некоторые вещи я изменил, чтобы было удобнее. Так появилась на свет библиотека [eql](https://github.com/artemeff/eql).

Пока писал &mdash; понял, что [встроенный лексер](http://erlang.org/doc/man/leex.html) мне не подходит; мне пришлось городить кучу костылей, чтобы просто просканировать токены в файле. Тогда я написал свой, который работает не с токенами, а со строками; т.е. он просто разбивает файл на строки, и, если та начинается с `--`, то это однозначно комментарий, иначе &mdash; запрос; дальше сканирую комментарии на наличие имени запроса. Результат работы &mdash; список отсканированных токенов с их названием, местом в файле и контентом; т.е. почти тоже самое, что отдавал мне встроенный в эрланг лексер &mdash; это чтобы [парсеру](http://erlang.org/doc/man/yecc.html) было удобнее.

В итоге получилось очень мало кода и приятный результат:

```sql
-- your_project/sql_queries/users.sql
-- Counts all the users.
-- :user_count
SELECT count(*) FROM users;

-- :user_by_id
SELECT * FROM users WHERE user_id = ?;
```

```erlang
> {ok, Queries} = eql:compile("your_project/sql_queries/users.sql").
> {ok, Q1} = eql:get_query(user_count, Queries).
> {ok, Q2} = proplists:get_value(user_by_id, Queries).
> Q1.
%> "SELECT count(*) FROM users;"
> Q2.
%> "SELECT * FROM users WHERE user_id = ?;"
```

И два отличия от yesql:

- Имя запроса указывается не `-- name: foo`, а просто `-- :foo`;
- У меня нет поддержки плейсхолдеров, сами запросы никак не обрабатываются.

### Миграции для PostgreSQL на основе eql

Через месяц после этого мне пришла в голову написать утилиту, которая накатывает изменения схемы РСУБД на основе eql, так появилась на свет библиотека [pgsql_migration](https://github.com/artemeff/pgsql_migration). Работает она тоже очень просто, и, как видно из названия &mdash; только с PostgreSQL.

Создаем директорию где-нибудь в priv/migrations и в ней файл с именем `<timestamp>_name.sql`:

```sql
-- priv/migrations/1424987801_create_users.sql
-- :up
CREATE TABLE users(
  id          SERIAL NOT NULL,
  username    CHARACTER VARYING(255) NOT NULL,
  password    CHARACTER VARYING(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE INDEX index_users_on_username
  ON users (username);

-- :down
DROP TABLE users;
```

Утилита создает в вашей базе данных таблицу `migrations`, в которой хранятся накатанные миграции с временем их применения. Чтобы запустить процесс миграции достаточно выполнить:

```erlang
> pgsql_migraion:migrate(Conn, "priv/migrations").
> pgsql_migraion:migrate(Conn, "1424987800", "priv/migrations"). % откат/накат до версии
```

И все будет сделано за вас. Каждая миграция оборачивается в транзакцию, процесс миграции останавливается, если он завершается с ошибками.

Сам использую две эти библиотеки в работе, очень доволен этим подходом и своим вкладом :-)
