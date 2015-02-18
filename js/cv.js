(function() {
  var gitHubUserUrl = 'https://api.github.com/users/artemeff';
  var gitHubToken = '2fd711b19edcde167f78ff8ffd1a44a0b727c62c';
  var fetchedData = [];
  var nanobar = new Nanobar({bg: '#555'});

  nanobar.go(5);

  var width = 350,
      height = 350,
      radius = Math.min(width, height) / 2,
      innerRadius = 0.3 * radius;

  /**
   * Helpers
   */

  var shuffleArray = function(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
  }

  /**
   * Data fetchers
   */

  var getJSON = function(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url, true);
    xhr.setRequestHeader('Authorization', 'token ' + gitHubToken);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
          cb && cb(JSON.parse(xhr.responseText));
        } else {
          console.error('Request error:', xhr.status);
        }
      }
    };
    xhr.send(null);
  };

  var fetchOwnRepos = function(callback) {
    getJSON(gitHubUserUrl + '/repos?per_page=100', function(repos) {
      var ownRepos = [];

      for (var i = repos.length - 1; i >= 0; i--) {
        if (!repos[i].fork) {
          ownRepos.push(repos[i]);
        }
      };

      for (var i = ownRepos.length - 1; i >= 0; i--) {
        callback && callback(ownRepos.length, ownRepos[i]);
      };
    });
  }

  var fetchLanguages = function(languagesUrl, callback) {
    getJSON(languagesUrl, function(languages) {
      callback && callback(languages);
    });
  }

  var fetchAllData = function(callback) {
    fetchOwnRepos(function(repoCount, repo) {
      var finalCallback = function() {
        nanobar.go((fetchedData.length / repoCount * 100) + 5);
        if (fetchedData.length == repoCount) {
          nanobar.go(100);
          callback && callback(fetchedData);
        }
      }

      fetchLanguages(repo.languages_url, function(languages) {
        fetchedData.push(languages);
        finalCallback();
      });
    });
  }

  /**
   * Data
   */

  var collectLangStats = function(repoLangs) {
    var langStats = {},
        results = [],
        maxOfBytes = 0;

    for (var i = repoLangs.length - 1; i >= 0; i--) {
      var langs = repoLangs[i];

      for (var name in langs) {
        var size = langs[name];
        if (!langStats[name]) {
          langStats[name] = {size: 0, repos: 0};
        }
        langStats[name].size += size;
        langStats[name].repos += 1;
      };
    };

    for (var name in langStats) {
      var langStat = langStats[name];
      if (langStat.size > maxOfBytes) {
        maxOfBytes = langStat.size;
      }
    };

    for (var name in langStats) {
      var langStat = langStats[name];

      results.push({
        name: name,
        size: langStat.size,
        sizePercent: langStat.size / maxOfBytes,
        repos: langStat.repos
      });
    };

    return shuffleArray(results);
  }

  /**
   * Formatting
   */

  var formatBytes = function (bytes) {
    var fmt = d3.format('.0f');
    if (bytes < 1024) {
      return fmt(bytes) + 'B';
    } else {
      return fmt(bytes / 1024) + 'kB';
    }
  }

  /**
   * Charts
   */

  var pie = d3.layout.pie()
    .sort(null)
    .value(function(d) { return d.repos; });

  var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([0, 0])
    .html(function(d) {
      var label = d.data.name,
          size  = formatBytes(d.data.size);
      return label + ": <span style='color:orangered'>" + size + "</span>";
    });

  var arc = d3.svg.arc()
    .innerRadius(innerRadius)
    .outerRadius(function (d) {
      var value = d.data.sizePercent;
      if (value < 0.1) value = 0.1;
      return (radius - innerRadius) * value + innerRadius; 
    });

  var outlineArc = d3.svg.arc()
    .innerRadius(innerRadius)
    .outerRadius(radius);

  var container = d3.select("#lang-stats").append("svg")
    .attr("class", "shadowed")
    .attr("width", width)
    .attr("height", height);

  var svg = container.append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  svg.call(tip);

  fetchAllData(function(rawData) {
    var data = collectLangStats(rawData);

    var path = svg.selectAll(".solidArc")
        .data(pie(data))
      .enter().append("path")
        .attr("class", function(d) {
          return 'solidArc lang-' + d.data.name.toLocaleLowerCase();
        })
        .attr("d", arc)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);

    var outerPath = svg.selectAll(".outlineArc")
        .data(pie(data))
      .enter().append("path")
        .attr("fill", "none")
        .attr("class", "outlineArc")
        .attr("d", outlineArc);  

    var score = data.reduce(function(acc, val) {
      return acc + val.size;
    }, 0);

    svg.append("svg:text")
      .attr("class", "score")
      .attr("dy", ".25em")
      .attr("text-anchor", "middle")
      .text(formatBytes(score));

    svg.append("svg:text")
      .attr("class", "score-span")
      .attr("dy", "2em")
      .attr("text-anchor", "middle")
      .text('of open-source code');

    container.attr("class", null);
  });
})();
