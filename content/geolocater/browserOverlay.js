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

var geolocater = {};

(function() {
Components.utils.import("resource://geolocater/geolocater-prefs.js");

function _addLocalToMenu(aId, aLoc) {
  var item = document.createElement("menuitem");
  item.setAttribute('label',aLoc.name);
  item.setAttribute('id','geolocater-browser-menuitem-'+aId);
  item.setAttribute('type','radio');
  item.setAttribute('name','geoprovider');
  item.setAttribute('value','geoloc://localhost/'+aId);
  item.setAttribute('oncommand',"geolocater.changeProvider('"+aId+"');");
  if (GeolocaterPrefs.uri == ('geoloc://localhost/'+aId))
    item.setAttribute('checked',true);
  var popup = document.getElementById("geolocater-browser-menupopup");
  popup.appendChild(item);
}

function _addLocalToAppMenu(aId, aLoc) {
  var item = document.createElement("menuitem");
  item.setAttribute('label',aLoc.name);
  item.setAttribute('id','geolocater-browser-appmenuitem-'+aId);
  item.setAttribute('type','radio');
  item.setAttribute('name','geoprovider');
  item.setAttribute('value','geoloc://localhost/'+aId);
  item.setAttribute('oncommand',"geolocater.changeProvider('"+aId+"');");
  if (GeolocaterPrefs.uri == ('geoloc://localhost/'+aId))
    item.setAttribute('checked',true);
  var popup = document.getElementById("geolocater-browser-appmenupopup");
  popup.appendChild(item);
}

function _onChangeUri(aEvent) {
  //dump(aEvent.data+'\n');
  //var value = Application.prefs.get(aEvent.data).value;
  let value = aEvent.data;
  let menu = document.getElementById("geolocater-browser-menu");
  let count = menu.itemCount;
  for (let i=2; i<count; i++) {
    let item = menu.getItemAtIndex(i);
    if(item.tagName == 'menuitem' && 
        item.value == value) {
      item.setAttribute('checked',true);
    }
  }
  menu = document.getElementById("geolocater-browser-appmenu");
  count = menu.itemCount;
  for (let i=2; i<count; i++) {
    let item = menu.getItemAtIndex(i);
    if(item.tagName == 'menuitem' && 
        item.value == value) {
      item.setAttribute('checked',true);
    }
  }
}

function _onChangeLocalhost(aEvent) {
  let menu = document.getElementById("geolocater-browser-menu");
  while (menu.itemCount != 3) {
    menu.removeItemAt(menu.itemCount-1);
  }
  let localhost = GeolocaterPrefs.localhost;
  if (localhost == '')
    localhost = '{}';
  localhost = JSON.parse(localhost);
  let first = true;
  for (let id in localhost) {
    if (first) {
      let popup = document.getElementById("geolocater-browser-menupopup");
      popup.appendChild(document.createElement("menuseparator"));
      first = false;
    }
    _addLocalToMenu(id,localhost[id]);
  }

  menu = document.getElementById("geolocater-browser-appmenu");
  while (menu.itemCount != 3) {
    menu.removeItemAt(menu.itemCount-1);
  }
  first = true;
  for (let id in localhost) {
    if (first) {
      let popup = document.getElementById("geolocater-browser-appmenupopup");
      popup.appendChild(document.createElement("menuseparator"));
      first = false;
    }
    _addLocalToAppMenu(id,localhost[id]);
  }
}

this.openWindow = function() {
  var url = "chrome://geolocater/content/geolocater.xul";
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]  
    .getService(Components.interfaces.nsIWindowMediator);  
  var browserEnumerator = wm.getEnumerator("navigator:browser");
    // Check each browser instance for our URL  
  var found = false;  
  while (!found && browserEnumerator.hasMoreElements()) {  
    var browserWin = browserEnumerator.getNext();  
    var tabbrowser = browserWin.gBrowser;  
  
    // Check each tab of this browser instance  
    var numTabs = tabbrowser.browsers.length;  
    for (var index = 0; index < numTabs; index++) {  
      var currentBrowser = tabbrowser.getBrowserAtIndex(index);  
      if (url == currentBrowser.currentURI.spec) {  
  
        // The URL is already opened. Select this tab.  
        tabbrowser.selectedTab = tabbrowser.tabContainer.childNodes[index];  
  
        // Focus *this* browser-window  
        browserWin.focus();  
  
        found = true;  
        break;  
      }  
    }  
  }
  if (!found)
    gBrowser.selectedTab = gBrowser.addTab(url);
  /*
  window.open("chrome://geolocater/content/geolocater.xul", 
      "", "chrome,resizable,centerscreen");
      */
}

this.changeProvider = function(aProvider) {
  if (aProvider == 'googleservice')
    GeolocaterPrefs.uri = 'geoloc://www.google.com/loc/json';
  else
    GeolocaterPrefs.uri = 'geoloc://localhost/'+aProvider;
  GeolocaterPrefs.forceUpdate();

  var geoProviderService = Components.
    classes["@mozilla.org/geolocation/provider;1"].getService();
  geoProviderService.
    QueryInterface(Components.interfaces.nsIGeolocationProvider);
  geoProviderService.startup();
  _onChangeUri({'data':'geo.wifi.uri'})
}

this.initialize = function() {
  _onChangeLocalhost(null);

  GeolocaterPrefs.events.addListener('uri',_onChangeUri);
  GeolocaterPrefs.events.addListener('localhost',_onChangeLocalhost);

  if (GeolocaterPrefs.uri == 'geoloc://www.google.com/loc/json')
    document.getElementById("geolocater-browser-menuitem-googleservice").
      setAttribute("checked",true);
}

this.shutdown = function() {
  window.removeEventListener("load",geolocater.initialize,false);
  window.removeEventListener("unload",geolocater.shutdown,false);

  GeolocaterPrefs.events.removeListener('uri',_onChangeUri);
  GeolocaterPrefs.events.removeListener('localhost',_onChangeLocalhost);
}

window.addEventListener("load",geolocater.initialize,false);
window.addEventListener("unload",geolocater.shutdown,false);

var prevFunc = XULBrowserWindow.hideChromeForLocation;  
  
XULBrowserWindow.hideChromeForLocation = function(aLocation) {  
  return (aLocation == 'chrome://geolocater/content/geolocater.xul') || prevFunc.apply(XULBrowserWindow, [aLocation]);  
}
}).apply(geolocater);
