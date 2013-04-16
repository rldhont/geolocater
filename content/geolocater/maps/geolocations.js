var map,accuracies,centers,extent,zoomBox;
var selection = null;

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
        },
        getFillColor:function(feat) {
           if (feat.attributes.selected)
             return 'gold';
           else
             return "#66ccff";
        },
        getStrokeColor:function(feat) {
           if (feat.attributes.selected)
             return 'gold';
           else
             return "#3399ff";
        },
        getDisplay:function(feat) {
           if (feat.attributes.checked)
             return '';
           else
             return 'none';
        }
  };
  var templateAcc = {
        pointRadius: "${getPointRadius}",
        fillColor: "${getFillColor}",
        fillOpacity: 0.3,
        strokeColor: "${getStrokeColor}",
        strokeWidth: 2,
        display: "${getDisplay}"
  };
  var styleAcc = new OpenLayers.Style(templateAcc, 
      {context: contextAcc});
  accuracies = new OpenLayers.Layer.Vector(
      "Accuracies",
      {styleMap: new OpenLayers.StyleMap(styleAcc)}
      );

  var contextCent = {
        getExternalGraphic:function(feat) {
           if (feat.attributes.selected &&
               feat.attributes.used)
             return "img/marker-gold-used.png";
           else if (feat.attributes.selected)
             return "img/marker-gold.png";
           else if (feat.attributes.used)
             return "img/marker-ff-used.png";
           else
             return "img/marker-ff.png";
        },
        getDisplay:function(feat) {
           if (feat.attributes.checked)
             return '';
           else
             return 'none';
        }
  };
  var templateCent = {
        externalGraphic: "${getExternalGraphic}",
        pointRadius: 10,
        graphicYOffset:-20,
        display: "${getDisplay}"
  };
  var styleCent = new OpenLayers.Style(templateCent, 
      {context: contextCent});
  centers = new OpenLayers.Layer.Vector(
      "Centers",
      {styleMap: new OpenLayers.StyleMap(styleCent)}
      );
  map.addLayers([mapnik,mapquest,accuracies,centers]);

  map.zoomToMaxExtent();
 
  zoomBox = new OpenLayers.Control.ZoomBox();
  map.addControl(zoomBox);

  extent = new OpenLayers.Bounds();

  return true;
}

function addGeolocation(aId,aGeoloc,aWithZoom) {
  var center = new OpenLayers.LonLat(
      aGeoloc.coords.longitude,
      aGeoloc.coords.latitude);

  var bbox = getAccuracyExtent(center,aGeoloc.coords.accuracy);
  bbox.transform(map.displayProjection,map.projection);
  extent.extend(bbox);

  var attr = {
    id:aId,
    accuracy:aGeoloc.coords.accuracy,
    address:aGeoloc.address,
    selected:false,
    used:false,
    checked:true
  };
  center.transform(map.displayProjection,map.projection);
  var feature = new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.Point(center.lon,center.lat),
      attr
      );
  accuracies.addFeatures([feature]);
  feature = new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.Point(center.lon,center.lat),
      attr
      );
  centers.addFeatures([feature]);

  if (aWithZoom)
    map.zoomToExtent(extent);
}

function updateGeolocation(aId,aGeoloc,aWithZoom) {
  if (accuracies.features.length==0)
    return false;

  var point = new OpenLayers.Geometry.Point(
      aGeoloc.coords.longitude,
      aGeoloc.coords.latitude);
  point.transform(map.displayProjection,map.projection);

  var accuracy = accuracies.features.filter(
      function(f) {
        return f.attributes.id == aId;
      })[0];
  accuracy.geometry.x = point.x;
  accuracy.geometry.y = point.y;
  accuracy.attributes.accuracy = aGeoloc.coords.accuracy;
  accuracy.attributes.address = aGeoloc.address;
  accuracies.drawFeature(accuracy);

  var center = centers.features.filter(
      function(f) {
        return f.attributes.id == aId;
      })[0];
  center.geometry.x = point.x;
  center.geometry.y = point.y;
  center.attributes.accuracy = aGeoloc.coords.accuracy;
  center.attributes.address = aGeoloc.address;
  centers.drawFeature(center);

  updateExtent(aWithZoom);
}

function selectGeolocation(aId) {
  if (selection != null) {
    selection.accuracy.attributes.selected = false;
    accuracies.drawFeature(selection.accuracy);
    selection.center.attributes.selected = false;
    centers.drawFeature(selection.center);
    selection = null;
  }
  var accuracy = accuracies.features.filter(
      function(f) {
        return f.attributes.id == aId;
      })[0];
  if (!accuracy)
    return null;
  accuracy.attributes.selected = true;
  accuracies.drawFeature(accuracy);
  var center = centers.features.filter(
      function(f) {
        return f.attributes.id == aId;
      })[0];
  center.attributes.selected = true;
  centers.drawFeature(center);
  selection = {
         accuracy:accuracy,
         center:center
  };
  return center.attributes.address;
}

function removeGeolocation(aId,aWithZoom) {
  if (selection != null) {
    selection.accuracy.attributes.selected = false;
    accuracies.drawFeature(selection.accuracy);
    selection.center.attributes.selected = false;
    centers.drawFeature(selection.center);
    selection = null;
  }
  var accuracy = accuracies.features.filter(
      function(f) {
        return f.attributes.id == aId;
      })[0];
  accuracies.removeFeatures([accuracy]);
  var center = centers.features.filter(
      function(f) {
        return f.attributes.id == aId;
      })[0];
  centers.removeFeatures([center]);

  updateExtent(aWithZoom);
}

function useGeolocation(aId) {
  var old = centers.features.filter(
      function(f) {
        return f.attributes.used;
      })[0];
  if (old) {
    old.attributes.used = false;
    centers.drawFeature(old);
  }
  var used = centers.features.filter(
      function(f) {
        return f.attributes.id == aId;
      })[0];
  if (used) {
    used.attributes.used = true;
    centers.drawFeature(used);
  }
}

function checkGeolocation(aId,aChecked) {
  var accuracy = accuracies.features.filter(
      function(f) {
        return f.attributes.id == aId;
      })[0];
  accuracy.attributes.checked = aChecked;
  accuracies.drawFeature(accuracy);
  var center = centers.features.filter(
      function(f) {
        return f.attributes.id == aId;
      })[0];
  center.attributes.checked = aChecked;
  centers.drawFeature(center);
}

function updateExtent(aWithZoom) {
  extent = new OpenLayers.Bounds();

  var feats = accuracies.features;
  var nbFeat = feats.length;
  for (var i=0; i<nbFeat; i++) {
    var feat = feats[i];

    var center = new OpenLayers.LonLat(
      feat.geometry.x,
      feat.geometry.y);
    center.transform(map.projection,map.displayProjection);

    var bbox = getAccuracyExtent(center,feat.attributes.accuracy);
    bbox.transform(map.displayProjection,map.projection);
    extent.extend(bbox);
  }
  if (aWithZoom)
    map.zoomToExtent(extent);
}

function zoomToExtent() {
  map.zoomToExtent(extent);
}

function zoomToSelection() {
  if (selection == null)
    return false;
  var accuracy = selection.center.attributes.accuracy;
  var center = selection.center.geometry;
  center = new OpenLayers.LonLat(
      center.x,
      center.y);
  center.transform(map.projection,map.displayProjection);

  var bbox = getAccuracyExtent(center,accuracy);
  bbox.transform(map.displayProjection,map.projection);
  map.zoomToExtent(bbox);
}
