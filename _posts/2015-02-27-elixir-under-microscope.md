---
layout:     post
title:      Elixir Under Microscope
date:       2015-03-26 11:38:00 +0400
---

Когда я только начинал изучать Elixir мне было интересно посмотреть на то, что он генерирует, что в итоге попадает в BEAM. Спрашивал в официальном IRC канале &ndash; мне сказали что это невозможно.

Но никто мне тогда не сказал, что BEAM файлы можно [декомпилировать](http://www.erlang.org/doc/man/beam_lib.html), если они собраны с флагом `debug_info`. Чтобы дальше было проще:

```erlang
#!/usr/bin/env escript
 
main([BeamFile]) ->
    {ok, {_, [{abstract_code, {_, AC}}]}} = beam_lib:chunks(BeamFile, [abstract_code]),
    io:fwrite("~s~n", [erl_prettypr:format(erl_syntax:form_list(AC))]).
```

Утилита в качестве аргумента принимает путь до BEAM файла и печатает на экран Erlang.

Эта запись будет скорее выжимкой, ни на что не претендующей, я ради интереса посмотрел какой код генерирует Эликсир и решил поделиться открытиями. Некоторые вещи я решил намеренно опустить, т.к. в них я не нашел ничего интересного, например – спеки функций. А еще утилита не всегда выводит отформатированный код, поэтому я причесал его ручками для этой записи.

Примерно вот так выглядит Эликсировский модуль с функией `add/2`:

```erlang
-compile(no_auto_import).
-file("lib/eum.ex", 1).
-module('Elixir.Eum').
-export(['__info__'/1, add/2]).

'__info__'(functions) -> [{add, 2}];
'__info__'(macros) -> [];
'__info__'(module) -> 'Elixir.Eum';
'__info__'(atom) -> module_info(atom).

add(a@1, b@1) -> a@1 + b@1.
```

Строки действительно являются бинарниками, поэтому с ними в Эликсире жить намного проще:

```elixir
# elixir
def string do
  "hellö"
end

def binary do
  <<"hellö">>
end
```

```erlang
% erlang
string() -> <<"hellö">>.
binary() -> <<"hellö">>.
```

Очень “интересно” сделали с интерполяцией:

```elixir
# elixir
def interpolation_simple do
  "hellö #{:world}"
end

def interpolation_complex do
  "hellö #{'complex'} #{:world} #{42}"
end
```

```erlang
% erlang
interpolation_simple() ->
    <<"hellö ",
        case world of
            _rewrite@1 when erlang:is_binary(_rewrite@1) ->
                _rewrite@1;
            _rewrite@2 ->
                'Elixir.String.Chars':to_string(_rewrite@2)
        end/binary>>.

interpolation_complex() ->
    <<"hellö ",
        case [99, 111, 109, 112, 108, 101, 120] of
            _rewrite@1 when erlang:is_binary(_rewrite@1) ->
                _rewrite@1;
            _rewrite@2 ->
                'Elixir.String.Chars':to_string(_rewrite@2)
        end/binary,
    " ",
        case world of
            _rewrite@3 when erlang:is_binary(_rewrite@3) ->
                _rewrite@3;
            _rewrite@4 ->
                'Elixir.String.Chars':to_string(_rewrite@4)
        end/binary,
    " ",
        case 42 of
            _rewrite@5 when erlang:is_binary(_rewrite@5) ->
                _rewrite@5;
            _rewrite@6 ->
                'Elixir.String.Chars':to_string(_rewrite@6)
        end/binary>>.
```

В эликсире есть оператор `cond`, который немного сокращает код:

```elixir
# elixir
def cond1 do
  cond do
    2 + 2 == 5 ->
      "This will not be true"
    2 * 2 == 3 ->
      "Nor this"
    1 + 1 == 2 ->
      "But this will"
  end
end

def cond2 do
  cond do
    hd([1,2,3]) ->
      "1 is considered as true"
  end
end
```

```erlang
% erlang
cond1() ->
    case 2 + 2 == 5 of
        true -> <<"This will not be true">>;
        false ->
            case 2 * 2 == 3 of
                true -> <<"Nor this">>;
                false ->
                    case 1 + 1 == 2 of
                        true -> <<"But this will">>;
                        false -> erlang:error(cond_clause)
                    end
            end
    end.

cond2() ->
    case erlang:hd([1, 2, 3]) of
        _@1 when _@1 /= nil andalso _@1 /= false ->
            <<"1 is considered as true">>;
        _ -> erlang:error(cond_clause)
    end.
```

Сахарок для proplists:

```elixir
# elixir
def proplist do
  pl = [{:a, 1}, {:b, 2}]
  _a = pl[:a]

  pl = [a: 1, b: 2]
  _a = pl[:a]
end
```

```erlang
% erlang
proplist() ->
    pl@1 = [{a, 1}, {b, 2}],
    _a@1 = 'Elixir.Access':get(pl@1, a),
    pl@2 = [{a, 1}, {b, 2}],
    _a@2 = 'Elixir.Access':get(pl@2, a).
```

Ключевое слово `def` создает функцию, `defp` тоже создает функцию, но не экспортирует ее, а если приватная функция не используется в модуле, то она не попадает в beam:

```elixir
# elixir
defmodule Eum
  def make_private_exist do
    private_fun_exist()
  end

  defp private_fun_exist do
    :private
  end

  defp private_fun_nonexist do
    :private
  end
end
```

```erlang
% erlang
-module('Elixir.Eum').
-export(['__info__'/1, make_private_exist/0]).

'__info__'(functions) -> [{make_private_exist, 0}];
'__info__'(macros) -> [];
'__info__'(module) -> 'Elixir.Eum';
'__info__'(atom) -> module_info(atom).

make_private_exist() -> private_fun_exist().
private_fun_exist() -> private.
```

Функция с аргументами по умолчанию создает несколько Erlang функций для каждой арности:

```elixir
# elixir
def default_args(default \\ "asd") do
  default
end

def complex_default(a \\ 1, b \\ 2, c \\ 3) do
  a + b + c
end
```

```erlang
% erlang
complex_default() ->
    complex_default(1, 2, 3).
complex_default(x0@1) ->
    complex_default(x0@1, 2, 3).
complex_default(x0@1, x1@1) ->
    complex_default(x0@1, x1@1, 3).
complex_default(a@1, b@1, c@1) ->
    a@1 + b@1 + c@1.


default_args() ->
    default_args(<<"asd">>).
default_args(default@1) ->
    default@1.
```

Структуры тоже сделали интересно:

```elixir
# elixir
defmodule UserStruct do
  defstruct name: "John", age: 27

  def new(name \\ "John Doe") do
    %UserStruct{name: name}
  end

  def update do
    john = %UserStruct{}
    mari = %{john | name: "Mari"}

    %UserStruct{name: name} = john
  end
end
```

```erlang
% erlang
-module('Elixir.UserStruct').
-export(['__info__'/1, '__struct__'/0, new/0, new/1,
   update/0]).

'__info__'(functions) ->
    [{'__struct__', 0}, {new, 0}, {new, 1}, {update, 0}];
'__info__'(macros) -> [];
'__info__'(module) -> 'Elixir.UserStruct';
'__info__'(atom) -> module_info(atom).

new() -> new(<<"John Doe">>).

new(name@1) ->
    #{'__struct__' => 'Elixir.UserStruct', age => 27, name => name@1,
      '__struct__' => 'Elixir.UserStruct'}.

update() ->
    john@1 = #{'__struct__' => 'Elixir.UserStruct',
         age => 27, name => <<"John">>,
         '__struct__' => 'Elixir.UserStruct'},
    mari@1 = john@1#{name := <<"Mari">>},
    #{name := name@1, '__struct__' := 'Elixir.UserStruct'} = john@1.

'__struct__'() ->
    #{'__struct__' => 'Elixir.UserStruct', age => 27, name => <<"John">>}.
```

List comprehensions:

```elixir
# elixir
def comprehension do
  _a = for n <- [1, 2, 3, 4], do: n * n

  dirs = []
  _b = for dir <- dirs, file <- File.ls!(dir), path = Path.join(dir, file), File.regular?(path) do
    File.rm!(path)
  end
end
```

```erlang
% erlang
comprehension() ->
    _a@1 = lists:reverse('Elixir.Enum':reduce([1, 2, 3, 4], [],
        fun (n@1, _@1) ->
          [n@1 * n@1 | _@1]
        end)),
    dirs@1 = [],
    _b@1 = lists:reverse('Elixir.Enum':reduce(dirs@1, [],
        fun (dir@1, _@3) ->
            'Elixir.Enum':reduce('Elixir.File':'ls!'(dir@1), _@3,
                fun(file@1, _@3) ->
                    case path@1 = 'Elixir.Path':join(dir@1, file@1) of
                       _@5 when _@5 == false orelse _@5 == nil ->
                           _@3;
                       _ ->
                          case 'Elixir.File':'regular?'(path@1) of
                              _@6 when _@6 == false orelse _@6 == nil ->
                                  _@3;
                              _ ->
                                  ['Elixir.File':'rm!'(path@1) | _@3]
                          end
                    end
                end)
        end)).
```

Протоколы

```elixir
# elixir
defmodule Eum
  defprotocol Blank do
    def blank?(data)
  end

  defimpl Blank, for: List do
    def blank?([]), do: true
    def blank?(_),  do: false
  end

  def test_proto do
    Blank.blank?([])
    Blank.blank?([1, 2, 3])
  end
end
```

```erlang
% erlang
% Elixir.Eum.Blank.beam
-module('Elixir.Eum.Blank').
-compile(debug_info).
-compile({inline,
    [{any_impl_for, 0}, {struct_impl_for, 1},
     {'impl_for?', 1}]}).
-protocol([{fallback_to_any, false},
     {consolidated, false}]).
-export_type([{t, 0}]).
-type t() :: term().
-callback 'blank?'(t()) -> term().

-export(['__info__'/1, '__protocol__'/1, 'blank?'/1,
   impl_for/1, 'impl_for!'/1]).

'__info__'(functions) ->
    [{'__protocol__', 1}, {'blank?', 1}, {impl_for, 1},
     {'impl_for!', 1}];
'__info__'(macros) -> [];
'__info__'(module) -> 'Elixir.Eum.Blank';
'__info__'(atom) -> module_info(atom).

impl_for(#{'__struct__' := _@1}) when erlang:is_atom(_@1) ->
    struct_impl_for(_@1);
impl_for(_@1) when erlang:is_tuple(_@1) ->
    case 'impl_for?'('Elixir.Eum.Blank.Tuple') of
        true -> 'Elixir.Eum.Blank.Tuple':'__impl__'(target);
        false -> any_impl_for()
    end;
impl_for(_@1) when erlang:is_atom(_@1) ->
    case 'impl_for?'('Elixir.Eum.Blank.Atom') of
        true -> 'Elixir.Eum.Blank.Atom':'__impl__'(target);
        false -> any_impl_for()
    end;
impl_for(_@1) when erlang:is_list(_@1) ->
    case 'impl_for?'('Elixir.Eum.Blank.List') of
        true -> 'Elixir.Eum.Blank.List':'__impl__'(target);
        false -> any_impl_for()
    end;
impl_for(_@1) when erlang:is_map(_@1) ->
    case 'impl_for?'('Elixir.Eum.Blank.Map') of
        true -> 'Elixir.Eum.Blank.Map':'__impl__'(target);
        false -> any_impl_for()
    end;
impl_for(_@1) when erlang:is_bitstring(_@1) ->
    case 'impl_for?'('Elixir.Eum.Blank.BitString') of
        true -> 'Elixir.Eum.Blank.BitString':'__impl__'(target);
        false -> any_impl_for()
    end;
impl_for(_@1) when erlang:is_integer(_@1) ->
    case 'impl_for?'('Elixir.Eum.Blank.Integer') of
        true -> 'Elixir.Eum.Blank.Integer':'__impl__'(target);
        false -> any_impl_for()
    end;
impl_for(_@1) when erlang:is_float(_@1) ->
    case 'impl_for?'('Elixir.Eum.Blank.Float') of
        true -> 'Elixir.Eum.Blank.Float':'__impl__'(target);
        false -> any_impl_for()
    end;
impl_for(_@1) when erlang:is_function(_@1) ->
    case 'impl_for?'('Elixir.Eum.Blank.Function') of
        true -> 'Elixir.Eum.Blank.Function':'__impl__'(target);
        false -> any_impl_for()
    end;
impl_for(_@1) when erlang:is_pid(_@1) ->
    case 'impl_for?'('Elixir.Eum.Blank.PID') of
        true -> 'Elixir.Eum.Blank.PID':'__impl__'(target);
        false -> any_impl_for()
    end;
impl_for(_@1) when erlang:is_port(_@1) ->
    case 'impl_for?'('Elixir.Eum.Blank.Port') of
        true -> 'Elixir.Eum.Blank.Port':'__impl__'(target);
        false -> any_impl_for()
    end;
impl_for(_@1) when erlang:is_reference(_@1) ->
    case 'impl_for?'('Elixir.Eum.Blank.Reference') of
        true -> 'Elixir.Eum.Blank.Reference':'__impl__'(target);
        false -> any_impl_for()
    end.

'impl_for!'(_@1) ->
    case impl_for(_@1) of
        _@2 when _@2 =:= nil orelse _@2 =:= false ->
            erlang:error('Elixir.Protocol.UndefinedError':exception([{protocol,
                'Elixir.Eum.Blank'}, {value, _@1}]));
        _@3 -> _@3
    end.

struct_impl_for(_@1) ->
    _@2 = 'Elixir.Module':concat('Elixir.Eum.Blank', _@1),
    case 'impl_for?'(_@2) of
        true -> _@2:'__impl__'(target);
        false -> any_impl_for()
    end.

'impl_for?'(_@1) ->
    'Elixir.Code':'ensure_compiled?'(_@1) andalso
      'Elixir.Kernel':'function_exported?'(_@1, '__impl__', 1).

'__protocol__'(name) -> 'Elixir.Eum.Blank';
'__protocol__'(functions) -> [{'blank?', 1}].

any_impl_for() -> nil.

'blank?'(_@1) -> ('impl_for!'(_@1)):'blank?'(_@1).

% Elixir.Eum.Blank.List.beam
-module('Elixir.Eum.Blank.List').
-impl([{protocol, 'Elixir.Eum.Blank'},
       {for, 'Elixir.List'}]).
-behaviour('Elixir.Eum.Blank').
-export(['__impl__'/1, '__info__'/1, 'blank?'/1]).

'__info__'(functions) ->
    [{'__impl__', 1}, {'blank?', 1}];
'__info__'(macros) -> [];
'__info__'(module) -> 'Elixir.Eum.Blank.List';
'__info__'(atom) -> module_info(atom).

'__impl__'(for) -> 'Elixir.List';
'__impl__'(target) -> 'Elixir.Eum.Blank.List';
'__impl__'(protocol) -> 'Elixir.Eum.Blank'.

'blank?'([]) -> true;
'blank?'(_) -> false.
```

На этом, пожалуй, все. Надо будет еще на макросы посмотреть.
