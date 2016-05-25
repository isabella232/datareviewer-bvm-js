/** @license
| Version 10.3.1
| Copyright 2016 Esri
|
| Licensed under the Apache License, Version 2.0 (the "License");
| you may not use this file except in compliance with the License.
| You may obtain a copy of the License at
|
|    http://www.apache.org/licenses/LICENSE-2.0
|
| Unless required by applicable law or agreed to in writing, software
| distributed under the License is distributed on an "AS IS" BASIS,
| WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
| See the License for the specific language governing permissions and
| limitations under the License.
*/

define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/text!./BatchValidationEditorDialog/templates/BatchValidationEditorDialog.html",
    "dojo/i18n!./BatchValidationEditorDialog/nls/dialog",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "bvroot/settings",
    "dojo/dom-style",
    "dojo/has",
    "dojo/_base/sniff",
    "dojo/on",
    "dojo/topic",
    "dojo/_base/connect",
    "esri/tasks/datareviewer/BatchValidationParameters",
    "util/CronHelper",
    "esri/map",
    "esri/toolbars/draw",
    "esri/request",
    "esri/geometry/Extent",
    "esri/SpatialReference",
    "esri/geometry/Point",
    "esri/geometry/Polygon",
    "esri/graphic",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/tasks/GeometryService",
    "esri/tasks/ProjectParameters",
    "dojo/query",
    "dojo/dom",
    "dojo/_base/Color",
    "dojo/date/stamp",
    "dojo/date/locale",
    "dojo/date",
    "dijit/registry",
    "dojo/html",
    "dijit/layout/ContentPane",
    "dijit/form/Button",
    "dijit/Dialog",
    "dijit/form/Form",
    "dijit/form/ValidationTextBox",
    "dijit/form/RadioButton",
    "dijit/form/CheckBox",
    "dijit/form/NumberTextBox",
    "dijit/form/DateTextBox",
    "dijit/form/TimeTextBox",
    "dijit/form/Select"
],
    function (declare, lang, template, i18n, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, settings, domStyle, has, sniff, on, topic, connect, BatchValidationParameters, CronHelper, Map, Draw, esriRequest, Extent, SpatialReference, Point, Polygon, Graphic, SimpleFillSymbol, SimpleLineSymbol, ArcGISTiledMapServiceLayer, ArcGISDynamicMapServiceLayer, GeometryService, ProjectParameters, query, dom, Color, stamp, locale, date, registry) {
        return declare("bvmanager.dijit.BatchValidationEditorDialog", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],
            {
                //This grabs the template html file.
                templateString: template,
                //Default CSS class applied to the root node of the widget.
                baseClass: "batchValidationEditorDialog",
                //This will eventually hold the localization object which contains all our localized strings.
                nls: null,
                /**
                 * Contains the job object referenced by the form.
                 * You should access this using the widget's get() and set() functions
                 */
                batchValidationJob: null,

                /**
                 * @private
                 */
                _cronExpressionHelper: null,
                /**
                 * @private
                 */
                _map: null,
                /**
                 * @private
                 */
                _toolbar: null,
                /**
                 * @public
                 */
                _aoiPolygon: null,

                _timeFormat24Hour: "HH:mm",

                _timeFormat12Hour: "hh:mm a",

                _dateFormat: "MM/dd/yyyy",
                _closedDialogHandle: null,
                _formModify: false,
                _jobId: null,
                _batchFileName: null,
                _IEFileUploadSupportVersion: 10,
                /**
                 * @constructor
                 */
                constructor: function () {
                    //This is before any dijits are created, would be a good time to get localization.
                    this.nls = i18n;
                },

                /**
                 * This is called after the widget has been rendered, but before subwidgets have been rendered.
                 * This is used to populate sub-widget properties.
                 */
                postCreate: function () {
                    if (has("ie") < this._IEFileUploadSupportVersion) {
                        this.setIEDisplay();
                    }
                    else {
                        this.setDisplay();
                    }
                },
                setDisplay: function () {
                    domStyle.set(this.selectedFile, "position", "absolute");
                    domStyle.set(this.selectedFile, "visibility", "hidden");
                },
                setIEDisplay: function () {
                    domStyle.set(this.fileUploadContainer, "display", "none");
                },

                /**
                 * Called after the widget is fully created, and in the DOM.
                 * This is used to wire up all the events and any last minute initialization.
                 */
                startup: function () {
                    this.reset = lang.hitch(this, this.reset);
                    this._onSubmit = lang.hitch(this, this._onSubmit);
                    this.show = lang.hitch(this, this.show);
                    this._uploadBatchJob = lang.hitch(this, this._uploadBatchJob);
                    this.hide = lang.hitch(this, this.hide);
                    this._showHideInterval = lang.hitch(this, this._showHideInterval);
                    this._optionsTextBox = lang.hitch(this, this._optionsTextBox);
                    this._updateBatchValidationObject = lang.hitch(this, this._updateBatchValidationObject);
                    this._getCronExpression = lang.hitch(this, this._getCronExpression);
                    this._showHideDateTimeRow = lang.hitch(this, this._showHideDateTimeRow);
                    this._getAreaOfInterest = lang.hitch(this, this._getAreaOfInterest);
                    this.populateSessionList = lang.hitch(this, this.populateSessionList);
                    //add map functions
                    this._showHideMap = lang.hitch(this, this._showHideMap);
                    this._createToolbar = lang.hitch(this, this._createToolbar);
                    this._addToMap = lang.hitch(this, this._addToMap);
                    this._drawExtent = lang.hitch(this, this._drawExtent);
                    this._clearExtent = lang.hitch(this, this._clearExtent);
                    this._setBatchJobProperties = lang.hitch(this, this._setBatchJobProperties);
                    this._setSelectionAreaonMap = lang.hitch(this, this._setSelectionAreaonMap);
                    on(this.cancelBtn, "click", this.hide);
                    on(this.submitBtn, "click", this._onSubmit);
                    on(this.selectedFile, "change", lang.hitch(this, this.updateBatchJobFileName));
                    on(this.browseButton, "click", lang.hitch(this, this.openBrowseDialog));
                    this._initializeRunRecurrenceRadios();
                    this._initializeIntervalRadios();
                    this._initializeCronOptionsRadios();
                    this._initializeStartingRadios();
                    this._initializeExtentRadios();
                    this._closedDialogHandle = this.batchValidationEditorDialog.on("hide", lang.hitch(this, function () {
                        this.reset();
                    }));
                },
                openBrowseDialog: function () {
                    this.selectedFile.click();
                },
                updateBatchJobFileName: function () {
                    var filePath = this.selectedFile.value;
                    var fileName = filePath.substring(filePath.lastIndexOf('\\') + 1, filePath.length);
                    this.rbjFileName.set("value", fileName);
                },
                _uploadBatchJob: function () {
                    var url = settings.drsSoeUrl.split('exts');
                    var uploadUrl = url[0] + "uploads/upload";
                    var form = dom.byId("addBVForm");
                    topic.publish("addLoggingInfo", "Uploading batch job");
                    return esriRequest({
                            form: form,
                            url: uploadUrl,
                            handleAs: "json",
                            load: lang.hitch(this, function (response) {
                                if (response != null && response !== undefined && response.success !== undefined && response.success == true) {
                                    topic.publish("addLoggingInfo", "Batch job successfully uploaded");
                                    this._batchJobFileItemId = response.item.itemID;
                                }
                                else {
                                    topic.publish("addLoggingError", this.nls.fileUploadErrorMessage);
                                    this.selectedFile.value = "";
                                    this.rbjFileName.set("value", "");
                                    return null;
                                }
                            }),

                            error: lang.hitch(this, function (response) {
                                topic.publish("addLoggingError", this.nls.fileUploadErrorMessage);
                                this.selectedFile.value = "";
                                this.rbjFileName.set("value", "");
                                return null;
                            })
                        }//, {useProxy: false}
                    );
                },
                /**
                 * @private
                 * onClick events for RUN radio buttons
                 */
                _initializeRunRecurrenceRadios: function () {
                    this.runOnceRadio.on("change", lang.hitch(this, function (isChecked) {
                        if (isChecked) {
                            this.runRecurringCheckBox.set("disabled", true);
                            this.recurringTxtEntry.set("disabled", true);
                            this.recurringTxtEntry.set("text", "");
                            this.runRecurringCheckBox.set("checked", false);
                            domStyle.set(this.dateNow, 'display', '');
                            domStyle.set(this.optionsMonthlyRow, 'display', 'none');
                            this.startingSpecifiedRadioLabel.innerHTML = this.nls.startingSpecifiedRadioLabel;
                        }
                    }), true);
                    this.runRecurringRadio.on("change", lang.hitch(this, function (isChecked) {
                        if (isChecked) {
                            if (this._formModify == false) {
                                this.runRecurringCheckBox.set("checked", false);
                                this.recurringTxtEntry.set("text", '');
                                this.intervalDailyRadio.set("checked", true);
                                this.optionsEveryDayRadio.set("checked", true);
                                this.everyDayTxtEntry.set("value", "1");
                                this.dayofMonthTxtEntry.set("value", "1");
                                this.EveryMonthTxtEntry.set("value", "1");
                                this.recurringTxtEntry.set("value", '');
                                domStyle.set(this.dateNow, 'display', 'none');
                                //this.startingSpecifiedRadioLabel.innerHTML= this.nls.startingSpecifiedTimeRadioLabel;
                            }
                            else {
                                if (this.runRecurringCheckBox.checked) {
                                    this.recurringTxtEntry.set("disabled", false);
                                }
                            }
                            domStyle.set(this.dateNow, 'display', 'none');
                            domStyle.set(this.showHideRecurrence, 'display', '');
                            this.runRecurringCheckBox.set("disabled", false);
                            this.startingSpecifiedRadioLabel.innerHTML = this.nls.startingSpecifiedTimeRadioLabel;
                        }
                        else {
                            domStyle.set(this.showHideRecurrence, 'display', 'none');
                        }
                        this._showHideInterval();
                    }), true);
                    this.runRecurringCheckBox.on("change", lang.hitch(this, function (isChecked) {
                        if (isChecked) {
                            this.recurringTxtEntry.set("disabled", false);
                            this.recurringTxtEntry.focus();

                        }
                        else {
                            this.recurringTxtEntry.set("disabled", true);
                            this.recurringTxtEntry.set("value", "");
                        }
                        this._showHideInterval();
                    }), true);
                },
                /**
                 * @private
                 * This will set the initial state and onClick events for INTERVAL radio buttons
                 */
                _initializeIntervalRadios: function () {
                    //default state for INTERVAL radio buttons
                    domStyle.set(this.showHideIntervalRow, "display", "none");
                    domStyle.set(this.showHideRecurrence, "display", "none");
                    this.intervalWeeklyRadio.on("change", lang.hitch(this, function (isChecked) {
                        if (isChecked) {
                            domStyle.set(this.optionsDailyRow, 'display', 'none');
                            domStyle.set(this.optionsMonthlyRow, 'display', 'none');
                            domStyle.set(this.optionsWeeklyRow, 'display', '');
                            if (this._formModify == false) {
                                query('[name=\"options2\"]').forEach(function (chkbox) {
                                    registry.getEnclosingWidget(chkbox).set("checked", false);
                                });
                            }
                        }
                    }), true);
                    this.intervalMonthlyRadio.on("change", lang.hitch(this, function (isChecked) {
                        if (isChecked) {
                            domStyle.set(this.optionsDailyRow, 'display', 'none');
                            domStyle.set(this.optionsWeeklyRow, 'display', 'none');
                            domStyle.set(this.optionsMonthlyRow, 'display', '');
                            if (this._formModify == false) {
                                this.dayofMonthTxtEntry.set("value", "1");
                                this.EveryMonthTxtEntry.set("value", "1");
                            }
                        }
                    }), true);
                    this.intervalDailyRadio.on("change", lang.hitch(this, function (isChecked) {
                        if (isChecked && this.runRecurringRadio.checked) {
                            domStyle.set(this.optionsMonthlyRow, 'display', 'none');
                            domStyle.set(this.optionsWeeklyRow, 'display', 'none');
                            domStyle.set(this.optionsDailyRow, 'display', '');
                            if (this._formModify == false) {
                                this.optionsEveryDayRadio.set("checked", true);
                                this.everyDayTxtEntry.set("value", "1");
                            }
                        }
                    }), true);
                },

                /**
                 * @private
                 * This will set the initial state and onClick events for OPTIONS(daily) radio buttons
                 */
                _initializeCronOptionsRadios: function () {

                    //default state for OPTIONS radio buttons
                    domStyle.set(this.optionsDailyRow, 'display', 'none');
                    domStyle.set(this.optionsMonthlyRow, 'display', 'none');
                    domStyle.set(this.optionsWeeklyRow, 'display', 'none');

                    //onClick events for OPTIONS(daily) radio buttons
                    on(this.optionsEveryDayRadio, "onClick", this._optionsTextBox);
                    on(this.optionsEveryWeekdayRadio, "onClick", this._optionsTextBox);
                },
                _initializeStartingRadios: function () {
                    domStyle.set(this.startingDateTimeRow, 'display', 'none');
                    this.startingNowRadio.on("change", lang.hitch(this, function (isChecked) {
                        if (isChecked)
                            this._showHideDateTimeRow();
                    }), true);
                    this.startingSpecifiedRadio.on("change", lang.hitch(this, function (isChecked) {
                        if (isChecked)
                            this._showHideDateTimeRow();
                    }), true);
                },
                /**
                 * @private
                 * This will enable/disable the textbox associated with 'Recurring ... times'
                 * radio button depending on RUN radio buttons selection
                 */
                _initializeExtentRadios: function () {
                    domStyle.set(this.optionsExtentRow, 'display', 'none');
                    this.extentWholeRadio.on("change", lang.hitch(this, function (isChecked) {
                        if (isChecked) {
                            domStyle.set(this.optionsExtentRow, 'display', 'none');
                        }
                    }), true);
                    this.extentSpatialRadio.on("change", lang.hitch(this, function (isChecked) {
                        if (isChecked) {
                            this._showHideMap();
                        }
                    }), true);
                    this.drawExtentBtn.on("click", lang.hitch(this, function () {
                        this._drawExtent();
                    }), true);
                    this.clearExtentBtn.on("click", lang.hitch(this, function () {
                        this._clearExtent();
                    }), true);
                },

                /**
                 * Shows the dialog.
                 */
                show: function (batchValidationJobParamter) {
                    //this.reset();
                    this.batchValidationEditorDialog.show();
                    if (batchValidationJobParamter.parameters && batchValidationJobParamter.parameters[0] != null) {
                        this.submitBtn.set("label", this.nls.update);
                        this._setBatchJobProperties(batchValidationJobParamter);
                        this._formModify = true;
                        this.populateSessionList(batchValidationJobParamter.parameters[0].sessionString);
                        this.populateProductionWorkspaceList(batchValidationJobParamter.parameters[0].productionWorkspace);
                    }
                    else {
                        this.submitBtn.set("label", this.nls.submit);
                        this.populateSessionList();
                        this.populateProductionWorkspaceList();
                    }
                },
                /**
                 * Hides the dialog, and resets the form.
                 */
                hide: function () {
                    this.reset();
                    this.batchValidationEditorDialog.hide();
                    this._formModify = false;
                },
                /**
                 * Resets the form to its default state.
                 */
                reset: function () {
                    this.addBVForm.reset();
                    this.runOnceRadio.set("checked", true);
                    this.intervalDailyRadio.set("checked", true);
                    this.optionsEveryDayRadio.set("checked", true);
                    this.extentWholeRadio.set("checked", true);
                    this.optionChangedFeaturesOnlyCheckBox.set("checked", false);
                    this.runRecurringCheckBox.set("checked", false);
                    domStyle.set(this.showHideIntervalRow, 'display', 'none');
                    domStyle.set(this.optionsDailyRow, 'display', 'none');
                    domStyle.set(this.optionsWeeklyRow, 'display', 'none');
                    domStyle.set(this.startingDateTimeRow, 'display', 'none');
                    domStyle.set(this.optionsExtentRow, 'display', 'none');

                    this.selectedFile.value = "";
                    this.sessionDropDown.selectedIndex = 0;
                    this._aoiPolygon = null;
                    this._formModify = false;
                    this.recurringTxtEntry.value = "";
                    this._jobId = null;
                    this._batchFileName = null;
                    if (this._map != null) {
                        this._map.destroy();
                        this._map.removeAllLayers();
                        this._map = null;
                    }
                },
                /**
                 * @private
                 * This will show/hide the INTERVAL and OPTIONS(daily and weekly) fields according to
                 * RUN radio buttons selection
                 */
                _showHideInterval: function () {
                    if (this.runRecurringRadio.checked == true) {
                        domStyle.set(this.showHideIntervalRow, 'display', '');
                        //todo: make sure this works above    this.showHideIntervalRow.style.display = '';

                        if (this.intervalDailyRadio.checked) {
                            domStyle.set(this.optionsDailyRow, 'display', '');
                            domStyle.set(this.optionsWeeklyRow, 'display', 'none');
                            domStyle.set(this.optionsMonthlyRow, 'display', 'none');

                        }
                        else if (this.intervalWeeklyRadio.checked) {

                            domStyle.set(this.optionsDailyRow, 'display', 'none');
                            domStyle.set(this.optionsMonthlyRow, 'display', 'none');
                            domStyle.set(this.optionsWeeklyRow, 'display', '');
                        }
                        else if (this.intervalMonthlyRadio.checked) {
                            domStyle.set(this.optionsDailyRow, 'display', 'none');
                            domStyle.set(this.optionsWeeklyRow, 'display', 'none');
                            domStyle.set(this.optionsMonthlyRow, 'display', '');
                        }
                        else {
                            domStyle.set(this.optionsDailyRow, 'display', 'none');
                            domStyle.set(this.optionsWeeklyRow, 'display', 'none');
                            domStyle.set(this.optionsMonthlyRow, 'display', 'none');
                        }
                    }
                    else {
                        domStyle.set(this.showHideIntervalRow, 'display', 'none');
                        domStyle.set(this.optionsDailyRow, 'display', 'none');
                        domStyle.set(this.optionsWeeklyRow, 'display', 'none');
                    }
                },
                _initializeMap: function () {
                    this._map = new Map(this.id + "_map");
                    for (i = 0; i < settings.mapServices.length; i++) {
                        var mapLayer;
                        if (settings.mapServices[i].serviceType == "Tiled") {
                            mapLayer = new ArcGISTiledMapServiceLayer(settings.mapServices[i].serviceUrl)
                        }
                        else {
                            mapLayer = new ArcGISDynamicMapServiceLayer(settings.mapServices[i].serviceUrl)
                        }
                        this._map.addLayer(mapLayer);
                    }
                },
                _setMapExtent: function () {
                    if (settings.mapServices[0].initialExtent != null && settings.mapServices[0].initialExtent !== undefined) {
                        var extentArray = settings.mapServices[0].initialExtent.split(",");
                        var initExtent = new Extent({
                            "xmin": parseFloat(extentArray[0]), "ymin": parseFloat(extentArray[1]), "xmax": parseFloat(extentArray[2]), "ymax": parseFloat(extentArray[3]),
                            "spatialReference": {"wkid": parseInt(settings.mapServices[0].spatialReference)}
                        });
                        this._map.setExtent(initExtent);
                    }
                },
                /**
                 * @private
                 * This will show/hide map according to
                 * EXTENT radio buttons selection
                 */
                _showHideMap: function (analysisArea) {

                    domStyle.set(this.optionsExtentRow, 'display', '');
                    //todo: make sure this works above  this.optionsExtentRow.style.display = '';
                    if (this._formModify == false || this._map == null) {
                        if (this._map != null) {
                            this._map.destroy();
                            this._map.removeAllLayers();
                            this._map = null;
                        }
                        this._initializeMap();
                        this._setMapExtent();
                        var handle = on(this._map, "load", lang.hitch(this, function (map) {
                            this._createToolbar();
                            handle.remove();
                            if (analysisArea && analysisArea != null)
                                this._drawAnalysisArea(analysisArea);
                        }));
                    }
                },
                /**
                 * @private
                 * This will create draw toolbar on the map
                 */
                _createToolbar: function (map) {
                    this._toolbar = new Draw(this._map);
                    connect.connect(this._toolbar, "onDrawEnd", this._addToMap);
                },
                /**
                 * @private
                 * This will add graphic layer on the map.
                 */
                _addToMap: function (geometry) {
                    this._toolbar.deactivate();
                    this._map.showZoomSlider();
                    var symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                        new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]));
                    var graphic = new Graphic(geometry, symbol);
                    this._map.graphics.add(graphic);
                    this._aoiPolygon = geometry;
                },
                /**
                 * @private
                 * This will active draw polygon tool after
                 * the user click Draw Area button.
                 */
                _drawExtent: function () {
                    this._map.reposition();
                    this._map.graphics.clear();
                    //_toolbar.activate(esri.toolbars.Draw.FREEHAND_POLYGON);
                    this._toolbar.activate(Draw.POLYGON);
                },

                /**
                 * @private
                 * This will clear exent on the map after the user click Clear Extent button
                 */
                _clearExtent: function () {
                    this._map.graphics.clear();
                    this._aoiPolygon = null;
                },
                /**
                 * @private
                 * This will enable/disable the textbox associated with 'Every ... day'
                 * radio button depending on OPTIONS radio buttons selection
                 */
                _optionsTextBox: function () {

                    if (this.optionsEveryDayRadio.checked == true) {
                        this.everyDayTxtEntry.set("disabled", false);
                        this.everyDayTxtEntry.focus();
                    }
                    else {
                        this.everyDayTxtEntry.set("disabled", true);
                    }
                },
                /**
                 * @private
                 * This will show/hide Date and Time Picker row depending on
                 * STARTING radio button selection and populates the Date and Time fields with
                 * current time when the row is displayed
                 */
                _showHideDateTimeRow: function () {
                    if (this.startingNowRadio.checked == true) {
                        domStyle.set(this.startingDateTimeRow, 'display', 'none');
                    }
                    else {
                        domStyle.set(this.startingDateTimeRow, 'display', '');
                        if (this._formModify == false)
                          registry.byId(this.id + "_startingTime").set("value", new Date()); 
                    }
                },
                _getWorkspaceParams: function () {
                    var prodWorkspaceParam = [];
                    if (this.workspaceList.value != "Select Workspace") {
                        prodWorkspaceParam = this.workspaceList.value.split(",");
                    }
                    return prodWorkspaceParam;
                },
                /**
                 * @private
                 * This will get the maximum number of executions based on the value entered
                 * in Recurring text box.
                 */
                _getMaxExecutions: function () {
                    if (this.runRecurringCheckBox.checked) {
                        return this.recurringTxtEntry.value;
                    }
                    else if (this.runOnceRadio.checked)
                    {
                        return 1;
                    }
                    return null;
                },

                /**
                 * @private
                 * This will pass parameters to Daily and Weekly Cron expression
                 * functions depending on the state of the radio buttons
                 */
                _getCronExpression: function () {
                    var startTime = this._getStartTime();
                    if (this.runRecurringRadio.checked) {

                        //Daily recurrence
                        if (this.intervalDailyRadio.checked) {
                            //Cron expression for daily recurrence
                            return CronHelper.createDailyCronExpression(this.optionsEveryWeekdayRadio.checked, this.everyDayTxtEntry.value, startTime, null);
                        }
                        //Weekly recurrence
                        else if (this.intervalWeeklyRadio.checked) {
                            var daysInWeek = "";
                            //get the elements with name attribute as options2 and that are checked
                            var elements = query("[name=options2]:checked, this.id");

                            query("[name=options2]:checked, this.id").forEach(function (elements) {
                                if (daysInWeek.length <= 0)
                                    daysInWeek = elements.value.toUpperCase();
                                else
                                    daysInWeek += "," + elements.value.toUpperCase();
                            });
                            //get weekly Cron expression
                            return CronHelper.createWeeklyCronExpression(daysInWeek, startTime);
                        }
                        //Monthly recurrence
                        else if (this.intervalMonthlyRadio.checked) {
                            return CronHelper.createMonthlyCronExpression(startTime, this.dayofMonthTxtEntry.value, this.EveryMonthTxtEntry.value);
                        }
                    }
                    else if (this.runOnceRadio.checked) {
                        var startDate = this._getStartDate();
                        return CronHelper.createDailyCronExpression(false, 1, startTime, startDate);
                    }
                    return null;
                },
                /**
                 * @private
                 * This will get the starting date in UTC format
                 */                
                _getStartDate: function () {
                    var startDate = null;
                    var date = null;
                    if (this.startingSpecifiedRadio.checked) {
                        date = this.startingDate.value;
                        //Date passed in local format. Convert to UTC
                        if (settings.clientTimeUTC === false){
                                 var options = {
                                    selector: "date",
                                    zulu: true,
                                    datePattern: "MM/dd/yyyy"
                                 };
                                startDate = stamp.toISOString(date, options);
                          }
                          else{
                               startDate = locale.format(date, {datePattern: this._dateFormat, selector: "date"});
                          }                        
                    }
                    else {
                        date = new Date();
                        var options = {
                            selector: "date",
                            zulu: true,
                            datePattern: "MM/dd/yyyy"
                        };
                        startDate = stamp.toISOString(date, options);
                    }
                    return startDate;
                },
                /**
                 * @private
                 * This will get the starting time in UTC 24 Hr format
                 */
                _getStartTime: function () {
                    var time, startDate;

                    if (this.startingSpecifiedRadio.checked) {
                         startDate = this.startingDate.value;
                         //update time for startDate
                         startDate.setHours(this.startingTime.value.getHours());
                         startDate.setMinutes(this.startingTime.value.getMinutes());
                         startDate.setSeconds(this.startingTime.value.getSeconds());
                         startDate.setMilliseconds(this.startingTime.value.getMilliseconds());
                        if (settings.clientTimeUTC === false) {
                            var options = {
                                selector: "time",
                                zulu: true,
                                timePattern:"HH:mm"
                            };
                            time=stamp.toISOString(startDate,options);
                            time=time.replace('T','');
                        }
                        else {
                            time = locale.format(startDate, {timePattern: this._timeFormat24Hour, selector: "time"});
                        }                        
                    }
                    else{
                        //adding a minute as a buffer for now schedule
                        var startDate = new Date();
                        startDate = date.add(startDate, "minute", 1); 
                        var options = {
                            selector: "time",
                            zulu: true,
                            timePattern:"HH:mm"
                        };
                        time=stamp.toISOString(startDate,options);
                        time=time.replace('T','');                        
                    }
                    return time;
                },

                _getAnalysisArea: function () {
                    var prodWorkspaceParam = this._getWorkspaceParams();
                    if (this.extentSpatialRadio.checked) {
                        if (this._aoiPolygon != null) {
                            if (prodWorkspaceParam.length == 0 || prodWorkspaceParam[1] == "")
                                return this._aoiPolygon;
                            else {
                                var deferred;
                                if (prodWorkspaceParam[2]) {
                                    deferred = this.projectAnalysisArea(this._aoiPolygon, prodWorkspaceParam[1], prodWorkspaceParam[2])
                                }
                                else {
                                    deferred = this.projectAnalysisArea(this._aoiPolygon, prodWorkspaceParam[1])
                                }
                                return deferred;
                            }
                        }
                        else {
                            this.extentWholeRadio.set("checked", true);
                        }
                    }
                },
                projectAnalysisArea: function (analysisArea, outputSR, datumTransformation) {
                    var inputpolygon = new Polygon(analysisArea);
                    var geometryService = GeometryService(settings.geometryServiceUrl);
                    var outSR = new SpatialReference({
                        wkid: parseInt(outputSR)
                    });
                    var prjParams = new ProjectParameters();
                    prjParams.geometries = [inputpolygon];
                    prjParams.outSR = outSR;
                    if (datumTransformation && datumTransformation != null) {
                        prjParams.transformation = {
                            wkid: parseInt(datumTransformation)
                        }
                    }
                    var deferred = geometryService.project(prjParams);
                    return deferred;
                },
                _checkForUserToken: function () {
                    var user;
                    topic.publish("getLoggedInUser", function (usr) {
                        user = usr;
                    });
                    if (user != null && user.token != null) {
                        var userTokenFormInput = dom.byId(this.userToken);
                        userTokenFormInput.value = user.token;
                    }
                },

                _validateForm: function () {
                    var validateMainForm = this.addBVForm.validate();
                    if (has("ie") < this._IEFileUploadSupportVersion && (this.selectedFile.value == null || this.selectedFile.value == "")) {
                        topic.publish("addLoggingError", "No file selected");
                        validateMainForm = false;
                    }
                    return validateMainForm;
                },

                /**
                 * Submits the job to the server.
                 */
                _onSubmit: function () {
                    this._checkForUserToken();
                    if (this._validateForm()) {
                        if (this.isWeekDaySelected()) {
                            var batchJobFileItemId = null;
                            var bvJobParamters = null;
                            if (this.extentSpatialRadio.checked && this._aoiPolygon == null) {
                                topic.publish("addLoggingError", this.nls.aoiMessage);
                                return;
                            }
                            var analysisArea = this._getAnalysisArea();
                            if (typeof analysisArea === "object" && analysisArea.promise) {
                                analysisArea.then(lang.hitch(this, function (outputPolygon) {
                                    var projectedPolygon = new Polygon(outputPolygon[0]);
                                    if (this.rbjFileName.value == this._batchFileName) {
                                        bvJobParamters = this._updateBatchValidationObject(null, projectedPolygon);
                                        return this.onSubmit(bvJobParamters, this._jobId);
                                    }
                                    else {
                                        batchJobFileItemId = this._uploadBatchJob();
                                        batchJobFileItemId.addCallback(lang.hitch(this, function (result) {
                                            if (result != null) {
                                                bvJobParamters = this._updateBatchValidationObject(this._batchJobFileItemId, projectedPolygon);
                                                if (this._jobId != null)
                                                    return this.onSubmit(bvJobParamters, this._jobId);
                                                else
                                                    return this.onSubmit(bvJobParamters);
                                            }
                                        }));
                                    }
                                }), lang.hitch(this, function (error) {
                                    topic.publish("addLoggingError", error.message);
                                }));
                            }
                            else {
                                if (this._jobId != null && this.rbjFileName.value == this._batchFileName) {
                                    bvJobParamters = this._updateBatchValidationObject(this._batchJobFileItemId, analysisArea);
                                    return this.onSubmit(bvJobParamters, this._jobId);
                                }
                                else {
                                    batchJobFileItemId = this._uploadBatchJob();
                                    batchJobFileItemId.addCallback(lang.hitch(this, function (result) {
                                        if (result != null) {
                                            bvJobParamters = this._updateBatchValidationObject(this._batchJobFileItemId, analysisArea);
                                             if (this._jobId != null){
                                                return this.onSubmit(bvJobParamters, this._jobId);
                                            }
                                            else{
                                                return this.onSubmit(bvJobParamters);
                                            }
                                        }
                                    }));
                                }
                            }
                        }
                        else {
                            topic.publish("addLoggingError", this.nls.weeklyScheduleValidationMessage);

                        }
                    }
                },
                /**
                 * @private
                 * This will update the batchValidationJob property based on
                 * what is in the form.
                 */
                _updateBatchValidationObject: function (batchJobFileItemId, analysisArea) {
                    var batchValidationParam = new BatchValidationParameters();
                    batchValidationParam.title = this.titleTxtEntry.value;
                    //Set the cron expression from the cron expression utility
                    batchValidationParam.cronExpression = this._getCronExpression();
                    batchValidationParam.maxNumberOfExecutions = this._getMaxExecutions();
                    batchValidationParam.sessionString = this.sessionDropDown.value;
                    batchValidationParam.changedFeaturesOnly = this.optionChangedFeaturesOnlyCheckBox.checked;
                    var prodWorkspaceParam = this._getWorkspaceParams();
                    batchValidationParam.productionWorkspace = prodWorkspaceParam[0];
                    batchValidationParam.analysisArea = analysisArea;

                    var user;
                    topic.publish("getLoggedInUser", function (usr) {
                        user = usr;
                    });
                    if (user == null || user.username == "") {
                        user = {};
                        user.username = settings.publishJobUsername != null ? settings.publishJobUsername : "Publisher";
                    }
                    if (this._jobId == null)
                    	batchValidationParam.createdBy = user.username;
                    if (batchJobFileItemId) {
                        batchValidationParam.fileItemId = batchJobFileItemId;
                    }
                    return batchValidationParam;
                },

                _setBatchJobProperties: function (batchJobParameter) {
                    if (batchJobParameter != null) {
                        this.titleTxtEntry.set("value", batchJobParameter.parameters[0].title);
                        this.rbjFileName.set("value", batchJobParameter.parameters[0].batchJobFileName);
                        this._jobId = batchJobParameter.jobId[0];
                        this._batchFileName = batchJobParameter.parameters[0].batchJobFileName;
                        if (batchJobParameter.parameters[0].analysisArea != null)
                            this._setSelectionAreaonMap(batchJobParameter.parameters[0].analysisArea);
                        if (batchJobParameter.parameters[0].changedFeaturesOnly == true)
                            this.optionChangedFeaturesOnlyCheckBox.set("checked", true);
                         if (batchJobParameter.parameters[0].maxNumberOfExecutions != null) {
                            this.runRecurringCheckBox.set("checked", true);
                            this.recurringTxtEntry.set("value", batchJobParameter.parameters[0].maxNumberOfExecutions);
                        }
                        //}
                        this._setIntervalRadio(batchJobParameter.parameters[0].cronExpression)
                    }
                },
                _setIntervalRadio: function (cronExpression) {
                    var cronArray = cronExpression.split(" ");
                    var jobSchedule = CronHelper.getCronType(cronExpression);
                    if (jobSchedule == CronHelper.cronTypeEnum.Daily) {
                        this.runRecurringRadio.set("checked", true);
                        this._setDailyOptions(cronArray[3], cronArray[5]);
                        this._setSpecificTime(cronArray[1], cronArray[2]);
                    }
                    else if (jobSchedule == CronHelper.cronTypeEnum.Weekly) {
                        this.runRecurringRadio.set("checked", true);
                        this._setWeeklyOptions(cronArray[5]);
                        this._setSpecificTime(cronArray[1], cronArray[2]);
                    }
                    else if (jobSchedule == CronHelper.cronTypeEnum.Monthly) {
                        this.runRecurringRadio.set("checked", true);
                        this._setMonthlyOptions(cronArray[3], cronArray[4]);
                        this._setSpecificTime(cronArray[1], cronArray[2]);
                    }
                    else if (jobSchedule == CronHelper.cronTypeEnum.Yearly) {
                        this.runOnceRadio.set("checked", 'checked');
                        this._setSpecificTime(cronArray[1], cronArray[2], cronArray[3], cronArray[4], cronArray[6]);
                    }
                },
                _setSelectionAreaonMap: function (analysisArea) {
                    this.extentSpatialRadio.set("checked", true);
                    if (this._map == null) {
                        this._showHideMap(analysisArea);
                    }
                    else {

                        this._drawAnalysisArea(analysisArea)
                    }
                },
                _drawAnalysisArea: function (analysisArea) {
                    var polygon = new Polygon(analysisArea);
                    var sfs = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                        new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT,
                            new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]));
                    this._map.graphics.clear();
                    if (polygon.spatialReference == this._map.spatialReference) {
                        this._map.graphics.add(new Graphic(polygon, sfs, null, null));
                        this._map.setExtent(polygon.getExtent());
                        this._aoiPolygon = polygon;
                    }
                    else {
                        deferred = this.projectAnalysisArea(analysisArea, this._map.spatialReference.wkid);
                        deferred.then(lang.hitch(this, function (outputPolygon) {
                            polygon = new Polygon(outputPolygon[0]);
                            this._map.graphics.add(new Graphic(polygon, sfs, null, null));
                            this._map.setExtent(polygon.getExtent());
                            this._aoiPolygon = polygon;
                        }), function (error) {
//                            topic.publish("showStatusMessage", error.message);
                            topic.publish("addLoggingError", error.message);
                            //  alert(error.message)
                        });
                        //deferred.addErrBack(;
                    }
                },
                _setDailyOptions: function (dayOfMonth, weekDay) {
                    var day = dayOfMonth.split("/");
                    this.intervalDailyRadio.set("checked", 'checked');

                    if (dayOfMonth == "?")
                        this.optionsEveryWeekdayRadio.set("checked", 'checked');
                    else {
                        this.optionsEveryDayRadio.set("checked", 'checked');
                        this.everyDayTxtEntry.set("value", day[1]);
                    }
                },
                _setWeeklyOptions: function (weekDays) {
                    this.intervalWeeklyRadio.set("checked", 'checked');
                    domStyle.set(this.optionsWeeklyRow, 'display', '');
                    query('[name=\"options2\"]').forEach(function (chkbox) {
                        if (weekDays.indexOf(chkbox.value.toUpperCase()) > -1) {
                            registry.getEnclosingWidget(chkbox).set("checked", 'checked');
                        }
                    });

                },
                _setMonthlyOptions: function (dayOfMonth, monthInterval) {
                    var month = monthInterval.split("/");
                    this.intervalMonthlyRadio.set("checked", 'checked');
                    this.dayofMonthTxtEntry.set("value", dayOfMonth);
                    this.EveryMonthTxtEntry.set("value", month[1]);
                },
                _setSpecificTime: function (minutes, hours, dayOfMonth, month, year) {
                    this.startingSpecifiedRadio.set("checked", 'checked');
                    
                    if (dayOfMonth && month && dayOfMonth.indexOf("/") == -1 && month.indexOf("/") == -1 && dayOfMonth.indexOf("*") == -1 && month.indexOf("*") == -1) {
                        if (year == "")
                            year = new Date().getFullYear();
                        var jobStartDate = new Date(year, (month - 1), dayOfMonth);
                        this.startingDate.set("value", jobStartDate);
                    }
                    //else {
                        //this.startingDate.set("value", new Date());
                        var jobStartTime = stamp.fromISOString("T" + hours + ":" + minutes + ":00");
                        this.startingTime.set("value", jobStartTime);
                        //registry.byId(this.id + "_startingTime").set("value", new Date()); 
                  //  }

                },
                onSubmit: function (job) {
                    //Extension point, developer using this widget would implement this
                    // if they wanted to do anything special if the user submits the form.
                    // The main use would be to actually submit the job to the server.
                },
                isWeekDaySelected: function () {
                    var weekDayIsSelected = false;
                    if (this.intervalWeeklyRadio.get("checked")) {
                        query('[name=\"options2\"]').forEach(function (chkbox) {
                            if (chkbox.checked) {
                                weekDayIsSelected = true;
                            }
                        });
                        return weekDayIsSelected;
                    }
                    else {
                        return true;
                    }
                },
                /*
                 * populates session strings
                 */
                populateSessionList: function (sessionString) {
                    var deferred = _batchValidationTask.getReviewerSessions();
                    deferred.then(lang.hitch(this, function (sessionList) {
                        var reviewerSessions = sessionList.reviewerSessions;
                        dom.byId(this.id + "_sessionDropDown").options.length = 0;
                        for (var i = 0; i < reviewerSessions.length; i++) {
                            dom.byId(this.id + "_sessionDropDown")[i] = new Option(reviewerSessions[i].toString(), reviewerSessions[i].toString());
                            if (sessionString != null && sessionString == reviewerSessions[i].toString())
                                dom.byId(this.id + "_sessionDropDown").selectedIndex = i
                        }
                    }), function (error) {
                        topic.publish("addLoggingError", (error.message || "Error connecting to server"));
                    });
                },
                /*
                 * populates production workspace
                 */
                populateProductionWorkspaceList: function (prodWorkspace) {
                    dom.byId(this.id + "_workspaceList").options.length = 0;
                    dom.byId(this.id + "_workspaceList")[0] = new Option("Select Workspace", "Select Workspace");
                    for (i = 0; i < settings.dataWorkspaces.length; i++) {
                        dom.byId(this.id + "_workspaceList")[i + 1] = new Option(settings.dataWorkspaces[i].name, settings.dataWorkspaces[i].path + "," + settings.dataWorkspaces[i].spatialReference + "," + settings.dataWorkspaces[i].transformation);
                        if (prodWorkspace != null && prodWorkspace == settings.dataWorkspaces[i].path)
                            dom.byId(this.id + "_workspaceList").selectedIndex = i + 1
                    }
                }
            });
    });
