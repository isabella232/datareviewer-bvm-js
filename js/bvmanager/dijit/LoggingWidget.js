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
    "dojo/text!./LoggingWidget/templates/LoggingWidgetTemplate.html",
    "dojo/i18n!./LoggingWidget/nls/logging",
    "dojo/_base/window",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/dom-style",
    "dojo/topic",
    "dijit/Dialog",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/CheckBox",
    "dojo/on",
    "dojo/query",
    "dojo/_base/lang"
],
    function (declare, template, i18n, dojoWindow, domConstruct, domAttr, domStyle, topic, Dialog, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, CheckBox, on, query, lang) {
        return declare(
            [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],
            {
                templateString: template,
                constructor: function () {
                    this.nls = i18n;
                    this._initListeners();
                },
                _initListeners: function () {
                    topic.subscribe("addLoggingError", lang.hitch(this, this._createErrorMessage));
                    topic.subscribe("addLoggingInfo", lang.hitch(this, this._createInfoMessage));
                },
                postCreate: function () {
                    this.inherited(arguments);
                    this.loggingLink = domConstruct.create("div", {className: "loggingWindowLink", title: this.nls.loggingLinkTitle});
                    var loggingLinkText = domConstruct.create("span", {className: "loggingLinkMainText", innerHTML: this.nls.loggingLinkText});
                    this.loggingLinkCount = domConstruct.create("span", {innerHTML: ""});
                    domConstruct.place(loggingLinkText, this.loggingLink);

                    domConstruct.place(this.loggingLinkCount, this.loggingLink);
                    on(this.loggingLink, "click", lang.hitch(this, this.toggleDialog));
                    domConstruct.place(this.loggingLink, dojoWindow.body());

                },
                /**
                 * @description adds a logging error
                 * @param message
                 * @private
                 */
                _createErrorMessage: function (message) {
                    this._createMessage(message, "loggingSprite loggingError", "loggingErrorMessage");
                },
                /**
                 * @description creates a logging info
                 * @param message
                 * @private
                 */
                _createInfoMessage: function (message) {
                    this._createMessage(message, "loggingSprite loggingInfo", "loggingInfoMessage");
                },
                /**
                 * @description creates a logging message
                 * @param {String} message message to log
                 * @param {String} iconClass icon class to display
                 * @param {String} messageStyleClass css style to add to text
                 * @param type
                 * @private
                 */
                _createMessage: function (message, iconClass, messageStyleClass) {
                    var liItem = domConstruct.create("li", {className: messageStyleClass});
                    var messageIcon = domConstruct.create("div", {className: iconClass + " " + "loggingWidgetTypeIcon"});
                    domConstruct.place(messageIcon, liItem);
                    var messageText = domConstruct.create("span", {innerHTML: message, className: "loggingMessageText"});
                    domConstruct.place(messageText, liItem);
                    domConstruct.place(liItem, this.loggingWidgetEntryList);
                    this.updateLogDisplayCount();


                },
                updateLogDisplayCount: function () {
                    var items = query("li", this.loggingWidgetEntryList);
                    if (items == null || items.length == 0) {
                        domAttr.set(this.loggingLinkCount, "innerHTML", "");
                    }
                    else {
                        domAttr.set(this.loggingLinkCount, "innerHTML", "(" + items.length + ")");
                    }

                },
                handleToggleErrorMessages: function (checked) {
                    if (checked) {
                        this._showErrorMessages();
                    }
                    else {
                        this._hideErrorMessages();
                    }
                },
                _showErrorMessages: function () {
                    this._setErrorElements("block");
                },
                _hideErrorMessages: function () {
                    this._setErrorElements("none");
                },
                _setErrorElements: function (displayStyle) {
                    var items = query(".loggingErrorMessage", this.loggingWidgetEntryList);
                    for (var i = 0; i < items.length; i++) {
                        domStyle.set(items[i], "display", displayStyle);
                    }
                },
                handleToggleInfoMessages: function (checked) {
                    if (checked) {
                        this._showInfoMessages();
                    }
                    else {
                        this._hideInfoMessages();
                    }

                },
                _showInfoMessages: function () {
                    this._setInfoElements("block");
                },
                _hideInfoMessages: function () {
                    this._setInfoElements("none");
                },
                _setInfoElements: function (displayStyle) {
                    var items = query(".loggingInfoMessage", this.loggingWidgetEntryList);
                    for (var i = 0; i < items.length; i++) {
                        domStyle.set(items[i], "display", displayStyle);
                    }
                },
                handleClearLog: function () {
                    domConstruct.empty(this.loggingWidgetEntryList);
                    domAttr.set(this.loggingLinkCount, "innerHTML", "");
                },
                toggleDialog: function () {
                    if (this.loggingDialog.open) {
                        this.hide();
                    }
                    else {
                        this.show();
                    }
                },
                show: function () {
                    this.loggingDialog.show();
                },
                hide: function () {
                    this.loggingDialog.hide();
                }
            });
    });
