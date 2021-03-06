$(window).ready(function () {
  google.load('visualization', '1.0', {'packages':['corechart'], callback:APP.init});
});

var APP = {

  cookie : null,
  data   : {'monthy': null, 
            'all'   : null},

  init : function() {

    /**
     * We first need to load the monthy balance
     * to get all the months url. Once this is done
     * we can safely load the month data and display
     * all the other charts. 
     */
    APP.initlistener();
    APP.loadMonthlyBalance(function() {
      VIEW.drawMonthlyBalance('depenses');
      APP.loadMonth(APP.data['monthly'], function() {
        VIEW.drawRest();
      });
    });
  },

  initlistener: function() {

    /**
     * Buttons toggle mechanism
     */
    $('#rechargements-btn').click(function() {
      VIEW.drawMonthlyBalance('rechargements');
      $(this).addClass('btn-success');
      $('#depenses-btn').removeClass('btn-success');
    });

    $('#depenses-btn').click(function() {
      VIEW.drawMonthlyBalance('depenses');
      $(this).addClass('btn-success');
      $('#rechargements-btn').removeClass('btn-success');
    });

  },

  loadMonthlyBalance: function(callback) {
    $.post("/get/montly", { cookie: APP.cookie })
      .done(function(data) {
        APP.data['monthly'] = JSON.parse(data).reverse();
        callback();
      }
    );
  },

  loadMonth: function(data, callback) {
    $.post("/get/all", { cookie: APP.cookie, data: data})
      .done(function(data) {
        APP.data['all'] = JSON.parse(data);
        callback();
      }
    );
  },

}

var VIEW = {

  drawMonthlyBalance: function(type) {
    var totaldepense = 0;
    var totalrechargement = 0;

    var gdata = new google.visualization.DataTable();   
    gdata.addColumn('string', 'Date');
    gdata.addColumn('number', 'Euro');

    data = APP.data['monthly']
    $.each(data, function(index, value) {
      var aux = type == 'depenses' ? value.out : value.in;
      totaldepense += parseFloat(value.out);
      totalrechargement += parseFloat(value.in);

      gdata.addRow([value.date, parseInt(aux)])
    });

    var options = { 'width'           : '100%', 
                    'height'          : '500', 
                    'backgroundColor' : { fill:'transparent' }};

    $("#depenses-btn").text("Dépenses mensuel ( " + totaldepense + "€ )");
    $("#rechargements-btn").text("Rechargements mensuel ( " + totalrechargement + "€ )");

    var chart = new google.visualization.AreaChart($('#monthly_balance')[0]); 
    chart.draw(gdata, options);

  },

  drawRest: function () {
    VIEW.drawDepenseHorraire();
    VIEW.drawTopConsommation();
    VIEW.drawTopBarman();
  },

  drawTopBarman: function() {
    var barmans = [];
    data = APP.data['all'];
    $.each(data, function(index, value) {
      if (barmans[value.vendeur] == undefined) {
        barmans[value.vendeur] = 1;
      } else {
        barmans[value.vendeur] += 1;
      }
    }); 

    $('#top_barman').empty();
    $('#top_barman').append('<h4>Tu as été servi par : </h4><br/>')
    Tools.bySortedValues(barmans, function(index, key, value) {
      $('#top_barman').append('<h5>('+value+') '+key+'</h5>')
      //if (index >= 14) return true;
    });
  },

  drawTopConsommation: function() {
    var conso = []
    data = APP.data['all'];
    $.each(data, function(index, value) {
      if (conso[value.name] == undefined) {
        conso[value.name] = parseInt(value.qte);
      } else {
        conso[value.name] += parseInt(value.qte);
      }
    });

    $('#top_conso').empty();
    $('#top_conso').append('<h4>Tu as commandé : </h4><br/>')
    Tools.bySortedValues(conso, function(index, key, value) {
      $('#top_conso').append('<h5>('+value+') '+key+'</h5>')
      //if (index >= 14) return true;
    });
  },

  drawDepenseHorraire: function() {

    var gdata = new google.visualization.DataTable();   
    gdata.addColumn('string', 'Date');
    gdata.addColumn('number', 'Euro');

    var times = [];
    data = APP.data['all']
    $.each(data, function(index, value) {
      time = value.time.split(' ');
      time = time[1].split(':');
      hour = time[0];
      if (times[hour] == undefined) {
        times[hour] = value.qte * value.prix;
      } else {
        times[hour] += value.qte * value.prix;
      }
    });

    // Quick & dirty fix to see night better.
    Tools.bySortedKeys(times, function(index, key, value) {
      if (key > 9) {
        gdata.addRow([key+"h", Math.floor(value)]);
      }
    });

    Tools.bySortedKeys(times, function(index, key, value) {
      if (key <= 9) {
        gdata.addRow([key+"h", Math.floor(value)]);
      }
    });

    var options = { 'width'           : '100%', 
                    'height'          : '500', 
                    'backgroundColor' : { fill:'transparent' }};

    var chart = new google.visualization.AreaChart($('#depense_horraire')[0]); 
    chart.draw(gdata, options);

  }

};

var Tools = {

  bySortedValues: function(obj, callback, context) {
    Tools.sort(obj, callback, function(a, b) { 
      return a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0 
    }, context);
  },

  bySortedKeys: function(obj, callback, context) {
    Tools.sort(obj, callback, function(a, b) { 
      return a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0
    }, context);
  },

  sort: function(obj, callback, sortFunction, context) {
    var tuples = [];
    for (var key in obj) tuples.push([key, obj[key]]);
    tuples.sort(sortFunction);
    var index = 0;
    while (index < tuples.length) {
      if(callback.call(context, index, tuples[index][0], tuples[index][1])) {
        return true;
      }
      index++;
    }  
  }

};
