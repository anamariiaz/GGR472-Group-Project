//provide access token to Mapbox API 
mapboxgl.accessToken = 'pk.eyJ1IjoiYW5hbWFyaWlheiIsImEiOiJjbGRtMTR5YmUwMjBqM3VrZDU0N2RmeTVuIn0.TtYMegWHD_9XSk_jO1jZFg';

//define maximum and minimum scroll bounds for the maps
const maxBounds = [
  [-90.8, 43.4], //SW coords
  [-100, 45] //NE coords
];

//define a constant variable "map" and assign it to a map created with the Mapbox API 
const map = new mapboxgl.Map({
  container: 'map1', //ID for div where map will be embedded in HTML file
  style: 'mapbox://styles/mapbox/light-v11', //link to style URL
  center: [-79.3, 38.765], //starting position [longitude, latitude]
  zoom: 8.65, //starting zoom
  bearing: -17.7, //angle rotation of map
  maxBounds: maxBounds //maximum and minimum scroll bounds
});

//Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl());

//Add fullscreen option to the map
map.addControl(new mapboxgl.FullscreenControl());

//Create geocoder variable
const geocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  mapboxgl: mapboxgl,
  countries: "ca"
});


//Add interactivity based on HTML event
//Use geocoder div to position geocoder on page
document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

//Add event listener which returns map view to full screen on button click
document.getElementById('returnbutton').addEventListener('click', () => {
  map.flyTo({
    center: [-79.3, 38.765],
    zoom: 8.65,
    bearing: -17.7,
    essential: true
  });
});

