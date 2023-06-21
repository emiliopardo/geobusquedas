/**
 * @module M/plugin/Geobusquedas
 */
import 'assets/css/geobusquedas';
import GeobusquedasControl from './geobusquedascontrol';
import api from '../../api.json';

export default class Geobusquedas extends M.Plugin {
  /**
   * @classdesc
   * Main facade plugin object. This class creates a plugin
   * object which has an implementation Object
   *
   * @constructor
   * @extends {M.Plugin}
   * @param {Object} impl implementation object
   * @api stable
   */
  constructor(parameters) {
    super();
    /**
     * Facade of the map
     * @private
     * @type {M.Map}
     */
    this.map_ = null;
    this.config_ = parameters.config;
    this.options_ = parameters.options;
    this.url_ = this.config_.url
    this.position_ = parameters.options.position || 'TL';

    if (this.position_ === 'TL' || this.position_ === 'BL') {
      this.positionClass_ = 'left';
    } else {
      this.positionClass_ = 'right';
    }

    /**
     * Array of controls
     * @private
     * @type {Array<M.Control>}
     */
    this.controls_ = [];

    /**
     * Metadata from api.json
     * @private
     * @type {Object}
     */
    this.metadata_ = api.metadata;

    /**
     * Name
     * @public
     * @type {string}
     */
    this.name = 'Geobusquedas';
  }

  /**
   * This function adds this plugin into the map
   *
   * @public
   * @function
   * @param {M.Map} map the map to add the plugin
   * @api stable
   */
  addTo(map) {
    this.controls_.push(new GeobusquedasControl(this.config_));
    this.map_ = map;
    // panel para agregar control - no obligatorio
    this.panel_ = new M.ui.Panel('panelGeobusquedas', {
      collapsible: true,
      className: `geobusquedas-panel ${this.positionClass_}`,
      collapsedButtonClass: 'g-cartografia-flecha-izquierda',
      position: M.ui.position[this.position_],
      tooltip: this.config_.title,
    });
    this.panel_.addControls(this.controls_);
    this.panel_.on(M.evt.ADDED_TO_MAP, () => {
      this.fire(M.evt.ADDED_TO_MAP);
    });
    map.addPanels(this.panel_);
  }

  /**
   * This function gets metadata plugin
   *
   * @public
   * @function
   * @api stable
   */
  getMetadata() {
    return this.metadata_;
  }

}
