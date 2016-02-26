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
    "dojo/dom-style",
    "dojo/_base/lang",
    "dijit/registry",
    "dojo/on",
    "dojo/topic",
    "dojo/text!./ScheduledJobDetailsPanel/templates/ScheduledJobDetailsPanel.html",
    "dojo/i18n!./ScheduledJobDetailsPanel/nls/ScheduleDetailsResource",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "esri/tasks/datareviewer/BatchValidationTask",
    "util/CronHelper",
    "bvroot/settings", "dijit/Dialog",
    "dijit/layout/ContentPane",
    "dijit/form/Button",
    "dojo/dom"
],
    function (declare, domStyle, lang, registry, on, topic, template, i18n, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, BatchValidationTask, CronHelper, settings,Dialog) {
        return    declare("bvmanager.dijit.ScheduledJobDetailsPanel", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],
            {
                widgetsInTemplate: true,
                templateString: template,
                _scheduledJobs: null,
                localization: null,
                _cronSchedule: null,
                _batchValidationJob: null,
                _batchValidationTask: null,
                constructor: function () {
                    this.localization = i18n;
                    this._showScheduledJobDetail = lang.hitch(this, this._showScheduledJobDetail);
                    _batchValidationTask = new BatchValidationTask(settings.drsSoeUrl);
                    this._errorHandler = lang.hitch(this, this._errorHandler);
                },
                startup: function () {
                    on(registry.byId("deleteButton"), "click", lang.hitch(this, this._deleteBatchValidationJob));
                    on(this.modifyButton, "click", lang.hitch(this, this._openScheduleJobDialog));
                    topic.subscribe("scheduledJobDetails", lang.hitch(this, function (batchValidationJob) {
                        this._setJobDetailsPanelSelected();
                        this._showScheduledJobDetail(batchValidationJob);
                        this._batchValidationJob = batchValidationJob;
                    }));
                    topic.subscribe("resetDetailPanel", lang.hitch(this, function () {
                        this._setJobDetailsPanelSelected(true);
                    }));

                },
                _setJobDetailsPanelSelected: function (deselect) {
                    if (deselect) {
                        this.domNode.className = "bvmPanelDefault bvmPanelDescription";
                    }
                    else {
                        this.domNode.className = "bvmPanelDefault";
                    }
                },
                /*
                 * This function displays the scheduled job details
                 */
                _showScheduledJobDetail: function (batchValidationJob) {
                    var batchValidationParameters = batchValidationJob.parameters[0];
                    this._setDetailsText(this.batchJobTitle, batchValidationJob.parameters[0].title);
                    this._setDetailsText(this.batchJobFileName, batchValidationParameters.batchJobFileName, fileNameLabel, this.localization.fileNameLabel);
                    this._setDetailsText(this.batchJobSessionId, batchValidationParameters.sessionString, sessionIdLabel, this.localization.sessionIdLabel);
                    this._setDetailsText(this.batchJobSchedule, this._getCronSchedule(batchValidationParameters.cronExpression), scheduleLabel, this.localization.jobScheduleLabel);
                    this._setDetailsText(this.batchJobScheduledBy, batchValidationParameters.createdBy, scheduledByLabel, this.localization.scheduledByLabel);
                    this._setDetailsText(this.batchJobProductionWorkspace, batchValidationParameters.productionWorkspace, productionWorkspaceLabel, this.localization.productionWorkspace)
                },
                /*
                 * sets the text of the divs and labels
                 */
                _setDetailsText: function (div, detailText, label, labelText) {
                    div.innerHTML = detailText;
                    div.title = detailText;
                    if (label)
                        label.innerHTML = labelText;
                },
                /*
                 * This function gets the cron schedule
                 */
                _getCronSchedule: function (cronString) {
                    //this._cronSchedule=new CronHelper();
                    if (CronHelper.getCronType(cronString) == CronHelper.cronTypeEnum.Hourly)
                        return "Hourly";
                    else if (CronHelper.getCronType(cronString) == CronHelper.cronTypeEnum.Daily)
                        return "Daily";
                    else if (CronHelper.getCronType(cronString) == CronHelper.cronTypeEnum.Weekly)
                        return "Weekly";
                    else if (CronHelper.getCronType(cronString) == CronHelper.cronTypeEnum.Monthly)
                        return "Monthly";
                    else if (CronHelper.getCronType(cronString) == CronHelper.cronTypeEnum.Yearly)
                        return "Yearly";
                    else if (CronHelper.getCronType(cronString) == CronHelper.cronTypeEnum.Unknown)
                        return "Unknown";
                },
                /*
                 * This function deletes the selected job
                 */
                _deleteBatchValidationJob: function () {
                	if (confirm(this.localization.confirmDeleteJob)) {
	                    if (this._batchValidationJob != null && this._batchValidationJob !== undefined) {
	                        var deferred = _batchValidationTask.deleteJob(this._batchValidationJob.jobId);
	                        deferred.then(lang.hitch(this, function (result) {
	                            if (result.deleted == true) {
	                                topic.publish("refreshJobsList");
	                                this._setJobDetailsPanelSelected();
	                            }
	                            else {
	                                this._errorHandler()
	                            }
	                        }), lang.hitch(this, function (err) {
	                            this._errorHandler(err)
	                        }))
	                    }
                    }
                },
                _openScheduleJobDialog: function () {
                    var dialog = registry.byId("batchValidationEditorDialog");
                    if (this._batchValidationJob.status[0] == this.localization.jobFinishedStatus) {
                        topic.publish("addLoggingInfo", this.localization.messageFinishedJob);
                    }
                    else {
                        if (dialog) {
                            dialog.show(this._batchValidationJob);
                        }
                    }
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

	

