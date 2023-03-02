//provide access token to Mapbox API 
mapboxgl.accessToken = 'pk.eyJ1IjoiYW5hbWFyaWlheiIsImEiOiJjbGRtMTR5YmUwMjBqM3VrZDU0N2RmeTVuIn0.TtYMegWHD_9XSk_jO1jZFg'; 

//define maximum and minimum scroll bounds for the maps
const maxBounds = [
    [-79.8, 43.4], //SW coords
    [-78.8, 44] //NE coords
];

//define a constant variable "map" and assign it to a map created with the Mapbox API 
const map = new mapboxgl.Map({
    container: 'map1', //ID for div where map will be embedded in HTML file
    style: 'mapbox://styles/mapbox/streets-v12', //link to style URL
    center: [-79.3, 43.765], //starting position [longitude, latitude]
    zoom: 9.2, //starting zoom
    bearing: -17.7, //angle rotation of map
	//maxBounds: maxBounds //maximum and minimum scroll bounds
});


map.on('load', () => {
    var getJSON = function(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.onload = function() {
          var status = xhr.status;
          if (status === 200) {
            callback(null, xhr.response);
          } else {
            callback(status, xhr.response);
          }
        };
        xhr.send();
    };
    getJSON('https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information',
    function(err, data) {
      if (err !== null) {
        alert('Something went wrong: ' + err);
      } else {
        //console.log(data);
        //console.log(data.data.stations[1].lon)};
        updateMap(data)}
        
      });
    
    function updateMap(data) {
        var test = [];
        for (let step = 0; step < 652; step++) {
            //console.log(data.data.stations[step].lon)
            let longitude=data.data.stations[step].lon
            let latitude=data.data.stations[step].lat
            test.push(JSON.parse(`{"type": "Feature", "geometry": {"coordinates": [${longitude},${latitude}], "type": "Point"}}`));
        };  
        map.addSource('bikeways', {
            type: 'geojson',
            data:  {"type": "FeatureCollection",
            "features": test}
        });
        console.log({"type": "FeatureCollection",
        "features": test})
        console.log(test)
    
        //add and style a layer of lines "bike" from the defined "bikeways" source
        map.addLayer({
            'id': 'bike',
            'type': 'circle',
            'source': 'bikeways',
            'paint': {
                'circle-radius': 10,
                'circle-color': '#000000'
            }
        });
    }
    //add a geojson file source "bikeways" for Toronto bikeways

});
