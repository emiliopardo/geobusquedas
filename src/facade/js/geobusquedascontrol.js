/* eslint-disable no-console */

/**
 * @module M/control/GeobusquedasControl
 */

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
    this.indexList_ = Array();
    this.fieldList_ = Array();
    this.indexConfig_ = new Array();
    this.getFields();
    this.getIndexs();
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
    // let templateVars = { vars: { title: this.title, fields: this.fields } };
    let templateVars = { vars: { title: this.config_.title } };
    //let templateVars = { vars: {} };

    return new Promise((success, fail) => {
      // console.log(this.fieldList_)
      // console.log(this.indexList_)
      console.log(this.indexConfig_)
      const html = M.template.compileSync(template, templateVars);
      // Añadir código dependiente del DOM
      this.element = html;
      this.addEvents(html, this.fields);
      success(html);
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
  }

  getIndexs() {
    M.remote.get(this.config_.url + "/indices?format=json").then((response) => {
      let responseIndexList = JSON.parse(response.text);
      responseIndexList.forEach(element => {
        let indexName = element["index"]
        if (!indexName.includes(".")) {
          this.indexList_.push(indexName);
        }
      });
    })
  }

  getFields() {
    M.remote.get(this.config_.url + "/_all/fields").then((response) => {
      let responseFieldList = JSON.parse(response.text);
      let indexNameList = Object.keys(responseFieldList)
      indexNameList.forEach(element => {
        if (!element.includes(".")) {
          let fieldsList = responseFieldList[element]["mappings"]["properties"];
          let indexInfo = {
            index: element,
            fields: fieldsList
          }
          this.indexConfig_.push(indexInfo);
        }
      });
    })
  }
}
