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
    //Número maximo de documentos devueltos por elastic
    this.MAX_QUERY_SIZE = 10000;
    this.IndexsListoptions = new Array();
    this.config_ = config;
    this.activePanel = 1;
    this.fieldFilterList = new Array();
    this.distance;
    this.lat;
    this.lon;
    this.geo_distance_filter;
    this.my_request = {
      "query": {
        "bool": {
          "must": [],
          "filter": []
        }
      },
      "_source": {
        "includes": []
      },
      "size": this.MAX_QUERY_SIZE,
    }


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

    this.estilo = new M.style.Generic({
      polygon: {
        fill: {
          color: 'green',
          opacity: 0.5,
        },
        stroke: {
          color: 'green',
          width: 1
        }
      }
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
    /* SE ACCEDE A LOS SELECTORES */
    this.panelTab1El = html.querySelectorAll('#tab1')[0];
    this.panelTab2El = html.querySelectorAll('#tab2')[0];
    this.panelContentTab1EL = html.querySelectorAll('#content-tab1')[0];
    this.panelContentTab2EL = html.querySelectorAll('#content-tab2')[0];
    this.selectorIndicesTab1EL = html.querySelectorAll('select#selectorIndices-tab1')[0];
    this.selectorIndicesTab2EL = html.querySelectorAll('select#selectorIndices-tab2')[0];
    this.selectorCamposTab1EL = html.querySelectorAll('select#selectorCampos')[0];
    this.selectorCamposFiltrosTab1EL = html.querySelectorAll('select#selectorCamposFiltros')[0];
    this.selectorEditorCodeMirrorTab2EL = html.querySelectorAll('div#editorCodeMirror')[0];
    this.loadButtonEL = html.querySelectorAll('button#loadButton')[0];
    this.clearButtonEL = html.querySelectorAll('button#clearButton')[0];
    this.filterFieldsEL = html.querySelectorAll('label#label-filters')[0];
    this.filterGeomEL = html.querySelectorAll('label#label-filter-geom')[0];
    this.filtersContainerEL = html.querySelectorAll('div#filter-container')[0];
    this.filterGeomContainerEL = html.querySelectorAll('div#filter-geom-container')[0];
    this.filtersOptionsEL = html.querySelectorAll('form#filters-options')[0];
    this.checkboxGeomFilterEL = html.querySelectorAll('input#checkboxGeomFilter')[0];
    this.sliderEL = html.querySelectorAll('span.slider,span.round')[0];
    this.distanceEL = html.querySelectorAll('input#distance')[0];
    this.distanceOutputEL = html.querySelectorAll('output#distance_value')[0];
    this.coordenadaXEL = html.querySelectorAll('input#coordenada_x')[0];
    this.coordenadaYEL = html.querySelectorAll('input#coordenada_y')[0];

    /* SE CREAN Y CONFIGURAR LOS CHOICE.JS*/
    this.choicesSelectorIndicesTab1EL = new Choices(this.selectorIndicesTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un indice', placeholder: true, searchPlaceholderValue: 'Seleccione un indice', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true });
    this.choicesSelectorCamposTab1EL = new Choices(this.selectorCamposTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un campo', placeholder: true, searchPlaceholderValue: 'Seleccione un campo', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: true, });
    this.choicesSelectorCamposFiltrosTab1EL = new Choices(this.selectorCamposFiltrosTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un campo para filtrar', placeholder: true, searchPlaceholderValue: 'Seleccione un campo', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: true, });
    this.choicesSelectorIndicesTab2EL = new Choices(this.selectorIndicesTab2EL, { allowHTML: true, placeholderValue: 'Seleccione un indice', placeholder: true, searchPlaceholderValue: 'Seleccione un indice', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true });

    /* INICIALIZAMOS EL CHOICE DE CAMPOS A DISABLE */
    this.choicesSelectorCamposTab1EL.disable();
    this.choicesSelectorCamposFiltrosTab1EL.disable();
    /* CARGAMOS EDITOR CODEMIRROR  */
    this.editor = new EditorView({
      state: this.startState_,
      parent: this.selectorEditorCodeMirrorTab2EL,
    })
    /* SE CREAN LOS EVENTOS */
    this.distanceEL.addEventListener('change', (e) => {
      this.distance = e.target.value;
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

    this.selectorIndicesTab1EL.addEventListener('change', () => {
      let indice = this.choicesSelectorIndicesTab1EL.getValue(true);
      this.getFields(indice);
    })
    this.selectorCamposTab1EL.addEventListener('change', () => {
      this.choicesSelectorCamposFiltrosTab1EL.enable();
      this.activeDistancePanel();
      if (this.choicesSelectorCamposTab1EL.getValue(true).length >= 1 & this.sliderEL.classList.contains('disabled')) {
        this.sliderEL.classList.remove('disabled');
      } else if (this.choicesSelectorCamposTab1EL.getValue(true).length == 0) {
        this.sliderEL.classList.add('disabled');
        this.checkboxGeomFilterEL.checked = false;
        document.getElementById(this.map_.impl_.map_.values_.target).style.cursor = "alias";
      }
      this.loadButtonEL.disabled = false;
      this.clearButtonEL.disabled = false;
    })

    this.selectorCamposFiltrosTab1EL.addEventListener('change', () => {
      this.removeAllChildNodes(this.filtersOptionsEL);
      this.createInputFilters(this.choicesSelectorCamposFiltrosTab1EL.getValue(true));
    })

    this.filterFieldsEL.addEventListener('click', () => { this.showHideFilters() });

    this.filterGeomEL.addEventListener('click', () => { this.showHideFilterGeom() });

    this.selectorIndicesTab2EL.addEventListener('change', () => {
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
            "must": [],
            "filter": []
          }
        },
        "_source": {
          "includes": []
        },
        "size": this.MAX_QUERY_SIZE,
      }
      document.getElementById(this.map_.impl_.map_.values_.target).style.cursor = "alias";
      this.cleanSpatialFilter();
      this.choicesSelectorIndicesTab1EL.destroy();
      this.choicesSelectorCamposTab1EL.destroy();
      this.choicesSelectorCamposFiltrosTab1EL.destroy();
      this.choicesSelectorIndicesTab1EL = new Choices(this.selectorIndicesTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un indice', placeholder: true, searchPlaceholderValue: 'Seleccione un indice', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true });
      this.choicesSelectorIndicesTab1EL.setChoices(this.IndexsListoptions)
      this.choicesSelectorCamposTab1EL = new Choices(this.selectorCamposTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un campo', placeholder: true, searchPlaceholderValue: 'Seleccione un campo', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: true, });
      this.choicesSelectorCamposTab1EL.disable();
      this.choicesSelectorCamposFiltrosTab1EL = new Choices(this.selectorCamposFiltrosTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un campo para filtrar', placeholder: true, searchPlaceholderValue: 'Seleccione un campo', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: true, });
      this.choicesSelectorCamposFiltrosTab1EL.disable();
      this.removeAllChildNodes(this.filtersOptionsEL);
      this.showHideFilters();
      this.showHideFilterGeom();
      this.fieldFilterList = new Array();
      this.choicesSelectorIndicesTab2EL.destroy();
      this.choicesSelectorIndicesTab2EL = new Choices(this.selectorIndicesTab2EL, { allowHTML: true, placeholderValue: 'Seleccione un indice', placeholder: true, searchPlaceholderValue: 'Seleccione un indice', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true });
      this.choicesSelectorIndicesTab2EL.setChoices(this.IndexsListoptions)
      /* RESETEAMOS LOS VALORES DEL EDITOR */
      this.editor.setState(this.startState_);
      this.loadButtonEL.disabled = true;
      this.clearButtonEL.disabled = true;
      this.removeOverlayLayers();
    })
  }

  getIndexs() {
    let my_option = {
      value: '',
      label: 'Selecciona un indice',
      selected: true,
      disabled: true,
    }
    this.IndexsListoptions.push(my_option)
    M.remote.get(this.config_.url + '/indices?format=json').then((response) => {
      let responseIndexList = JSON.parse(response.text);
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

      this.choicesSelectorIndicesTab1EL.setChoices(this.IndexsListoptions)
      this.choicesSelectorIndicesTab2EL.setChoices(this.IndexsListoptions)
    })
    return new Promise((success) => {
      success()
    })
  }

  getFields(index) {
    M.remote.get(this.config_.url + '/' + index + '/fields').then((response) => {
      let indexInfo = JSON.parse(response.text);
      let fieldsObject = indexInfo[index]['mappings']['properties'];
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
      this.choicesSelectorCamposTab1EL.destroy()
      this.choicesSelectorCamposTab1EL = new Choices(this.selectorCamposTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un campo', placeholder: true, searchPlaceholderValue: 'Seleccione un campo', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: true, });
      //reseteo los cohices de los campos
      this.choicesSelectorCamposTab1EL.setChoices(options, 'value', 'label', true);
      this.choicesSelectorCamposFiltrosTab1EL.setChoices(options, 'value', 'label', true);
      //activo los choices de los campos 
      this.choicesSelectorCamposTab1EL.enable();
    })
  }

  search() {
    let indice
    let campos = this.choicesSelectorCamposTab1EL.getValue(true);
    let must = new Array()
    campos.push('geom');
    if (this.filtersOptionsEL.hasChildNodes()) {
      this.createFilterQuery(this.filtersOptionsEL.childNodes);
    }
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

    this.my_request['query']['bool']['must'] = must;
    this.my_request['_source']['includes'] = campos;

    if (this.lat && this.lon) {
      this.geo_distance_filter = {
        "geo_distance": {
          "distance": this.distance + 'km',
          "geom": {
            "lat": this.lat,
            "lon": this.lon
          }
        }
      }
      this.my_request['query']['bool']['filter'] = this.geo_distance_filter
    } else {
      delete this.my_request.filter
    }

    console.log(this.my_request)

    switch (this.activePanel) {
      case 1:
        indice = this.choicesSelectorIndicesTab1EL.getValue(true);
        this.editor.dispatch({ changes: { from: 0, to: this.editor.state.doc.length, insert: JSON.stringify(this.my_request, null, 2) } });
        break;
      case 2:
        indice = this.choicesSelectorIndicesTab2EL.getValue(true);
        this.my_request = JSON.parse(this.editor.state.doc.toString())
        break;
    }
    let capaGeoJSON
    M.proxy(false);
    let url = this.config_.url + '/' + indice + '/search?'

    M.remote.post(url, this.my_request).then((res) => {
      this.removeOverlayLayers();


      let Arrayfeatures = new Array()
      let response = JSON.parse(res.text)
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

        capaGeoJSON.setStyle(this.estilo);

        this.map_.addLayers(capaGeoJSON);
        capaGeoJSON.on(M.evt.LOAD, () => {
          this.map_.setBbox(capaGeoJSON.getMaxExtent())
        })
      } else {
        M.dialog.info('No se han encontrado resultados que se ajusten al filtro');
      }
    })
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

  getDistinctValuesinField(my_field, my_select) {
    let indice = this.choicesSelectorIndicesTab1EL.getValue(true);
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
    let url = this.config_.url + '/' + indice + '/search?'
    M.proxy(false);
    M.remote.post(url, request).then((res) => {

      let response = JSON.parse(res.text);
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
        this.checkfieldFilterList(my_field)
        let filter = {
          field: my_field,
          type: 'text',
          value: choiceSelectEL.getValue(true)
        }
        this.fieldFilterList.push(filter);
      })
    })
  }

  getBasictStatsFields(my_field, my_input) {
    let indice = this.choicesSelectorIndicesTab1EL.getValue(true);
    let url = this.config_.url + '/' + indice + '/search?'
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
    M.proxy(false);
    M.remote.post(url, request).then((res) => {
      let response = JSON.parse(res.text);
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
  }

  getAdvancedtStatsFields(my_field, my_input) {
    let indice = this.choicesSelectorIndicesTab1EL.getValue(true);
    let url = this.config_.url + '/' + indice + '/search?'
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

    M.proxy(false);
    M.remote.post(url, request).then((res) => {
      let response = JSON.parse(res.text);

      console.log(response)
    })
  }

  showHideFilterGeom() {
    {
      let myIcon = this.filterGeomEL.firstChild
      myIcon.classList.toggle('g-cartografia-mas2')
      myIcon.classList.toggle('g-cartografia-menos2')
      if (myIcon.classList.contains('g-cartografia-menos2')) {
        this.filterGeomContainerEL.style.display = 'block'
      } else {
        this.filterGeomContainerEL.style.display = 'none'
      }
    }
  }

  showHideFilters() {
    {
      let myIcon = this.filterFieldsEL.firstChild
      myIcon.classList.toggle('g-cartografia-mas2')
      myIcon.classList.toggle('g-cartografia-menos2')
      if (myIcon.classList.contains('g-cartografia-menos2')) {
        this.filtersContainerEL.style.display = 'block'
      } else {
        this.filtersContainerEL.style.display = 'none'
      }
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


  checkfieldFilterList(fieldName) {
    this.fieldFilterList = this.fieldFilterList.filter(element => element.field != fieldName);
  }

  activeDistancePanel() {
    this.checkboxGeomFilterEL.disabled = false;
    this.sliderEL.classList.toggle('disabled');
    this.sliderEL.disabled = false;
    this.distanceEL.disabled = false;
    this.coordenadaXEL.disabled = false;
    this.coordenadaYEL.disabled = false;
    this.distance = this.distanceEL.value
  }

  cleanSpatialFilter() {
    this.lat = null;
    this.lon = null;
    this.checkboxGeomFilterEL.disabled = true;
    this.checkboxGeomFilterEL.checked = false;
    this.sliderEL.classList.toggle('disabled');
    this.distanceEL.disabled = true;
    this.distanceEL.value = 50;
    this.distanceOutputEL.value = '50Km';
    this.coordenadaXEL.disabled = true;
    this.coordenadaYEL.disabled = true;
    this.coordenadaXEL.value = null
    this.coordenadaYEL.value = null;
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
        var miFeature = new M.Feature("featurePrueba001", {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: e.coord
          }
        });
        miFeature.getImpl().getOLFeature().getGeometry().transform(this.map_.getProjection().code, 'EPSG:4326');
        this.lat = miFeature.getGeometry().coordinates[1];
        this.lon = miFeature.getGeometry().coordinates[0];
      }
    })
  }
}