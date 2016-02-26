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
    "esri/tasks/datareviewer/BatchValidationTask",
    "bvroot/settings",
    "dojo/_base/lang",
    "dijit/registry",
    "dojo/topic",
    "dojo/i18n!./localizedResources/nls/mainPage",
    "dojo/dom",
    "esri/map",
    "esri/utils",
    "dojo/on",
    "./util/IdentityManagerHelper",
    "./dijit/MessagingWidget",
    "./dijit/LoggingWidget"
],
    function (BatchValidationTask, settings, lang, registry, topic, resources, dom, map, utils, on, IdentityManagerHelper, MessagingWidget, LoggingWidget) {
        var _batchValidationTask = null;
        var _resources = resources;
        return {
            startup: function () {
                this.loggingWidget = new LoggingWidget();
                this.messagingWidget = new MessagingWidget();
                this.identityManagerHelper = new IdentityManagerHelper();
                dom.byId("pageTitle").innerHTML = _resources.bvManagerPageName1 + "<span class='color_green'> " + _resources.bvManagerPageName2 + "</span>";
                dom.byId("addBVButton").innerHTML = _resources.bvManagerAddBVBtn;
                dom.byId("search").innerHTML = _resources.bvManagerSearchLabel;
                if (settings.proxyURL != null)
                    esri.config.defaults.io.proxyUrl = settings.proxyURL;
                if (settings.alwaysUseProxy != null)
                    esri.config.defaults.io.alwaysUseProxy = settings.alwaysUseProxy;
                // create necessary objects
                _batchValidationTask = new BatchValidationTask(settings.drsSoeUrl);
                registry.byId("addBVButton").on("click", registry.byId("batchValidationEditorDialog").show);
                 //This is adding functionality to an extension point exposed by the custom widget.
                registry.byId("batchValidationEditorDialog").onSubmit = function (batchValidationParameter, updateJobId) {
                    var deferred;
                    if (!updateJobId) {
                        topic.publish("addLoggingInfo", "Creating batch job...");
                        deferred = _batchValidationTask.scheduleJob(batchValidationParameter);
                        deferred.then(function (response) {
                            topic.publish("addLoggingInfo", "Batch job created");
                            registry.byId("batchValidationEditorDialog").hide();
                            topic.publish("refreshJobsList")
                        }, function (err) {
                            topic.publish("addLoggingError", (err.message || err.toString()));
                        });
                    }
                    else {
                        topic.publish("addLoggingInfo", "Updating batch job...");
                        deferred = _batchValidationTask.editJob(updateJobId, batchValidationParameter);
                        deferred.then(function (response) {
                            topic.publish("addLoggingInfo", "Update completed successfully");
                            registry.byId("batchValidationEditorDialog").hide();
                            topic.publish("refreshJobsList")
                        }, function (err) {
                            topic.publish("addLoggingError", (err.message || err.toString()));
                        });
                    }
                };
                //resize grid
                var grid = registry.byId('scheduledJobsGrid');
                if (grid != null) {
                    grid.resize();
                }
                //Resizing the grids on tab change
                var tabContainer = registry.byId('tabContainer');
                //  on(tabContainer, "selectChild", lang.hitch(this, function (nval) {
                tabContainer.watch("selectedChildWidget", lang.hitch(this, function (name, oval, nval) {
                    var grid;
                    if (nval.id == 'executionsList')
                        grid = registry.byId('jobExecutionGrid');
                    else if (nval.id == 'scheduleList')
                        grid = registry.byId('scheduledJobsGrid');
                    if (grid != null) {
                        grid.resize();
                        grid.sort();
                    }
                }));
            }
        };
    });
