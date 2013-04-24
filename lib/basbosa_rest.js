var BasbosaRest = function() {};
var _instance;
var pdn = require('path').dirname;

BasbosaRest.prototype = {
  settings : {
    map : {
      create : {
        put : ['/%resourceName%'],
        post : ['/%resourceName%/add'],
        get : ['/%resourceName%/add']
      },

      read : {
        get : ['/%resourceName%']
      },

      update : {
        get : ['/%resourceName%/edit/:_id'],
        post : ['/%resourceName%/edit/:_id', '/%resourceName%']
      },

      delete : {
        get : ['/%resourceName%/delete/:_id'],
        delete : ['/%resourceName%/:_id']
      }
    },
    defaultActions : ['create', 'read', 'update', 'delete'],
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

  queryJSON : function(query) {
    var self = this;
    for (var x in query) {
      if (typeof query[x] === 'string') {
        if (query[x][0] == '[' || query[x][0] == '{') {
          query[x] = JSON.parse(query[x]);
        } else if (!isNaN(parseFloat(query[x])) && isFinite(query[x])) {
          query[x] = parseFloat(query[x]);
        }
      } else {
        self.queryJSON(query[x]);
      }
    }
  },

  handle : function(alias, resourceName, actions) {
    var self = this, map = self.options().map;
    actions = actions || this.options('defaultActions');
    actions.forEach(function(action) {
      for (var verb in map[action]) {
        map[action][verb].forEach(function(url) {
          var boundFunction = self[action].bind(self);
          url = url.replace('%resourceName%', alias);
          Basbosa('Logger').trace('Binding action: ' + action + ' verb ' + verb + ' to url ' + url);
          Basbosa('App')[verb](url, function(req, res, next) {
            var q = B('_').extend({}, req.query);
            //var action = action;
            self.queryJSON(q);
            req.rest = {
              resourceName : resourceName,
              resourceRoot : '/' + alias,
              modelName : B('_').classify(B('_').singularize(resourceName)) + 'Model',
              query : q
            };
            boundFunction(req, res, function() {
              if (self.options('defaultTemplates') !== 'json') {

                res.locals.view = self.options('templates') + action + '_' + self.options('defaultTemplates');
                res.locals.resourceRoot = req.rest.resourceRoot;
              } else {
                res.locals.view = self.options('templates') + 'json';
              }
              next();
            });
          });
        });
      }
    });

  },

  create : function(req, res, next) {
    if (req.method === 'GET' && req.rest.query.data) {
      // Updating the model using get data
      var model = new (B(req.rest.modelName));
      model.set(req.rest.query.data);
      model.saveDb(function(err, result) {
        if (err) throw new Error(err);
        res.locals.data = model.toJSON();
        res.locals.restDataUpdated = true;
        next();
      });
    } else {
      next();
    }
  },

  read : function(req, res, next) {
    var
      self = this,
      resourceName = req.rest.resourceName,
      modelName = B('_').classify(B('_').singularize(resourceName)) + 'Model',
      q = req.rest.query,
      query = B('_').extend({}, q.query),
      fields = B('_').extend({}, q.fields),
      qOptions = B('_').extend({limit : 20}, q.qOptions);

    B('AutoModels').getModel(modelName, function(err, model) {
      model.find(query, fields, qOptions, function(err, results) {
        res.locals.data = results.toJSON();
        res.locals.dataFields = self.extractFields(res.locals.data);
        B('Logger').trace('Read list found ' + results.length + ' records');
        next();
      }, res);
    });
  },

  update : function(req, res, next) {
    var self = this;

    // if this is a get request with no data posted
    if (req.method === 'GET' && !req.rest.query.data) {
      B('AutoModels').getModel(req.rest.modelName, function(err, model) {
        model.find({_id : new (B('ObjectId'))(req.param('_id'))}, {}, {}, function(err, results) {
          res.locals.data = results.first() ? results.first().toJSON() : {};
          next();
        }, res);
      });
    } else if (req.method === 'GET' && req.rest.query.data) {
      // Updating the model using get data
      var model = new (B(req.rest.modelName));
      model.set(req.rest.query.data);
      model.saveDb(function(err, result) {
        if (err) throw new Error(err);
        res.locals.data = model.toJSON();
        res.locals.restDataUpdated = true;
        next();
      });
    }
  },

  delete : function(req, res, next) {
    B('AutoModels').getModel(req.rest.modelName, function(err, Model) {
      Model.delete({_id : new (B('ObjectId'))(req.param('_id'))}, function (err, result) {
        if (err) throw new Error(err);
        res.redirect(req.rest.resourceRoot);
        //next();
      });
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