//Add data sources and draw map layers
map.on('load', () => {
  //'getJSON' function for reading an external JSON file
  var getJSON = function (url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function () {
      var status = xhr.status;
      if (status === 200) {
        callback(null, xhr.response);
      } else {
        callback(status, xhr.response);
      }
    };
    xhr.send();
  };
  //apply 'getJSON' function to our external JSON file from BikeShare API: if it reads the file successfully, trigger 'updateMap' function, otherwise give an error
  getJSON('https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information',
    function (err, data) {
      if (err !== null) {
        alert('Something went wrong: ' + err);
      } else {
        updateMap(data)
      }
    });

  //'updateMap' function for taking the coordinates out of the BikeShare JSON file, using them to manually create a GeoJSON file, and then plotting the points in this created GeoJSON file 
  function updateMap(data) {

    var test = [];
    //loop through all of the BikeShare stations and add their coordinates to a manually created GeoJSON file
    for (let step = 0; step < data.data.stations.length; step++) {
      let longitude = data.data.stations[step].lon
      let latitude = data.data.stations[step].lat
      test.push(JSON.parse(`{"type": "Feature", "geometry": {"coordinates": [${longitude},${latitude}], "type": "Point"}}`));
    };

    //add a geojson file source "toronto_bikeshare_stations" for Toronto bikeways using the manually created GeoJSON file
    map.addSource('toronto_bikeshare_stations', {
      type: 'geojson',
      data: {
        "type": "FeatureCollection",
        "features": test
      },
      //cluster the data to limit the symbology on the map at low zoom levels
      cluster: true,
      clusterMaxZoom: 14, //maximum zoom at which points cluster
      clusterRadius: 50 //distance over which points cluster
    });

    //load and add image 'bikeshare-marker' for bikeshare icons (throw an error if this process fails)
    map.loadImage(
      'https://anamariiaz.github.io/GGR472-Group-Project-Sources/bikeshare.png',
      (error, image) => {
        if (error) throw error;
        map.addImage('bikeshare-marker', image);
      }
    );

    //add and style a layer of lines "toronto_bikeshare_clustered" from the defined "toroto_bikeshare_stations" source for the clustered bikeshare stations
    map.addLayer({
      'id': 'toronto_bikeshare_clustered',
      'type': 'circle',
      'source': 'toronto_bikeshare_stations',
      //only show text when there is more than 1 bikeshare station within radius 
      filter: ['has', 'point_count'],
      'paint': {
        //specify the radius of the circles based on whether the number of bikeshare stations within radius is <10, 10-20, 20-50, 50-100 or >100
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          13,
          10,
          15,
          20,
          17,
          50,
          20,
          100,
          25
        ],
        'circle-color': '#ACDF87'
      }
    });

    //add and style a layer of symbols "toronto_bikeshare_cluster-count" from the defined "toronto_bikeshare_stations" source for the text on top of the clustered bikeshare stations
    map.addLayer({
      id: 'toronto_bikeshare_cluster-count',
      type: 'symbol',
      source: 'toronto_bikeshare_stations',
      //only show text when there is more than 1 bikeshare station within radius 
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
        //allow overlap of other text layers (so that all layers are simultaneously visible)
        'text-allow-overlap': true,
        'text-ignore-placement': true
      }
    });

    //add and style a layer of circles "toronto_bikeshare_unclustered" from the defined "toronto_bikeshare_stations" source for the unclustered (single) bikeshare stations
    map.addLayer({
      id: 'toronto_bikeshare_unclustered',
      type: 'symbol',
      source: 'toronto_bikeshare_stations',
      //only show circles when there is 1 bikeshare station within radius 
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': 'bikeshare-marker',
        'icon-size': 0.07,
        //allow overlap of other icon layers (so that all layers are simultaneously visible)
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    });


  }

  //add a geojson file source "toronto_cycling_network" for Toronto bikeways
  map.addSource('toronto_cycling_network', {
    type: 'geojson',
    data: 'https://anamariiaz.github.io/GGR472-Group-Project-Sources/toronto_cycling_network.geojson',
    'generateId': true
  });

  //add and style a layer of lines "toronto_bikeways" from the defined "toronto_cycling_network" source
  map.addLayer({
    'id': 'toronto_bikeways',
    'type': 'line',
    'source': 'toronto_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'type', make the color red
        ['in', 'bike lane', ['downcase', ['get', 'type']]],
        'red',
        ['in', 'cycle track', ['downcase', ['get', 'type']]],
        'green',
        ['in', 'multi', ['downcase', ['get', 'type']]],
        'blue',
        ['in', 'sharrows', ['downcase', ['get', 'type']]],
        'orange',
        //ex. if the word 'shared roadway' OR the word 'signed route' is in the (lowercase) entry for 'type', make the color purple (i think theyre the same thing or similar?)
        ['any', ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]]],
        'purple',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]]],
        '#5C4033',
        ['in', 'shared pathway', ['downcase', ['get', 'type']]],
        '#ff69b4',
        ['in', 'paved shoulder', ['downcase', ['get', 'type']]],
        '#0492C2',
        'black' //default color if none of the above apply
      ],
      'line-opacity': 0.7
    }
  });

  map.on('mouseenter', 'toronto_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer'; //Switch cursor to pointer when mouse is over provterr-fill layer
     });
    
    map.on('mouseleave', 'toronto_bikeways', () => {
        map.getCanvas().style.cursor = ''; //Switch cursor back when mouse leaves provterr-fill layer
     });

