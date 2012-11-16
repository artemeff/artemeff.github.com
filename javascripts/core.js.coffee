$ ->

  $(".archive_year").click (e) ->
    # disable all actions
    e.preventDefault()
    # get year
    year = $(this).attr "data-year"
    # classes
    $(".archive_year").removeClass "active"
    $(this).addClass "active"
    # hide other
    $(".archive_for:visible").fadeOut "fast", "linear", () ->
      $("#archive_for_" + year).fadeIn "fast"
