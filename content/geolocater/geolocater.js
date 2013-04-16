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

const CL = Components.classes;
const CI = Components.interfaces;

// General User Interface
// Object to store element and information on the
// User Interface
var gui = {};

// General User Interface Controller
// Object to control the commands of the
// User Interface
var guiController = {
  supportsCommand: function(cmd)
  {
    switch (cmd) {
      case "cmd_new":
      case "cmd_edit":
      case "cmd_del":
      case "cmd_cancel":
      case "cmd_switch":
      case "cmd_save":
      case "cmd_move":
      case "cmd_pan_map":
      case "cmd_zoom_in":
      case "cmd_zoom_out":
      case "cmd_zoom_ext":
      case "cmd_zoom_sel":
      case "cmd_search":
        return true;
    }
    return false;
  },

  isCommandEnabled: function(cmd)
  {
    switch (cmd) {
      case "cmd_pan_map":
      case "cmd_zoom_in":
      case "cmd_zoom_out":
      case "cmd_zoom_ext":
      case "cmd_search":
        return true;
      case "cmd_new":
        return (gui.deck.selectedIndex == 0);
      case "cmd_edit":
      case "cmd_del":
        return (gui.deck.selectedIndex == 0 &&
                gui.listbox.currentIndex > 0 &&
                gui.listbox.currentItem != null);
      case "cmd_save":
        var editFrame = gui.frames.edit;
        editFrame = editFrame.contentWindow.wrappedJSObject;
        if (gui.edit.name.value == '' ||
            editFrame.centers.features.length == 0)
          return false;
      case "cmd_cancel":
        return (gui.deck.selectedIndex == 1);
      case "cmd_switch":
      case "cmd_move":
        return (gui.deck.selectedIndex == 1);
      case "cmd_zoom_sel":
        return (gui.listbox.currentItem != null);
    }
    return false;
  },
  
  doCommand: function(cmd)
  {
    if (this.isCommandEnabled(cmd)) {
      switch (cmd) {
        case "cmd_new":
          geolocaterNew();
          break;
        case "cmd_edit":
          geolocaterEdit();
          break;
        case "cmd_del":
          geolocaterDel();
          break;
        case "cmd_cancel":
          geolocaterSaveCancel('cancel');
          break;
        case "cmd_switch":
          geolocaterSwitch();
          break;
        case "cmd_save":
          geolocaterSaveCancel('save');
          break;
        case "cmd_move":
          geolocaterMove();
          break;
        case "cmd_pan_map":
          geolocaterPanZoom('pan');
          break;
        case "cmd_zoom_in":
          geolocaterPanZoom('in');
          break;
        case "cmd_zoom_out":
          geolocaterPanZoom('out');
          break;
        case "cmd_zoom_ext":
          geolocaterPanZoom('ext');
          break;
        case "cmd_zoom_sel":
          geolocaterPanZoom('sel');
          break;
        case "cmd_search":
          geolocaterSearch();
          break;
      }
      this.onCommandUpdate();
    }
  },
    
  onCommandUpdate: function()
  {
    var commands = document.getElementById("guiCommands")
                           .getElementsByTagName("command");
    for (var i = 0; i < commands.length; i++)
      goSetCommandEnabled(commands[i].id, this.isCommandEnabled(commands[i].id));
  },
  
  onEvent: function(evt) { }
};

var wifi = {listener:null,service:null};