map.on('click', 'toronto_bikeways', (e) => {
console.log (e)
new mapboxgl.Popup() 
    .setLngLat(e.lngLat) 
    .setHTML( "Name: " + e.features[0].properties.name + "<br>" + "Trail type: " + "<br>" + e.features[0].properties.type +
    "<br>" + "City: " + e.features[0].properties.municipality)
    .addTo(map);
});

  //add a geojson file source "york_region_cycling_network" for York Region bikeways
  map.addSource('york_region_cycling_network', {
    type: 'geojson',
    data: 'https://anamariiaz.github.io/GGR472-Group-Project-Sources/york_region_cycling_network.geojson',
    'generateId': true
  });

  //add and style a layer of lines "york_region_bikeways" from the defined "york_region_cycling_network" source
  map.addLayer({
    'id': 'york_region_bikeways',
    'type': 'line',
    'source': 'york_region_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'type', make the color red
        ['in', 'bike lane', ['downcase', ['get', 'type']]],
        'red',
        ['in', 'cycle track', ['downcase', ['get', 'type']]],
        'green',
        ['in', 'multi', ['downcase', ['get', 'type']]],
        'blue',
        ['in', 'sharrows', ['downcase', ['get', 'type']]],
        'orange',
        //ex. if the word 'shared roadway' OR the word 'signed route' is in the (lowercase) entry for 'type', make the color purple (i think theyre the same thing or similar?)
        ['any', ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]]],
        'purple',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]]],
        '#5C4033',
        ['in', 'shared pathway', ['downcase', ['get', 'type']]],
        '#ff69b4',
        ['in', 'paved shoulder', ['downcase', ['get', 'type']]],
        '#0492C2',
        'black'
      ],
      'line-opacity': 0.7
    }
  });

  map.on('mouseenter', 'york_region_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer'; //Switch cursor to pointer when mouse is over provterr-fill layer
     });
    
    map.on('mouseleave', 'york_region_bikeways', () => {
        map.getCanvas().style.cursor = ''; //Switch cursor back when mouse leaves provterr-fill layer
     });

map.on('click', 'york_region_bikeways', (e) => {
console.log (e)
new mapboxgl.Popup() 
    .setLngLat(e.lngLat) 
    .setHTML( "Name: " + e.features[0].properties.name + "<br>" + "Trail type: " + "<br>" + e.features[0].properties.type +
    "<br>" + "City: " + e.features[0].properties.municipality)
    .addTo(map);
});
  //add a geojson file source "peel_region_cycling_network" for Peel Region bikeways
  map.addSource('peel_region_cycling_network', {
    type: 'geojson',
    data: 'https://ireo00.github.io/472-Resources/peel_region_cycling_network.geojson', 'generateId': true
  });

  //add and style a layer of lines "peel_bikeways" from the defined "peel_region_cycling_network" source
  map.addLayer({
    'id': 'peel_bikeways',
    'type': 'line',
    'source': 'peel_region_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "Type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'Type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'Type', make the color red
        ['in', 'bike lane', ['downcase', ['get', 'Type']]],
        'red',
        ['in', 'cycle track', ['downcase', ['get', 'Type']]],
        'green',
        ['in', 'multi', ['downcase', ['get', 'Type']]],
        'blue',
        ['in', 'sharrows', ['downcase', ['get', 'Type']]],
        'orange',
        //ex. if the word 'shared roadway' OR the word 'signed route' is in the (lowercase) entry for 'type', make the color purple (i think theyre the same thing or similar?)
        ['any', ['in', 'shared roadway', ['downcase', ['get', 'Type']]], ['in', 'signed route', ['downcase', ['get', 'Type']]]],
        'purple',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'Type']]], ['in', 'park road', ['downcase', ['get', 'Type']]]],
        '#5C4033',
        ['in', 'shared pathway', ['downcase', ['get', 'Type']]],
        '#ff69b4',
        ['in', 'paved shoulder', ['downcase', ['get', 'Type']]],
        '#0492C2',
        'black' //default color if none of the above apply
      ],
      'line-opacity': 0.7
    }
  });

  map.on('mouseenter', 'peel_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer'; //Switch cursor to pointer when mouse is over provterr-fill layer
     });
    
    map.on('mouseleave', 'peel_bikeways', () => {
        map.getCanvas().style.cursor = ''; //Switch cursor back when mouse leaves provterr-fill layer
     });

