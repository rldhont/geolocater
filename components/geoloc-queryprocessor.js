/****** BEGIN LICENSE BLOCK *****
 Version: MPL 1.1/GPL 2.0/LGPL 2.1

 The contents of this file are subject to the Mozilla Public License Version
 1.1 (the "License"); you may not use this file except in compliance with
 the License. You may obtain a copy of the License at 
 http://www.mozilla.org/MPL/

 Software distributed under the License is distributed on an "AS IS" basis,
 WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 for the specific language governing rights and limitations under the
 License.

 The Original Code is 3liz code,

 The Initial Developer of the Original Code is René-Luc D'Hont rldhont@3liz.com
 Portions created by the Initial Developer are Copyright (C) 2009
 the Initial Developer. All Rights Reserved.

 Some Parts of the Code are taken from the original Mozilla Firefox and/or XulRunner Code. 
 If these parts were subject to a licence not in compliance with the License, 
 it is not intentionnal and please contact the Initial Developer.

 Alternatively, the contents of this file may be used under the terms of
 either of the GNU General Public License Version 2 or later (the "GPL"),
 or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 in which case the provisions of the GPL or the LGPL are applicable instead
 of those above. If you wish to allow use of your version of this file only
 under the terms of either the GPL or the LGPL, and not to allow others to
 use your version of this file under the terms of the MPL, indicate your
 decision by deleting the provisions above and replace them with the notice
 and other provisions required by the GPL or the LGPL. If you do not delete
 the provisions above, a recipient may use your version of this file under
 the terms of any one of the MPL, the GPL or the LGPL.

 ***** END LICENSE BLOCK ***** */

/**
 * @fileoverview geolocater template query processor
 */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

const Ci = Components.interfaces;
const Cc = Components.classes;

var Application = Cc["@mozilla.org/fuel/application;1"].
                    getService(Ci.fuelIApplication);

// basic wrapper for nsIXULTemplateResult
function GeolocaterResult(aId,aData) {
  this._id = aId;
  this._data = aData;
}

GeolocaterResult.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIXULTemplateResult]),

  // private storage
  _data: null,

  // right now our results are flat lists, 
  // so no containing/recursion take place
  isContainer: false,
  isEmpty: true,
  mayProcessChildren: false,
  resource: null,
  type: "simple-item",

  get id() {
    return this._id;
  },

  // return the value of that bound variable such as ?name
  getBindingFor: function(aVar) {
    // strip off the ? from the beginning of the name
    var name = aVar.toString().slice(1);
    if (name == 'id')
      return this._id;
    return this._data[name];
  },

  // return an object instead of a string for convenient comparison purposes
  // or null to say just use string value
  getBindingObjectFor: function(aVar) {
    return null;
  },

  // called when a rule matches this item.
  ruleMatched: function(aQuery, aRuleNode) { },

  // the output for a result has been removed and the result is no longer being used by the builder
  hasBeenRemoved: function() { }
};


// basic wrapper for nsISimpleEnumerator
function GeolocaterResultSet(aArrayOfData) {
  this._index = 0;
  this._array = aArrayOfData;
}

GeolocaterResultSet.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsISimpleEnumerator]),

  hasMoreElements: function() {
    return this._index < this._array.length;
  },

  getNext: function() {
    var geolocation = this._array[this._index++];
    return new GeolocaterResult(geolocation.id,geolocation.data);
  }
};


// The query processor class - implements nsIXULTemplateQueryProcessor
function GeolocaterQueryProcessor() {
  this._data = [];
}

GeolocaterQueryProcessor.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIXULTemplateQueryProcessor]),
  classDescription: "Geolocater XUL Template Query Processor",
  classID: Components.ID("{c7b92f98-c7f1-4f55-961f-607430bca757}"),
  contractID: "@mozilla.org/xul/xul-query-processor;1?name=geolocater",

  getDatasource: function(aDataSources, aRootNode, aIsTrusted, aBuilder, aShouldDelayBuilding) {
    // TODO: parse the aDataSources variable
    // for now, ignore everything and let's just signal that we have data
    return this._data;
  },

  initializeForBuilding: function(aDatasource, aBuilder, aRootNode) {
    // perform any initialization that can be delayed until the content builder
    // is ready for us to start
    var localhost = Application.prefs.
      get("extensions.geolocater.localhost").value;
    dump('localhost:'+localhost+'\n');
    localhost = Services.prefs.
      getCharPref("extensions.geolocater.localhost");
    dump('localhost:'+localhost+'\n');
    localhost = JSON.parse(localhost);
    this._data = [];
    for (var id in localhost) {
      this._data.push({
        id:id,
        data:localhost[id]
      });
    }
    return this._data;
  },

  done: function() {
    // called when the builder is destroyed to clean up state
  },

  compileQuery: function(aBuilder, aQuery, aRefVariable, aMemberVariable) {
    // outputs a query object.
    // eventually we should read the <query> to create filters
    return this._data;
  },

  generateResults: function(aDatasource, aRef, aQuery) {
    // preform any query and pass the data to the result set
    return new GeolocaterResultSet(this._data);
  },

  addBinding: function(aRuleNode, aVar, aRef, aExpr) {
    // add a variable binding for a particular rule, which we aren't using yet
  },

  translateRef: function(aDatasource, aRefstring) {
    // if we return null, everything stops
    return new GeolocaterResult(aRefstring,null);
  },

  compareResults: function(aLeft, aRight, aVar) {
    // -1 less, 0 ==, +1 greater
    var leftValue = aLeft.getBindingFor(aVar);
    var rightValue = aRight.getBindingFor(aVar);
    if (leftValue < rightValue) {
      return -1;
    }
    else if (leftValue > rightValue) {
      return  1;
    }
    else {
      return 0;
    }
  }
};

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
var components = [GeolocaterQueryProcessor];

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule(components);
