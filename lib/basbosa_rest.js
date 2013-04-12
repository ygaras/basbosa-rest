var BasbosaRest = function() {};
var _instance;
var pdn = require('path').dirname;

BasbosaRest.prototype = {
  settings : {
    map : {
      create : {
        put : ['/%resourceName%'],
        post : ['/%resourceName%/add']
      },

      read : {
        get : ['/%resourceName%', '/%resourceName%/:_id']
      }
    },

    templates : pdn(pdn(__filename)) + '/templates/'
  },

  options : function(options) {
    if (typeof options === 'undefined') return this.settings;

    if (typeof options === 'string') return this.settings[options];

    for (var key in this.settings) {
      if (typeof options[key] !== 'undefined') this.settings[key] = options[key];
    }
  },

  alias : function(alias, route) {

  },

  handle : function(resourceName, actions) {
    var self = this, map = self.options().map, boundFunction;
    actions = actions || ['create', 'read'];
    actions.forEach(function(action) {
      for (var verb in map[action]) {
        //Basbosa('Logger').debug(self.options().map[action], verb);
        boundFunction = self[action].bind(self);
        map[action][verb].forEach(function(url) {
          url = url.replace('%resourceName%', resourceName);
          Basbosa('Logger').debug('Binding action: ' + action + ' verb ' + verb + ' to url ' + url);
          Basbosa('App')[verb](url, boundFunction);
        });
      }
    });
  },


  create : function(req, res, next) {

  },

  read : function(req, res, next) {
    var
      self = this,
      resourceName = req.url.split('/')[1],
      modelName = B('_').classify(B('_').singularize(resourceName)) + 'Model';

    B('Logger').debug(resourceName, modelName);

    B('AutoModels').getModel(modelName, function(err, model) {
      B('Logger').debug(model);
      model.find({}, {}, {}, function(err, results) {
        res.locals.data = results.toJSON();
        res.locals.view = self.options('templates') + 'json';
        next();
      }, res);
    });
  },

  update : function(req, res, next) {

  },

  'delete' : function(req, res, next) {

  }
};

if (typeof _instance === 'undefined') _instance = new BasbosaRest;
if (typeof Basbosa !== 'undefined') {
  Basbosa.add('Rest', _instance);
}