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

/** Contains all reviewer  server gobal settings
 * @class Provides access to reviewer server global settings.
 * <p><b>NOTE:</b>This file provides custom configuration parameters to other classes
 * through dojo.config. dojo.config (djConfig) is a global JavaScript object.</p>
 * <p>index.html reads this file and adds two configuration
 * parameters, rsBaseUrl and baseMapserviceUrl, to dojo.config. The BatchValidationEditorDialog
 * uses both of these parameters to access REST services.</p>
 * @name esri.reviewer.reviewerSettings
 */
define("", function () {
    return {
        /**
         * Url of the map service to be used for logging and Identity Manager
         */
        restReviewerMapServer: window.location.protocol + "//<ArcGIS Server Host Machine Name>:6080/arcgis/rest/services/reviewer/MapServer/",
        /**
         * URL to access DRS SOE rest services
         */
        drsSoeUrl: window.location.protocol + "//<ArcGIS Server Host Machine Name>:6080/arcgis/rest/services/reviewer/MapServer/exts/DataReviewerServer",
        /**
         * Specify if the UTC time has to be used for scheduling jobs if a time is not chosen
         */
        clientTimeUTC: false,
        /**
         * Set refresh interval for job executions
         */
        jobExecutionListRefreshInterval: 15000,
        /**
         * Specify if proxy has to be used for all requests
         */
        alwaysUseProxy: false,
        /*
         * The proxy url that should be used upload batch jobs. This must reside on the same domain as the HTML application.
         * Please refer https://developers.arcgis.com/javascript/jshelp/ags_proxy.html
         */
        proxyURL: "http://" + "<Proxy Host Machine Name>" + "/proxy/proxy.ashx",
        //
        /**
         * Defines a list of map services used by the esri map control. This map is used to define analysis area while scheduling batch jobs
         * By default first service will be considered as a base map.
         * Initial extent and wkid will be used to set map's initial extent
         * and spatial reference
         */
        mapServices: [
            {
                serviceType: "Tiled",
                serviceUrl: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
                initialExtent: "-9820648.503,5121949.719,-9803450.171,5133415.273",
                spatialReference: "102100"
            },
            {
                serviceType: "Dynamic",
                serviceUrl: "http://datareviewer.arcgisonline.com/arcgis/rest/services/Samples/reviewerDashboard/MapServer"
            }
        ],
        /*
         * List of production workspaces that will be displayed while scheduling a job
         * name (Required) signifies a identifier given to a production workspace. This value will appear in the Data Workspace list
         * path (Required) signifies the path to the fgdb or sde connection file
         * spatialReference {wkid:number} (Required if Analysis area has to be projected) The spatial reference to which you are projecting the geometries
         * tranformation (Optional) The well-known id {wkid:number} for the datum transfomation to be applied on the projected geometries.
         */
        dataWorkspaces: [
            {
                name: "My Prod",
                path: "C:\\arcgisserver\\data\\filegdb.gdb",
                spatialReference: "102004",
                transformation: "1251"
            },
            {
                name: "My Prod2",
                path: "C:\\arcgisserver\\data\\Connection to sqlserver.sde",
                spatialReference: "102004",
                transformation: ""
            },
            {
                name: "My Prod3",
                path: "C:\\arcgisserver\\data\\Connection to oracle.sde",
                spatialReference: "",
                transformation: ""
            }
        ],
        /*
         * URL of Geometry service used for datum transformations for Analysis area
         */
        geometryServiceUrl: "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer",
        /* Generic username to use for published jobs. This is ignored if the map service is locked down
        */
        publishJobUsername: "Publisher"
    }
});
