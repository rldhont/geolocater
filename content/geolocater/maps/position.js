var map,locations,accuracies,centers,zoomBox;
var scale = [50,150,300,600,1000,2500,5000,10000,25000];
var callbacks = {};
function callback(name, args) {
  if (name && callbacks[name]) {
    callbacks[name].apply(map,args);
  }
};

function main() {
  if (map)
    return false;

  var options = {
        projection: new OpenLayers.Projection("EPSG:900913"),
        displayProjection: new OpenLayers.Projection("EPSG:4326"),
        units: "m",
        numZoomLevels: 19,
        maxResolution: 156543.0339,
        maxExtent: new OpenLayers.Bounds(-20037508.34, -20037508.34,
                20037508.34, 20037508.34)
  };
  map = new OpenLayers.Map('map', options);
  /*
  var mapnik = new OpenLayers.Layer.TMS(
      "OpenStreetMap (Mapnik)",
      ["http://a.tile.openstreetmap.org/"
      ,"http://b.tile.openstreetmap.org/"
      ,"http://c.tile.openstreetmap.org/"],
      {
        type: 'png',
        getURL: osm_getTileURL,
        transitionEffect: 'resize',
        displayOutsideMaxExtent: true,
        attribution: 'OpenStreetMap'
     });
  */
  var mapnik = new OpenLayers.Layer.OSM('osm');
  var mapquest = new OpenLayers.Layer.OSM('mapquest', 
      ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
        "http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
        "http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
        "http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png"]
    , {numZoomLevels: 19}
    );

  var contextLoc = {
        getDisplay:function(feat) {
           if (feat.attributes.edited)
             return 'none';
           else
             return '';
        }
  };
  var templateLoc = {
        externalGraphic: "img/marker-ff-grey.png",
        pointRadius: 12,
        graphicYOffset:-24,
        display: "${getDisplay}"
  };
  var styleLoc = new OpenLayers.Style(templateLoc, 
      {context: contextLoc});
  locations = new OpenLayers.Layer.Vector(
      "Geolocations",
      {styleMap: new OpenLayers.StyleMap(styleLoc)}
      );
  
  var contextAcc = {
        getPointRadius:function(feat) {
          var res = map.getResolution();
          var units = map.getUnits();
          if(!units){return Math.round(feat.attributes.accuracy/res);}
          var inches = OpenLayers.INCHES_PER_UNIT;
          var newScale = (map.getGeodesicPixelSize().w||0.000001)*inches["km"]*OpenLayers.DOTS_PER_INCH;
          var newRes = OpenLayers.Util.getResolutionFromScale(newScale,units);
          var newRadius = Math.round(feat.attributes.accuracy/newRes);
          return newRadius;

           var res = map.getResolution();
           return Math.round(feat.attributes.accuracy/res);
        }
  };
  var templateAcc = {
        pointRadius: "${getPointRadius}",
        fillColor: "#66ccff",
        fillOpacity: 0.3,
        strokeColor: "#3399ff",
        strokeWidth: 2
  };
  var styleAcc = new OpenLayers.Style(templateAcc, 
      {context: contextAcc});
  accuracies = new OpenLayers.Layer.Vector(
      "Accuracies",
      {styleMap: new OpenLayers.StyleMap(styleAcc)}
      );
 
  var contextCent = {
        getPointRadius:function(feat) {
           if (feat.attributes.selected)
             return 14;
           else
             return 10;
        },
        getGraphicYOffset:function(feat) {
           if (feat.attributes.selected)
             return -26;
           else
             return -20;
        },
        getGraphic:function(feat) {
           if (feat.attributes.selected)
             return "img/marker-ff-select.png";
           else
             return "img/marker-ff.png";
        }
  };
  var templateCent = {
        pointRadius: "${getPointRadius}",
        graphicYOffset: "${getGraphicYOffset}",
        externalGraphic: "${getGraphic}"
  };
  var styleCent = new OpenLayers.Style(templateCent, 
      {context: contextCent});
  centers = new OpenLayers.Layer.Vector(
      "Centers",
      {styleMap: new OpenLayers.StyleMap(styleCent)}
      );

  map.addLayers([mapnik,mapquest,locations,accuracies,centers]);

  map.zoomToMaxExtent();
  
  zoomBox = new OpenLayers.Control.ZoomBox();
  map.addControl(zoomBox);

  var drag = new OpenLayers.Control.DragFeature(centers);
  drag.onStart = function(feat) {
    feat.attributes.selected = true;
    accuracies.removeFeatures(accuracies.features);
  };
  drag.onComplete = function(feat) {
    feat.attributes.selected = false;
    centers.drawFeature(feat);
    var point = feat.geometry;
    var accuracy = new OpenLayers.Feature.Vector(
        point.clone(),
        {accuracy:feat.attributes.accuracy});
    accuracies.addFeatures([accuracy]);
    var lonlat = new OpenLayers.LonLat(point.x,point.y);
    map.setCenter(lonlat);
  };
  map.addControl(drag);
  drag.activate();
}

function cleanLocation() {
  accuracies.removeFeatures(accuracies.features);
  centers.removeFeatures(centers.features);

  map.zoomToMaxExtent();
}

