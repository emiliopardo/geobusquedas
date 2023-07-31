import Geobusquedas from 'facade/geobusquedas';

M.addProxyException("http://localhost");

const ortofoto2016_color = new M.layer.WMS({
  url: 'http://www.ideandalucia.es/wms/ortofoto2016?',
  name: 'ortofotografia_2016_rgb',
  legend: 'Ortofotografía Color 0,5 metros/pixel (Año 2016)',
  transparent: false,
  tiled: true
}, {
  styles: 'default'
})

ortofoto2016_color.setLegendURL('https://emiliopardo.github.io/integracion-plugins/visores/leyendas/ortofoto2016_color.png')

const CDAU_Base = new M.layer.WMS({
  url: 'https://www.callejerodeandalucia.es/servicios/base/wms?',
  name: 'CDAU_base',
  legend: 'Base Cartográfica Callejero Digital de Andalucía',
  transparent: false,
  tiled: true
})

CDAU_Base.setLegendURL('https://emiliopardo.github.io/integracion-plugins/visores/leyendas/cdau_base.png');

// definición layers wms  de overlay
const cdau_portales = new M.layer.WMS({
  url: 'https://www.callejerodeandalucia.es/servicios/cdau/wms?',
  name: 'v_portalpk',
  legend: 'v_portalpk',
  transparent: true,
  tiled: false
}, {
  styles: 'cdau:CDAU_Portal'
})

cdau_portales.displayInLayerSwitcher=false;

const cdau_viales = new M.layer.WMS({
  url: 'https://www.callejerodeandalucia.es/servicios/cdau/wms?',
  name: 'v_vial',
  legend: 'v_vial',
  transparent: true,
  tiled: false
}, {
  styles: 'cdau:CDAU_Vial'
})
cdau_viales.displayInLayerSwitcher=false;

const map = M.map({
  container: 'mapjs',
  layers: [ortofoto2016_color, CDAU_Base, cdau_viales, cdau_portales],
});

map.setBGColorContainer('white');
map.addControls(['scale', 'scaleline', 'mouse', 'panzoombar', 'layerswitcher']);


let configuracion = {
  config: {
    title: 'Test Elasticsearch',
    url: 'https://elasticlab.ieca.junta-andalucia.es'
  },
  options: {
    position: 'TL',
  }
}
const mp = new Geobusquedas(configuracion);

map.addPlugin(mp);