map.on('click', 'peel_bikeways', (e) => {
console.log (e)
new mapboxgl.Popup() 
    .setLngLat(e.lngLat) 
    .setHTML( "Name: " + e.features[0].properties.Name + "<br>" + "Trail type: " + "<br>" + e.features[0].properties.Class +
    "<br>" + "City: " + e.features[0].properties.MUN)
    .addTo(map);
});
  //add a geojson file source "durham_region_cycling_network" for Durham Region bikeways
  map.addSource('durham_region_cycling_network', {
    type: 'geojson',
    data: 'https://ireo00.github.io/472-Resources/durham_region_cycling_network.geojson', 'generateId': true
  });

  //add and style a layer of lines "durham_region_bikeways" from the defined "durham_region_cycling_network" source
  map.addLayer({
    'id': 'durham_region_bikeways',
    'type': 'line',
    'source': 'durham_region_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'type', make the color red
        ['in', 'bike lane', ['downcase', ['get', 'type']]],
        'red',
        ['in', 'cycle track', ['downcase', ['get', 'type']]],
        'green',
        ['in', 'multi', ['downcase', ['get', 'type']]],
        'blue',
        ['in', 'sharrows', ['downcase', ['get', 'type']]],
        'orange',
        //ex. if the word 'shared roadway' OR the word 'signed route' is in the (lowercase) entry for 'type', make the color purple (i think theyre the same thing or similar?)
        ['any', ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]]],
        'purple',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]]],
        '#5C4033',
        ['in', 'shared pathway', ['downcase', ['get', 'type']]],
        '#ff69b4',
        ['in', 'paved shoulder', ['downcase', ['get', 'type']]],
        '#0492C2',
        'black'
      ],
      'line-opacity': 0.7
    }
  });

  map.on('mouseenter', 'durham_region_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer'; //Switch cursor to pointer when mouse is over provterr-fill layer
     });
    
    map.on('mouseleave', 'durham_region_bikeways', () => {
        map.getCanvas().style.cursor = ''; //Switch cursor back when mouse leaves provterr-fill layer
     });

map.on('click', 'durham_region_bikeways', (e) => {
console.log (e)
new mapboxgl.Popup() 
    .setLngLat(e.lngLat) 
    .setHTML( "Name: " + e.features[0].properties.name)
    .addTo(map);
});

  //add a geojson file source "burlington_cycling_networkk" for Burlington bikeways
  map.addSource('burlington_cycling_network', {
    type: 'geojson',
    data: 'https://ireo00.github.io/472-Resources/burlington_cycling_network.geojson', 'generateId': true
  });
  map.addLayer({
    'id': 'burlington_bikeways',
    'type': 'line',
    'source': 'burlington_cycling_network',
    'paint': {
      'line-width': 3,
        //specify the color of the lines based on the text contained within the "Type" data field (i.e. based on the bikeway type)
        //note that 'downcase' is used to ignore the case of the entries in the field 'Type' (some entries are uppercase so we make them lowercase)
        'line-color': [
          'case',
          //ex. if the word 'bike lane' is in the (lowercase) entry for 'Type', make the color red
          ['in', 'bl', ['downcase', ['get', 'type']]], //'bike lane', Bike lane (BL)
          'red',
          ['in', 'cycle track', ['downcase', ['get', 'type']]],
          'green',
          ['any', ['in', 'mupoff', ['downcase', ['get', 'type']]], ['in', 'mupadj', ['downcase', ['get', 'type']]]], //'multi', Multiuse path off road (MUPOFF) OR Multiuse path adjacent to road	(MUPADJ)
          'blue',
          ['in', 'shared', ['downcase', ['get', 'type']]], //'sharrows', Shared use - Sharrows painted on pavement (SHARED)
          'orange',
          //ex. if the word 'shared roadway' OR the word 'signed route' is in the (lowercase) entry for 'type', make the color purple (i think theyre the same thing or similar?)
          ['any', ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]]],
          'purple',
          //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
          ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]]],
          '#5C4033',
          ['in', 'bl-shared', ['downcase', ['get', 'type']]], // 'shared pathway', Mixed use - Bike lane and sharrows (BL-SHARED) 
          '#ff69b4',
          ['in', 'ps', ['downcase', ['get', 'type']]], //'paved shoulder', Paved shoulder (PS)
          '#0492C2',
          'black' //default color if none of the above apply
        ],
        'line-opacity': 0.7
      
     
    }
  });
  map.on('mouseenter', 'burlington_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer'; //Switch cursor to pointer when mouse is over provterr-fill layer
     });
    
    map.on('mouseleave', 'burlington_bikeways', () => {
        map.getCanvas().style.cursor = ''; //Switch cursor back when mouse leaves provterr-fill layer
     });

