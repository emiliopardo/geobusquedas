import Geobusquedas from 'facade/geobusquedas';

M.addProxyException("http://localhost");

const map = M.map({
  container: 'mapjs',
});

map.addControls(['scale', 'layerswitcher']);


var configuracion = {
  config:{
    title: 'Test',
    url: 'http://localhost/geobusquedas'
  },
  options:{
    position:'TL',
  }
}
const mp = new Geobusquedas(configuracion);

map.addPlugin(mp);