// Function for initialization of the
// User Interface
function init() {
  // set the General user Interface
  // General Elements
  gui.deck = document.getElementById('geolocater-deck');
  gui.listbox = document.getElementById('geolocater-list-box');
  gui.menulist = document.getElementById('geolocater-menu-list');
  gui.menupopup = document.getElementById('geolocater-menu-popup');
  gui.radiogroup = document.getElementById('geolocater-list-radio');
  gui.stringBundle = document.getElementById('geolocater-string-bundle');
  gui.baselayers = document.getElementById('geolocater-base-menu-popup');

  // Frame Elements
  gui.frames = {};
  gui.frames.map = document.getElementById('geolocater-map-frame');
  gui.frames.edit = document.getElementById('geolocater-edit-frame');

  // Address Elements
  gui.addrs = {};
  gui.addrs.select = document.getElementById('geolocater-select-address');
  gui.addrs.edit = document.getElementById('geolocater-edit-address');

  // Search
  gui.search = {};
  gui.search.text = document.getElementById('geolocater-search-textbox');
  gui.search.responseData = null;

  // Edit Elements
  gui.edit = {};
  gui.edit.caption = document.getElementById('geolocater-edit-caption');
  gui.edit.name = document.getElementById('geolocater-edit-name');
  gui.edit.acc = document.getElementById('geolocater-edit-accuracy');
  gui.edit.geolocation = null;

  // Command Elements
  gui.cmds = {};
  gui.cmds.new = document.getElementById('cmd_new');
  gui.cmds.edit = document.getElementById('cmd_edit');
  gui.cmds.del = document.getElementById('cmd_del');
  gui.cmds.cancel = document.getElementById('cmd_cancel');
  gui.cmds.switch = document.getElementById('cmd_switch');
  gui.cmds.save = document.getElementById('cmd_save');
  gui.cmds.panMap = document.getElementById('cmd_pan_map');
  gui.cmds.zoomIn = document.getElementById('cmd_zoom_in');
  gui.cmds.zoomOut = document.getElementById('cmd_zoom_out');
  gui.cmds.zoomSel = document.getElementById('cmd_zoom_sel');

  // Broadcaster Elements
  gui.cast = {};
  gui.cast.search = document.getElementById('cast_search');
  gui.cast.sel = document.getElementById('cast_sel');
  gui.cast.edit = document.getElementById('cast_edit');

  // Preferences
  Components.utils.import("resource://geolocater/geolocater-prefs.js");
  gui.prefs = GeolocaterPrefs;

  // Event Listener Functions
  function _onloadMap() {
    var frame = gui.frames.map.contentWindow.wrappedJSObject;
    frame.main();
    geolocaterGoogleServicePosition();
    
    let mapquest = document.getElementById('geolocater-base-menu-mapquest');
    if (mapquest.getAttribute('checked') == 'true') {
      frame.map.setBaseLayer(frame.map.getLayersByName('mapquest')[0]);
    }
  }
  function _onloadEdit() {
    var frame = gui.frames.edit.contentWindow.wrappedJSObject;
    frame.main();
    frame.callbacks['getaccuracy'] = function(aAcc) {
      gui.edit.acc.value = aAcc;
      };
    frame.scale = gui.edit.acc.scale;
    
    let mapquest = document.getElementById('geolocater-base-menu-mapquest');
    if (mapquest.getAttribute('checked') == 'true') {
      frame.map.setBaseLayer(frame.map.getLayersByName('mapquest')[0]);
    }
  }
  function _onkeypressSearch(event) {
    if (event.keyCode == KeyEvent.DOM_VK_ENTER ||
        event.keyCode == KeyEvent.DOM_VK_RETURN)
      geolocaterSearch();
  }
  gui.listeners = {};
  gui.listeners.onChangeLocalhost = function(aEvent) {
    gui.listbox.builder.rebuild();
    gui.menupopup.builder.rebuild();
  }
  gui.listeners.onChangeUri = function(aEvent) {
    var value = gui.prefs.uri;
    gui.radiogroup.value = value;
    gui.menulist.value = value;

    var mapFrame = gui.frames.map.contentWindow.wrappedJSObject;
    if (value == 'geoloc://www.google.com/loc/json')
      mapFrame.useGeolocation('googleservice');
    else
      mapFrame.useGeolocation(value.split('localhost/')[1]);
  }

  // set the map frame
  var mapFrame = gui.frames.map;
  mapFrame.addEventListener('load',_onloadMap,true);
  if (mapFrame.getAttribute('src') == 'about:blank')
    mapFrame.setAttribute('src',
        'chrome://geolocater/content/maps/geolocations.html');

  // set the edit frame
  var editFrame = gui.frames.edit;
  editFrame.addEventListener('load',_onloadEdit,true);
  if (editFrame.getAttribute('src') == 'about:blank')
    editFrame.setAttribute('src',
        'chrome://geolocater/content/maps/position.html');

  // Add Event Listener on other elements than frames
  gui.search.text.addEventListener('keypress',_onkeypressSearch,true);
 
  // We need to use a module insteed of FUEL API
  // because there are a bug with nsIPrefBranch2
  gui.prefs.events.addListener('uri',gui.listeners.onChangeUri);
  gui.prefs.events.addListener('localhost',gui.listeners.onChangeLocalhost);

  // set the scale on the accuracy element
  var scale = Application.prefs.get('extensions.geolocater.scale').value;
  scale = JSON.parse(scale);
  gui.edit.acc.scale = scale;

  guiController.onCommandUpdate();
}

