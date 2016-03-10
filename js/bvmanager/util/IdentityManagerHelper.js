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
    "bvroot/settings",
    "esri/IdentityManager",
    "dojo/topic",
    "esri/kernel",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/cookie",
    "dojo/json",
    "dojo/i18n!../localizedResources/nls/mainPage",
    "dojo/_base/unload"
],
    function (declare, settings, IdentityManager, topic, kernel, lang, domConstruct, cookie, JSON, resources, unload) {
        return  declare(
            [
            ],
            {
                hasIdentityManagerErr: false,
                cred: "esri_jsapi_id_manager_data",
                constructor: function () {
                    //uncomment next two lines to store user token in browser
                    //     unload.addOnUnload(lang.hitch(this, this._storeCredentials));
                    //     this._loadCredentials();
                    this._initListeners();
                },
                _initListeners: function () {
                    topic.subscribe("getLoggedInUser", lang.hitch(this, this._getLoggedInUser));
                    IdentityManager.on("dialog-cancel", lang.hitch(this, this._handleSignInCancel));
                    IdentityManager.on("dialog-create", lang.hitch(this, this._handleIdentityManagerDialogCreate));
                },
                _handleIdentityManagerDialogCreate: function () {
                    var dialog = IdentityManager.dialog;
                    if (dialog && dialog.domNode) {
                        var title = domConstruct.create("div", {className: "batchValidatorSignInText", innerHTML: resources.bvManagerLoginLabel});
                        domConstruct.place(title, dialog.titleBar, "after");

                    }

                },
                _handleSignInCancel: function () {
                    //for some reason sign in tries twice. only display the first err out
                    if (!this.hasIdentityManagerErr) {
//                        topic.publish("showStatusMessage", "Sign In Cancelled. You cannot list or publish jobs");
                        topic.publish("addLoggingError", "Sign In Cancelled. You cannot list or publish jobs");
                        this.hasIdentityManagerErr = true;
                    }
                },
                _getLoggedInUser: function (callback) {
                    if (callback != null && lang.isFunction(callback)) {
                        if (IdentityManager.credentials == null || IdentityManager.credentials.length < 1) {
                            callback(null);
                            return;
                        }
                        var targetUrl = settings.restReviewerMapServer;
                        var currentCredential;
                        var currentResources;
                        for (var i = 0; i < IdentityManager.credentials.length; i++) {
                            currentCredential = IdentityManager.credentials[i];
                            currentResources = currentCredential.resources;
                            if (currentResources != null && lang.isArray(currentResources)) {
                                for (var j = 0; j < currentResources.length; j++) {
                                    if (currentResources[j].indexOf(targetUrl) > -1) {
                                        callback({username: currentCredential.userId, token: currentCredential.token});
                                    }
                                }
                            }
                        }
                    }
                },
                _loadCredentials: function () {
                    var idJson, idObject;
                    if (this._supportsLocalStorage()) {
                        // read from local storage
                        idJson = window.localStorage.getItem(this.cred);
                    } else {
                        // read from a cookie
                        idJson = cookie(cred);
                    }

                    if (idJson && idJson != "null" && idJson.length > 4) {
                        idObject = JSON.parse(idJson);
                        kernel.id.initialize(idObject);
                    } else {
                    }
                },
                _storeCredentials: function () {
                    // make sure there are some credentials to persist
                    if (kernel.id.credentials.length === 0) {
                        return;
                    }
                    // serialize the ID manager state to a string
                    var idString = JSON.stringify(kernel.id.toJson());
                    // store it client side
                    if (this._supportsLocalStorage()) {
                        // use local storage
                        window.localStorage.setItem(this.cred, idString);
                    } else {
                        // use a cookie
                        cookie(cred, idString, { expires: 1 });
                    }
                },
                _supportsLocalStorage: function () {
                    try {
                        return "localStorage" in window && window["localStorage"] !== null;
                    } catch (e) {
                        return false;
                    }
                }
            })

    });