/* eslint-disable no-console */

/**
 * @module M/control/GeobusquedasControl
 */

import { EditorState } from "@codemirror/state"
import { EditorView, keymap, placeholder, lineNumbers, drawSelection, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars } from "@codemirror/view"
import { defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap } from "@codemirror/language"
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete"
import { defaultKeymap } from "@codemirror/commands"
import { json } from "@codemirror/lang-json"
import Choices from 'choices.js';
import GeobusquedasImplControl from 'impl/geobusquedascontrol';
import template from 'templates/geobusquedas';
import templateLoading from 'templates/loading';
import templateError from 'templates/error';

export default class GeobusquedasControl extends M.Control {
  /**
   * @classdesc
   * Main constructor of the class. Creates a PluginControl
   * control
   *
   * @constructor
   * @extends {M.Control}
   * @api stable
   */
  constructor(config) {
    // 1. checks if the implementation can create PluginControl
    if (M.utils.isUndefined(GeobusquedasImplControl)) {
      M.exception('La implementación usada no puede crear controles GeobusquedasControl');
    }
    // 2. implementation of this control
    const impl = new GeobusquedasImplControl();
    super(impl, 'Geobusquedas');

    M.proxy(false);
    this._my_headers = new Headers
    let username = 'factorylab'
    let password = 'kibanaLab123'
    // let username = 'elastic';
    // let password = 'secret'
    this._my_headers.set('Authorization', 'Basic ' + btoa(username + ":" + password));
    this._my_headers.set('Content-Type', 'application/json; charset=utf-8')

    //Número maximo de documentos devueltos por elastic
    // this.MAX_QUERY_SIZE = 60000;
    this.MAX_QUERY_SIZE = 10000;
    this.IndexsListoptions = new Array();
    this.config_ = config;
    this.activePanel = 1;
    this.fieldFilterList = new Array();
    this.geo_distance_filter = null;
    this.SelectOptionsSpatialFilter = [
      {
        value: 'Seleccione un filtro espacial',
        label: 'Seleccione un filtro espacial',
        selected: true,
        disabled: true,
      },
      {
        value: 'distance',
        label: 'Distancia',
        selected: false,
        disabled: false,
      }, {
        value: 'boundingBox',
        label: 'Extensión',
        selected: false,
        disabled: false,
      }
    ]


    // Se sobreescribe el estilo por defecto de choropleth
    M.style.Choropleth.DEFAULT_STYLE = function (c) {
      return new M.style.Generic({
        point: {
          fill: {
            color: c,
            opacity: 1,
          },
          stroke: {
            color: '#6c6c6c',
            width: 0.3,
          },
          radius: 5,
        },
        line: {
          stroke: {
            color: c,
            width: 0.3,
          },
        },
        polygon: {
          fill: {
            color: c,
            opacity: 1,
          },
          stroke: {
            color: '#6c6c6c',
            width: 0.3,
          },
        },
      });
    };

    //Configuracion de CodeMirror
    this.startState_ = EditorState.create({
      doc: "{}",
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        foldGutter(),
        drawSelection(),
        json(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightActiveLine(),
        placeholder('{}'),
        keymap.of([
          closeBracketsKeymap,
          defaultKeymap,
          foldKeymap,
          completionKeymap
        ])]
    })
  }

  /**
   * This function creates the view
   *
   * @public
   * @function
   * @param {M.Map} map to add the control
   * @api stable
   */
  createView(map) {
    return new Promise((success) => {
      this.getIndexs().then(() => {
        this.templateVars_ = { vars: { title: this.config_.title } };
        const html = M.template.compileSync(template, this.templateVars_);
        this.element = html;
        this.addEvents(html);
        success(html)
      });
    });
  }

  /**
   * This function is called on the control activation
   *
   * @public
   * @function
   * @api stable
   */
  activate() {
    // calls super to manage de/activation
    super.activate();
  }
  /**
   * This function is called on the control deactivation
   *
   * @public
   * @function
   * @api stable
   */
  deactivate() {
    // calls super to manage de/activation
    super.deactivate();
  }
  /**
   * This function gets activation button
   *
   * @public
   * @function
   * @param {HTML} html of control
   * @api stable
   */
  getActivationButton(html) {
    return html.querySelector('.m-geobusquedas button');
  }

  /**
   * This function compares controls
   *
   * @public
   * @function
   * @param {M.Control} control to compare
   * @api stable
   */
  equals(control) {
    return control instanceof GeobusquedasControl;
  }

  // Add your own functions