function kill() {
  gui.prefs.events.removeListener('uri',gui.listeners.onChangeUri);
  gui.prefs.events.removeListener('localhost',gui.listeners.onChangeLocalhost);
}

// geolocaterGoogleServicePosition
// Function to query Google Geolocation Service
function geolocaterGoogleServicePosition() {

  function addLocalhostGeolocation() {
    var mapFrame = gui.frames.map.contentWindow.wrappedJSObject;
    var editFrame = gui.frames.edit.contentWindow.wrappedJSObject;

    var localhost = gui.prefs.localhost;
    if (localhost == '')
      localhost = '{}';
    localhost = JSON.parse(localhost);
    for (var id in localhost) {
      mapFrame.addGeolocation(id,localhost[id],true);
      editFrame.addGeolocation(id,localhost[id]);
    }
    gui.menulist.removeAttribute('disabled');
    gui.listbox.removeAttribute('disabled');
    var value = gui.prefs.uri;
    gui.radiogroup.value = value;
    gui.menulist.value = value;

    if (value == 'geoloc://www.google.com/loc/json')
      mapFrame.useGeolocation('googleservice');
    else
      mapFrame.useGeolocation(value.split('localhost/')[1]);

    geolocaterSelectItem();
  }

  Components.utils.import("resource://geolocater/geolocater-prefs.js");
  window.setTimeout(function() {
    var mapFrame = gui.frames.map.contentWindow.wrappedJSObject;
    var rli = document.getElementById('googleservice');
    var geoloc = GeolocaterGooglePosition.location;
    if (geoloc == null)
      rli.setAttribute('class','error');
    else
      mapFrame.addGeolocation('googleservice',geoloc,true);
    GeolocaterGooglePosition.events.addListener('change',function(aEvent){
      mapFrame = gui.frames.map.contentWindow.wrappedJSObject;
      if (geoloc == null) {
        mapFrame.addGeolocation('googleservice',aEvent.data,true);
        rli.setAttribute('class','');
        geolocaterSelectItem();
      } else
        mapFrame.updateGeolocation('googleservice',aEvent.data,true);
      geoloc = aEvent.data;
    });
    addLocalhostGeolocation();
  }, 1000);
}