map.on('click', 'burlington_bikeways', (e) => {
console.log (e)
new mapboxgl.Popup() 
    .setLngLat(e.lngLat) 
    .setHTML( "Name: " + e.features[0].properties.name + "<br>" +
    "Address: " + e.features[0].properties.address + "<br>" + "Postal Code: " + e.features[0].properties.postal_code
    + "<br>" + "City: " + e.features[0].properties.city + "<br>" + "Parking type: " + "<br>" +
    e.features[0].properties.parking_type + "<br>" + "Bike Capacity: " + e.features[0].properties.bike_capacity)
    .addTo(map);
});

  //add a geojson file source "milton_cycling_network" for Milton bikeways
  map.addSource('milton_cycling_network', {
    type: 'geojson',
    data: 'https://ireo00.github.io/472-Resources/milton_cycling_network.geojson', 'generateId': true
  });

  //add and style a layer of lines "milton_bikeways" from the defined "milton_cycling_network" source
  map.addLayer({
    'id': 'milton_bikeways',
    'type': 'line',
    'source': 'milton_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "Type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'Type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'Type', make the color red
        ['in', 'bike lane', ['downcase', ['get', 'type']]],
        'red',
        ['in', 'cycle track', ['downcase', ['get', 'type']]],
        'green',
        ['in', 'multi', ['downcase', ['get', 'type']]],
        'blue',
        ['in', 'sharrows', ['downcase', ['get', 'type']]],
        'orange',
        //ex. if the word 'shared roadway' OR the word 'signed route' is in the (lowercase) entry for 'type', make the color purple (i think theyre the same thing or similar?)
        ['any', ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]]],
        'purple',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]]],
        '#5C4033',
        ['in', 'shared pathway', ['downcase', ['get', 'type']]],
        '#ff69b4',
        ['in', 'paved shoulder', ['downcase', ['get', 'type']]],
        '#0492C2',
        'black' //default color if none of the above apply
      ],
      'line-opacity': 0.7
    }
  });

  
  //add a geojson file source "oakville_cycling_network" for Oakville bikeways
  map.addSource('oakville_cycling_network', {
    type: 'geojson',
    data: 'https://ireo00.github.io/472-Resources/oakville_cycling_network.geojson', 'generateId': true
  });

  //add and style a layer of lines "oakville_bikeways" from the defined "oakville_cycling_network" source
  map.addLayer({
    'id': 'oakvill_bikeways',
    'type': 'line',
    'source': 'oakville_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "Type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'Type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'Type', make the color red
        ['in', 'bike lane', ['downcase', ['get', 'type']]],
        'red',
        ['in', 'cycle track', ['downcase', ['get', 'type']]],
        'green',
        ['in', 'multi', ['downcase', ['get', 'type']]],
        'blue',
        ['in', 'sharrows', ['downcase', ['get', 'type']]],
        'orange',
        //ex. if the word 'shared roadway' OR the word 'signed route' is in the (lowercase) entry for 'type', make the color purple (i think theyre the same thing or similar?)
        ['any', ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]]],
        'purple',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]]],
        '#5C4033',
        ['in', 'shared pathway', ['downcase', ['get', 'type']]],
        '#ff69b4',
        ['in', 'paved shoulder', ['downcase', ['get', 'type']]],
        '#0492C2',
        'black' //default color if none of the above apply
      ],
      'line-opacity': 0.7
    }
  });


  //add a geojson file source "toronto_bicycle_parking" for Toronto bike parking stations
  map.addSource('toronto_bicycle_parking', {
    type: 'geojson',
    data: 'https://anamariiaz.github.io/GGR472-Group-Project-Sources/toronto_bicycle_parking.geojson',
    'generateId': true,
    //cluster the data to limit the symbology on the map at low zoom levels
    cluster: true,
    clusterMaxZoom: 14, //maximum zoom at which points cluster
    clusterRadius: 50 //distance over which points cluster
  });

  //load and add image 'parking-marker' for parking icons (throw an error if this process fails)
  map.loadImage(
    'https://anamariiaz.github.io/GGR472-Group-Project-Sources/bike_parking.png',
    (error, image) => {
      if (error) throw error;
      map.addImage('parking-marker', image);
    }
  );

  //add and style a layer of circles "toronto_bike_parking_clustered" from the defined "toronto_bicycle_parking" source for the clustered parking stations
  map.addLayer({
    'id': 'toronto_bike_parking_clustered',
    'type': 'circle',
    'source': 'toronto_bicycle_parking',
    //only show circles when there is more than 1 bike parking station within radius
    filter: ['has', 'point_count'],
    'paint': {
      'circle-color': '#11b4da',
      //specify the radius of the circles based on whether the number of bike parking stations within radius is <10, 10-20, 20-50, 50-100 or >100
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        13,
        10,
        15,
        20,
        17,
        50,
        20,
        100,
        25
      ]
    }
  });

  //add and style a layer of symbols "toronto_bike_parking_cluster-count" from the defined "toronto_bicycle_parking" source for the text on top of the clustered parking stations
  map.addLayer({
    id: 'toronto_bike_parking_cluster-count',
    type: 'symbol',
    source: 'toronto_bicycle_parking',
    //only show text when there is more than 1 bike parking station within radius 
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
      //allow overlap of other text layers (so that all layers are simultaneously visible)
      'text-allow-overlap': true,
      'text-ignore-placement': true
    }
  });

  //add and style a layer of circles "toronto_bike_parking_unclustered" from the defined "toronto_bicycle_parking" source for the unclustered (single) parking stations
  map.addLayer({
    id: 'toronto_bike_parking_unclustered',
    type: 'symbol',
    source: 'toronto_bicycle_parking',
    //only show circles when there is 1 bike parking station within radius 
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': 'parking-marker',
      'icon-size': 0.15,
      //allow overlap of other icon layers (so that all layers are simultaneously visible)
      'icon-allow-overlap': true,
      'icon-ignore-placement': true
    }
  });
  map.on('mouseenter', 'toronto_bicycle_shops_unclustered', () => {
    map.getCanvas().style.cursor = 'pointer'; //Switch cursor to pointer when mouse is over provterr-fill layer
     });
    
    map.on('mouseleave', 'toronto_bicycle_shops_unclustered', () => {
        map.getCanvas().style.cursor = ''; //Switch cursor back when mouse leaves provterr-fill layer
     });

