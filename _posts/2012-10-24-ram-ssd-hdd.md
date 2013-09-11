---
layout:     post
header:     ram-ssd-hdd
title:      Тестируем RAM, SSD и HDD на скорость
date:       2012-10-24
---

Сейчас я потихоньку занимаюсь своим проектом, когда есть свободное время, и вот недавно встал вопрос о железе для хостинга. Я хочу рассказать о производительности SSD vs [RAM Drive](http://ru.wikipedia.org/wiki/RAM_drive) vs HDD.

Тесты проводились на компьютере с OS X, 4x4Gb Kingston @ 1333 RAM, Intel Core i3 @ 2.8 Ghz, OCZ Vertex3, HDD Seagate ST3000DM001. OS X установлена на SSD, Ruby с гемами расположены в домашней папке. Я создал Rails приложение с 10.000 записей в sqlite и контроллер со следующим кодом:

```ruby
@products = Product.all
Rails.cache.clear
```

Записи на странице не рендерил, подумал что это будет лишним. Дальше связка nginx + unicorn и тестирование нагрузки. Результаты на чтение получились очень странными:

HDD
---

```
Document Length:      719 bytes
Concurrency Level:    4
Time taken for tests: 40.510 seconds
Complete requests:    100
Failed requests:      0
Total transferred:    130600 bytes
HTML transferred:     71900 bytes
Requests per second:  2468.54
Transfer rate:        3223.92 kb/s received
            Connnection Times (ms)
            min     avg     max
Connect:    0       0       0
Processing: 1193    1596    2400
Total:      1193    1596    2400
```

RAM disk
--------

```
Document Length:      719 bytes
Concurrency Level:    4
Time taken for tests: 39.272 seconds
Complete requests:    100
Failed requests:      0
Total transferred:    130600 bytes
HTML transferred:     71900 bytes
Requests per second:  2546.33
Transfer rate:        3325.51 kb/s received
            Connnection Times (ms)
            min     avg     max
Connect:    0       0       0
Processing: 366     1546    1645
Total:      366     1546    1645
```

SSD
---

```
Document Length:      719 bytes
Concurrency Level:    4
Time taken for tests: 39.274 seconds
Complete requests:    100
Failed requests:      0
Total transferred:    130600 bytes
HTML transferred:     71900 bytes
Requests per second:  2546.21
Transfer rate:        3325.35 kb/s received
            Connnection Times (ms)
            min     avg     max
Connect:    0       0       0
Processing: 398     1546    1627
Total:      398     1546    1627
```

И для удобства:

```
            Connnection Times (ms)  RPS
            min     avg     max
HDD:        1193    1596    2400    2468.54
RAM Disk:   366     1546    1645    2546.33
SSD:        398     1546    1627    2546.21
```

Тесты на запись получились куда адекватнее. Код тестирования записи:

```ruby
1.upto(100) do |i|
  Product.create do |p|
    p.code = rand 10_000
    p.name = "name"
    p.shown = [true, false].sample
    p.description = "text"
  end
end
```

HDD
---

```
Document Length:      975 bytes
Concurrency Level:    4
Time taken for tests: 83.542 seconds
Complete requests:    100
Failed requests:      0
Non-2xx responses:    100
Total transferred:    124700 bytes
HTML transferred:     97500 bytes
Requests per second:  1197.00
Transfer rate:        1492.65 kb/s received
            Connnection Times (ms)
            min     avg     max
Connect:    0       0       0
Processing: 540     3290    4829
Total:      540     3290    4829
```

RAM disk
--------

```
Document Length:      972 bytes
Concurrency Level:    4
Time taken for tests: 13.850 seconds
Complete requests:    100
Failed requests:      0
Non-2xx responses:    100
Total transferred:    124400 bytes
HTML transferred:     97200 bytes
Requests per second:  7220.03
Transfer rate:        8981.72 kb/s received
            Connnection Times (ms)
            min     avg     max
Connect:    0       0       0
Processing: 130     545     577
Total:      130     545     577
```

SSD
---

```
Document Length:      974 bytes
Concurrency Level:    4
Time taken for tests: 15.569 seconds
Complete requests:    100
Failed requests:      0
Non-2xx responses:    100
Total transferred:    124600 bytes
HTML transferred:     97400 bytes
Requests per second:  6422.87
Transfer rate:        8002.89 kb/s received
            Connnection Times (ms)
            min     avg     max
Connect:    0       0       0
Processing: 183     613     664
Total:      183     613     664
```

И для удобства:

```
            Connnection Times (ms)  RPS
            min     avg     max
HDD:        540     3290    4829    1197.00
RAM Disk:   130     545     577     7220.03
SSD:        183     613     664     6422.87
```

![chart](/images/ram-ssd-hdd/chart.png)
