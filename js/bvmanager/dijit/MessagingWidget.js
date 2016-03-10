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

define([
    "dojo/_base/declare",
    "dojo/text!./MessagingWidget/templates/MessagingWidgetTemplate.html",
    "dojo/topic",
    "dojo/_base/lang",
    "dojo/_base/window",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojox/timing"
],
    function (declare, template, topic, lang, dojoWindow, domStyle, domConstruct, domAttr, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, timing) {
        return declare(
            [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],
            {
                templateString: template,
                defaultTimerInterval: 4000,
                postCreate: function () {
                    this.inherited(arguments);
                    this.initListeners();
                    //set up the hide timer
                    this.scopedHideMessage = lang.hitch(this, this.hideMessage);
                    this.messageTimer = new timing.Timer(this.defaultTimerInterval);
                    this.messageTimer.onTick = lang.hitch(this, function () {
                        this.hideMessage();
                    });
                    domConstruct.place(this.domNode, dojoWindow.body());
                    this.hideMessage();


                },
                initListeners: function () {
                    this.inherited(arguments);
//                    topic.subscribe("showStatusMessage", lang.hitch(this, this.showMessage));
                    topic.subscribe("hideStatusMessage", lang.hitch(this, this.hideMessage));
                },
                showMessage: function (message, showDuration) {
                    domStyle.set(this.domNode, "display", "inline");
                    domAttr.set(this.messagingText, "innerHTML", message);
                    showDuration = (showDuration == null) ? this.defaultTimerInterval : showDuration;
                    this.messageTimer.setInterval(showDuration);
                    this.messageTimer.onTick = this.scopedHideMessage;
                    this.messageTimer.start();
                },

                hideMessage: function () {
                    if (this.messageTimer) {
                        this.messageTimer.stop();
                        //timing seems to keep calling the function even though i am stopping it. Just point to an empty function for now
                        this.messageTimer.onTick = function () {
                        };
                    }
                    domStyle.set(this.domNode, "display", "none");

                }
            });
    });