// geolocaterNew
// Function to switch to edition of
// new geolocation
function geolocaterNew() {
  if (gui.cast.search.hasAttribute('hidden')) {
    gui.cast.sel.setAttribute('hidden',true);
    gui.cast.search.removeAttribute('hidden');
    gui.cmds.switch.setAttribute('type','go'); 
  }

  var cmds = gui.cmds;
  cmds.new.setAttribute('hidden',true);
  cmds.edit.setAttribute('hidden',true);
  cmds.del.setAttribute('hidden',true);
  cmds.zoomSel.setAttribute('hidden',true);
  cmds.cancel.removeAttribute('hidden');
  cmds.switch.removeAttribute('hidden');
  cmds.save.removeAttribute('hidden');

  gui.edit.caption.setAttribute('observes','cast_new');
  gui.search.text.value = '';
  gui.edit.name.value = '';
  var scale = gui.edit.acc.scale;
  gui.edit.acc.value = scale[scale.length-1];

  geolocaterCleanAddress('edit');

  var frame = gui.frames.map.contentWindow.wrappedJSObject;
  var center = frame.map.getCenter();
  var zoom = frame.map.getZoom();

  frame = gui.frames.edit.contentWindow.wrappedJSObject;
  frame.addCenter(center,zoom);

  gui.edit.geolocation = null;
  gui.deck.selectedIndex = 1;
  guiController.onCommandUpdate();
}

// geolocaterEdit
// Function to switch to edition of
// existing geolocation
function geolocaterEdit() {
  var cmds = gui.cmds;
  cmds.new.setAttribute('hidden',true);
  cmds.edit.setAttribute('hidden',true);
  cmds.del.setAttribute('hidden',true);
  cmds.zoomSel.setAttribute('hidden',true);
  cmds.cancel.removeAttribute('hidden');
  cmds.switch.removeAttribute('hidden');
  gui.cmds.switch.setAttribute('type','back'); 
  cmds.save.removeAttribute('hidden');

  gui.cast.search.setAttribute('hidden',true);
  gui.cast.sel.removeAttribute('hidden');

  gui.edit.caption.setAttribute('observes','cast_edit');

  var item = gui.listbox.currentItem;
  var id = item.id;

  var localhost = gui.prefs.localhost;
  if (localhost == '')
    localhost = '{}';
  localhost = JSON.parse(localhost);

  var loc = localhost[id];
  var coords = loc.coords;
  var address = loc.address;

  var castLeft = gui.stringBundle.getString('cast_loc_edit_left');
  var castRight = gui.stringBundle.getString('cast_loc_edit_right');
  gui.cast.edit.setAttribute('label',castLeft+' '+loc.name+' '+castRight);
  gui.edit.name.value = loc.name;
  gui.edit.acc.value = coords.accuracy;

  var addr = gui.addrs.edit;
  addr.streetNumber = address.street_number;
  addr.street = address.street;
  addr.premises = address.premises;
  addr.city = address.city;
  addr.county = address.county;
  addr.region = address.region;
  addr.postalCode = address.postal_code;
  addr.countryCode = address.country_code;

  gui.edit.geolocation = id;
  gui.deck.selectedIndex = 1;
  var frame = gui.frames.edit.contentWindow.wrappedJSObject;
  frame.addCoords(coords);
  frame.selectGeolocation(id,true);
}

