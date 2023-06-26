import Geobusquedas from 'facade/geobusquedas';

M.addProxyException("http://localhost");

// const ortofoto2016_color = new M.layer.WMS({
//   url: 'http://www.ideandalucia.es/wms/ortofoto2016?',
//   name: 'ortofotografia_2016_rgb',
//   legend: 'Ortofotografía Color 0,5 metros/pixel (Año 2016)',
//   transparent: false,
//   tiled: true
// }, {
//   styles: 'default'
// })

const ortofoto2016_pancromatica = new M.layer.WMS({
  url: 'https://www.ideandalucia.es/wms/ortofoto2016?',
  name: 'ortofotografia_2016_pancromatico',
  legend: 'Ortofotografía Pancromática 0,5 metros/pixel (Año 2016)',
  transparent: false,
  tiled: true
}, {
  styles: 'default'
})


const map = M.map({
  container: 'mapjs',
  //layers: [ortofoto2016_color],
  layers: [ortofoto2016_pancromatica],
  // projection: "EPSG:4326*d",
});

map.setBGColorContainer('white');
map.addControls(['scale','scaleline','mouse','panzoombar', 'layerswitcher']);


var configuracion = {
  config:{
    title: 'Test Elasticsearch',
    url: 'http://localhost/geobusquedas'
  },
  options:{
    position:'TL',
  }
}
const mp = new Geobusquedas(configuracion);

map.addPlugin(mp);
