---
layout:     post
header:     concerns-v-rails-4
title:      Concerns в Rails 4
date:       2013-04-21
---

Все заметили что в Rails 4 создается директория __concerns__ в моделях и контроллерах? Я заметил, но не придал этому особого значения. Когда появилось свободное время – я таки решил посмотреть что же это такое. Concern'ы позволяют DRY'ить ваши модели и контроллеры. Этот функционал введен уже давно и в [четвертой версии рельс директории создаются по умолчанию](https://github.com/rails/rails/commit/f6bbc3f582bfc16da3acc152c702b04102fcab81).

# Задача

Пока искал информацию о концернах, вспомнил что мне надо реализовать функционал «безопасного» удаления элементов модели, чтобы запись не удалялась в базе данных, а просто переключался триггер «deleted» или устанавливалась дата удаления. На этом примере я и покажу как юзать concerns.

# Немного кода

Чтобы не напрягать знающих кучей букв в этой блогозаписи (если такие вообще читают меня :В), я сразу опубликую исходный код:

```ruby
# app/models/concerns/archivable.rb
module Archivable
  extend ActiveSupport::Concern

  included do
    scope :published, -> { where(deleted_at: nil) }
  end

  def delete
    self.touch :deleted_at
  end

  def revive
    self.update_attribute :deleted_at, nil
  end
end

# app/models/blip.rb
class Blip < ActiveRecord::Base
  include Archivable

  # ...
end
```

Вот так легко мы можем расширять наши модели. Для использования этого надо добавить поле `deleted_at` в нужную модель. А теперь немного поиграемся:

```
console> Blip.all

Blip Load (0.2ms)  SELECT "blips".* FROM "blips"
+----+-------------+---------+-------+-------------+--------------+------------+
| id | text        | user_id | group | created_at  | updated_at   | deleted_at |
+----+-------------+---------+-------+-------------+--------------+------------+
| 2  | second blip | 18      | 2     | 2013-04-... | 2013-04-2... |            |
| 3  | third blip  | 18      | 2     | 2013-04-... | 2013-04-2... |            |
| 4  | it's boo... | 18      | 2     | 2013-04-... | 2013-04-2... |            |
| 5  | lalki       | 18      | 2     | 2013-04-... | 2013-04-2... |            |
| 1  | whoa? It... | 18      | 1     | 2013-04-... | 2013-04-2... |            |
+----+-------------+---------+-------+-------------+--------------+------------+
5 rows in set


console> martyr = Blip.all.sample

Blip Load (0.3ms)  SELECT "blips".* FROM "blips"
+----+-------+---------+-------+----------------+-----------------+------------+
| id | text  | user_id | group | created_at     | updated_at      | deleted_at |
+----+-------+---------+-------+----------------+-----------------+------------+
| 5  | lalki | 18      | 2     | 2013-04-21 ... | 2013-04-21 1... |            |
+----+-------+---------+-------+----------------+-----------------+------------+
1 row in set


console> martyr.delete

(0.1ms)  BEGIN
(0.5ms)  UPDATE "blips" SET "deleted_at" = $1, "updated_at" = $2 WHERE "blips"."id" = 5  [["deleted_at", Sun, 21 Apr 2013 17:41:49 MSK +04:00], ["updated_at", Sun, 21 Apr 2013 17:41:49 MSK +04:00]]
(2.1ms)  COMMIT


console> Blip.all

Blip Load (0.3ms)  SELECT "blips".* FROM "blips"
+----+-------------+---------+-------+-------------+-------------+-------------+
| id | text        | user_id | group | created_at  | updated_at  | deleted_at  |
+----+-------------+---------+-------+-------------+-------------+-------------+
| 2  | second blip | 18      | 2     | 2013-04-... | 2013-04-... |             |
| 3  | third blip  | 18      | 2     | 2013-04-... | 2013-04-... |             |
| 4  | it's boo... | 18      | 2     | 2013-04-... | 2013-04-... |             |
| 1  | whoa? It... | 18      | 1     | 2013-04-... | 2013-04-... |             |
| 5  | lalki       | 18      | 2     | 2013-04-... | 2013-04-... | 2013-04-... |
+----+-------------+---------+-------+-------------+-------------+-------------+
5 rows in set


console> Blip.published

Blip Load (0.3ms)  SELECT "blips".* FROM "blips" WHERE "blips"."deleted_at" IS NULL
+----+-------------+---------+-------+-------------+--------------+------------+
| id | text        | user_id | group | created_at  | updated_at   | deleted_at |
+----+-------------+---------+-------+-------------+--------------+------------+
| 2  | second blip | 18      | 2     | 2013-04-... | 2013-04-2... |            |
| 3  | third blip  | 18      | 2     | 2013-04-... | 2013-04-2... |            |
| 4  | it's boo... | 18      | 2     | 2013-04-... | 2013-04-2... |            |
| 1  | whoa? It... | 18      | 1     | 2013-04-... | 2013-04-2... |            |
+----+-------------+---------+-------+-------------+--------------+------------+
4 rows in set


console> martyr.revive

(0.1ms)  BEGIN
(0.3ms)  UPDATE "blips" SET "deleted_at" = $1, "updated_at" = $2 WHERE "blips"."id" = 5  [["deleted_at", nil], ["updated_at", Sun, 21 Apr 2013 17:42:04 MSK +04:00]]
(1.6ms)  COMMIT


console> Blip.all

Blip Load (0.3ms)  SELECT "blips".* FROM "blips"
+----+-------------+---------+-------+-------------+--------------+------------+
| id | text        | user_id | group | created_at  | updated_at   | deleted_at |
+----+-------------+---------+-------+-------------+--------------+------------+
| 2  | second blip | 18      | 2     | 2013-04-... | 2013-04-2... |            |
| 3  | third blip  | 18      | 2     | 2013-04-... | 2013-04-2... |            |
| 4  | it's boo... | 18      | 2     | 2013-04-... | 2013-04-2... |            |
| 1  | whoa? It... | 18      | 1     | 2013-04-... | 2013-04-2... |            |
| 5  | lalki       | 18      | 2     | 2013-04-... | 2013-04-2... |            |
+----+-------------+---------+-------+-------------+--------------+------------+
5 rows in set


console>
```

Все работает, все красиво. Теперь немного о возможностях концернов, т.к. в нашем примере я использовал не все. Вот его структура:

```ruby
module Archivable
  extend ActiveSupport::Concern

  included do
    # relations, callbacks, validations, scopes and others...
  end

  # instance methods

  module ClassMethods
    # class methods
  end
end

```

Код в блоке `included` выполняется при создании объекта модели, там можно хранить их свойства. Instance методы, очевидно, определяются для объекта модели, и class методы определяются для класса, их можно использовать в свойствах или как я в примере, для получения не архивированных записей.

Немного литературы:

* [Документация для Rails 4](http://edgeapi.rubyonrails.org/classes/ActiveSupport/Concern.html)
* [Документация для старых Rails](http://api.rubyonrails.org/classes/ActiveSupport/Concern.html)
* [Put chubby models on a diet with concerns by DHH](http://37signals.com/svn/posts/3372-put-chubby-models-on-a-diet-with-concerns)

