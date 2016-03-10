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
        "dojo/_base/array",
        "dijit/registry",
        "dojo/on",
        "dojo/topic",
        "dojo/date",
        "dojo/date/locale",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_WidgetsInTemplateMixin",
        "dojo/text!./JobExecutionList/templates/JobExecutionList.html",
        "dojo/i18n!./JobExecutionList/nls/JobExecutionListResource",
        "drs/BatchValidationTask",
        "util/CronHelper",
        "drs/ReviewerResultsTask",
        "bvroot/settings",
        "dojo/data/ItemFileReadStore",
        "dojox/grid/DataGrid",
        "dijit/form/CheckBox",
        "dijit/form/FilteringSelect"
    ],
    function (declare, lang, array, registry, on, topic, date, locale, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, template, i18n, BatchValidationTask, CronHelper, ReviewerResultsTask, settings, ItemFileReadStore, DataGrid, CheckBox, FilteringSelect) {
        return declare("bvmanager.dijit.JobExecutionList", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
            templateString: template,
            /**
             * BatchValidation Task
             * @type esri.reviewer.BatchValidationTask
             * @see esri.reviewer.BatchValidationTask
             */
            _batchValidationTask: null,
            /**
             * BatchValidation Task;
             * @type esri.reviewer.BatchValidationTask
             * @see esri.reviewer.BatchValidationTask
             */
            _reviewerResultsTask: null,
            /**
             * Represents data store which contains scheduled jobs array
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
            /*
             * Represents the jobExecutionGrid
             */
            jobExecutionsGrid: null,
            /*
             * Represents the id of the refresh interval set by setinterval method
             */
            _autoRefreshInterval: null,

            constructor: function () {
                //gets the jobExecutions
                this.localization = i18n;
                this._refreshJobExecutionList = lang.hitch(this, this._refreshJobExecutionList);
                this._getScheduledJobList = lang.hitch(this, this._getScheduledJobList);
                this._getJobExecutionList = lang.hitch(this, this._getJobExecutionList);
                this._getBatcRunDetails = lang.hitch(this, this._getBatcRunDetails);

            },
            startup: function () {
                this._batchValidationTask = new BatchValidationTask(settings.drsSoeUrl);
                this._reviewerResultsTask = new ReviewerResultsTask(settings.drsSoeUrl);
                this._createGrid();
                this._getScheduledJobList();
                this.subscribeEvents();
            },
            subscribeEvents: function () {
                topic.subscribe("checkAutoRefreshToggle", lang.hitch(this, function (chkboxState) {
                    this._toggleAutoUpdateJobExection(chkboxState)
                }));
                topic.subscribe("applyFilter", lang.hitch(this, function (filterError, dateFilter) {
                    this._applyFilters(filterError, dateFilter)
                }));
                topic.subscribe("refreshJobsList", lang.hitch(this, function () {
                    topic.publish("addLoggingInfo", "Refreshing job execution list");
                    //topic.publish("resetExecutionDetailsPanel");
                    var grid = registry.byId("jobExecutionGrid");
                    grid.selection.clear();
                    this._getScheduledJobList();
                }));
            },
            /*
             * Fetches the scheduled jobs list using the getScheduledJobsList method from DRS JS API
             */
            _getScheduledJobList: function () {
                var deferred = this._batchValidationTask.getScheduledJobsList();
                deferred.then(lang.hitch(this, lang.hitch(this, this._getJobExecutionList)), lang.hitch(this, function (error) {
                    this._errorHandler(error);
                }));
            },
            /*
             * Fetches the batch run ids and execution details based on job status
             */
            _getJobExecutionList: function (scheduledJobsList) {
                topic.publish("addLoggingInfo", "Populating job schedule list");
                var jobExecutionList = [];
                var uniqueId = 0;
                array.forEach(scheduledJobsList.scheduledJobs, lang.hitch(this, function (item, i) {
                    uniqueId += 1;
                    if (item.hasOwnProperty("executionDetails") === true && item.status.toLowerCase() == "executing") {
                        jobExecutionList.push({id: uniqueId, jobId: item.jobId, title: item.parameters.title, parameters: item.parameters, batchRunId: item.status.toLowerCase(), batchRunStartTime: item.executionDetails.startTimeUTC, batchRunEndTime: this.getEpochTime(item.executionDetails.finishTimeUtc), batchRunStatus: item.status.toLowerCase()});
                    }
                    if (item.hasOwnProperty("batchRunIds") === true) {
                        array.forEach(item.batchRunIds, function (batchRunId, idx) {
                            uniqueId += 1;
                            jobExecutionList.push({id: uniqueId, jobId: item.jobId, title: item.parameters.title, parameters: item.parameters, batchRunId: batchRunId.substring(1, batchRunId.length - 1)});
                        });
                    }
                    else if (item.hasOwnProperty("executionDetails") === true && item.executionDetails.status.toLowerCase() == "failed") {
                        jobExecutionList.push({id: uniqueId + 1, jobId: item.jobId, title: item.parameters.title, parameters: item.parameters, batchRunId: item.executionDetails.status.toLowerCase(), batchRunStartTime: item.executionDetails.startTimeUTC, batchRunEndTime: this.getEpochTime(item.executionDetails.finishTimeUtc), batchRunStatus: item.executionDetails.status.toLowerCase()});
                    }
                }));
                this._getBatchRunDetails(jobExecutionList);
            },
            /*
             * Fetches the start time, end time and status of based on batch run id's
             */
            _getBatchRunDetails: function (jobExecutionList) {
                var batchRunIds = [];
                array.forEach(jobExecutionList, function (item, idx) {
                    if (item.batchRunId != "executing" && item.batchRunId != "failed")
                        batchRunIds.push(item.batchRunId)
                });
                if (batchRunIds.length > 0) {
                    var deferred = this._reviewerResultsTask.getBatchRunDetails(batchRunIds);
                    deferred.then(lang.hitch(this, function (response) {
                        var idx = 0;
                        var features = response.featureSet.features;
                        array.forEach(jobExecutionList, function (item, idx) {
                            if (item.batchRunId != "executing" && item.batchRunId != "failed") {
                                array.forEach(features, function (feature, i) {
                                    if ("{" + item.batchRunId + "}" == feature.attributes.batchRunId) {
                                        item.batchRunStartTime = feature.attributes.batchRunStartTime;//new Date(feature.attributes.batchRunStartTime);
                                        item.batchRunEndTime = feature.attributes.batchRunEndTime;//new Date(feature.attributes.batchRunEndTime);
                                        item.batchRunStatus = feature.attributes.batchRunStatus;
                                        item.totalValidated = feature.attributes.totalValidated;
                                        item.totalResults = feature.attributes.totalResults;
                                        item.batchRunId = feature.attributes.batchRunId;
                                    }
                                });
                            }
                        });
                        this._refreshJobExecutionList(jobExecutionList);
                    }), lang.hitch(this, function (error) {
                        this._errorHandler(error);
                    }))
                }
                else {
                    this._refreshJobExecutionList(jobExecutionList);
                }
            },
            getEpochTime: function (dateStr) {
                if (dateStr !== undefined)
                    return (dateStr.getTime() - dateStr.getMilliseconds());
                else
                    return "execute";
            },
            /**
             * This function creates an empty grid and adds the columns
             */
            _createGrid: function () {
                var data = {
                    items: []
                };
                this._dataStore = new ItemFileReadStore({data: data});
                //Column names of the Grid
                var layout = [
                    [
                        {name: this.localization.jobIdColumnName, field: 'jobId', hidden: true },
                        {name: this.localization.statusColumnName, field: 'batchRunStatus', formatter: lang.hitch(this, this._setStatusColumn), width: '25px', noresize: true},
                        {name: this.localization.executionStartTime, field: 'batchRunStartTime', formatter: this._getExecutionDateTime, width: '150px', noresize: true},
                        {name: this.localization.executionEndTime, field: 'batchRunEndTime', formatter: this._getExecutionDateTime, width: '140px', noresize: true},
                        //{name: this.localization.executionEndTime, field: 'batchRunEndTime',width:'140px',noresize:true},
                        {name: this.localization.jobTitleColumnName, field: 'title', width: '175px', noresize: true},
                        {name: this.localization.scheduleColumnName, field: 'parameters', formatter: this._getCronSchedule, width: '90px', noresize: true},
                        {name: 'BatchRunId', field: 'batchRunId', hidden: true},
                        {name: 'id', field: 'id', hidden: true}
                    ]
                ];
                this.jobExecutionGrid = new DataGrid({
                    id: 'jobExecutionGrid',
                    store: this._dataStore,
                    structure: layout,
                    selectionMode: 'single',
                    selectable: true,
                    autoHeight: 19,
                    sortInfo: '-3',
                    autoWidth: true,
                    canSort: function (index) {
                        if (index == 2) {
                            return false;
                        }
                        return true;
                    }
                }, "grid");
                var grid = registry.byId("jobExecutionGrid");
                this.jobExecutionGrid.startup();
                on(registry.byId("jobExecutionGrid"), "rowClick", lang.hitch(this, this._fetchJobExecutionDetails));
            },
            /**
             * This function refreshes the grid with the latest list of scheduled jobs
             */
            _refreshJobExecutionList: function (jobExecutionList) {
                var data = {
                    label: 'jobId',
                    items: jobExecutionList
                };
                this._dataStore = new ItemFileReadStore({data: data});
                this._dataStore.comparatorMap = {};
                //globalized sorting on Schedule Column
                this._dataStore.comparatorMap["parameters"] = lang.hitch(this, function (currentVal, nextVal) {
                    var currentSchedule = this._getCronSchedule(currentVal);
                    var nextSchedule = this._getCronSchedule(nextVal);
                    return currentSchedule.toLowerCase().localeCompare(nextSchedule.toLowerCase());
                });

                /*Refresh existing grid*/
                var grid = registry.byId("jobExecutionGrid");
                grid.selection.clear();
                grid.setStore(this._dataStore);
                grid.focus.doContextMenu = function () {
                };
                grid.onRowContextMenu = function () {
                };
                grid.onHeaderContextMenu = function () {
                };
                var filterAllOption = registry.byId("filterAllExecutions");
                var dateFilter = registry.byId("filterExecutionByDate").attr('value');
                this._applyFilters(filterAllOption.checked + ',' + dateFilter);

            },
            _fetchJobExecutionDetails: function (evt) {
                var grid = registry.byId("jobExecutionGrid");
                var uniqueId = grid._getItemAttr(evt.rowIndex, 'id');
                if (this._dataStore != null && this._dataStore !== undefined) {
                    this._dataStore.fetch({query: { 'id': uniqueId}, onComplete: function (array) {
                        topic.publish("jobExecutionDetails", array[0]);
                    }});
                }
            },
            /*
             * Formatter function of the status column
             */
            _setStatusColumn: function (value) {
                if (value != null && value !== undefined) {
                    if (value == 0)
                        return "<div class='icon icon_check icon_check_green' title='" + this.localization.successStatus + "'></div>";
                    else if (value == 1)
                        return "<div class='icon icon_error icon_error_red' title='" + this.localization.successWithError + "'></div>";
                    else if (value == 2)
                        return "<div class='icon icon_warning icon_warning_gold' title='" + this.localization.successWithWarnings + "'></div>";
                    else if (value == 3)
                        return "<div class='icon icon_error icon_error_red' title='" + this.localization.successWithErrorandWarnings + "'></div>";
                    else if (value == 4)
                        return "<div class='icon icon_failed icon_failed_red' title='" + this.localization.failedStatus + "'></div>";
                    else if (value == "executing")
                        return "<div class='icon icon_clock icon_clock_blue' title='" + this.localization.executingStatus + "'></div>";
                    else if (value == "failed")
                        return "<div class='icon icon_failed icon_failed_red' title='" + this.localization.failedStatus + "'></div>";
                    else    return value;
                }
            },
            /*
             * Formatter function of the execution start time and end time
             */
            _getExecutionDateTime: function (value) {
                if (value != null && value !== undefined && value != "" && value != "execute") {
                    return locale.format(new Date(value), {datePattern: "yyyy-MM-dd", timePattern: "HH:mm"});
                }
                else
                    return "...";

            },
            /*
             * Formatter function of the job title
             */
            _getTitle: function (value) {
                if (value != null && value !== undefined) {
                    if (value.hasOwnProperty("title"))
                        return value.title;
                }

            },
            /**
             * This function returns the whether the cron expresison is yearly, monthly, weekly, daily or hourly.
             * @param String value
             * @return checkbox
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
                    else
                        return null;
                }
            },
            /*
             * Toggles the auto refresh of the job execution list
             */
            _toggleAutoUpdateJobExection: function (chkboxState) {
                if (chkboxState == true) {
                    this._autoRefreshInterval = setInterval(this._getScheduledJobList, settings.jobExecutionListRefreshInterval);
                }
                else {
                    clearInterval(this._autoRefreshInterval)
                }
            },
            /*
             * This function handles the filters to be applied to the grid
             */
            _applyFilters: function (filters) {

                var filterString = filters.split(',');
                filterAllOption = filterString[0];
                selectedDateFilter = filterString[1];
                var grid = registry.byId("jobExecutionGrid");
                grid.selection.clear();
                //restoring the batchRunEndTime to riginal state to loop through all rows of the grid
                grid.filter({ batchRunEndTime: '*'});
                topic.publish("resetExecutionDetailsPanel");
                var dateFilter = this._getDateFilter(selectedDateFilter);
                if (dateFilter != "") {
                    if (filterAllOption == "true") {
                        grid.filter({batchRunStatus: '*', batchRunEndTime: new RegExp(dateFilter)});
                    }
                    else {
                        grid.filter({batchRunStatus: new RegExp('1|3|4|failed'), batchRunEndTime: new RegExp(dateFilter)});
                    }
                }
                else {
                    if (filterAllOption == "true") {
                        grid.filter({batchRunStatus: '*'});
                    }
                    else {
                        grid.filter({batchRunStatus: new RegExp('1|3|4|failed')});
                    }
                }
            },
            /*
             * This function returns the string of batchRunEndTime that satisfy the date criteria selected by user
             */
            _getDateFilter: function (selectedDateFilter) {
                var filterString = "";
                var dateFilter;
                var currentDate = new Date();
                var grid = registry.byId("jobExecutionGrid");
                if (selectedDateFilter == "0")
                    return "";
                else if (selectedDateFilter == "2")
                    dateFilter = date.add(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), '12', '00'), "day", -1);
                else
                    dateFilter = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), '12', '00');
                for (i = 0; i < grid.rowCount; i++) {
                    var batchRunEndTime = grid._getItemAttr(i, 'batchRunEndTime');
                    var batchRunEndDate;
                    if (batchRunEndTime !== undefined && batchRunEndTime != null && batchRunEndTime !== "execute")
                        batchRunEndDate = new Date(batchRunEndTime);
                    else
                        batchRunEndDate = new Date();
                    batchRunEndDate = new Date(batchRunEndDate.getFullYear(), batchRunEndDate.getMonth(), batchRunEndDate.getDate(), '12', '00');
                    if (selectedDateFilter == "1" || selectedDateFilter == "2") {
                        dateDifference = date.difference(batchRunEndDate, dateFilter, "day");
                        if (dateDifference == 0) {
                            if (filterString != "") {
                                filterString += "|"
                            }
                            filterString += grid._getItemAttr(i, 'batchRunEndTime')
                        }
                    }
                    else if (selectedDateFilter == "3") {
                        var beginDate = date.add(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), '12', '00'), "week", -1);
                        if (batchRunEndDate <= dateFilter && batchRunEndDate >= beginDate) {
                            if (filterString != "") {
                                filterString += "|";
                            }
                            filterString += grid._getItemAttr(i, 'batchRunEndTime')
                        }
                    }
                    else if (selectedDateFilter == "4") {
                        var beginDate = date.add(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), '12', '00'), "day", -30);
                        if (batchRunEndDate <= dateFilter && batchRunEndDate >= beginDate) {
                            if (filterString != "") {
                                filterString += "|";
                            }
                            filterString += grid._getItemAttr(i, 'batchRunEndTime')
                        }
                    }
                }
                if (filterString == "")
                    return "null";
                else
                    return filterString;
            },
            /*
             * error handler
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
            }
        });
    });

