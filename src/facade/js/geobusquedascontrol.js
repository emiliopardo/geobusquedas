/* eslint-disable no-console */

/**
 * @module M/control/GeobusquedasControl
 */
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
      const html = M.template.compileSync(template, this.templateVars_);
      // Añadir código dependiente del DOM
      this.element = html;
      // hasta que no optenga la respuesta de los indices no cargo la plantilla ni los eventos
      this.getIndexs().then((response) => {
        this.selectIndexOptions_ = response
        this.addEvents(html);
        success(html);
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
    console.log("addEvents")
    /* SE ACCEDE A LOS SELECTORES */
    this.selectorIndicesEL = html.querySelectorAll('select#selectorIndices')[0];
    console.log(this.selectorIndicesEL)
    /* SE CREAN Y CONFIGURAR LOS CHOICE.JS*/
    this.choicesSelectorIndicesEL = new Choices(this.selectorIndicesEL,{ allowHTML: true,  removeItemButton: true, placeholderValue: 'Seleccione un indice', itemSelectText: 'Click para seleccionar', noResultsText: 'No se han encontrado resultados', noChoicesText: 'No hay mas opciones', shouldSort: true,
    shouldSortItems: true,});
  }


  getIndexs() {
    let indexList_ = new Array()
    M.remote.get(this.config_.url + "/indices?format=json").then((response) => {
      let responseIndexList = JSON.parse(response.text);
      responseIndexList.forEach(element => {
        let indexName = element["index"]
        if (!indexName.includes(".")) {
          let my_option = {
            value: indexName,
            label: indexName,
            selected: false,
            disabled: false,
          }

          indexList_.push(my_option);
        }
      });
      //defino el listado de opciones del choice
      this.choicesSelectorIndicesEL.setChoices(indexList_)
    })
    return new Promise((success, fail) => {
      success(indexList_)
    })
  }

  getFields(my_index) {
    let indexConfig_ = new Array()
    M.remote.get(this.config_.url + "/"+my_index+"/fields").then((response) => {
      let responseFieldList = JSON.parse(response.text);
      let indexNameList = Object.keys(responseFieldList)
      indexNameList.forEach(element => {
        if (!element.includes(".")) {
          let fieldsList = responseFieldList[element]["mappings"]["properties"];
          let indexInfo = {
            index: element,
            fields: fieldsList
          }
          indexConfig_.push(indexInfo);
        }
      });
    })
    return new Promise((success, fail) => {
        
      success(indexConfig_)
    })
  }

}
