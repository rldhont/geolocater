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
 * @fileoverview geoloc:// Protocol Handler
 */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

const Ci = Components.interfaces;
const Cc = Components.classes;

//Protocol handler
function GeolocProtocolHandler(){
}

GeolocProtocolHandler.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolHandler,Ci.nsIObserver]),
  classDescription: "Geoloc Protocol Handler",
  classID: Components.ID("{304ca79d-e830-45e4-b12e-7bbab2aa2496}"),
  contractID: "@mozilla.org/network/protocol;1?name=geoloc",

  _PHIID: Ci.nsIProtocolHandler,
  get scheme()          { return "geoloc"; },
  get protocolFlags()   { return this._PHIID.URI_NORELATIVE | this._PHIID.URI_NOAUTH },
  get defaultPort()     { return 0; },
  
  allowPort: function (aPort, aScheme)
  {
    return false;
  },
  
  newURI: function (aSpec, aOriginalCharset, aBaseURI)
  {
    var uri = Cc["@mozilla.org/network/standard-url;1"].createInstance(Ci.nsIStandardURL);
    uri.init(Ci.nsIStandardURL.URLTYPE_STANDARD,6667,aSpec,aOriginalCharset,aBaseURI);

    return uri.QueryInterface(Ci.nsIURI);
  },
  
  newChannel: function (aURI)
  {
    var ioService = Cc["@mozilla.org/network/io-service;1"]
       .getService(Ci.nsIIOService);
    
    //var pageURI = "https://www.google.com/loc/json";
    var pageURI = Services.prefs.
      getCharPref("extensions.geolocater.googleservice");
   
    pageURI += '?browser=firefox&sensor=true';
    if (aURI.host == "www.google.com")
      return ioService.newChannel(pageURI, null, null);

    var id = aURI.path.split('?')[0].replace('/','');
    var localhost = Services.prefs.
      getCharPref("extensions.geolocater.localhost");
    localhost = JSON.parse(localhost);

    // Create the pipe
    var pipe = Cc["@mozilla.org/pipe;1"].
      createInstance(Ci.nsIPipe);
    pipe.init(true,true, 0, 0, null);

    // Create the channel
    var channel = Cc["@mozilla.org/network/input-stream-channel;1"].
      createInstance(Ci.nsIInputStreamChannel);
    channel.setURI(aURI);
    channel.contentStream = pipe.inputStream;
    channel.QueryInterface(Ci.nsIChannel);
    channel.contentType = "application/json";
    channel.contentCharset = "UTF-8";

    var converter = Cc["@mozilla.org/intl/converter-output-stream;1"].
      createInstance(Ci.nsIConverterOutputStream);
    converter.init(pipe.outputStream, "UTF-8", 0, 0);
    var coords = localhost[id].coords
    var data = JSON.stringify({
      'status':'OK',
      'accuracy':coords.accuracy,
      'location':{'lat':coords.latitude,'lng':coords.longitude},
      'access_token':id
    });
    converter.writeString(data);
    converter.close();
    //dump(data+'\n');

    pipe.outputStream.close();

    return channel;
  },
  observe: function(aSubject, aTopic, aData) {
    Components.utils.import("resource://geolocater/geolocater-prefs.js");
  },
  register: function() {
    var observerService = Cc["@mozilla.org/observer-service;1"]
      .getService(Ci.nsIObserverService);
    observerService.addObserver(this, "profile-after-change", false);
  },
  unregister: function() {
    var observerService = Cc["@mozilla.org/observer-service;1"]
      .getService(Ci.nsIObserverService);
    observerService.removeObserver(this, "profile-after-change");
  }
};

var components = [GeolocProtocolHandler];

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule(components);
