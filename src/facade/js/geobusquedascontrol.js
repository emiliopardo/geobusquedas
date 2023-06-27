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
    this.IndexsListoptions = new Array();
    this.config_ = config;
    this.activePanel = 1;
    //Número maximo de documentos devueltos por elastic
    this.MAX_QUERY_SIZE = 10000;

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
    this.filtersContainerEL = html.querySelectorAll('div#filter-container')[0];
    this.filtersOptionsEL = html.querySelectorAll('form#filters-options')[0];
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
      this.loadButtonEL.disabled = false;
      this.clearButtonEL.disabled = false;
    })

    this.selectorCamposFiltrosTab1EL.addEventListener('change', () => {
      this.removeAllChildNodes(this.filtersOptionsEL);
      this.createFilters(this.choicesSelectorCamposFiltrosTab1EL.getValue(true));
    })

    this.filterFieldsEL.addEventListener('click', () => {
      let myIcon = this.filterFieldsEL.firstChild
      myIcon.classList.toggle('g-cartografia-mas2')
      myIcon.classList.toggle('g-cartografia-menos2')
      if (myIcon.classList.contains('g-cartografia-menos2')) {
        this.filtersContainerEL.style.display = 'block'
      } else {
        this.filtersContainerEL.style.display = 'none'
      }
    })

    this.selectorIndicesTab2EL.addEventListener('change', () => {
      this.loadButtonEL.disabled = false;
      this.clearButtonEL.disabled = false;
    });
    this.loadButtonEL.addEventListener('click', () => {
      this.search();
    })
    this.clearButtonEL.addEventListener('click', () => {
      switch (this.activePanel) {
        case 1:
          this.choicesSelectorIndicesTab1EL.destroy();
          this.choicesSelectorCamposTab1EL.destroy();
          this.choicesSelectorCamposFiltrosTab1EL.destroy();
          this.choicesSelectorIndicesTab1EL = new Choices(this.selectorIndicesTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un indice', placeholder: true, searchPlaceholderValue: 'Seleccione un indice', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true });
          this.choicesSelectorIndicesTab1EL.setChoices(this.IndexsListoptions)
          this.choicesSelectorCamposTab1EL = new Choices(this.selectorCamposTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un campo', placeholder: true, searchPlaceholderValue: 'Seleccione un campo', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: true, });
          this.choicesSelectorCamposTab1EL.disable();
          this.choicesSelectorCamposFiltrosTab1EL = new Choices(this.selectorCamposFiltrosTab1EL, { allowHTML: true, placeholderValue: 'Seleccione un campo para filtrar', placeholder: true, searchPlaceholderValue: 'Seleccione un campo', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: true, });
          this.choicesSelectorCamposFiltrosTab1EL.disable();
          break
        case 2:
          this.choicesSelectorIndicesTab2EL.destroy();
          this.choicesSelectorIndicesTab2EL = new Choices(this.selectorIndicesTab2EL, { allowHTML: true, placeholderValue: 'Seleccione un indice', placeholder: true, searchPlaceholderValue: 'Seleccione un indice', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true });
          this.choicesSelectorIndicesTab2EL.setChoices(this.IndexsListoptions)
          /* RESETEAMOS LOS VALORES DEL EDITOR */
          this.editor.setState(this.startState_);
          break
      }
      this.loadButtonEL.disabled = true;
      this.clearButtonEL.disabled = true;
      let layerList = this.map_.getLayers()
      layerList.forEach(layer => {
        if (layer.name == this.indice) {
          this.map_.removeLayers(layer)
        }
      });
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
      //reseteo los cohices de los campos
      this.choicesSelectorCamposTab1EL.setChoices(options, 'value', 'label', true);
      this.choicesSelectorCamposFiltrosTab1EL.setChoices(options, 'value', 'label', true);
      //activo los choices de los campos 
      this.choicesSelectorCamposTab1EL.enable();
      this.choicesSelectorCamposFiltrosTab1EL.enable();
    })
  }

  search() {
    let request;
    let indice
    let campos

    switch (this.activePanel) {
      case 1:
        indice = this.choicesSelectorIndicesTab1EL.getValue(true);
        campos = this.choicesSelectorCamposTab1EL.getValue(true);
        request = {
          "query": {
            "match_all": {},
          },
          "_source": {
            "includes": campos,
          },
          "size": this.MAX_QUERY_SIZE,
          // "size": 100,
        }
        break;
      case 2:
        indice = this.choicesSelectorIndicesTab2EL.getValue(true);
        request = JSON.parse(this.editor.state.doc.toString())
        campos = new Array();
        break;
    }
    let capaGeoJSON
    M.proxy(false);
    campos.push("geom")
    let url = this.config_.url + '/' + indice + '/search?'

    M.remote.post(url, request).then((res) => {
      let layerList = this.map_.getLayers()
      layerList.forEach(layer => {
        if (layer.name == indice) {
          this.map_.removeLayers(layer)
        }
      });


      let Arrayfeatures = new Array()
      let response = JSON.parse(res.text)
      let results = response['hits']['hits']
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
    })
  }

  createFilters(arrayFields) {
    arrayFields.forEach(field => {
      let find = false;
      do {
        this.fieldsFilters.forEach(element => {
          if (element['field'] == field) {
            find = true;
            this.createFiltersDOMElement(element['field'], element['type']);
            find = true;
          }
        });
      } while (!find);
    });
  }

  createFiltersDOMElement(field, type) {
    // construimos elemento div
    let my_div = document.createElement('div');
    my_div.setAttribute('id', field);
    my_div.setAttribute('name', field);
    my_div.setAttribute('class', 'opciones-busqueda');
    // construimos elemento label
    let my_label = document.createElement("label");
    my_label.setAttribute('class', 'label-opciones-busqueda');
    my_label.setAttribute('for', 'filtro_' + field);
    my_label.innerHTML = field;
    let my_input;
    let my_select;
    switch (type) {
      case 'long':
        my_input = document.createElement('input');
        my_input.setAttribute('id', 'filtro_' + field);
        my_input.setAttribute('name', 'filtro_' + field);
        my_input.setAttribute('type', 'number');
        my_input.setAttribute('class', 'inputFilters');
        my_input.setAttribute('step', '1');
        my_input.setAttribute('pattern', '[0-9]');
        break;
      case 'double':
        my_input = document.createElement('input');
        my_input.setAttribute('id', 'filtro_' + field);
        my_input.setAttribute('name', 'filtro_' + field);
        my_input.setAttribute('type', 'number');
        my_input.setAttribute('pattern', '[0-9]');
        my_input.setAttribute('step', '.01');
        my_input.setAttribute('class', 'inputFilters');
        break;
      case 'keyword':
        my_select = document.createElement('select');
        my_select.setAttribute('id', 'filtro_' + field);
        my_select.setAttribute('name', 'filtro_' + field);
        my_select.setAttribute('multiple', true);
        break;
      case 'text':
        my_input = document.createElement('input');
        my_input.setAttribute('id', 'filtro_' + field);
        my_input.setAttribute('name', 'filtro_' + field);
        my_input.setAttribute('type', 'text');
        my_input.setAttribute('class', 'inputFilters');
        break;
      default:
        break;
    }
    my_div.appendChild(my_label);
    if (my_input) {
      my_div.appendChild(my_input);
      this.getBasictStatsFields(field, my_input)
    }
    if (my_select) {
      my_div.appendChild(my_select);
      this.getDistinctValuesinField(field, my_select)
    }
    this.filtersOptionsEL.appendChild(my_div)
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
        console.log(choiceSelectEL.getValue(true));
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
      my_input.setAttribute('max', response['aggregations']['fields_stats']['max']);
      my_input.setAttribute('placeholder', 'introduce un valor entre ' + response['aggregations']['fields_stats']['min'] + ' y ' + response['aggregations']['fields_stats']['max']);

      my_input.addEventListener('change', () => {
        console.log(my_input.value)
      })
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
}