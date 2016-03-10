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

define(["dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/on",
    "dijit/registry",
    "dojo/topic",
    "dojo/text!./JobExecutionFilterPanel/templates/JobExecutionFilterPanel.html",
    "dojo/i18n!./JobExecutionFilterPanel/nls/JobExecutionFilterResource",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/ContentPane"],
    function (declare, lang, on, registry, topic, template, i18n, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin) {
        return declare("bvmanager.dijit.JobExecutionFilterPanel", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
            //This grabs the template html file.
            templateString: template,
            localization: null,
            constructor: function () {
                this.localization = i18n;
            },
            startup: function () {
                on(this.chkAutoRefresh, "change", lang.hitch(this, function (event) {
                    topic.publish("checkAutoRefreshToggle", event);
                }));
                on(this.refreshJobExecutionButton, "click", lang.hitch(this, function () {
                    topic.publish("refreshJobsList");
                }));
                on(registry.byId("filterAllExecutions"), "change", lang.hitch(this, this._createFilterCritera));
                on(registry.byId("filterExecutionByDate"), "change", lang.hitch(this, this._createFilterCritera));
            },
            _createFilterCritera: function () {
                var filterAllOption = registry.byId("filterAllExecutions");
                var dateFilter = registry.byId("filterExecutionByDate").attr('value');
                topic.publish("applyFilter", filterAllOption.checked + "," + dateFilter);
            }
        });
    });

