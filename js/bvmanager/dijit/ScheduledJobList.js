/** @license
| Version 10.2.2
| Copyright 2014 Esri
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

define(
    [
        "dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/on",
        "dojo/_base/array",
        "dojo/topic",
        "dijit/registry",
        "dojo/data/ItemFileReadStore",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_WidgetsInTemplateMixin",
        "dojo/text!./ScheduledJobList/templates/ScheduledJobList.html",
        "dojo/i18n!./ScheduledJobList/nls/ScheduledJobListResource",
        "drs/BatchValidationTask",
        "util/CronHelper",
        "bvroot/settings",
        "dijit/form/CheckBox",
        "dijit/form/ComboBox",
        "dojox/grid/DataGrid"
    ],
    function (declare, lang, on, array, topic, registry, ItemFileReadStore, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, template, i18n, BatchValidationTask, CronHelper, settings, CheckBox, ComboBox, DataGrid) {
        return declare("bvmanager.dijit.ScheduledJobList", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            /**
             * BatchValidation Task
             * @type esri.reviewer.BatchValidationTask
             * @see esri.reviewer.BatchValidationTask
             */
            _batchValidationTask: null,
            /**
             * Represents data store which conatins scheduled jobs array
             * @type dojo.data.ItemFileReadStore
             */
            _dataStore: null,
            /**
             * Represents localization object which contains localized strings
             */
            localization: null,
            /**
             * Cron Schedule
             * @type esri.reviewer.CronExpression
             * @see esri.reviewer.CronExpression
             */
            _cronSchedule: null,
            scheduledJobsGrid: null,
            constructor: function () {
                this._batchValidationTask = new BatchValidationTask(settings.drsSoeUrl);
                this.localization = i18n;//dojo.i18n.getLocalization("bvmanager.dijit.ScheduledJobList", "ScheduledJobListResource");
                this._refreshScheduledJobsList = lang.hitch(this, this._refreshScheduledJobsList);
                this._refreshDataStore = lang.hitch(this, this._refreshDataStore);
                this._refreshButtonOnclickEvent = lang.hitch(this, this._refreshButtonOnclickEvent);
                this._fetchScheduledJobDetails = lang.hitch(this, this._fetchScheduledJobDetails);
                this._errorHandler = lang.hitch(this, this._errorHandler);
                this._setCheckBoxState = lang.hitch(this, this._setCheckBoxState);
                this._changeJobStatusScoped = lang.hitch(this, this._changeJobStatus);
            },
            startup: function () {
                on(registry.byId("refreshButton"), "click", this._refreshButtonOnclickEvent);
                on(registry.byId("filterAllOption"), "change", lang.hitch(this, this._applyFilters));
                on(registry.byId("filterActiveOption"), "change", lang.hitch(this, this._applyFilters));
                this._createGrid();
                this._createScheduledByFilter();
                var deferred = this._batchValidationTask.getScheduledJobsList();
                deferred.then(this._refreshDataStore, this._errorHandler);
                topic.subscribe("refreshJobsList", lang.hitch(this, function () {
                    var deferred = this._batchValidationTask.getScheduledJobsList();
                    deferred.then(lang.hitch(this, this._refreshDataStore), this._errorHandler);
                }));
            },
            _refreshButtonOnclickEvent: function () {
                topic.publish("addLoggingInfo", "Refreshing scheduled job list");
                var deferred = this._batchValidationTask.getScheduledJobsList();
                deferred.then(lang.hitch(this, this._refreshDataStore), this._errorHandler);
                topic.publish("resetDetailPanel");
            },
            /**
             * This function refreshes the grid with the latest list of scheduled jobs
             */
            _refreshDataStore: function (scheduledJobArray) {
                topic.publish("addLoggingInfo", "Populating scheduled job list");
                var data = {
                    identifier: 'jobId',
                    label: 'title',
                    items: scheduledJobArray.scheduledJobs
                };
                var scheduledByData = this.addScheduledByColumn(data);
                this._dataStore = new ItemFileReadStore({data: scheduledByData});
                this._dataStore.comparatorMap = {};
                //globalized sorting on Title and Schedule Column
                this._dataStore.comparatorMap["parameters"] = lang.hitch(this, function (currentVal, nextVal) {
                    var colIndex = registry.byId("scheduledJobsGrid").getSortIndex();
                    if (colIndex == 2) {
                        return currentVal.title.toLowerCase().localeCompare(nextVal.title.toLowerCase());
                    }
                    else if (colIndex == 3) {
                        var currentSchedule = this._getCronSchedule(currentVal);
                        var nextSchedule = this._getCronSchedule(nextVal);
                        return currentSchedule.toLowerCase().localeCompare(nextSchedule.toLowerCase());
                    }
                });
                this._refreshScheduledJobsList(this._dataStore);
                this._refreshFilterSelect(this._dataStore);
                lang.hitch(this, this._applyFilters());
            },
            _refreshScheduledJobsList: function (dataStore) {
                /*Refresh existing grid*/
                var grid = registry.byId("scheduledJobsGrid");
                grid.selection.clear();
                grid.setStore(dataStore);
                if (registry.byId("filterActiveOption").checked) {
                    grid.filter({
                        status: new RegExp("Scheduled|Executing")
                    });
                }
                grid.focus.doContextMenu = function () {
                };
                grid.onRowContextMenu = function () {
                };
                grid.onHeaderContextMenu = function () {
                };
                grid.startup();
            },
            _refreshFilterSelect: function (dataStore) {
                var filteringSelect = registry.byId("scheduledBySelect");
                var optionList = [];
                //check for duplicate user names
                dataStore.fetch({
                    onComplete: function (items, request) {
                        var duplicateItemArray = [];
                        optionList.push({scheduledBy: "all users"});
                        array.forEach(items, function (item, i) {
                            if (item.scheduledBy != "" && array.indexOf(duplicateItemArray, item.scheduledBy.toString().toLowerCase()) == -1)
                                optionList.push({scheduledBy: item.scheduledBy});
                            duplicateItemArray.push(item.scheduledBy.toString().toLowerCase());
                        });
                    }});
                var store = new ItemFileReadStore({data: {items: optionList}});
                filteringSelect.set("store", store);
            },
            addScheduledByColumn: function (data) {
                var scheduledBy = [];
                for (i = 0; i < data.items.length; i++) {
                    data.items[i].scheduledBy = data.items[i].parameters.createdBy.toLowerCase();
                }
                return data;
            },
            _createScheduledByFilter: function () {
                var filteringSelect = ComboBox({
                    id: "scheduledBySelect",
                    name: "scheduledBy",
                    value: "all users",
                    searchAttr: "scheduledBy",
                    store: this._dataStore,
                    autoComplete: false
                }, "scheduledBySelect");
                on(registry.byId("scheduledBySelect"), "change", lang.hitch(this, this._applyFilters));
            },
            /**
             * This function creates an empty grid and adds the columns
             */
            _createGrid: function () {
                var data = {
                    identifier: 'jobId',
                    items: []
                };
                this._dataStore = new ItemFileReadStore({data: data});
                //Column names of the Grid
                var layout = [
                    [
                        {'name': this.localization.jobIdColumnName, 'field': 'jobId', 'hidden': true },
                        {'name': this.localization.statusColumnName, 'fields': ['status', 'jobId'], 'formatter': this._setCheckBoxState, 'width': '25px', 'noresize': true},
                        {'name': this.localization.jobTitleColumnName, 'field': 'parameters', 'formatter': this._getTitle, 'width': '400px', 'noresize': true},
                        {'name': this.localization.scheduleColumnName, 'field': 'parameters', 'formatter': this._getCronSchedule, 'width': '100px', 'noresize': true},
                        {'name': this.localization.createdBy, 'field': 'scheduledBy', 'formatter': function (value) {
                            return value.toLowerCase();
                        }, 'hidden': true}
                    ]
                ];
                this.scheduledJobsGrid = new DataGrid({
                    id: 'scheduledJobsGrid',
                    store: this._dataStore,
                    structure: layout,
                    selectionMode: 'single',
                    selectable: true,
                    autoHeight: 20,
                    autoWidth: true,
                    canSort: function (index) {
                        return index != 2;

                    }
                }, "grid");
                this.scheduledJobsGrid.startup();
                on(registry.byId("scheduledJobsGrid"), "rowClick", lang.hitch(registry.byId("scheduledJobsGrid"), this._fetchScheduledJobDetails));
            },
            _getTitle: function (value) {
                if (value != null && value !== undefined) {
                    if (value.hasOwnProperty("title"))
                        return value.title;
                }
                return "";
            },
            /**
             * Event handler for fetching batch validation job w
             * hen a row is selected
             */
            _fetchScheduledJobDetails: function (event) {
                var grid = registry.byId("scheduledJobsGrid");
                var jobId = grid._getItemAttr(event.rowIndex, 'jobId');
                if (this._dataStore != null && this._dataStore !== undefined) {
                    this._dataStore.fetch({query: { 'jobId': jobId}, onComplete: function (array) {
                        topic.publish("scheduledJobDetails", array[0]);
                    }});
                }
            },
            /**
             * This function returns the checkbox based on the status of the scheduled job.
             * @param value
             * @return checkbox
             */
            _setCheckBoxState: function (value) {
                var checkBox = null;
                if (value[0].toLowerCase() == "scheduled") {
                    checkBox = new CheckBox({
                        name: value[0],
                        value: value[1],
                        checked: true,
                        title: this.localization.scheduledStatus,
                        onClick: this._changeJobStatusScoped
                    }, "checkBox");
                }
                else if (value[0].toLowerCase() == "finished") {
                    checkBox = new CheckBox({
                        name: value[0],
                        value: value[1],
                        checked: true,
                        disabled: 'disabled',
                        title: this.localization.finishedStatus
                    }, "checkBox");
                }
                else if (value[0].toLowerCase() == "disabled") {
                    checkBox = new CheckBox({
                        name: value[0],
                        value: value[1],
                        checked: false,
                        title: this.localization.disabledStatus,
                        onClick: this._changeJobStatusScoped
                    }, "checkBox");
                }
                else if (value[0].toLowerCase() == "executing") {
                    checkBox = new CheckBox({
                        name: value[0],
                        value: value[1],
                        checked: true,
                        title: this.localization.executingStatus,
                        onClick: this._changeJobStatusScoped
                    }, "checkBox");
                }
                return checkBox;
            },
            /**
             * This function returns the whether the cron expresison is yearly, monthly, weekly, daily or hourly.
             * @param value
             * @return String
             */
            _getCronSchedule: function (value) {
                if (value != null && value !== undefined) {
                    if (value.hasOwnProperty("cronExpression") && value.cronExpression != "") {
                        if (CronHelper.getCronType(value.cronExpression) == CronHelper.cronTypeEnum.Daily)
                            return "Daily";
                        else if (CronHelper.getCronType(value.cronExpression) == CronHelper.cronTypeEnum.Weekly)
                            return "Weekly";
                        else if (CronHelper.getCronType(value.cronExpression) == CronHelper.cronTypeEnum.Monthly)
                            return "Monthly";
                        else if (CronHelper.getCronType(value.cronExpression) == CronHelper.cronTypeEnum.Yearly)
                            return "Yearly";
                        else if (CronHelper.getCronType(value.cronExpression) == CronHelper.cronTypeEnum.Hourly)
                            return "Hourly";
                        else if (CronHelper.getCronType(value.cronExpression) == CronHelper.cronTypeEnum.Unknown)
                            return "Unknown";
                    }
                }
                return null
            },
            /**
             * Event handler for changing job status when checkbox is clicked
             */
            _changeJobStatus: function (evt) {
                var chkbox = evt.target;
                var checkBoxControl = registry.byId(chkbox.id);
                var deferred;
                if (chkbox.checked == true) {
                    //enable job
                    deferred = this._batchValidationTask.enableJob(chkbox.value);
                    deferred.then(lang.hitch(this, function (response) {
                        if (response.enabled != true) {
                            checkBoxControl.checked = false;
                            this._errorHandler();
                        }
                        else {
                            var deferred = _batchValidationTask.getScheduledJobsList();
                            deferred.then(this._refreshDataStore, this._errorHandler);
                        }
                    }), lang.hitch(this, function (err) {
                        checkBoxControl.checked = false;
                        this._errorHandler(err);
                    }))
                }
                else {
                    //disable job
                    deferred = this._batchValidationTask.disableJob(chkbox.value);
                    deferred.then(lang.hitch(this, function (response) {
                        if (response.disabled != true) {
                            checkBoxControl.checked = true;
                            this._errorHandler();
                        }
                        else {
                            var deferred = this._batchValidationTask.getScheduledJobsList();
                            deferred.then(this._refreshDataStore, this._errorHandler);
                        }
                    }), lang.hitch(this, function (err) {
                        checkBoxControl.checked = true;
                        this._errorHandler(err);
                    }))
                }
                evt.stopPropagation();

            },
            /**
             * This function handles the errors
             */
            _errorHandler: function (error) {
                var msg;
                if (error !== undefined && error.hasOwnProperty("message")) {
                    msg = error.message;

                }
                else {
                    msg = "Error occurred while processing request";
                }
                topic.publish("addLoggingError", msg);


            },
            _applyFilters: function (value) {
                var filteringSelect = registry.byId("scheduledBySelect");
                var filterAllOption = registry.byId("filterAllOption");
                var scheduledByName = filteringSelect.get('displayedValue').toString().toLowerCase();
                var grid = registry.byId("scheduledJobsGrid");
                grid.selection.clear();
                topic.publish("resetDetailPanel");

                if (scheduledByName != "all users" && filterAllOption.checked) {
                    grid.filter({
                        scheduledBy: scheduledByName, status: '*'
                    });
                }
                else if (scheduledByName != "all users" && filterAllOption.checked != true) {
                    grid.filter({
                        scheduledBy: scheduledByName, status: new RegExp(this.localization.scheduledStatus + "|" + this.localization.executingStatus)
                    });
                }
                else if (scheduledByName == "all users" && filterAllOption.checked != true) {
                    grid.filter({
                        status: new RegExp(this.localization.scheduledStatus + "|" + this.localization.executingStatus)
                    });
                }
                else if (scheduledByName == "all users" && filterAllOption.checked) {
                    grid.filter({
                        status: '*'
                    });
                }
            },
            uninitialize: function () {
                this._batchValidationTask = null;
                this._cronSchedule = null;
                this._dataStore = null;
                this.localization = null;
            }
        });
    });
		

