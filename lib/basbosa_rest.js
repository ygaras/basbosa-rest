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
    defaultActions : ['create', 'read'],
    defaultTemplates : 'html',
    templates : pdn(pdn(__filename)) + '/templates/'


  },

  options : function(options) {
    if (typeof options === 'undefined') return this.settings;

    if (typeof options === 'string') return this.settings[options];

    for (var key in this.settings) {
      if (typeof options[key] !== 'undefined') this.settings[key] = options[key];
    }
  },

  handle : function(alias, resourceName, actions) {
    var self = this, map = self.options().map, boundFunction;
    actions = actions || this.options('defaultActions');
    actions.forEach(function(action) {
      for (var verb in map[action]) {
        boundFunction = self[action].bind(self);
        map[action][verb].forEach(function(url) {
          url = url.replace('%resourceName%', alias);
          Basbosa('Logger').trace('Binding action: ' + action + ' verb ' + verb + ' to url ' + url);
          Basbosa('App')[verb](url, function(req, res, next) {
            req.rest = {
              resourceName : resourceName,
              resourceRoot : '/' + alias
            };
            boundFunction(req, res, next);
          });
        });
      }
    });

  },

  create : function(req, res, next) {

  },

  read : function(req, res, next) {
    var
      self = this,
      resourceName = req.rest.resourceName,
      modelName = B('_').classify(B('_').singularize(resourceName)) + 'Model',
      query = B('_').extend({}, req.query.query),
      fields = B('_').extend({}, req.query.fields),
      qOptions = B('_').extend({limit : 20}, req.query.qOptions);

    B('AutoModels').getModel(modelName, function(err, model) {
      model.find(query, fields, qOptions, function(err, results) {
        res.locals.data = results.toJSON();
        if (self.options('defaultTemplates') !== 'json') {
          res.locals.view = self.options('templates') + 'read_list_' + self.options('defaultTemplates');
          res.locals.dataFields = self.extractFields(res.locals.data);
          res.locals.resourceRoot = req.rest.resourceRoot;
        } else {
          res.locals.view = self.options('templates') + 'json';
        }

        next();
      }, res);
    });
  },

  extractFields : function(data) {
    var fields = {};
    data.forEach(function(row) {
      for (var f in row) fields[f] = 1;
    });

    var keys = [];
    for (var k in fields) keys.push(k);
    return keys;
  }
};

if (typeof _instance === 'undefined') _instance = new BasbosaRest;
if (typeof Basbosa !== 'undefined') {
  Basbosa.add('Rest', _instance);
}