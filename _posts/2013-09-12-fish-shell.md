---
layout:     post
header:     fish-shell
title:      fish shell
date:       2013-09-12 21:52:00
---

Оболочек для unix-like систем расплодилось много: sh, bash, dash, zsh. Выбрать тот самый из всего зверинца очень сложно. В этой маленькой блогозаписи я хочу осветить один прекрасный продукт, который развивается около 8 лет.

![fish shell](/images/fish-shell/theme.png)

[fish](https://github.com/fish-shell/fish-shell) - это не просто yet another shell, за 8 лет они сделали действительно удобный и гибкий шелл. У них в документации есть фраза «*unlike other shells*» под которой подписаны функции, уникальные для этой оболочки. Сначала я напишу о них, а уже потом выскажу свое мнение.

### Встроенная документация

В fish есть встроенная документация, достаточно ввести комманду:

```bash
$ help
```

И в браузере откроется отформатированный документ со всеми описаниями его внутренностей.

### Перенаправление вывода

В других шеллах перенапрявлять вывод можно с помощью операторов `<` и `>`, в fish пошли дальше и сделали такой функционал и для ошибок:

```bash
$ grep fish < /etc/shells > ~/output.txt ^ ~/errors.txt
```

### Переменные

В fish нет синтаксиса для установки значений переменным, для этого сделали команду `set`:

```bash
$ set name 'Mister Noodle'
$ echo $name
Mister Noodle
```

### Статус завершения

Статус завершения программы хранится в переменной `$status`, а не в `$?`:

```bash
$ false
$ echo $status
1
```

### Переменные окружения

Команды для установки переменных окружения `export` нет, вместо этого можно использовать `set` с аргументом `-x` или `--export`:

```bash
$ set -x MyVariable SomeValue
$ env | grep MyVariable
MyVariable=SomeValue
```

Вы так-же можете очищать эти переменные:

```bash
$ set -e MyVariable
$ env | grep MyVariable
(no output)
```

### Подстановка

В других оболочках, для подстановки в команду, выражение оборачивают в кавычки; в fish вы можете использовать для этого круглые скобки:

```bash
$ echo In (pwd), running (uname)
In /home/tutorial, running FreeBSD
```

```bash
$ set os (uname)
$ echo $os
Linux
```

```bash
$ touch "testing_"(date +%s)".txt"
$ ls *.txt
testing_1360099791.txt
```

### Комбинаторы

Вместо `&&` и `||` в fish есть `and`, `or` и `not`:

```bash
$ cp file1.txt file1_bak.txt; and echo "Backup successful"; or echo "Backup failed"
Backup failed
```

### Функции

Для доступа к аргументам функций используется переменная `$argv`, вместо `$1`, `$2`, `$3` и т.д.

```bash
$ function say_hello
   echo Hello $argv
  end
$ say_hello
Hello
$ say_hello everybody!
Hello everybody!
```

```bash
$ function my_name_is
   echo $argv[1]
  end
$ my_name_is Yuri Artemev
Yuri
```

### Prompt

В fish нет переменных для установки prompt, таких как PS1. Для этого есть функция `fish_prompt`, которую вы можете переопределить:

```bash
$ function fish_prompt
    echo "New Prompt % "
  end
New Prompt % _
```

## А теперь немного отсебятины

Первое, что мне не понравилось – это установка переменных. В fish нельзя написать так:

```bash
$ RAILS_ENV=test rake db:migrate
```

Вместо этого приходится устанавливать переменные с помощью команды `set` или делать это после самой команды:

```bash
$ rake db:migrate RAILS_ENV=test
```

Забудьте о `Ctrl + R`, в этой оболочке нет привычного поиска, в fish все круче – вы просто пишете команду и тут же серым подставляется первое совпадение, если не подошло – бродим по истории с помощью стрелок вверх и вниз, [все очень просто](http://fishshell.com/tutorial.html#tut_autosuggestions).

Массивы – они мощные:

```bash
$ set ary 1 2 3 4 5 6 7 8 9 hello
$ echo $ary[1]
1
$ echo $ary[-1]
hello
$ echo $ary[1..5]
1 2 3 4 5
$ echo $ary[-1..-3]
hello 9 8
$ echo $ary[-1..1]
hello 9 8 7 6 5 4 3 2 1
$ count $ary
10
$ set ary[5] 50
$ echo $ary
1 2 3 4 50 6 7 8 9 hello
```

```bash
$ for v in $ary
    echo $v
  end

1
2
3
4
50
6
7
8
9
hello
```

Есть подсветка синтаксиса, есть команды `prevd` и `nextd` для путешествия туда и обратно по директориям, а еще можно делать [крутые темы](https://gist.github.com/artemeff/6253889).


