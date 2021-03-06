import mapboxgl from 'mapbox-gl';

import { sendMessage } from '../client/race'
import { setCallback } from '../client/race'


console.log(`My user ID is ${userId}`)
// set up map API key
const mapElement = document.getElementById('map');
mapboxgl.accessToken = mapElement.dataset.mapboxApiKey;
// start/end
const myStart = raceCheckpoints[1]
const myEnd = raceCheckpoints[raceCheckpoints.length - 1]

// drawing map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v10',
  center: myStart, // @starting position
  zoom: 12 // TODO: Adjust
});
// to use touch later
var canvas = map.getCanvasContainer();

// TODO: calculate below, based on the start/end
// var bounds = [[parseFloat((myStart[0] + 0.1).toFixed(5)), parseFloat((myStart[1] - 0.1).toFixed(5))], [parseFloat((myEnd[0] - 0.1).toFixed(5)), parseFloat((myEnd[1] + 0.1).toFixed(5))]];
// console.log(bounds)
// map.setMaxBounds(bounds);

// form the request to API with start/end coordinates
let url = 'https://api.mapbox.com/directions/v5/mapbox/cycling/'
raceCheckpoints.forEach((checkpoint, index) => {
  if (index != 0) {
    url += `${checkpoint[0]},${checkpoint[1]}`
    if (index != raceCheckpoints.length - 1) {
      url += ';'
    }
  }
})
url += '?steps=true&geometries=geojson&access_token=' + mapboxgl.accessToken;

// request API
fetch(url)
  .then(response => response.json())
  .then((data) => {
    // choose routes section
    // console.log(data)
    const routes = data.routes[0]
    // choose route instructions
    const instructions = document.getElementById('instructions');
    // choose route steps
    const steps = routes.legs[0].steps;
    // form instructions
    var tripInstructions = [];
    // for (var i = 0; i < steps.length; i++) {
    //   // TODO: drop the last one/or add turn by turn navigation, based on the geoLocation
    //   tripInstructions.push('<br><li class="text t5 white">' + steps[i].maneuver.instruction) + '</li>';
    //   instructions.innerHTML = '<div class="map-instructions text t4 white">Instructions:</div><span class="duration text t6 accent">- race duration: ' + Math.floor(data.duration / 60) + ' min</span>' + tripInstructions + '<div class="map-divider"></div>';
    // }
    // display the route
    // console.log(routes.geometry.coordinates)
    map.on('load', function () {
      map.addLayer({
        "id": "route",
        "type": "line",
        "source": {
          "type": "geojson",
          "data": {
            "type": "Feature",
            "properties": {},
            "geometry": {
              "type": "LineString",
              // TODO: change below to repsonse from API
              "coordinates": routes.geometry.coordinates
            }
          }
        },
        "layout": {
          "line-join": "round",
          "line-cap": "round"
        },
        "paint": {
          "line-color": "#FFC700",
          "line-width": 6
        }
      })
      // display start point
      map.addLayer({
        id: 'start',
        type: 'circle',
        source: {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Point',
                coordinates: myStart
              }
            }
            ]
          }
        },
        paint: {
          'circle-radius': 10,
          'circle-color': '#13a513'
        }
      })
      // display end point
      map.addLayer({
        id: 'end',
        type: 'circle',
        source: {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Point',
                coordinates: myEnd
              }
            }
            ]
          }
        },
        paint: {
          'circle-radius': 10,
          'circle-color': '#ff0000'
        }
      })
      map.flyTo({
        center: myEnd,
        zoom: 18
      })
      setTimeout(() => {
        map.flyTo({
          center: myStart,
          zoom: 18
        })
      }, 1000)

      // TODO: add layer with current locations of others
      // show my current location

    })
  })

setInterval(() => {
  // process
  navigator.geolocation.getCurrentPosition((coordinates) => {
    // form GeoJson for current location
    let positionJson = {
      "geometry": {
        "type": "Point",
        "coordinates": [coordinates.coords.longitude, coordinates.coords.latitude]
      },
      "type": "Feature",
      "properties": {}
    }
    sendMessage(JSON.stringify([coordinates.coords.longitude, coordinates.coords.latitude]), raceId, userId)

    setCallback(message => {
      console.log(message)
      let racers = JSON.parse(message)
      Object.keys(racers).forEach((key) => {
        if (parseInt(key) != userId) {
          // create json for this racer
          let racerJson = {
            "geometry": {
              "type": "Point",
              "coordinates": [racers[key][0], racers[key][1]]
            },
            "type": "Feature",
            "properties": {}
          }
          // check if layer exists
          if (map.getLayer(`racer-${key}`)) {
            map.getSource(`racer-${key}`).setData(racerJson);
            console.log('racer layer is there')
          } else if (map.getLayer(`racer-${key}`) === undefined)
          {
            console.log('need to create new racer layer')
            map.loadImage("https://res.cloudinary.com/diciu4xpu/image/upload/v1551694060/chaserz/scooter.png", function (error, image) { //this is where we load the image file
              if (error) throw error;
              if (map.hasImage(`racer-${key}-marker`)) { map.removeImage(`racer-${key}-marker`)}
              map.addImage(`racer-${key}-marker`, image); //this is where we name the image file we are loading
              map.addLayer({
                'id': `racer-${key}`,
                'type': 'symbol',
                'source': {
                  type: 'geojson',
                  data: racerJson
                },
                'layout': {
                  "icon-image": `racer-${key}-marker`, // the name of image file we used above
                  "icon-allow-overlap": false,
                  "icon-size": 0.3 //this is a multiplier applied to the standard size. So if you want it half the size put ".5"
                }
              })
            })
          }
        }
      })
    })
    // show on the map
    // check if exists and clear it
    if (map.getLayer('user')) {
      map.getSource('user').setData(positionJson);
      console.log('layer user is there')
    }
    else if (map.getLayer(`user`) === undefined)
    {
      console.log('need to create new')
    //   console.log('layer user is new')
      map.loadImage("https://res.cloudinary.com/diciu4xpu/image/upload/v1551461746/chaserz/marker_v2.png", function (error, image) { //this is where we load the image file
        if (error) throw error;
      if (map.hasImage(`custom-marker`)) { map.removeImage(`custom-marker`) }
        map.addImage("custom-marker", image); //this is where we name the image file we are loading
        map.addLayer({
          'id': "user", //this is the name of the layer, it is what we will reference below
          'type': "symbol",
          'source': { //now we are adding the source to the layer more directly and cleanly
            type: "geojson",
            data: positionJson // CHANGE THIS TO REFLECT WHERE YOUR DATA IS COMING FROM
          },
          'layout': {
            "icon-image": "custom-marker", // the name of image file we used above
            "icon-allow-overlap": false,
            "icon-size": 0.2 //this is a multiplier applied to the standard size. So if you want it half the size put ".5"
          }
        })
      })
    }
  })
  // end of process
  // other racers

}, 100);