map.on('click', 'toronto_bicycle_shops_unclustered', (e) => {
console.log (e)
new mapboxgl.Popup() 
    .setLngLat(e.lngLat) 
    .setHTML( "Name: " + e.features[0].properties.name + "<br>" +
    "Address: " + e.features[0].properties.address + "<br>" + "Postal Code: " + e.features[0].properties.postal_code
    + "<br>" + "City: " + e.features[0].properties.city + "<br>" + "Parking type: " + "<br>" +
    e.features[0].properties.parking_type + "<br>" + "Bike Capacity: " + e.features[0].properties.bike_capacity)
    .addTo(map);
});
  //add a geojson file source "toronto_bicycle_shops" for Toronto bike shops
  map.addSource('toronto_bicycle_shops', {
    type: 'geojson',
    data: 'https://ireo00.github.io/472-Resources/toronto_bicycle_shops.geojson',
    'generateId': true,
    //cluster the data to limit the symbology on the map at low zoom levels
    cluster: true,
    clusterMaxZoom: 14, //maximum zoom at which points cluster
    clusterRadius: 50 //distance over which points cluster
  });

  //load and add image 'shop-marker' for shop icons (throw an error if this process fails)
  map.loadImage(
    'https://ireo00.github.io/472-Resources/bike_shop.png',
    (error, image) => {
      if (error) throw error;
      map.addImage('shop-marker', image);
    }
  );


  //add and style a layer of circles "toronto_bicycle_shops_clustered" from the defined "toronto_bicycle_shops" source for the clustered bike shops
  map.addLayer({
    'id': 'toronto_bicycle_shop_clustered',
    'type': 'circle',
    'source': 'toronto_bicycle_shops',
    //only show circles when there is more than 1 bike shop within radius
    filter: ['has', 'point_count'],
    'paint': {
      'circle-color': '#11b4da',
      //specify the radius of the circles based on whether the number of bike shops within radius is <10, 10-20, 20-50, 50-100 or >100
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        13,
        10,
        15,
        20,
        17,
        50,
        20,
        100,
        25
      ]
    }
  });

  //add and style a layer of symbols "toronto_bicycle_shops_cluster-count" from the defined "toronto_bicycle_shops" source for the text on top of the clustered bike shops
  map.addLayer({
    id: 'toronto_bicycle_shop_clustered-count',
    type: 'symbol',
    source: 'toronto_bicycle_shops',
    //only show text when there is more than 1 bike shop within radius 
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
      //allow overlap of other text layers (so that all layers are simultaneously visible)
      'text-allow-overlap': true,
      'text-ignore-placement': true
    }
  });

  //add and style a layer of circles "toronto_bicycle_shops_unclustered" from the defined "toronto_bicycle_shops" source for the unclustered (single) shop
  map.addLayer({
    id: 'toronto_bicycle_shops_unclustered',
    type: 'symbol',
    source: 'toronto_bicycle_shops',
    //only show circles when there is 1 bike shop within radius 
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': 'shop-marker',
      'icon-size': 0.08,
      //allow overlap of other icon layers (so that all layers are simultaneously visible)
      'icon-allow-overlap': true,
      'icon-ignore-placement': true
    }
  });

  map.on('mouseenter', 'toronto_bicycle_shops_unclustered', () => {
    map.getCanvas().style.cursor = 'pointer'; //Switch cursor to pointer when mouse is over provterr-fill layer
     });
    
    map.on('mouseleave', 'toronto_bicycle_shops_unclustered', () => {
        map.getCanvas().style.cursor = ''; //Switch cursor back when mouse leaves provterr-fill layer
     });