function addCenter(aCenter,aZoom) {
  accuracies.removeFeatures(accuracies.features);
  centers.removeFeatures(centers.features);

  map.setCenter(aCenter,aZoom);

  var res = map.getResolution();
  var size = map.getSize();

  var acc = '150';
  if (size.w < size.h)
    acc = Math.round(size.w*res/2);
  else
    acc = Math.round(size.h*res/2);

  var selAcc = 50;
  scale.forEach(function(a) {
      if (a < acc)
        selAcc = a;
  });
  acc = selAcc;

  var coords = map.getCenter();
  coords = new OpenLayers.Geometry.Point(coords.lon,coords.lat);

  var accuracy = new OpenLayers.Feature.Vector(
      coords.clone(),
      {accuracy:acc});
  accuracies.addFeatures([accuracy]);

  var center = new OpenLayers.Feature.Vector(
      coords.clone(),
      {accuracy:acc});
  centers.addFeatures([center]);

  callback('getaccuracy',[acc]);
}

function addFound(aLocation) {
  accuracies.removeFeatures(accuracies.features);
  centers.removeFeatures(centers.features);

  var bbox = aLocation.bbox;
  bbox = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3]);
  bbox.transform(map.displayProjection,map.projection);
  map.zoomToExtent(bbox);

  var res = map.getResolution();
  var size = map.getSize();

  var acc = '150';
  if (size.w < size.h)
    acc = Math.round(size.w*res/2);
  else
    acc = Math.round(size.h*res/2);

  var selAcc = 50;
  scale.forEach(function(a) {
      if (a < acc)
        selAcc = a;
  });
  acc = selAcc;
 
  var coords = aLocation.coords;
  coords = new OpenLayers.Geometry.Point(coords.lon,coords.lat);
  coords.transform(map.displayProjection,map.projection);

  var accuracy = new OpenLayers.Feature.Vector(
      coords.clone(),
      {accuracy:acc});
  accuracies.addFeatures([accuracy]);

  var center = new OpenLayers.Feature.Vector(
      coords.clone(),
      {accuracy:acc});
  centers.addFeatures([center]);

  callback('getaccuracy',[acc]);
}

function addCoords(aCoords) {
  accuracies.removeFeatures(accuracies.features);
  centers.removeFeatures(centers.features);

  var coords = new OpenLayers.Geometry.Point(
      aCoords.longitude,
      aCoords.latitude);
  coords.transform(map.displayProjection,map.projection);

  var accuracy = new OpenLayers.Feature.Vector(
      coords.clone(),
      {accuracy:aCoords.accuracy});
  accuracies.addFeatures([accuracy]);

  var center = new OpenLayers.Feature.Vector(
      coords.clone(),
      {accuracy:aCoords.accuracy});
  centers.addFeatures([center]);

  zoomToExtent();

  callback('getaccuracy',[aCoords.accuracy]);
}

function getPosition() {
  var feat = centers.features[0];
  var point = feat.geometry.clone();
  point.transform(map.projection,map.displayProjection);
  return {longitude:point.x,latitude:point.y};
}

function updateAccuracy(aAcc) {
  if (centers.features.length == 0)
    return -1;

  centers.features[0].attributes.accuracy = aAcc;
  accuracies.features[0].attributes.accuracy = aAcc;
  accuracies.drawFeature(accuracies.features[0]);

  zoomToExtent();
}

function zoomToExtent() {
  var center = centers.features[0];
  var accuracy = center.attributes.accuracy;
  center = center.geometry;
  center = new OpenLayers.LonLat(
      center.x,
      center.y);
  center.transform(map.projection,map.displayProjection);

  var bbox = getAccuracyExtent(center,accuracy);
  bbox.transform(map.displayProjection,map.projection);
  map.zoomToExtent(bbox);
}

function addGeolocation(aId,aGeoloc) {
  var center = new OpenLayers.LonLat(
      aGeoloc.coords.longitude,
      aGeoloc.coords.latitude);

  var attr = {
    id:aId,
    accuracy:aGeoloc.coords.accuracy,
    address:aGeoloc.address,
    edited: false
  };
  center.transform(map.displayProjection,map.projection);
  var feature = new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.Point(center.lon,center.lat),
      attr
      );

  locations.addFeatures([feature]);
}

function updateGeolocation(aId,aGeoloc) {
  var center = new OpenLayers.LonLat(
      aGeoloc.coords.longitude,
      aGeoloc.coords.latitude);

  var loc = locations.features.filter(
      function(f) {
        return f.attributes.id == aId;
      })[0];
  loc.attributes.accuracy = aGeoloc.coords.accuracy;
  loc.attributes.address = aGeoloc.address;
  locations.drawFeature(loc);
}

function removeGeolocation(aId) {
  var loc = locations.features.filter(
      function(f) {
        return f.attributes.id == aId;
      })[0];
  locations.removeFeatures([loc]);
}

function selectGeolocation(aId,aEdit) {
  var loc = locations.features.filter(
      function(f) {
        return f.attributes.id == aId;
      })[0];
  if (aEdit)
    loc.attributes.edited = true;
  else
    loc.attributes.edited = false;

  locations.drawFeature(loc);
}
