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
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

const Ci = Components.interfaces;
const Cc = Components.classes;

var EXPORTED_SYMBOLS = ["GeolocaterPrefs","GeolocaterGooglePosition"];

//Mozilla object
function WifiGeoCoordsObject(lat, lon, acc, alt, altacc) {
  this.latitude = lat;
  this.longitude = lon;
  this.accuracy = acc;
  this.altitude = alt;
  this.altitudeAccuracy = altacc;
}

WifiGeoCoordsObject.prototype = {
  QueryInterface:  XPCOMUtils.generateQI([Ci.nsIDOMGeoPositionCoords]),
  classInfo: XPCOMUtils.generateCI({interfaces: [Ci.nsIDOMGeoPositionCoords],
                                    flags: Ci.nsIClassInfo.DOM_OBJECT,
                                    classDescription: "wifi geo position coords object"}),
};

//Mozilla object
function WifiGeoPositionObject(lat, lng, acc) {
  this.coords = new WifiGeoCoordsObject(lat, lng, acc, 0, 0);
  this.address = null;
  this.timestamp = Date.now();
}

WifiGeoPositionObject.prototype = {
  QueryInterface:   XPCOMUtils.generateQI([Ci.nsIDOMGeoPosition]),
  // Class Info is required to be able to pass objects back into the DOM.
  classInfo: XPCOMUtils.generateCI({interfaces: [Ci.nsIDOMGeoPosition],
                                    flags: Ci.nsIClassInfo.DOM_OBJECT,
                                    classDescription: "wifi geo location position object"}),
};

function GooglePosition() {
  this._location = null;
  this._events = new Events();

  var self = this;
  function queryGoogleService(aAccessPoints) {
    let providerUrlBase = "https://maps.googleapis.com/maps/api/browserlocation/json";
    let providerUrl;

    let query = providerUrlBase.indexOf("?");
    if (query == -1)
      providerUrl = providerUrlBase + "?"
    else
      providerUrl = providerUrlBase + "&";
    providerUrl = providerUrl + "browser=firefox&sensor=true";

    // check to see if we have an access token:
    let accessToken = "";
    try {
      let accessTokenPrefName = "geo.wifi.access_token." + providerUrlBase;
      accessToken = Services.prefs.getCharPref(accessTokenPrefName);

      // check to see if it has expired
      let accessTokenDate = Services.prefs.getIntPref(accessTokenPrefName + ".time");
      
      let accessTokenInterval = 1209600;  // seconds in 2 weeks
      try {
        accessTokenInterval = Services.prefs.getIntPref("geo.wifi.access_token.recycle_interval");
      } catch (e) {}
            
      if ((Date.now() / 1000) - accessTokenDate > accessTokenInterval)
        accessToken = "";
    }
    catch (e) {
      accessToken = "";
    }
    if (accessToken !== "")
      providerUrl = providerUrl + "&access_token="+accessToken;
   
    function sort(a, b) {
      return b.signal - a.signal;
    };

    function encode(ap) {
      // make sure that the ssid doesn't contain any | chars.
      ap.ssid = ap.ssid.replace("|", "\\|");
      // gls service parses the | as fields
      return "&wifi=mac:"+ap.mac+"|ssid:"+ap.ssid+"|ss:"+ap.signal;
    };

    if (aAccessPoints) {
        providerUrl = providerUrl + aAccessPoints.sort(sort).map(encode).join("");
        // max length is 2k.  make sure we are under that
        let x = providerUrl.length - 2000;
        if (x >= 0) {
            // we need to trim
            let doomed = providerUrl.lastIndexOf("&", 2000);
            providerUrl = providerUrl.substring(0, doomed);
        }
     }

    providerUrl = encodeURI(providerUrl);
    // send our request to a wifi geolocation network provider:
    let xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Ci.nsIXMLHttpRequest);

    // This is a background load
    xhr.mozBackgroundRequest = true;
    xhr.open("GET", providerUrl, false);
    xhr.channel.loadFlags = Ci.nsIChannel.LOAD_ANONYMOUS;
    xhr.addEventListener("error", function(req) {
    }, false);
    xhr.addEventListener("load", function (req) {  
      response = JSON.parse(req.target.responseText);
      /*
         {
          "status": "OK",
          "accuracy": 150.0,
          "location": {
            "lat": -33.85702,
            "lng": 151.21494
          },
          "access_token": "quijibo"
       }
      */

      if (response.status != "OK")
         return;

      if (response.location) {
        let newLocation = new WifiGeoPositionObject(response.location.lat,
                                                    response.location.lng,
                                                    response.accuracy);
        self.location = newLocation;
        self._events.dispatch('change',newLocation);
      } else {
        self.location = null;
        self._events.dispatch('change',null);
      }

      // Check to see if we have a new access token
      let newAccessToken = response.access_token;
      if (newAccessToken !== undefined)
      {
        let accessToken = "";
        let accessTokenPrefName = "geo.wifi.access_token." + providerUrlBase;
        try { accessToken = Services.prefs.getCharPref(accessTokenPrefName); } catch (e) {}

        if (accessToken != newAccessToken) {
          // no match, lets cache
          try {
            Services.prefs.setIntPref(accessTokenPrefName + ".time", nowInSeconds());
            Services.prefs.setCharPref(accessTokenPrefName, newAccessToken);
           } catch (x) {
               // XXX temporary hack for bug 575346 to allow geolocation to function
          }
        }
      }
    }, false);

    xhr.send(null);
  }

  function queryWifi() {
  }
  queryWifi.prototype =
  {
    onChange: function (accessPoints){
      queryGoogleService(accessPoints);
    },
 
    onError: function (value) {
      queryGoogleService(null);
    },

    QueryInterface: function(iid) {
      if (iid.equals(Ci.nsIWifiListener) ||
          iid.equals(Ci.nsISupports))
        return this;
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
  }
  
  // To query Google Geolocation Service
  // also without @mozilla.org/wifi/monitor;1 component
  // bug discover in Ubuntu Firefox
  try {
    let listener = new queryWifi();
    let wifi_service = Cc["@mozilla.org/wifi/monitor;1"].
      getService(Ci.nsIWifiMonitor);
    wifi_service.startWatching(listener);
    wifi.listener = listener;
    wifi.service = wifi_service;
    window.addEventListener("unload",function(){
        if (wifi.service != null && wifi.listener != null)
          wifi.service.stopWatching(wifi.listener);
    },false);
  } catch(e) {
    queryGoogleService(null);
  }
}
GooglePosition.prototype = {
  get location() {
    return this._location;
  },
  get events() {
    return this._events;
  }
};