map.on('click', 'toronto_bicycle_shops_unclustered', (e) => {
console.log (e)
new mapboxgl.Popup() 
    .setLngLat(e.lngLat) 
    .setHTML( "Name: " + e.features[0].properties.name + "<br>" + "Rental: " + e.features[0].properties.rental + "<br>" +
    "Address: " + e.features[0].properties.address +"<br>" + "Postal Code: " + e.features[0].properties.postal_code
    + "<br>" + "City: " + e.features[0].properties.city + "<br>" + "Phone: " + "<br>" +
    e.features[0].properties.phone)
    .addTo(map);
});

  map.addSource('ajax_cycling_network', {
    type: 'geojson',
    data: 'https://janicewg.github.io/GGR472-Data-Group-Project/Active_Transportation.geojson',
    'generateId': true,
  });
  
  map.addLayer({
    'id': 'ajax_bikeways',
    'type': 'line',
    'source': 'ajax_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "Type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'Type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'Type', make the color red
        ['in', 'bike lane', ['downcase', ['get', 'type']]],
        'red',
        ['in', 'cycle track', ['downcase', ['get', 'type']]],
        'green',
        ['in', 'multi', ['downcase', ['get', 'type']]],
        'blue',
        ['in', 'sharrows', ['downcase', ['get', 'type']]],
        'orange',
        //ex. if the word 'shared roadway' OR the word 'signed route' is in the (lowercase) entry for 'type', make the color purple (i think theyre the same thing or similar?)
        ['any', ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]]],
        'purple',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]]],
        '#5C4033',
        ['in', 'shared pathway', ['downcase', ['get', 'type']]],
        '#ff69b4',
        ['in', 'paved shoulder', ['downcase', ['get', 'type']]],
        '#0492C2',
        'black' //default color if none of the above apply
      ],
      'line-opacity': 0.7
    }
  });

    map.on('mouseenter', 'ajax_bikeways', () => {
        map.getCanvas().style.cursor = 'pointer'; //Switch cursor to pointer when mouse is over provterr-fill layer
         });
        
        map.on('mouseleave', 'ajax_bikeways', () => {
            map.getCanvas().style.cursor = ''; //Switch cursor back when mouse leaves provterr-fill layer
         });

  map.on('click', 'ajax_bikeways', (e) => {
    console.log (e)
    new mapboxgl.Popup() 
        .setLngLat(e.lngLat) 
        .setHTML( "Location: " + e.features[0].properties.location +"<br>" + "Facility: " + e.features[0].properties.type)
        .addTo(map);
});

  map.addSource('whitby_cycling_network', {
    type: 'geojson',
    data: 'https://janicewg.github.io/GGR472-Data-Group-Project/Whitby_cycling_routes.geojson',
    'generateId': true,
  });

  map.addLayer({
    'id': 'whitby_bikeways',
    'type': 'line',
    'source': 'whitby_cycling_network',
    'paint': {
      'line-width': 3,
      //specify the color of the lines based on the text contained within the "Type" data field (i.e. based on the bikeway type)
      //note that 'downcase' is used to ignore the case of the entries in the field 'Type' (some entries are uppercase so we make them lowercase)
      'line-color': [
        'case',
        //ex. if the word 'bike lane' is in the (lowercase) entry for 'Type', make the color red
        ['in', 'bike lane', ['downcase', ['get', 'type']]],
        'red',
        ['in', 'cycle track', ['downcase', ['get', 'type']]],
        'green',
        ['in', 'multi', ['downcase', ['get', 'type']]],
        'blue',
        ['in', 'sharrows', ['downcase', ['get', 'type']]],
        'orange',
        //ex. if the word 'shared roadway' OR the word 'signed route' is in the (lowercase) entry for 'type', make the color purple (i think theyre the same thing or similar?)
        ['any', ['in', 'shared roadway', ['downcase', ['get', 'type']]], ['in', 'signed route', ['downcase', ['get', 'type']]]],
        'purple',
        //ex. if the word 'hiking' OR the word 'park road' is in the (lowercase) entry for 'type', make the color '#5C4033' (i think theyre basically the same thing so i grouped them together)
        ['any', ['in', 'hiking', ['downcase', ['get', 'type']]], ['in', 'park road', ['downcase', ['get', 'type']]]],
        '#5C4033',
        ['in', 'shared pathway', ['downcase', ['get', 'type']]],
        '#ff69b4',
        ['in', 'paved shoulder', ['downcase', ['get', 'type']]],
        '#0492C2',
        'black' //default color if none of the above apply
      ],
      'line-opacity': 0.7
    }
  });

  map.on('mouseenter', 'whitby_bikeways', () => {
    map.getCanvas().style.cursor = 'pointer'; //Switch cursor to pointer when mouse is over provterr-fill layer
     });
    
    map.on('mouseleave', 'whitby_bikeways', () => {
        map.getCanvas().style.cursor = ''; //Switch cursor back when mouse leaves provterr-fill layer
     });

map.on('click', 'whitby_bikeways', (e) => {
console.log (e)
new mapboxgl.Popup() 
    .setLngLat(e.lngLat) 
    .setHTML( "Location: " + e.features[0].properties.roadname +"<br>" + "Start: " + e.features[0].properties.start
    + "<br>" + "End: " + e.features[0].properties.end + "<br>" + "Type: " + e.features[0].properties.type)
    .addTo(map);
});




});


