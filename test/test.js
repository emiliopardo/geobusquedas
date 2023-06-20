import Geobusquedas from 'facade/geobusquedas';

const map = M.map({
  container: 'mapjs',
});

const mp = new Geobusquedas();

map.addPlugin(mp);