// Events object for the prefs API
function Events() {
  this._listeners = [];
}

Events.prototype = {
  addListener : function evts_al(aEvent, aListener) {
    if (this._listeners.some(hasFilter))
      return;
 
    this._listeners.push({
      event: aEvent,
      listener: aListener
    });
 
    function hasFilter(element) {
      return element.event == aEvent && element.listener == aListener;
    }
  },
 
  removeListener : function evts_rl(aEvent, aListener) {
    this._listeners = this._listeners.filter(hasFilter);
 
    function hasFilter(element) {
      return (element.event != aEvent) || (element.listener != aListener);
    }
  },
 
  dispatch : function evts_dispatch(aEvent, aEventItem) {
    var eventItem = {type:'change', data:aEventItem};
 
    this._listeners.forEach(function(key){
      if (key.event == aEvent) {
        key.listener.handleEvent ?
          key.listener.handleEvent(eventItem) :
          key.listener(eventItem);
      }
    });
 
    return true;
  }
};

// Geolocater Pref Manager
function Prefs() {
  this._events = new Events();
  this._update = Cc["@mozilla.org/geolocation/service;1"].
    getService(Ci.nsIGeolocationUpdate);
  this.forceUpdate = function() {
    var value = this.uri;
    if (value == 'geoloc://www.google.com/loc/json') {
        this._update.update(GeolocaterGooglePosition.location);
    } else {
      let id = value.replace('geoloc://localhost/','');
      let localhost = Services.prefs.
        getCharPref("extensions.geolocater.localhost");
      localhost = JSON.parse(localhost);
      let coords = localhost[id].coords;
      let loc = new WifiGeoPositionObject(coords.latitude,
                                          coords.longitude,
                                          coords.accuracy);
      this._update.update(loc);
    }
  };
}

Prefs.prototype = {
  get uri() {
    return Services.prefs.getCharPref('geo.wifi.uri');
  },
  set uri(aValue) {
    if (aValue == '')
      return Services.prefs.getCharPref('geo.wifi.uri');
    let changed = (Services.prefs.getCharPref('geo.wifi.uri') != aValue);
    if (changed) {
      Services.prefs.setCharPref('geo.wifi.uri',aValue);
      this._events.dispatch('uri',aValue);
    }
    return aValue;
  },
  get googserv() {
    return Services.prefs.getCharPref('extensions.geolocater.googleservice');
  },
  get localhost() {
    return Services.prefs.getCharPref('extensions.geolocater.localhost');
  },
  set localhost(aValue) {
    let changed = (Services.prefs.getCharPref('extensions.geolocater.localhost') != aValue);
    Services.prefs.setCharPref('extensions.geolocater.localhost',aValue);
    if (changed)
      this._events.dispatch('localhost',aValue);
    return aValue;
  },
  get events() {
    return this._events;
  }
};

var GeolocaterPrefs = new Prefs();
var GeolocaterGooglePosition = new GooglePosition();