// geolocaterDel
// Function to delete
// existing geolocation
function geolocaterDel() {
  var item = gui.listbox.currentItem;
  var id = item.id

  var localhost = gui.prefs.localhost;
  if (localhost == '')
    localhost = '{}';
  localhost = JSON.parse(localhost);

  var prompts = CL["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(CI.nsIPromptService);
  var title = gui.stringBundle.getString('prompt_loc_del_title');
  var left = gui.stringBundle.getString('prompt_loc_del_left');
  var right = gui.stringBundle.getString('prompt_loc_del_right');
  var result = prompts.confirm(window, title,
      left+" "+localhost[id].name+right);
  if (!result)
    return false;

  if (gui.prefs.uri == 'geoloc://localhost/'+id) {
    gui.prefs.uri = 'geoloc://www.google.com/loc/json';
    gui.prefs.forceUpdate();
  }

  var newLocal = {};
  for (var idString in localhost) {
    if (idString != id)
      newLocal[idString] = localhost[idString];
  }

  geolocaterCleanAddress('select');

  var mapFrame = gui.frames.map.contentWindow.wrappedJSObject;
  mapFrame.removeGeolocation(id);
  var editFrame = gui.frames.edit.contentWindow.wrappedJSObject;
  editFrame.removeGeolocation(id);

  GeolocaterPrefs.localhost = JSON.stringify(newLocal);
  gui.listeners.onChangeUri();
  return true;
}

// geolocaterSwitch
// Function to switch from search edition to
// information edition
function geolocaterSwitch() {
  if (gui.cast.search.hasAttribute('hidden')) {
    gui.cast.sel.setAttribute('hidden',true);
    gui.cast.search.removeAttribute('hidden');
    gui.cmds.switch.setAttribute('type','go'); 

    gui.edit.name.value = '';
  } else { 
    gui.cast.search.setAttribute('hidden',true);
    gui.cast.sel.removeAttribute('hidden');
    gui.cmds.switch.setAttribute('type','back'); 
    geolocaterCleanAddress('edit');

    var editFrame = gui.frames.edit.contentWindow.wrappedJSObject;
    var center = editFrame.centers.features[0];
    var position = editFrame.getPosition();

    var address = gui.addrs.edit;

    if (gui.search.responseData != null) {
      var sw = gui.search.responseData.viewport.sw;
      var ne = gui.search.responseData.viewport.ne;
      if (position.latitude < sw.lat ||
          position.latitude > ne.lat ||
          position.longitude < sw.lng ||
          position.longitude > ne.lng)
        gui.search.responseData = null;
    }

    if (gui.search.responseData != null) {
      var result = gui.search.responseData.results[0];
      gui.edit.name.value = result.titleNoFormatting;
      address.city = result.city;
      address.region = result.region;
      address.postalCode = result.postalCode || '';
      if (result.country.length == 2)
        address.countryCode = result.country;

      var streetAddress = result.streetAddress.split(', ');
      var streetInfo = streetAddress[1] || '';
      streetAddress = streetAddress[0];
      streetAddress = streetAddress.replace(result.postalCode,'');
      streetAddress = streetAddress.replace(result.city,'');
      if (result.accuracy == 6) {
        address.street = streetAddress;
      }
      if (result.accuracy == 8) {
        streetAddress = streetAddress.split(' ');
        if (!isNaN(streetAddress[0][0])) {
          address.streetNumber = streetAddress[0];
          streetAddress.shift();
        } else if (!isNaN(streetAddress[streetAddress.length-1][0])){
          address.streetNumber = streetAddress[streetAddress.length-1];
          streetAddress.pop();
        }
        address.street = streetAddress.join(' ');
      }

      if (streetInfo.length != 0) {
        streetInfo = streetInfo.split(' ');
        if (!isNaN(streetInfo[0]))
          address.postalCode = streetInfo[0];
      }
    }

    var q = position.latitude+','+position.longitude;
    var url = 'http://ajax.googleapis.com/ajax/services/search/local?v=1.0&q=';
    url += q;

    var xhr = CL["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(CI.nsIXMLHttpRequest);
    xhr.mozBackgroundRequest = true;
    xhr.open("GET", url, true);
    xhr.onerror = function(req) {
      alert('Error');
    };
    xhr.onload = function(req) {
      var resp = JSON.parse(req.target.responseText);

      if (!resp.responseData.results[0]) {
        alert(gui.stringBundle.getString('alert_no_address_found'));
        return false;
      }
      var result = resp.responseData.results[0];

      if (gui.edit.name.value == '')
        gui.edit.name.value = result.titleNoFormatting;

      if (address.city == '')
        address.city = result.city;
      if (address.region == '')
        address.region = result.region;
      if (address.postalCode == '')
        address.postalCode = result.postalCode || '';
      if (result.country.length == 2)
        address.countryCode = result.country;

      var streetAddress = result.streetAddress.split(', ');
      var streetInfo = streetAddress[1] || '';
      streetAddress = streetAddress[0];
      streetAddress = streetAddress.replace(result.postalCode,'');
      streetAddress = streetAddress.replace(result.city,'');
      streetAddress = streetAddress.split(' ');
      var streetNumber = ''
      if (!isNaN(streetAddress[0][0])) {
        streetNumber = streetAddress[0];
        streetAddress.shift();
      } else if (!isNaN(streetAddress[streetAddress.length-1][0])){
        streetNumber = streetAddress[streetAddress.length-1];
        streetAddress.pop();
      }
      if (address.street == '')
        address.street = streetAddress.join(' ');

      var accuracy = center.attributes.accuracy;
      if (accuracy < 1001 && address.streetNumber == '')
        address.streetNumber = streetNumber;

      if (streetInfo.length != 0) {
        streetInfo = streetInfo.split(' ');
        if (!isNaN(streetInfo[0]) && address.postalCode == '')
          address.postalCode = streetInfo[0];
      }
      gui.edit.acc.value = accuracy;
      guiController.onCommandUpdate();
      return true;
    };
    xhr.send(null);
  }
  guiController.onCommandUpdate();
}

// geolocaterSaveCancel
// Function to save or cancel edition
// * aType String to specify 'cancel' or 'save'
function geolocaterSaveCancel(aType) {
  gui.deck.selectedIndex = 0;
  gui.search.responseData = null;

  var cmds = gui.cmds;
  cmds.cancel.setAttribute('hidden',true);
  cmds.switch.setAttribute('hidden',true);
  cmds.save.setAttribute('hidden',true);
  cmds.new.removeAttribute('hidden');
  cmds.edit.removeAttribute('hidden');
  cmds.del.removeAttribute('hidden');
  cmds.zoomSel.removeAttribute('hidden');

  var editFrame = gui.frames.edit.contentWindow.wrappedJSObject;
  var mapFrame = gui.frames.map.contentWindow.wrappedJSObject;
  var center = editFrame.map.getCenter();
  var zoom = editFrame.map.getZoom();

  mapFrame.map.setCenter(center,zoom);

  if (gui.edit.geolocation != null)
    editFrame.selectGeolocation(gui.edit.geolocation,false);

  if (aType == 'cancel')
    return true;

  var idTable = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
    'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0' ];

  var idString = "";
  for (var i = 0; i < 8; ++i) {
    idString += idTable[Math.floor(Math.random() * idTable.length)];
  }

  if (gui.edit.geolocation != null)
    idString = gui.edit.geolocation;

  var position = editFrame.getPosition();

  var accuracy = gui.edit.acc.value;

  var elem = gui.addrs.edit;
  var address = {
    street_number: elem.streetNumber,
    street: elem.street,
    premises: elem.premises,
    city: elem.city,
    county: elem.county,
    region: elem.region,
    postal_code: elem.postalCode,
    country_code: elem.countryCode,
    country: elem.country
  };

  var name = gui.edit.name.value;

  var localhost = gui.prefs.localhost;
  if (localhost == '')
    localhost = '{}';
  localhost = JSON.parse(localhost);
  localhost[idString] = {
    name:name,
    coords:{
      longitude:position.longitude,
      latitude:position.latitude,
      accuracy:accuracy
    },
    address: address
  };

  if (gui.edit.geolocation != null) {
    mapFrame.updateGeolocation(idString,localhost[idString],false);
    editFrame.updateGeolocation(idString,localhost[idString]);
  } else {
    mapFrame.addGeolocation(idString,localhost[idString],false);
    editFrame.addGeolocation(idString,localhost[idString]);
  }

  var listIndex = gui.listbox.selectedIndex;
  gui.prefs.localhost = JSON.stringify(localhost);

  gui.listbox.selectedIndex = listIndex;

  if (gui.edit.geolocation == null) {
    const kDontAskAgainPref = "extensions.geolocater.dontAskForUse"
    const kUseNewPref = "extensions.geolocater.useNew"
    try {
      var pref = CL["@mozilla.org/preferences-service;1"]
                   .getService(CI.nsIPrefBranch);
      var dontAskAgain = pref.getBoolPref(kDontAskAgainPref);
    } catch(e) {
      dontAskAgain = false;
    }
    if (!dontAskAgain) {
      var prompts = CL["@mozilla.org/embedcomp/prompt-service;1"]
        .getService(CI.nsIPromptService);
      var title = gui.stringBundle.getString('prompt_loc_use_title');
      var confLabel = gui.stringBundle.getString('prompt_loc_use_confirm');
      var checkLabel = gui.stringBundle.getString('prompt_loc_use_check');
      var check = {value: false};
      var result = prompts.confirmCheck(window,
          title,
          confLabel, 
          checkLabel,
          check);
      if (result)
        GeolocaterPrefs.uri = 'geoloc://localhost/'+idString;
      else
        gui.listeners.onChangeUri();
      if (check.value != dontAskAgain) {
        pref.setBoolPref(kDontAskAgainPref, check.value);
        pref.setBoolPref(kUseNewPref, result);
      }
    } else if (pref.getBoolPref(kUseNewPref))
      GeolocaterPrefs.uri = 'geoloc://localhost/'+idString;
    else
      gui.listeners.onChangeUri();
  }
}

// geolocaterMove
// Function to move the geolocation edited
// to the map center
function geolocaterMove() {
  var frame = gui.frames.edit.contentWindow.wrappedJSObject;
  var center = frame.map.getCenter();
  var zoom = frame.map.getZoom();
  frame.addCenter(center,zoom);
}

// geolocaterPanZoom
// Function to activate or execute pan-zoom button
// * aType String to specify 'pan', 'in', 'out', 'ext' or 'sel'
function geolocaterPanZoom(aType) {
  var mapFrame = gui.frames.map.contentWindow.wrappedJSObject;
  var editFrame = gui.frames.edit.contentWindow.wrappedJSObject;

  var frame = mapFrame;
  if (gui.deck.selectedIndex == 1)
    frame = editFrame;

  if (aType == 'sel')
    return mapFrame.zoomToSelection();
  else if (aType == 'ext')
    return frame.zoomToExtent();

  var cmds = gui.cmds;

  if (cmds.panMap.hasAttribute('checked') && aType != 'pan')
    cmds.panMap.removeAttribute('checked');
  else if (cmds.zoomIn.hasAttribute('checked') && aType != 'in')
    cmds.zoomIn.removeAttribute('checked');
  else if (cmds.zoomOut.hasAttribute('checked') && aType != 'out')
    cmds.zoomOut.removeAttribute('checked');

  switch (aType) {
    case 'pan' :
      mapFrame.zoomBox.deactivate();
      editFrame.zoomBox.deactivate();
      cmds.panMap.setAttribute('checked',true);
      break;
    case 'in' :
      mapFrame.zoomBox.out = false;
      mapFrame.zoomBox.activate();
      editFrame.zoomBox.out = false;
      editFrame.zoomBox.activate();
      cmds.zoomIn.setAttribute('checked',true);
      break;
    case 'out' :
      mapFrame.zoomBox.out = true;
      mapFrame.zoomBox.activate();
      editFrame.zoomBox.out = true;
      editFrame.zoomBox.activate();
      cmds.zoomOut.setAttribute('checked',true);
      break;
  }
}

// geolocaterChangeBaselayer
// Function to change the baselayer
// * aItem the menuitem
function geolocaterChangeBaselayer(aItem) {
  var mapFrame = gui.frames.map.contentWindow.wrappedJSObject;
  var editFrame = gui.frames.edit.contentWindow.wrappedJSObject;

  mapFrame.map.setBaseLayer(mapFrame.map.getLayersByName(aItem.value)[0]);
  editFrame.map.setBaseLayer(editFrame.map.getLayersByName(aItem.value)[0]);
}

// geolocaterSetSelectAddress
// Function to update the selection address
// * aAddress Object the address object of the selection
function geolocaterSetSelectAddress(aAddress) {
  var elem = gui.addrs.select;
  elem.streetNumber = aAddress.street_number || '';
  elem.street = aAddress.street || '';
  elem.premises = aAddress.premises || '';
  elem.city = aAddress.city || '';
  elem.county = aAddress.county || '';
  elem.region = aAddress.region || '';
  elem.postalCode = aAddress.postal_code || '';
  elem.countryCode = aAddress.country_code || '-';
}

// geolocaterSelectItem
// Function to update the selection
// on the map and the address
function geolocaterSelectItem() {
  var item = gui.listbox.currentItem;
  var mapFrame = gui.frames.map.contentWindow.wrappedJSObject;
  var address = mapFrame.selectGeolocation(item.id);
  if (address)
    geolocaterSetSelectAddress(address);
  else
    geolocaterSetSelectAddress({});

  guiController.onCommandUpdate();
}

/*
// geolocaterCheckItem (out of date)
// Function to switch the display
// mode of markers
function geolocaterCheckItem() {
  var item = gui.listbox.currentItem;
  var checked = item.firstChild.checked;
  var mapFrame = gui.frames.map.contentWindow.wrappedJSObject;
  mapFrame.checkGeolocation(item.id,checked);

  guiController.onCommandUpdate();
}
*/

// geolocaterSearch
// Function to made a geolocation address searching
// and update the edit map
function geolocaterSearch() {
  var address = gui.addrs.edit;
  var q = gui.search.text.value;
  var url = 'http://ajax.googleapis.com/ajax/services/search/local?v=1.0&q=';
  url += q;

  var xhr = CL["@mozilla.org/xmlextras/xmlhttprequest;1"]
    .createInstance(CI.nsIXMLHttpRequest);
  xhr.mozBackgroundRequest = true;
  xhr.open("GET", url, true);
  xhr.onerror = function(req) {
    alert('Error');
  };
  xhr.onload = function(req) {
    var resp = JSON.parse(req.target.responseText);

    if (!resp.responseData.viewport)
      return alert('Nothing found!');

    gui.search.responseData = resp.responseData;

    var sw = resp.responseData.viewport.sw;
    var ne = resp.responseData.viewport.ne;
    var bbox = [sw.lng,sw.lat,ne.lng,ne.lat];

    var result = resp.responseData.results[0];

    var coords = {lon:result.lng,lat:result.lat};
    var editFrame = gui.frames.edit.contentWindow.wrappedJSObject;
    editFrame.addFound({coords:coords,bbox:bbox});

    guiController.doCommand('cmd_zoom_ext');
    guiController.onCommandUpdate();
  };
  geolocaterCleanAddress('edit');
  xhr.send(null);
}

// geolocaterUpdateAcc
// Function to update the geolocation edited accuracy
function geolocaterUpdateAcc() {
  var editFrame = gui.frames.edit.contentWindow.wrappedJSObject;
  editFrame.updateAccuracy(gui.edit.acc.value);
}

// geolocaterCleanAddress
// Function to clean an address element
// * aRef String to select address element 'select' or 'edit'
function geolocaterCleanAddress(aRef) {
  var address = gui.addrs.edit;
  if (aRef == 'select')
    address = gui.addrs.select;

  address.streetNumber = '';
  address.street = '';
  address.premises = '';
  address.city = '';
  address.postalCode = '';
  address.county = '';
  address.region = '';
  address.countryCode = '-';
}

// geolocaterOnMenuSelect
// Function to update the geolocation used
// after a selection in the menulist
function geolocaterOnMenuSelect() {
  if (!gui.menulist)
    return false;
  var value = gui.menulist.value;
  if (gui.prefs.uri != value) {
    gui.prefs.uri = value;
    gui.prefs.forceUpdate();
  }
}

// geolocaterOnRadioSelect
// Function to update the geolocation used
// after a selection in the radiogroup
function geolocaterOnRadioSelect() {
  var value = gui.radiogroup.value;
  if (gui.prefs.uri != value) {
    gui.prefs.uri = value;
    gui.prefs.forceUpdate();
  }
}