  addEvents(html) {
    /******************************/
    /* SE ACCEDE A LOS SELECTORES */
    /******************************/
    /* pestañas del panel */
    this.panelTab1El = html.querySelectorAll('#tab1')[0];
    this.panelTab2El = html.querySelectorAll('#tab2')[0];
    /* contenedores de cada una de las pestañas*/
    this.panelContentTab1EL = html.querySelectorAll('#content-tab1')[0];
    this.panelContentTab2EL = html.querySelectorAll('#content-tab2')[0];
    /* contenido del contenedor de la pestaña 1 */
    this.selectIndexTab1EL = html.querySelectorAll('select#selectIndexTab1')[0];
    this.selectFieldsTab1EL = html.querySelectorAll('select#selectFields')[0];
    /* activadores de filtros*/
    this.checkboxFiltersEL = html.querySelectorAll('input#checkboxFilters')[0];
    this.checkboxSpatialEL = html.querySelectorAll('input#checkboxSpatial')[0];
    this.checkboxStylesEL = html.querySelectorAll('input#checkboxStyles')[0];
    /* filtro tematico de campos */
    this.selectFieldsFiltersTab1EL = html.querySelectorAll('select#selectFieldsFilters')[0];
    this.tematicFilterEL = html.querySelectorAll('i#tematic-filter')[0];
    this.filtersOptionsEL = html.querySelectorAll('form#filters-options')[0];
    this.selectSpatialFiltersTab1EL = html.querySelectorAll('select#selectSpatialFilters')[0];
    /* filtro espacial geométrico*/
    this.spatialFilterEL = html.querySelectorAll('i#spatial-filter')[0];
    this.checkboxGeomFilterEL = html.querySelectorAll('input#checkboxGeomFilter')[0];
    this.sliderEL = html.querySelectorAll('span.slider,span.round')[0];
    this.distanceEL = html.querySelectorAll('input#distance')[0];
    this.distanceOutputEL = html.querySelectorAll('output#distance_value')[0];
    this.coordenadaXEL = html.querySelectorAll('input#coordenada_x')[0];
    this.coordenadaYEL = html.querySelectorAll('input#coordenada_y')[0];
    /* filtros estilos avanzados*/
    this.AdvancedStyleEL = html.querySelectorAll('i#advanced-styles')[0];
    this.selectAdvancedStylesFieldTab1EL = html.querySelectorAll('select#selectAdvancedStylesField')[0];
    this.selectClasificationMethodTab1EL = html.querySelectorAll('select#selectClasificationMethod')[0];
    /* contenido del contenedor de la pestaña 2 */
    this.selectIndexTab2EL = html.querySelectorAll('select#selectIndexTab2')[0];
    this.selectorEditorCodeMirrorTab2EL = html.querySelectorAll('div#editorCodeMirror')[0];
    /* botones cargar borrar*/
    this.loadButtonEL = html.querySelectorAll('button#loadButton')[0];
    this.clearButtonEL = html.querySelectorAll('button#clearButton')[0];
    /***************************************/
    /* SE CREAN Y CONFIGURAR LOS CHOICE.JS */
    /***************************************/
    this.choicesSelectIndexTab1EL = new Choices(this.selectIndexTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un indice', placeholder: true, searchPlaceholderValue: 'Seleccione un indice', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true });
    this.choicesSelectFieldsTab1EL = new Choices(this.selectFieldsTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un campo', placeholder: true, searchPlaceholderValue: 'Seleccione un campo', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: true, });
    this.choicesSelectFieldsFiltersTab1EL = new Choices(this.selectFieldsFiltersTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un campo para filtrar', placeholder: true, searchPlaceholderValue: 'Seleccione un campo', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: true, });
    this.choicesSelectSpatialFiltersTab1EL = new Choices(this.selectSpatialFiltersTab1EL, { choices: this.SelectOptionsSpatialFilter, allowHTML: true, placeholderValue: 'Seleccione filtro espacial', placeholder: true, searchPlaceholderValue: 'Seleccione filtro espacial', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: false, });
    this.choicesSelectAdvancedStylesFieldTab1EL = new Choices(this.selectAdvancedStylesFieldTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un campo', placeholder: true, searchPlaceholderValue: 'Seleccione un campo', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: false, });
    this.choicesSelectClasificationMethodTab1EL = new Choices(this.selectClasificationMethodTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un método', placeholder: true, searchPlaceholderValue: 'Seleccione un método', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: false, shouldSortItems: false, removeItems: true, removeItemButton: false, });
    this.choicesSelectorIndicesTab2EL = new Choices(this.selectIndexTab2EL, { allowHTML: true, placeholderValue: 'Seleccione un indice', placeholder: true, searchPlaceholderValue: 'Seleccione un indice', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true });
    /***********************************************/
    /* INICIALIZAMOS EL CHOICE DE CAMPOS A DISABLE */
    /***********************************************/
    this.choicesSelectFieldsTab1EL.disable();
    this.choicesSelectFieldsFiltersTab1EL.disable();
    this.choicesSelectSpatialFiltersTab1EL.disable();
    this.choicesSelectAdvancedStylesFieldTab1EL.disable()
    this.choicesSelectClasificationMethodTab1EL.disable();
    /*******************************/
    /* CARGAMOS EDITOR CODEMIRROR  */
    /*******************************/
    this.editor = new EditorView({
      state: this.startState_,
      parent: this.selectorEditorCodeMirrorTab2EL,
    })
    /************************/
    /* CAPTURAMOS   EVENTOS */
    /************************/
    /* Eventos al hacer click en los tab del panel */
    this.panelTab1El.addEventListener('click', () => {
      this.activePanel = 1;
      this.panelTab1El.classList.add('actived');
      this.panelTab2El.classList.remove('actived');
      this.panelContentTab2EL.style.display = 'none';
      this.panelContentTab1EL.style.display = 'block';
    })
    this.panelTab2El.addEventListener('click', () => {
      this.activePanel = 2;
      this.panelTab2El.classList.add('actived');
      this.panelTab1El.classList.remove('actived');
      this.panelContentTab1EL.style.display = 'none';
      this.panelContentTab2EL.style.display = 'block';
    })
    /* evento al cambiar el selector selectIndexTab1EL */
    this.selectIndexTab1EL.addEventListener('change', () => {
      let indice = this.choicesSelectIndexTab1EL.getValue(true);
      this.getFields(indice);
      this.removeAllChildNodes(this.filtersOptionsEL);
    })
    /* evento al cambiar el selector selectFieldsTab1EL */
    this.selectFieldsTab1EL.addEventListener('change', () => {
      if (this.choicesSelectFieldsTab1EL.getValue(true).length >= 1) {
        this.choicesSelectFieldsFiltersTab1EL.enable()
        this.choicesSelectClasificationMethodTab1EL.enable();
        this.choicesSelectClasificationMethodTab1EL.setChoiceByValue('Selecciona un metodo de clasificación');
        this.choicesSelectSpatialFiltersTab1EL.enable();
        this.createSelectOptionStyles();
        this.sliderEL.classList.remove('disabled');
      } else if (this.choicesSelectFieldsTab1EL.getValue(true).length == 0) {
        this.choicesSelectFieldsFiltersTab1EL.disable();
        this.choicesSelectClasificationMethodTab1EL.removeActiveItems();
        this.choicesSelectClasificationMethodTab1EL.disable();
        this.choicesSelectFieldsFiltersTab1EL.removeActiveItems();
        this.removeAllChildNodes(this.filtersOptionsEL);
        this.createSelectOptionStyles();
        this.choicesSelectAdvancedStylesFieldTab1EL.disable();
        this.disableInputsStyles();
        this.cleanSpatialFilters();
      }
      this.loadButtonEL.disabled = false;
      this.clearButtonEL.disabled = false;
    })

    /* evento al cambiar el selector selectFieldsFiltersTab1EL */
    this.selectFieldsFiltersTab1EL.addEventListener('change', () => {
      this.removeAllChildNodes(this.filtersOptionsEL);
      if (this.choicesSelectFieldsFiltersTab1EL.getValue(true).length > 0) {
        this.createInputFilters(this.choicesSelectFieldsFiltersTab1EL.getValue(true));
      }
    })

    this.selectClasificationMethodTab1EL.addEventListener('change', () => {
      switch (this.choicesSelectClasificationMethodTab1EL.getValue(true)) {
        case 'UNIQUE_VALUES':
          html.querySelector('div#options-classication-methods').classList.add('display-none')
          break;
        default:
          html.querySelector('div#options-classication-methods').classList.remove('display-none')
          break;
      }
    })
    /* evento al cambiar el selector de filtro espacial */
    this.selectSpatialFiltersTab1EL.addEventListener('change', () => {
      let selected = this.choicesSelectSpatialFiltersTab1EL.getValue(true)
      if (selected == 'distance') {
        document.getElementById('distance').classList.toggle('display-none');
        document.getElementById('boundingBox').classList.add('display-none');
        this.map_.getImpl().map_.un('moveend', this.onMoveEnd)
        document.getElementById('min_x').value = '';
        document.getElementById('min_y').value = '';
        document.getElementById('max_x').value = '';
        document.getElementById('max_y').value = '';
      } else if (selected == 'boundingBox') {
        document.getElementById('boundingBox').classList.toggle('display-none');
        document.getElementById('distance').classList.add('display-none');
        document.getElementById('min_x').value = this.map_.getBbox()['x']['min'].toFixed(2)
        document.getElementById('min_y').value = this.map_.getBbox()['y']['min'].toFixed(2)
        document.getElementById('max_x').value = this.map_.getBbox()['x']['max'].toFixed(2)
        document.getElementById('max_y').value = this.map_.getBbox()['y']['max'].toFixed(2)
        this.map_.getImpl().map_.on('moveend', this.onMoveEnd)
      }
    })
    /* eventos al hacer click en los labels de cada uno de los tipos de opcions  Filtro Campos, Filtro Geométrico , Estilos Avanzados*/
    this.tematicFilterEL.addEventListener('click', (e) => {
      this.showHide(e)
    });
    this.spatialFilterEL.addEventListener('click', (e) => {
      this.showHide(e)
    });
    this.AdvancedStyleEL.addEventListener('click', (e) => {
      this.showHide(e)
    });

    this.checkboxGeomFilterEL.addEventListener('change', () => {
      if (this.checkboxGeomFilterEL.checked) {
        document.getElementById(this.map_.impl_.map_.values_.target).style.cursor = "crosshair";
        this.map_.on(M.evt.CLICK, this.activeClick())
      } else if (!this.checkboxGeomFilterEL.checked) {
        document.getElementById(this.map_.impl_.map_.values_.target).style.cursor = "alias";
        this.map_.un(M.evt.CLICK, this.activeClick())
      }
    });

    this.selectIndexTab2EL.addEventListener('change', () => {
      this.loadButtonEL.disabled = false;
      this.clearButtonEL.disabled = false;
    });
    this.loadButtonEL.addEventListener('click', () => {
      this.search();
    })
    this.clearButtonEL.addEventListener('click', () => {
      this.my_request = {
        "query": {
          "bool": {
          }
        },
        "_source": {
          "includes": []
        },
        "size": this.MAX_QUERY_SIZE,
      }
      document.getElementById(this.map_.impl_.map_.values_.target).style.cursor = "alias";
      this.cleanIndexs();
      this.cleanFields();
      this.cleanFieldsFilters();
      this.cleanSpatialFilters();
      this.cleanStyles();
      /* RESETEAMOS LOS VALORES DEL EDITOR */
      this.editor.setState(this.startState_);
      /* DESACTIVAMOS BOTONES CARGA Y BORRADO*/
      this.loadButtonEL.disabled = true;
      this.clearButtonEL.disabled = true;
      /* BORRADO DE OVERLAY LAYER*/
      this.removeOverlayLayers();
    })
  }

  /* Obtenemos el listado de indices */
  getIndexs() {
    let my_option = {
      value: 'Selecciona un indice',
      label: 'Selecciona un indice',
      selected: true,
      disabled: true,
    }
    this.IndexsListoptions.push(my_option)
    fetch(this.config_.url + '/_cat/indices?format=json', { method: 'GET', headers: this._my_headers }).then(res => res.json()
    ).then(res => {
      let responseIndexList = res;
      responseIndexList.forEach(element => {
        let indexName = element['index']
        if (!indexName.includes('.')) {
          let my_option = {
            value: indexName,
            label: indexName,
            selected: false,
            disabled: false,
          }
          this.IndexsListoptions.push(my_option)
        }
      });

      this.choicesSelectIndexTab1EL.setChoices(this.IndexsListoptions)
      this.choicesSelectorIndicesTab2EL.setChoices(this.IndexsListoptions)
    })
    // M.remote.get(this.config_.url + '/indices?format=json').then((response) => {
    //   let responseIndexList = JSON.parse(response.text);
    //   responseIndexList.forEach(element => {
    //     let indexName = element['index']
    //     if (!indexName.includes('.')) {
    //       let my_option = {
    //         value: indexName,
    //         label: indexName,
    //         selected: false,
    //         disabled: false,
    //       }
    //       this.IndexsListoptions.push(my_option)
    //     }
    //   });

    //   this.choicesSelectIndexTab1EL.setChoices(this.IndexsListoptions)
    //   this.choicesSelectorIndicesTab2EL.setChoices(this.IndexsListoptions)
    // })
    return new Promise((success) => {
      success()
    })
  }
  /* obtenemos el listado de campos del indice seleccionado */
  getFields(index) {
    fetch(this.config_.url + '/' + index + '/_mapping?format=json', { method: 'GET', headers: this._my_headers }).then(res => res.json()
    ).then(res => {
      this.mappings =
        this.indexInfo = res;
      let fieldsObject = this.indexInfo[index]['mappings']['properties'];
      let fieldsArray = Object.keys(fieldsObject);
      let options = new Array();
      this.fieldsFilters = new Array();

      fieldsArray.forEach(field => {
        if (field != 'geom') {

          let filter = {
            field: field,
            type: fieldsObject[field]['type']
          }

          this.fieldsFilters.push(filter)

          let option = {
            value: field,
            label: field,
            selected: false,
            disabled: false,
          }
          options.push(option);
        }
      })
      /* reseteo los choices de campo seleccionado y campos para filtro */
      this.choicesSelectFieldsTab1EL.clearStore()
      this.choicesSelectFieldsFiltersTab1EL.clearStore()
      this.choicesSelectFieldsTab1EL.setChoices(options, 'value', 'label', true);
      this.choicesSelectFieldsFiltersTab1EL.setChoices(options, 'value', 'label', true);
      this.choicesSelectFieldsTab1EL.enable();
      this.choicesSelectFieldsFiltersTab1EL.disable()

    })
    // M.remote.get(this.config_.url + '/' + index + '/fields').then((response) => {
    //   this.mappings =
    //   this.indexInfo = JSON.parse(response.text);
    //   let fieldsObject = this.indexInfo[index]['mappings']['properties'];
    //   let fieldsArray = Object.keys(fieldsObject);
    //   let options = new Array();
    //   this.fieldsFilters = new Array();

    //   fieldsArray.forEach(field => {
    //     if (field != 'geom') {

    //       let filter = {
    //         field: field,
    //         type: fieldsObject[field]['type']
    //       }

    //       this.fieldsFilters.push(filter)

    //       let option = {
    //         value: field,
    //         label: field,
    //         selected: false,
    //         disabled: false,
    //       }
    //       options.push(option);
    //     }
    //   })
    //   /* reseteo los choices de campo seleccionado y campos para filtro */
    //   this.choicesSelectFieldsTab1EL.clearStore()
    //   this.choicesSelectFieldsFiltersTab1EL.clearStore()
    //   this.choicesSelectFieldsTab1EL.setChoices(options, 'value', 'label', true);
    //   this.choicesSelectFieldsFiltersTab1EL.setChoices(options, 'value', 'label', true);
    //   this.choicesSelectFieldsTab1EL.enable();
    //   this.choicesSelectFieldsFiltersTab1EL.disable()
    // })
  }

  search() {
    this.my_request = {
      "query": {
        "bool": {
        }
      },
      "_source": {
        "includes": []
      },
      "size": this.MAX_QUERY_SIZE,
    }

    let indice
    let campos = this.choicesSelectFieldsTab1EL.getValue(true);
    //añadimos el campo geom por defecto
    campos.push('geom');
    this.my_request = this.buildQuery(campos)
    switch (this.activePanel) {
      case 1:
        indice = this.choicesSelectIndexTab1EL.getValue(true);
        this.editor.dispatch({ changes: { from: 0, to: this.editor.state.doc.length, insert: JSON.stringify(this.my_request, null, 2) } });
        break;
      case 2:
        indice = this.choicesSelectorIndicesTab2EL.getValue(true);
        this.my_request = JSON.parse(this.editor.state.doc.toString())
        break;
    }
    let capaGeoJSON
    // let url = this.config_.url + '/' + indice + '/search?'
    let url = this.config_.url + '/' + indice + '/_search?'
    let my_vars = {
      index: indice,
      fields: this.my_request['_source']['includes'],
    }
    if (this.my_request['query']['bool'].hasOwnProperty('filter')) {
      if (this.my_request['query']['bool']['filter'].hasOwnProperty('geo_distance')) {
        my_vars['spatial'] = { radio: this.my_request['query']['bool']['filter']['geo_distance']['distance'], coor_y: this.coordenadaYEL.value, coor_x: this.coordenadaXEL.value }
      }
    }
    if (this.my_request['query']['bool'].hasOwnProperty('must')) {
      let filters = new Array()
      this.my_request['query']['bool']['must'].forEach(element => {
        if (element.hasOwnProperty('range')) {
          let keys = Object.keys(element['range'])
          keys.forEach(key => {
            let my_filter = {
              field: key,
              value: this.parseInverseOperators(Object.keys(element['range'][key])[0]) + ' ' + element['range'][key][Object.keys(element['range'][key])[0]]
            }
            filters.push(my_filter)
          });

        } else if (element.hasOwnProperty('term')) {
          let key = Object.keys(element['term'])[0]
          let values = element['term'][key]
          let my_filter = {
            field: key,
            value: values.toString()
          }
          filters.push(my_filter)

        } else if (element.hasOwnProperty('terms')) {
          let key = Object.keys(element['terms'])[0]
          let values = element['terms'][key]
          let my_filter = {
            field: key,
            value: values.toString()
          }
          filters.push(my_filter)
        }
      });
      my_vars['filters'] = filters
    }

    this.templateVarsQuery = {
      vars: my_vars
    }
    let htmlLoading = M.template.compileSync(templateLoading, this.templateVarsQuery);
    M.dialog.info(htmlLoading.outerHTML, 'Procesando Consulta');
    document.querySelector('div.m-button > button').style.display = 'none';
    let okButton = document.querySelector('div.m-button > button');
    console.time('carga de  datos');

    fetch(url, { method: 'POST', headers: this._my_headers, body: JSON.stringify(this.my_request)}).then(res => res.json()
    ).then(res => {
      this.removeOverlayLayers();
      let Arrayfeatures = new Array()
      let response = res
      let results = response['hits']['hits']
      if (results.length != 0) {
        results.forEach(element => {

          let miFeature = new M.Feature(element['_id'], {
            "type": "Feature",
            "id": "element['_id']",
            "geometry": element['_source']['geom'],
            "geometry_name": "geometry",
          });

          let fields = Object.keys(element['_source'])
          fields.forEach(field => {
            if (field != 'geom') {
              miFeature.setAttribute(field, element['_source'][field])
            }
          });
          Arrayfeatures.push(miFeature.getGeoJSON())
        });

        capaGeoJSON = new M.layer.GeoJSON({
          source: {
            "crs": { "properties": { "name": "EPSG:4326" }, "type": "name" },
            "features": Arrayfeatures,
            "type": "FeatureCollection"
          },
          name: indice
        });

        if (this.checkboxStylesEL.checked) {
          let my_style
          if (this.choicesSelectClasificationMethodTab1EL.getValue(true) != 'UNIQUE_VALUES') {
            my_style = this.createStyle(document.getElementById("firstColor").value, document.getElementById("lastColor").value, this.choicesSelectClasificationMethodTab1EL.getValue(true), document.getElementById("breaks").value);
          } else {
            my_style = new M.style.Category(this.choicesSelectAdvancedStylesFieldTab1EL.getValue(true));
          }
          capaGeoJSON.setStyle(my_style)
          this.map_.addLayers(capaGeoJSON);
        } else {
          let field = this.choicesSelectFieldsTab1EL.getValue(true);
          let my_style = this.createDefaultFieldStyle(field[0], this.indexInfo[indice]['mappings']['_meta']['styles'][field[0]])
          capaGeoJSON.setStyle(my_style)
          this.map_.addLayers(capaGeoJSON)
        }
        capaGeoJSON.on(M.evt.LOAD, () => {
          okButton.click();
          console.timeEnd('carga de  datos');
        })
      }
      else {
        let htmlError = M.template.compileSync(templateError, this.templateVarsQuery);
        M.dialog.info(htmlError.outerHTML, 'No se han Encontrado Resultados');
      }

    })
    // M.remote.post(url, this.my_request).then((res) => {
    //   this.removeOverlayLayers();
    //   let Arrayfeatures = new Array()
    //   let response = JSON.parse(res.text)
    //   let results = response['hits']['hits']
    //   if (results.length != 0) {
    //     results.forEach(element => {

    //       let miFeature = new M.Feature(element['_id'], {
    //         "type": "Feature",
    //         "id": "element['_id']",
    //         "geometry": element['_source']['geom'],
    //         "geometry_name": "geometry",
    //       });

    //       let fields = Object.keys(element['_source'])
    //       fields.forEach(field => {
    //         if (field != 'geom') {
    //           miFeature.setAttribute(field, element['_source'][field])
    //         }
    //       });
    //       Arrayfeatures.push(miFeature.getGeoJSON())
    //     });

    //     capaGeoJSON = new M.layer.GeoJSON({
    //       source: {
    //         "crs": { "properties": { "name": "EPSG:4326" }, "type": "name" },
    //         "features": Arrayfeatures,
    //         "type": "FeatureCollection"
    //       },
    //       name: indice
    //     });

    //     if (this.checkboxStylesEL.checked) {
    //       let my_style
    //       if (this.choicesSelectClasificationMethodTab1EL.getValue(true) != 'UNIQUE_VALUES') {
    //         my_style = this.createStyle(document.getElementById("firstColor").value, document.getElementById("lastColor").value, this.choicesSelectClasificationMethodTab1EL.getValue(true), document.getElementById("breaks").value);
    //       } else {
    //         my_style = new M.style.Category(this.choicesSelectAdvancedStylesFieldTab1EL.getValue(true));
    //       }
    //       capaGeoJSON.setStyle(my_style)
    //       this.map_.addLayers(capaGeoJSON);
    //     } else {
    //       let field = this.choicesSelectFieldsTab1EL.getValue(true);
    //       let my_style = this.createDefaultFieldStyle(field[0], this.indexInfo[indice]['mappings']['_meta']['styles'][field[0]])
    //       capaGeoJSON.setStyle(my_style)
    //       this.map_.addLayers(capaGeoJSON)
    //     }
    //     capaGeoJSON.on(M.evt.LOAD, () => {
    //       okButton.click();
    //       console.timeEnd('carga de  datos');
    //     })
    //   }
    //   else {
    //     let htmlError = M.template.compileSync(templateError, this.templateVarsQuery);
    //     M.dialog.info(htmlError.outerHTML, 'No se han Encontrado Resultados');
    //   }
    // })
  }

  createInputFilters(arrayFields) {
    arrayFields.forEach(field => {
      let find = false;
      do {
        this.fieldsFilters.forEach(element => {
          if (element['field'] == field) {
            find = true;
            this.createInputFiltersDOMElement(element['field'], element['type']);
            find = true;
          }
        });
      } while (!find);
    });
  }

  /* metodo para obtener los options para rellenar el selector de Campos de representación avanzada*/
  createSelectOptionStyles() {
    let options = new Array()
    let option = null;
    let defaultOption = {
      value: 'Selecione un campo',
      label: 'Selecione un campo',
      selected: true,
      disabled: true,
    }
    let selectFields = this.choicesSelectFieldsTab1EL.getValue(true);
    if (selectFields.length == 1) {
      selectFields.forEach(element => {
        option = {
          value: element,
          label: element,
          selected: true,
          disabled: false,
        }
        options.push(option);
      })
    } else if (selectFields.length > 1) {
      options.push(defaultOption);
      selectFields.forEach(element => {
        option = {
          value: element,
          label: element,
          selected: false,
          disabled: false,
        }
        options.push(option);
      });
    } else if (selectFields.length == 0) {
      options.push(defaultOption);

    }

    this.choicesSelectAdvancedStylesFieldTab1EL.clearStore();
    this.choicesSelectAdvancedStylesFieldTab1EL.setChoices(options);
    this.choicesSelectAdvancedStylesFieldTab1EL.enable();
    this.enableInputsStyles()
  }

  createInputFiltersDOMElement(field, type) {
    const comparacionNumeros = ['igual que', 'menor que', 'menor o igual que', 'mayor que', 'mayor o igual que'];
    let my_comparacionNumeros = document.createElement('select');
    my_comparacionNumeros.setAttribute('class', 'comparacionNumeros')

    comparacionNumeros.forEach(element => {
      let option = document.createElement('option');
      option.setAttribute('value', element);
      option.text = element;
      my_comparacionNumeros.appendChild(option)
    });

    // construimos elemento div
    let my_div = document.createElement('div');
    my_div.setAttribute('id', field);
    my_div.setAttribute('name', field);
    my_div.setAttribute('class', 'opciones-busqueda');
    // construimos elemento label
    let my_label = document.createElement("label");
    my_label.setAttribute('class', 'label-opciones-busqueda');
    my_label.setAttribute('for', 'filtro_' + field);
    my_label.setAttribute('id', 'label_filtro_' + field);
    my_label.innerHTML = field;
    let my_input;
    let my_select;
    switch (type) {
      case 'long':
        my_div.appendChild(my_label);
        my_comparacionNumeros.setAttribute('id', 'comparacion_filtro_' + field);
        my_div.appendChild(my_comparacionNumeros)
        my_input = document.createElement('input');
        my_input.setAttribute('id', 'filtro_' + field);
        my_input.setAttribute('name', 'filtro_' + field);
        my_input.setAttribute('type', 'number');
        my_input.setAttribute('class', 'inputFilters');
        my_input.setAttribute('step', '1');
        my_input.setAttribute('pattern', '[0-9]');
        my_div.appendChild(my_input);
        this.getBasictStatsFields(field, my_input)
        break;
      case 'double':
        my_div.appendChild(my_label);
        my_comparacionNumeros.setAttribute('id', 'comparacion_filtro_' + field);
        my_div.appendChild(my_comparacionNumeros);
        my_input = document.createElement('input');
        my_input.setAttribute('id', 'filtro_' + field);
        my_input.setAttribute('name', 'filtro_' + field);
        my_input.setAttribute('type', 'number');
        my_input.setAttribute('pattern', '[0-9]');
        my_input.setAttribute('step', '.01');
        my_input.setAttribute('class', 'inputFilters');
        my_div.appendChild(my_input);
        this.getBasictStatsFields(field, my_input)
        break;
      case 'keyword':
        my_div.appendChild(my_label);
        my_select = document.createElement('select');
        my_select.setAttribute('id', 'filtro_' + field);
        my_select.setAttribute('name', 'filtro_' + field);
        my_select.setAttribute('multiple', true);
        my_div.appendChild(my_select);
        this.getDistinctValuesinField(field, my_select)
        break;
      case 'text':
        my_div.appendChild(my_label);
        my_input = document.createElement('input');
        my_input.setAttribute('id', 'filtro_' + field);
        my_input.setAttribute('name', 'filtro_' + field);
        my_input.setAttribute('type', 'text');
        my_input.setAttribute('class', 'inputFilters');
        break;
      default:
        break;
    }
    this.filtersOptionsEL.appendChild(my_div);
  }

  removeAllChildNodes(parent) {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
  }

  /* metodo para obtener valores distintos campos */
  getDistinctValuesinField(my_field, my_select) {
    let indice = this.choicesSelectIndexTab1EL.getValue(true);
    let request = {
      "size": 0,
      "aggs": {
        "my-agg-name": {
          "terms": {
            "field": my_field,
            "order": { "_key": "asc" },
            "size": 10000
          }
        }
      }
    }

    let my_options = new Array();
    // let url = this.config_.url + '/' + indice + '/search?'
    let url = this.config_.url + '/' + indice + '/_search?'

    fetch(url, { method: 'POST', headers: this._my_headers, body: JSON.stringify(request)}).then(res => res.json()
    ).then(res => {
      let response = res;
      let buckets = response['aggregations']['my-agg-name']['buckets'];

      buckets.forEach(bucket => {
        my_options.push({
          value: bucket['key'],
          label: bucket['key'],
          selected: false,
          disabled: false
        });
      });

      let choiceSelectEL = new Choices(my_select, { allowHTML: true, choices: my_options, placeholderValue: 'Seleccione un valor', placeholder: true, searchPlaceholderValue: 'Seleccione un valor', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: true, });
      my_select.addEventListener('change', () => {
        this.fieldFilterList = new Array();
        this.checkfieldFilterList(my_field)
        let filter = {
          field: my_field,
          type: 'text',
          value: choiceSelectEL.getValue(true)
        }
        this.fieldFilterList.push(filter);
      })

    })
    // M.remote.post(url, request).then((res) => {

    //   let response = JSON.parse(res.text);
    //   let buckets = response['aggregations']['my-agg-name']['buckets'];

    //   buckets.forEach(bucket => {
    //     my_options.push({
    //       value: bucket['key'],
    //       label: bucket['key'],
    //       selected: false,
    //       disabled: false
    //     });
    //   });

    //   let choiceSelectEL = new Choices(my_select, { allowHTML: true, choices: my_options, placeholderValue: 'Seleccione un valor', placeholder: true, searchPlaceholderValue: 'Seleccione un valor', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: true, });
    //   my_select.addEventListener('change', () => {
    //     this.fieldFilterList = new Array();
    //     this.checkfieldFilterList(my_field)
    //     let filter = {
    //       field: my_field,
    //       type: 'text',
    //       value: choiceSelectEL.getValue(true)
    //     }
    //     this.fieldFilterList.push(filter);
    //   })
    // })
  }

  /* metodo para obtener estadisticas básicas */
  getBasictStatsFields(my_field, my_input) {
    let indice = this.choicesSelectIndexTab1EL.getValue(true);
    // let url = this.config_.url + '/' + indice + '/search?'
    let url = this.config_.url + '/' + indice + '/_search?'
    let request = {
      "size": 0,
      "aggs": {
        "fields_stats": {
          "stats": {
            "field": my_field
          }
        }
      }
    }

    fetch(url, { method: 'POST', headers: this._my_headers, body: JSON.stringify(request)}).then(res => res.json()
    ).then(res => {
      let response = JSON.parse(res);
      my_input.setAttribute('min', response['aggregations']['fields_stats']['min']);
      my_input.setAttribute('max', response['aggregations']['fields_stats']['max'])
      my_input.setAttribute('placeholder', 'introduce un valor');
      let myMinMaxlabel = document.createElement("label");
      myMinMaxlabel.setAttribute('id', 'rango_' + my_field);
      myMinMaxlabel.setAttribute('class', 'label_rango_valor');
      myMinMaxlabel.innerHTML = '* introduce un valor entre ' + response['aggregations']['fields_stats']['min'] + ' y ' + response['aggregations']['fields_stats']['max']
      let parentDiv = document.getElementById(my_field);
      parentDiv.appendChild(myMinMaxlabel)

    })
    // M.remote.post(url, request).then((res) => {
    //   let response = JSON.parse(res.text);
    //   my_input.setAttribute('min', response['aggregations']['fields_stats']['min']);
    //   my_input.setAttribute('max', response['aggregations']['fields_stats']['max'])
    //   my_input.setAttribute('placeholder', 'introduce un valor');
    //   let myMinMaxlabel = document.createElement("label");
    //   myMinMaxlabel.setAttribute('id', 'rango_' + my_field);
    //   myMinMaxlabel.setAttribute('class', 'label_rango_valor');
    //   myMinMaxlabel.innerHTML = '* introduce un valor entre ' + response['aggregations']['fields_stats']['min'] + ' y ' + response['aggregations']['fields_stats']['max']
    //   let parentDiv = document.getElementById(my_field);
    //   parentDiv.appendChild(myMinMaxlabel)
    // })
  }

  /* metodo para obtener estadisticas avanzadas */
  getAdvancedtStatsFields(my_field, my_input) {
    let indice = this.choicesSelectIndexTab1EL.getValue(true);
    // let url = this.config_.url + '/' + indice + '/search?'
    let url = this.config_.url + '/' + indice + '/_search?'
    let request = {
      "size": 0,
      "aggs": {
        "fields_stats": {
          "extended_stats": {
            "field": my_field,
            "missing": 0
          }
        }
      }
    }

    fetch(url, { method: 'POST', headers: this._my_headers, body: JSON.stringify(request)}).then(res => res.json()
    ).then(res => {
      let response = res;

      console.log(response)
     })

    // M.remote.post(url, request).then((res) => {
    //   let response = JSON.parse(res.text);
    //   console.log(response)
    // })
  }

  showHide(event) {
    event.currentTarget.classList.toggle('g-cartografia-mas2');
    event.currentTarget.classList.toggle('g-cartografia-menos2');
    let my_container_filter_element = document.getElementById(event.currentTarget.getAttribute('name') + '-container');
    if (event.currentTarget.classList.contains('g-cartografia-menos2')) {
      document.getElementById(my_container_filter_element.getAttribute('id')).style.display = 'block'
    } else {
      document.getElementById(my_container_filter_element.getAttribute('id')).style.display = 'none'
    }
  }

  createFilterQuery(filtersDOMElements) {
    filtersDOMElements.forEach(filterDom => {
      if (filterDom.nodeType != 3) {
        let field = filterDom.getAttribute('id');
        let filterDomChilds = filterDom.childNodes;
        filterDomChilds.forEach(element => {
          if (element.getAttribute('id') == 'filtro_' + field && element.getAttribute('type') == 'number' && element.value != '') {
            let operador = document.getElementById('comparacion_filtro_' + field);
            let filter = {
              field: field,
              type: 'number',
              operator: operador.value,
              value: element.value
            }
            this.checkfieldFilterList(field);
            this.fieldFilterList.push(filter)
          }
        });
      }
    });
  }

  buildQuery(campos) {
    /* añado los campos seleccionados a la query */
    this.my_request['_source']['includes'] = campos;
    /* si tengo filtro temático construyo query con bool must */
    if (this.checkboxFiltersEL.checked && this.filtersOptionsEL.hasChildNodes()) {
      let must = new Array()
      this.createFilterQuery(this.filtersOptionsEL.childNodes);
      this.fieldFilterList.forEach(element => {
        if (element['type'] == 'number' && element['operator'] != 'igual que') {
          let my_range = "{\"range\":{\"" + element['field'] + "\":{\"" + this.parseOperators(element['operator']) + "\":" + element['value'] + "}}}"
          must.push(JSON.parse(my_range))
        } else if (element['type'] == 'number' && element['operator'] == 'igual que') {
          let my_term = "{\"term\":{\"" + element['field'] + "\":" + element['value'] + "}}"
          must.push(JSON.parse(my_term))
        } else if (element['type'] == 'text' && element['value'].length > 1) {
          let my_values = ""
          element['value'].forEach(element => {
            my_values = my_values + "\"" + element + "\",";
          });
          let my_terms = "{\"terms\":{\"" + element['field'] + "\":[" + my_values + "]}}";
          must.push(JSON.parse(my_terms.replace(',]', ']')))
        } else if (element['type'] == 'text' && element['value'].length == 1) {
          let my_term = "{\"term\":{\"" + element['field'] + "\":\"" + element['value'] + "\"}}"
          must.push(JSON.parse(my_term))
        }
      });
      if (must.length > 0) {
        this.my_request['query']['bool']['must'] = must;
      }
    }
    /* si tengo filtro espacial añado al query el filtro espacial */
    if (this.checkboxSpatialEL.checked && this.choicesSelectSpatialFiltersTab1EL.getValue(true) == 'distance' && this.coordenadaXEL.value != '' && this.coordenadaYEL.value != '') {
      let coordinates = this.transformPoint([Number(this.coordenadaXEL.value), Number(this.coordenadaYEL.value)])
      this.geo_distance_filter = {
        "geo_distance": {
          "distance": this.distanceEL.value + 'km',
          "geom": {
            "lat": coordinates[1],
            "lon": coordinates[0]
          }
        }
      }
      this.my_request['query']['bool']['filter'] = this.geo_distance_filter
    } else if (this.checkboxSpatialEL.checked && this.choicesSelectSpatialFiltersTab1EL.getValue(true) == 'boundingBox') {
      this.geo_bounding_box_filter = {
        "geo_bounding_box": {
          "geom": this.createSpatialFilterBbox()
        }
      }
      this.my_request['query']['bool']['filter'] = this.geo_bounding_box_filter
    } else {
      delete this.my_request.filter
    }
    return this.my_request
  }

  parseOperators(operator) {
    let result
    switch (operator) {
      case 'mayor que':
        result = "gt"
        break;
      case 'mayor o igual que':
        result = "gte"
        break;
      case 'menor que':
        result = "lt"
        break;
      case 'menor o igual que':
        result = "lte"
        break;
      default:
        break;
    }
    return result
  }

  parseInverseOperators(operator) {
    let result
    switch (operator) {
      case 'gt':
        result = 'mayor que'
        break;
      case 'gte':
        result = 'mayor o igual que'
        break;
      case 'lt':
        result = 'menor que'
        break;
      case 'lte':
        result = 'menor o igual que'
        break;
      default:
        break;
    }
    return result
  }


  checkfieldFilterList(fieldName) {
    this.fieldFilterList = this.fieldFilterList.filter(element => element.field != fieldName);
  }

  removeOverlayLayers() {
    let layerList = this.map_.getLayers()
    layerList.forEach(layer => {
      if (layer instanceof M.layer.Vector && layer.name != '__draw__') {
        this.map_.removeLayers(layer)
      }
    });
  }

  activeClick() {
    this.map_.on(M.evt.CLICK, (e) => {
      if (this.checkboxGeomFilterEL.checked) {
        this.coordenadaXEL.value = e.coord[0].toFixed(2);
        this.coordenadaYEL.value = e.coord[1].toFixed(2);
      }
    })
  }

  onMoveEnd(evt) {
    const map = evt.map;
    const extent = map.getView().calculateExtent(map.getSize());
    document.getElementById('coordenada_x').value = null;
    document.getElementById('coordenada_y').value = null;
    document.getElementById('min_x').value = extent[0].toFixed(2)
    document.getElementById('min_y').value = extent[1].toFixed(2)
    document.getElementById('max_x').value = extent[2].toFixed(2)
    document.getElementById('max_y').value = extent[3].toFixed(2)
  }


  createSpatialFilterBbox() {
    let min_x = Number(document.getElementById('min_x').value);
    let min_y = Number(document.getElementById('min_y').value);
    let max_x = Number(document.getElementById('max_x').value);
    let max_y = Number(document.getElementById('max_y').value);
    let top_left = this.transformPoint([min_x, max_y]);
    let bottom_right = this.transformPoint([max_x, min_y])
    return {
      "top_left": {
        "lat": top_left[1],
        "lon": top_left[0]
      },
      "bottom_right": {
        "lat": bottom_right[1],
        "lon": bottom_right[0]
      }
    }
  }

  /* metodo para transformar geometrias puntuales del srs del mapa a 4326 */
  transformPoint(coord) {
    let miFeature = new M.Feature("featurePrueba001", {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: coord
      }
    });
    miFeature.getImpl().getOLFeature().getGeometry().transform(this.map_.getProjection().code, 'EPSG:4326');
    return miFeature.getGeometry().coordinates
  }

  /* se limpia el selector de indices */
  cleanIndexs() {
    this.choicesSelectIndexTab1EL.removeActiveItems();
    this.choicesSelectIndexTab1EL.setChoiceByValue('Selecciona un indice');
    this.choicesSelectorIndicesTab2EL.removeActiveItems();
    this.choicesSelectorIndicesTab2EL.setChoiceByValue('Selecciona un indice')
  }

  /* se limpia el selector de campos */
  cleanFields() {
    this.choicesSelectFieldsTab1EL.removeActiveItems();
    this.choicesSelectFieldsTab1EL.disable();
  }

  /* se limpia el selector de filtros de campos */
  cleanFieldsFilters() {
    this.choicesSelectFieldsFiltersTab1EL.removeActiveItems();
    this.choicesSelectFieldsFiltersTab1EL.disable();
    this.removeAllChildNodes(this.filtersOptionsEL);
    this.fieldFilterList = new Array();
  }

  /* se limpia el selector de filtro espacial */
  cleanSpatialFilters() {
    this.choicesSelectSpatialFiltersTab1EL.setChoiceByValue('Seleccione un filtro espacial')
    this.choicesSelectSpatialFiltersTab1EL.disable();
    this.disableSpatialFilterDistance();
    this.disableSpatialFilterBBox();
  }

  /* se limpia el selector de campos para simbologia */
  cleanStyles() {
    this.createSelectOptionStyles();
    this.choicesSelectAdvancedStylesFieldTab1EL.disable();
    this.choicesSelectClasificationMethodTab1EL.disable();
    this.disableInputsStyles()
  }

  /* se desactivan los input de simbología */
  disableInputsStyles() {
    if (!document.getElementById('options-classication-methods').classList.contains('display-none')) {
      document.getElementById('options-classication-methods').classList.add('display-none');
    }
    this.choicesSelectClasificationMethodTab1EL.setChoiceByValue('Selecciona un metodo de clasificación');
    document.getElementById('firstColor').disabled = true;
    document.getElementById('lastColor').disabled = true;
    document.getElementById('breaks').value = 5;
    document.getElementById('breaks').disabled = true;
  }

  /* se activan los input de simbología */
  enableInputsStyles() {
    document.getElementById('firstColor').disabled = false;
    document.getElementById('lastColor').disabled = false;
    document.getElementById('breaks').disabled = false;
  }

  /* se oculta el contendor del filtro espacial por distancia y se limpian sus inputs*/
  disableSpatialFilterDistance() {
    if (!document.getElementById('distance').classList.contains('display-none')) {
      document.getElementById('distance').classList.add('display-none');
    }
    this.distanceEL.value = 25;
    this.distanceOutputEL.value = '25Km';
    this.coordenadaXEL.disabled = true;
    this.coordenadaYEL.disabled = true;
    this.coordenadaXEL.value = null
    this.coordenadaYEL.value = null;
  }

  /* se oculta el contendor del filtro espacial por extensión y se limpian sus inputs*/
  disableSpatialFilterBBox() {
    if (!document.getElementById('boundingBox').classList.contains('display-none')) {
      document.getElementById('boundingBox').classList.add('display-none');
    }
    document.getElementById('min_x').value = null;
    document.getElementById('min_y').value = null;
    document.getElementById('max_x').value = null;
    document.getElementById('max_y').value = null;
  }

  createStyle(colorInicial, colorFinal, method, intervals) {
    let style
    switch (method) {
      case 'QUANTILE':
        style = new M.style.Choropleth(this.choicesSelectAdvancedStylesFieldTab1EL.getValue(true), [colorInicial, colorFinal], M.style.quantification.JENKS(intervals));
        break;
      case 'JENKS':
        style = new M.style.Choropleth(this.choicesSelectAdvancedStylesFieldTab1EL.getValue(true), [colorInicial, colorFinal], M.style.quantification.QUANTILE(intervals));
        break;
      default:
        break;
    }
    return style
  }

  createDefaultFieldStyle(field, styles) {
    let my_categoryStyles = {}
    let response
    if (styles) {
      switch (styles['type']) {
        case 'category':
          styles['values'].forEach(element => {
            my_categoryStyles[element.value] = new M.style.Generic({ polygon: { fill: { color: element.color }, stroke: { color: '#6c6c6c', width: 0.1 }, } });
          });
          response = new M.style.Category(field, my_categoryStyles);
          break;
        case 'ranges':
          console.log(styles['intervals'])
          response = new M.style.Choropleth(field, [styles['initcolor'], styles['finalcolor']], () => (styles['intervals']));
          /* hay que hablar con sigc para ver como podemos meter un valor por defecto para lo que no tiene de dato o es secreto estadístico */
          break
        default:
          response = new M.style.Category(field)
          break;
      }
    } else {
      response = new M.style.Category(field)
    }
    return response
  }
}