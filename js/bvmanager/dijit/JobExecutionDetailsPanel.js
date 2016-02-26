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

define(["dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/topic",
    "dojo/date",
    "dojo/on",
    "dojo/text!./JobExecutionDetailsPanel/templates/JobExecutionDetailsPanel.html",
    "dojo/i18n!./JobExecutionDetailsPanel/nls/JobExecutionDetailsResource",
    "util/CronHelper",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/registry",
    "bvroot/settings",
    "dijit/layout/AccordionContainer",
    "dijit/layout/ContentPane"
],
    function (declare, lang, topic, date, on, template, i18n, CronHelper, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, registry) {
        return declare("bvmanager.dijit.JobExecutionDetailsPanel", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
            //This grabs the template html file.
            templateString: template,
            _jobExecution: null,
            localization: null,
            _cronSchedule: null,
            _jobId: null,
            constructor: function () {
                this.localization = i18n;
                topic.subscribe("jobExecutionDetails", lang.hitch(this, function (executionDetailObject) {
                    if (executionDetailObject !== null && executionDetailObject != undefined) {
                        this._jobId = executionDetailObject.jobId[0];
                        this._setJobDetailsPanelSelected();
                        this._showJobExecutionDetail(executionDetailObject);
                        this._setJobExecutionProperties(executionDetailObject.parameters)
                    }
                    else {
                        this._setJobDetailsPanelSelected(true);
                    }
                }));
                topic.subscribe("resetExecutionDetailsPanel", lang.hitch(this, function () {
                    this._setJobDetailsPanelSelected(true);
                }));

            },
            postCreate: function () {
                on(this.associatedBatchButton, "click", lang.hitch(this, this._showAssociatedBatchJob));
            },
            /*
             * sets the class of the details panel
             */
            _setJobDetailsPanelSelected: function (deselect) {
                if (deselect) {
                    this.domNode.className = "bvmPanelDefault bvmPanelDescription";
                }
                else {
                    this.domNode.className = "bvmPanelDefault";
                }
            },
            /*
             * This function displays the job execution details
             */
            _showJobExecutionDetail: function (executionDetail) {
                this._setDetailsText(this.jobTitle, executionDetail.title[0]);
                this._setDetailsText(this.runTimeDiv, this._getJobExecutionRunTime(executionDetail.batchRunStartTime[0], executionDetail.batchRunEndTime[0]));//+ ' ' + this.localization.runTimeUnitsLabel)
                if (executionDetail.totalValidated)
                    this._setDetailsText(this.featuresValidatedDiv, executionDetail.totalValidated[0]);
                else
                    this._setDetailsText(this.featuresValidatedDiv, "N/A");
                if (executionDetail.totalResults)
                    this._setDetailsText(this.totalResultsDiv, executionDetail.totalResults[0]);
                else
                    this._setDetailsText(this.totalResultsDiv, "N/A");

                this._setDetailsText(this.endStateDiv, this._getJobExecutionStatus(executionDetail.batchRunStatus));
            },
            _getJobExecutionRunTime: function (batchRunStartTime, batchRunEndTime) {
                if (batchRunEndTime != undefined)
                    runTime = date.difference(new Date(batchRunStartTime), new Date(batchRunEndTime), 'second');
                else
                    runTime = 0;
                var hours = parseInt(runTime / 3600) % 24;
                var minutes = parseInt(runTime / 60) % 60;
                var seconds = parseInt(runTime % 60, 10);
                return (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);
            },
            /*
             * gets the status text based on batchRunStatus
             */
            _getJobExecutionStatus: function (value) {
                if (value != null && value !== undefined) {
                    if (value == 0)
                        return this.localization.successfulStatus;
                    else if (value == 1)
                        return this.localization.successWithErrorStatus;
                    else if (value == 2)
                        return this.localization.successWithWarningStatus;
                    else if (value == 3)
                        return this.localization.successWithErrorAndWarningStatus;
                    else if (value == 4)
                        return this.localization.failedStatus;
                    else if (value == "executing")
                        return this.localization.executingStatus;
                    else if (value == "failed")
                        return this.localization.failedStatus;
                }
                return value;
            },
            /*
             * set the text of the divs
             */
            _setDetailsText: function (div, detailText) {
                div.innerHTML = detailText;
                if (div.id == "runTimeDiv")
                    div.title = "hh:mm:ss";
                else
                    div.title = detailText;
            },
            _setJobExecutionProperties: function (jobParameters) {
                var batchValidationParameters = jobParameters[0];
                this._setDetailsText(this.jobExecutionBatchJobFileName, batchValidationParameters.batchJobFileName);
                this._setDetailsText(this.jobExecutionSessionId, batchValidationParameters.sessionString);
                this._setDetailsText(this.jobExecutionSchedule, this._getCronSchedule(batchValidationParameters.cronExpression));
                this._setDetailsText(this.jobExecutionProductionWorkspace, batchValidationParameters.productionWorkspace)
            },
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
                //   else if (CronHelper.getCronType(cronString) == CronHelper.cronTypeEnum.Unknown)
                return "Unknown";
            },
            _showAssociatedBatchJob: function () {
                var tabPane = registry.byId('scheduleList');
                var tabContainer = registry.byId('tabContainer');
                var scheduledJobsGrid = registry.byId('scheduledJobsGrid');
                var selectedIdx;
                var jobItem;

                tabContainer.selectChild(tabPane);
                for (var i = 0; i < scheduledJobsGrid.rowCount; i++) {
                    var item = scheduledJobsGrid.getItem(i);
                    if (item.jobId[0] == this._jobId) {
                        jobItem = item;
                        selectedIdx = i;
                        break;
                    }
                }

                if (this._jobId != null) {
                    if (scheduledJobsGrid.rowCount > 0 && selectedIdx < scheduledJobsGrid.rowCount) {
                        if (scheduledJobsGrid.selection.selectedIndex >= 0) {
                            // If there is a currently selected row, deselect it now
                            scheduledJobsGrid.selection.setSelected(scheduledJobsGrid.selection.selectedIndex, false);
                        }
                        scheduledJobsGrid.selection.setSelected(selectedIdx, true);
                        scheduledJobsGrid.render();
                        topic.publish("scheduledJobDetails",  jobItem );

                    }
                }

            }
        });
    });

