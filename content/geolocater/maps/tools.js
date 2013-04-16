OpenLayers.IMAGE_RELOAD_ATTEMPTS = 2;
OpenLayers.Util.onImageLoadErrorColor = "transparent";

function osm_getTileURL(bounds) {
  var res = this.map.getResolution();
  var x = Math.round((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
  var y = Math.round((this.maxExtent.top - bounds.top) / (res * this.tileSize.h));
  var z = this.map.getZoom();
  var limit = Math.pow(2, z);

  if (y < 0 || y >= limit) {
    return OpenLayers.Util.getImagesLocation() + "404.png";
  } else {
    x = ((x % limit) + limit) % limit;
    var path = z + "/" + x + "/" + y + "." + this.type;
    var url = this.url;
    if (url instanceof Array)
      url = this.selectUrl(path, url);
    return url + path;
  }
}

function getAccuracyExtent(center,accuracy) {
  var R = 6371000;
  var lat1 = center.lat*Math.PI/180;
  var lon1 = center.lon*Math.PI/180;

  var brng = 45*Math.PI/180;
  var lat2 = Math.asin( 
      Math.sin(lat1)*Math.cos(accuracy/R) + 
      Math.cos(lat1)*Math.sin(accuracy/R)*Math.cos(brng) );
  var lon2 = lon1 + Math.atan2( 
      Math.sin(brng)*Math.sin(accuracy/R)*Math.cos(lat1), 
      Math.cos(accuracy/R)-Math.sin(lat1)*Math.sin(lat2));
  lon2 = (lon2+Math.PI)%(2*Math.PI) - Math.PI;
  lat2 =lat2*180/Math.PI;
  lon2 =lon2*180/Math.PI;

  brng = 225*Math.PI/180;
  var lat3 = Math.asin( 
      Math.sin(lat1)*Math.cos(accuracy/R) + 
      Math.cos(lat1)*Math.sin(accuracy/R)*Math.cos(brng) );
  var lon3 = lon1 + Math.atan2( 
      Math.sin(brng)*Math.sin(accuracy/R)*Math.cos(lat1), 
      Math.cos(accuracy/R)-Math.sin(lat1)*Math.sin(lat3));
  lon3 = (lon3+Math.PI)%(2*Math.PI) - Math.PI;
  lat3 =lat3*180/Math.PI;
  lon3 =lon3*180/Math.PI;

  var bbox = new OpenLayers.Bounds();
  bbox.extend(new OpenLayers.LonLat(lon2,lat2));
  bbox.extend(new OpenLayers.LonLat(lon3,lat3));
  return bbox;
}
