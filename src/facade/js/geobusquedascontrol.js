/* eslint-disable no-console */

/**
 * @module M/control/GeobusquedasControl
 */

import {EditorState} from "@codemirror/state"
import {EditorView, keymap, placeholder,lineNumbers, drawSelection,highlightActiveLine,highlightActiveLineGutter,highlightSpecialChars} from "@codemirror/view"
import {defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching,foldGutter, foldKeymap} from "@codemirror/language"
import {autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap} from "@codemirror/autocomplete"
import {defaultKeymap} from "@codemirror/commands"
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
    this.config_ = config;
    //Número maximo de documentos devueltos por elastic
    this.MAX_QUERY_SIZE = 10000;

    //Configuracion de CodeMirror
    this.startState_ = EditorState.create({
      doc: "",
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        foldGutter(),
        drawSelection(),
        json(), 
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),       
        highlightActiveLine(),
        placeholder('Editor JSON'),
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
    this.templateVars_ = { vars: { title: this.config_.title } };
    return new Promise((success, fail) => {
      // hasta que no optenga la respuesta de los indices no cargo la plantilla ni los eventos
      this.getIndexs().then((response) => {
        const html = M.template.compileSync(template, this.templateVars_);
        // Añadir código dependiente del DOM
        this.element = html;
        this.selectIndexOptions_ = response
        this.addEvents(html);
        success(html)
      })
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
    this.selectorIndicesEL = html.querySelectorAll('select#selectorIndices')[0];
    this.selectorCamposEL = html.querySelectorAll('select#selectorCampos')[0];
    this.selectorTextAreaEL = html.querySelectorAll('input#textArea')[0];
    this.selectorEditorCodeMirrorEL = html.querySelectorAll('div#editorCodeMirror')[0];
    this.loadButtonEL = html.querySelectorAll('button#loadButton')[0];
    this.clearButtonEL = html.querySelectorAll('button#clearButton')[0];
    /* SE CREAN Y CONFIGURAR LOS CHOICE.JS*/
    this.choicesSelectorIndicesEL = new Choices(this.selectorIndicesEL, { allowHTML: true, placeholderValue: 'Seleccione un indice', placeholder: true, searchPlaceholderValue: 'Seleccione un indice', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true });
    this.choicesSelectorCamposEL = new Choices(this.selectorCamposEL, { allowHTML: true, placeholderValue: 'Seleccione un campo', placeholder: true, searchPlaceholderValue: 'Seleccione un campo', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: true, });
    // INICIALIZAMOS EL CHOICE DE CAMPOS A DISABLE
    this.choicesSelectorCamposEL.disable();
    // CARGAMOS EDITOR CODEMIRROR
    this.editor = new EditorView({
      state: this.startState_,
      parent: this.selectorEditorCodeMirrorEL,
    })

    /* SE CREAN LOS EVENTOS*/
    this.selectorIndicesEL.addEventListener('change', () => {
      let indice = this.choicesSelectorIndicesEL.getValue(true);
      this.getFields(indice);
    })
    this.selectorCamposEL.addEventListener('change', () => {
      this.loadButtonEL.disabled = false;
      this.clearButtonEL.disabled = false;
    })
    this.loadButtonEL.addEventListener('click', () => {
      this.indice = this.choicesSelectorIndicesEL.getValue(true);
      this.campo = this.choicesSelectorCamposEL.getValue(true);
      this.search(this.indice, this.campo)
    })
    this.clearButtonEL.addEventListener('click', () => {
      this.choicesSelectorIndicesEL.destroy()
      this.choicesSelectorIndicesEL = new Choices(this.selectorIndicesEL, { allowHTML: true, placeholderValue: 'Seleccione un indice', placeholder: true, searchPlaceholderValue: 'Seleccione un indice', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true });
      this.getIndexs()
      this.choicesSelectorCamposEL.destroy()
      this.choicesSelectorCamposEL = new Choices(this.selectorCamposEL, { allowHTML: true, placeholderValue: 'Seleccione un campo', placeholder: true, searchPlaceholderValue: 'Seleccione un campo', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true, shouldSortItems: true, removeItems: true, removeItemButton: true, });
      this.choicesSelectorCamposEL.disable();
      /* RESETEAMOS LOS VALORES DEL EDITOR */
      this.editor.setState(this.startState_);

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
    let options = new Array()
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

          options.push(my_option);
        }
      });
      //defino el listado de opciones del choice
      this.choicesSelectorIndicesEL.setChoices(options)
    })
    return new Promise((success, fail) => {
      success(options)
    })
  }

  getFields(index) {
    M.remote.get(this.config_.url + '/' + index + '/fields').then((response) => {
      let indexInfo = JSON.parse(response.text);
      let fieldsObject = indexInfo[index]['mappings']['properties'];
      let fieldsArray = Object.keys(fieldsObject)
      let options = new Array()

      fieldsArray.forEach(field => {
        if (field != 'geom') {
          let option = {
            value: field,
            label: field,
            selected: false,
            disabled: false,
          }
          options.push(option);
        }
      })
      //reseteo el choice y defino el listado de opciones del choice
      this.choicesSelectorCamposEL.setChoices(options, 'value', 'label', true);
      //activo el choice
      this.choicesSelectorCamposEL.enable();
    })
  }

  search(index, fields) {
    let request;
    if (this.editor.state.doc.toString() == '') {
      request = {
        "query": {
          "match_all": {},
        },
        "_source": {
          "includes": fields,
        },
        "size": this.MAX_QUERY_SIZE,
        // "size": 100,
      }
    } else {
      request = JSON.parse(this.editor.state.doc.toString())
    }

    let capaGeoJSON
    M.proxy(false);
    fields.push("geom")
    let url = this.config_.url + '/' + index + '/search?'

    M.remote.post(url, request).then((res) => {
      let layerList = this.map_.getLayers()
      layerList.forEach(layer => {
        if (layer.name == index) {
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
        name: index
      });

      capaGeoJSON.setStyle(this.estilo);

      this.map_.addLayers(capaGeoJSON);
      capaGeoJSON.on(M.evt.LOAD, () => {
        this.map_.setBbox(capaGeoJSON.getMaxExtent())
      })
    })
  }
}
