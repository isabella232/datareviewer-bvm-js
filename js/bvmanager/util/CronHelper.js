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

/**
 * Provides utility functions to create daily, weekly and monthly cron expressions.
 * Cron expressions allow you to define complex date and time combinations.
 * Cron expressions have date and time components that follow this format:</p>
 * <code>seconds minutes hours day-of-month month day-of-week (year)</code>
 * </br>
 * <p>Date and time components have the following allowable values:</p>
 * <ul>
 * <li>seconds : 0-59</li>
 * <li>minutes : 0-59</li>
 * <li>hours : 0-23</li>
 * <li>day-of-month : 1-31</li>
 * <li>month : 1-12 or JAN-DEC</li>
 * <li>day-of-week : 1-7 or SUN-SAT</li>
 * <li>Year : 1970-2099</li>
 * </ul>
 *
 * <p>Example cron expressions:</p>
 * <ul>
 * <li>At 6:00 every day: <code>0 0 6 * * ?</code></li>
 * <li>At 1:10 of the 30th of every month: <code>0 10 1 30 * ?</code></li>
 * <li>At 16:30 of June 7 of every year: <code>0 30 16 7 6 ?</code></li>
 * </ul>
 * <p>ArcGIS Data Reviewer for Server uses cron expressions to control when scheduled batch validation executes.
 * Adhoc batch validation does not use cron expressions.</p>
 * @class CronHelper
 * @static
 * CronHelper class should be used as a static class instead of creating instances of the class.
 * It supports creation of cron schedules from BatchValidation Manager application and parses
 * only those cron schedules that are created through BatchValidation Manager Application.
 */

define(
    ["dojo/_base/declare"],
    function (declare) {
        return {
            cronTypeEnum: {
                Hourly: 1,
                Daily: 2,
                Weekly: 3,
                Monthly: 4,
                Yearly: 5,
                Unknown: 6
            },
            /**
             * Parses the cron expression and returns the cron type (cronTypeEnum).
             * @method getCronType
             * @param {String} cronString
             * @return {cronTypeEnum} The cron expression type
             */
            getCronType: function (cronString) {
                var weekDaysObj = {
                    SUN: 1,
                    MON: 2,
                    TUE: 3,
                    WED: 4,
                    THU: 5,
                    FRI: 6,
                    SAT: 7
                };
                try {
                    if (cronString != undefined && this.IsCronStringValid(cronString)) {
                        var cronArray = cronString.split(" ");
                        //var startDay = "", daysInterval = "";
                        var daysArray = [];

                        if (cronArray.length > 5 && cronArray.length < 8) {
                            //check hourly schedule
                            if (cronArray[2].indexOf("/") != -1 || (cronArray[2].indexOf("*") != -1 && cronArray[5].indexOf("?") != -1) || (cronArray[2].indexOf("?") != -1 && cronArray[5].indexOf("*") != -1) && (cronArray[3].indexOf("*") != -1 || cronArray[3].indexOf("?") != -1 || cronArray[3].indexOf("/") != -1)) {
                                return this.cronTypeEnum.Hourly;
                            }
                            //check daily schedule
                            else if (cronArray[3].indexOf("/") != -1 || cronArray[5].indexOf("-") != -1 || (cronArray[3].indexOf("*") != -1 && cronArray[5].indexOf("?") != -1) || (cronArray[3].indexOf("?") != -1 && cronArray[5].indexOf("*") != -1)) {
                                return this.cronTypeEnum.Daily;
                            }
                            //check weekly schedule
                            else if (cronArray[5].indexOf(",") != -1 || (cronArray[5].indexOf("?") == -1 && cronArray[5].indexOf("*") == -1)) {
                                if (cronArray[5].indexOf(",") != -1)
                                    return this.cronTypeEnum.Weekly;
                                else {
                                    for (var z in weekDaysObj) {
                                        if (isNaN(cronArray[5])) {
                                            if (cronArray[5].toUpperCase() === z) {
                                                return this.cronTypeEnum.Weekly;
                                            }
                                        }
                                        else if (cronArray[5] == weekDaysObj[z]) {
                                            return this.cronTypeEnum.Weekly;
                                        }
                                    }
                                    return this.cronTypeEnum.Unknown;
                                }
                            }
                            //check monthly schedule
                            else if ((cronArray[3].indexOf("*") == -1 || cronArray[3].indexOf("/") == -1) && (cronArray[4].indexOf("/") != -1 || cronArray[4].indexOf("*") != -1)) {
                                return this.cronTypeEnum.Monthly;
                            }
                            //check yearly schedule
                            else if ((cronArray[3].indexOf("*") == -1 || cronArray[3].indexOf("/") == -1 ) && (cronArray[4].indexOf("*") == -1 || cronArray[4].indexOf("?") == -1 || cronArray[4].indexOf("/") == -1)) {
                                return this.cronTypeEnum.Yearly;
                            }
                        }
                        else {
                            throw new Error("Invalid cron expression.", "CronHelper");
                        }
                    }
                    else {
                        throw new Error("Invalid cron expression.", "CronHelper");
                    }
                }
                catch (exception) {
                    return this.cronTypeEnum.Unknown;
                }
            },
            /**
             * Validates the cron string.
             * @method IsCronStringValid
             * @param {String} cronString
             * @return {boolean} True if the cron expression is valid.
             */
            IsCronStringValid: function (cronString) {
                var seconds = null, minutes = null, hours = null, dayOfMonth = null, month = null, dayOfWeek = null, year = null;
                if (cronString == "")
                    return false;
                var cronStringArray = cronString.split(" ");
                if (cronStringArray == null || cronStringArray === undefined || cronStringArray.length < 6 || cronStringArray.length > 7)
                    return false;
                seconds = cronStringArray[0];
                minutes = cronStringArray[1];
                hours = cronStringArray[2];
                dayOfMonth = cronStringArray[3];
                month = cronStringArray[4];
                dayOfWeek = cronStringArray[5];
                if (cronStringArray.length == 7)
                    year = cronStringArray[6];
                return this._validateCronExpressionValues(seconds, minutes, hours, dayOfMonth, month, dayOfWeek, year);
            },
            /**
             * checks each parameter of the Cron String
             * @method _validateCronExpressionValues
             *
             * @private
             * @param seconds
             * @param minutes
             * @param hours
             * @param dayOfMonth
             * @param dayOfWeek
             * @param year
             * @param month
             */
            _validateCronExpressionValues: function (seconds, minutes, hours, dayOfMonth, month, dayOfWeek, year) {
                if (this._validateSecondsAndMinutes(seconds, minutes) == false)
                    return false;
                if (this._validateHours(hours) == false)
                    return false;
                if (this._validateDayOfMonth(dayOfMonth) == false)
                    return false;
                if (this._validateMonth(month) == false)
                    return false;
                if (this._validateDayOfWeek(dayOfWeek) == false)
                    return false;
                if (year != null && year != "") {
                    if (this._validateYear(year) == false)
                        return false
                }
                return true;
            },
            /**
             * validates seconds and minutes parameters of the Cron String
             * @method _validateSecondsAndMinutes
             * @private
             * @param seconds
             * @param minutes
             */
            _validateSecondsAndMinutes: function (seconds, minutes) {
                if (seconds == null || seconds == "")
                    return false;
                if (minutes == null || minutes == "")
                    return false;
                // validates * or if the value is between 0 and 59. Eg 45
                var singlePattern = new RegExp("^([0-5]?[0-9]|[*])$");
                // validates range values within 0 - 59. Eg 30-35
                var rangePattern = new RegExp("^([0-5]?[0-9])-([0-5]?[0-9])$");
                //validates */59 or values below 59 / values below 59. Eg 30/2
                var incrementsPattern = new RegExp("^(\\*|[0-5]?[0-9])\\/([0-5]?[0-9])$");
                //validates list of values below  59 and a list of range values below 59
                var listPattern = new RegExp("^(([0-5]?[0-9])|([0-5]?[0-9])-([0-5]?[0-9]),)+([0-5]?[0-9])|([0-5]?[0-9])-([0-5]?[0-9])$/");
                if (this._validateCronExpressionIndividualValue(seconds, singlePattern, rangePattern, listPattern) == false)
                    return false;
                return this._validateCronExpressionIndividualValue(minutes, singlePattern, rangePattern, listPattern);
            },
            /**
             * validates seconds and minutes parameters of the Cron String
             * @method _validateHours
             * @private
             * @param hours
             */
            _validateHours: function (hours) {
                if (hours == null || hours == "")
                    return false;
                // validates * or if the value is between 0 and 24. Eg 12
                var singlePattern = new RegExp("^([0-1]?[0-9]|2[0-3]|[*])$");
                // validates range values within 0 - 24. Eg 2-4
                var rangePattern = new RegExp("^([0-1]?[0-9]|2[0-3])-([0-1]?[0-9]|2[0-3])$");
                //validates */24 or values below 24 / values below 24. Eg 12/2
                var incrementsPattern = new RegExp("^(\\*|(?:[0-1]?[0-9]|2[0-3]))\\/([0-1]?[0-9]|2[0-3])$");
                //validates list of values below  24 and a list of range values below 24
                var listPattern = new RegExp("^(([0-1]?[0-9]|2[0-3])|(([0-1]?[0-9]|2[0-3])-([0-1]?[0-9]|2[0-3])),)+([0-1]?[0-9]|2[0-3])|(([0-1]?[0-9]|2[0-3])-([0-1]?[0-9]|2[0-3]))$");
                return this._validateCronExpressionIndividualValue(hours, singlePattern, rangePattern, incrementsPattern, listPattern);
            },
            /**
             * validates day of month parameter of the Cron String
             * @method _validateDayOfMonth
             * @private
             * @param dayOfMonth
             */
            _validateDayOfMonth: function (dayOfMonth) {
                if (dayOfMonth == null || dayOfMonth == "")
                    return false;
                // validates * or if the value is between 0 and 31. Eg 20
                var singlePattern = new RegExp("^(0?[1-9]W?|[1-2][0-9]W?|3[0-1]W?|[*L?])$");
                // validates range values within 1 - 31. Eg 10-15
                var rangePattern = new RegExp("^(0?[1-9]|[1-2][0-9]|3[0-1])-(0?[1-9]|[1-2][0-9]|3[0-1])$");
                //validates */31 or values below 31 / values below 31. Eg 30/2
                var incrementsPattern = new RegExp("^(\\*|(?:0?[1-9]|[1-2][0-9]|3[0-1]))\\/(0?[1-9]|[1-2][0-9]|3[0-1])$");
                //validates list of values below  31 and a list of range values below 31. Eg 2,3,4-10
                var listPattern = new RegExp("^((0?[1-9]|[1-2][0-9]|3[0-1])|(0?[1-9]|[1-2][0-9]|3[0-1])-(0?[1-9]|[1-2][0-9]|3[0-1]),)+(0?[1-9]|[1-2][0-9]|3[0-1]|(0?[1-9]|[1-2][0-9]|3[0-1])-(0?[1-9]|[1-2][0-9]|3[0-1]))$");
                return this._validateCronExpressionIndividualValue(dayOfMonth, singlePattern, rangePattern, incrementsPattern, listPattern);
            },
            /**
             * validates month parameter of the Cron String
             * @method _validateMonth
             * @private
             * @param month
             */
            _validateMonth: function (month) {
                if (month == null || month == "")
                    return false;
                // validates * or if the value is between 1 and 12. Eg 6
                var singlePattern = new RegExp("^(0?[1-9]|1[0-2]|[*])$");
                // validates range values within 1 - 12. Eg 3-6
                var rangePattern = new RegExp("^(0?[1-9]|1[0-2])-(0?[1-9]|1[0-2])$");
                //validates */12 or values below 12 / values below 12. Eg 6/2
                var incrementsPattern = new RegExp("^(\\*|(?:0?[1-9]|1[0-2]))\\/(0?[1-9]|1[0-2])$");
                //validates list of values below  12 and a list of range values below 12. Eg 2,4,6-8
                var listPattern = new RegExp("^((0?[1-9]|1[0-2])|(0?[1-9]|1[0-2])-(0?[1-9]|1[0-2]),)+(0?[1-9]|1[0-2]|(0?[1-9]|1[0-2])-(0?[1-9]|1[0-2]))$");
                return this._validateCronExpressionIndividualValue(month, singlePattern, rangePattern, incrementsPattern, listPattern);
            },
            /**
             * validates day of week of the Cron String
             * @method _validateDayOfWeek
             * @private
             * @param dayOfWeek
             */
            _validateDayOfWeek: function (dayOfWeek) {
                if (dayOfWeek == null || dayOfWeek == "")
                    return false;
                var newValue = this._replaceDayAbbreviationsByNumbers(dayOfWeek);
                // validates * or if the value is between 1 and 7. Eg 3
                var singlePattern = new RegExp("^(0?[1-7]L?|0?[1-7]#0?[1-5]|[*?])$");
                // validates range values within 1 - 7. Eg 2-5
                var rangePattern = new RegExp("^(0?[1-7])-(0?[1-7])$");
                //validates */7 or values below 7 / values below 7. Eg 4/2
                var incrementsPattern = new RegExp("^(\\*|(?:0?[1-7]))\\/(0?[1-7])$");
                //validates list of values below  7 and a list of range values below 7. Eg 1-3,6
                var listPattern = new RegExp("^((0?[1-7]|(0?[1-7])-(0?[1-7])),)+(0?[1-7]|(0?[1-7])-(0?[1-7]))$");
                return this._validateCronExpressionIndividualValue(newValue, singlePattern, rangePattern, incrementsPattern, listPattern);
            },
            _replaceDayAbbreviationsByNumbers: function (value) {
                var weekDayAbbreviation = ["MON" , "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
                if (value == null)
                    return null;

                for (i = 0; i < 7; i++) {
                    value = value.replace(weekDayAbbreviation[i], i + 1);
                }
                return value;
            },
            /**
             * validates year parameter of the Cron String
             * @method _validateYear
             * @private
             * @param year
             */
            _validateYear: function (year) {
                if (year == null || year == "")
                    return false;
                // validates * or if the value is between 2000 and 2099. Eg 45
                var singlePattern = new RegExp("^(20[0-9][0-9]|[*])$");
                // validates range values within 2000 - 2099. Eg 2016-2016
                var rangePattern = new RegExp("^(20[0-9][0-9])-(20[0-9][0-9])$");
                //validates */2099 or values below 2099 / values below 2099. Eg 2012/2
                var incrementsPattern = new RegExp("^(\\*|(?:20[0-9][0-9]))\\/([0-9]?[0-9])$");
                //validates list of values below  2099 and a list of range values below 2099. Eg 2013,2016-2018
                var listPattern = new RegExp("^((20[0-9][0-9]|(20[0-9][0-9])-(20[0-9][0-9])),)+(20[0-9][0-9]|(20[0-9][0-9])-(20[0-9][0-9]))$");
                return this._validateCronExpressionIndividualValue(year, singlePattern, rangePattern, incrementsPattern, listPattern);
            },
            /**
             * Compares the value parameter of the cron string to a regular expression.
             * @method validateCronExpressionIndividualValue
             * @param {String} value A portion of the cron string to compare against the regular expression.
             * @param {String} singlePattern
             * @param {String} rangePattern
             * @param {String} incrementsPattern
             * @param {String} listPattern
             */
            _validateCronExpressionIndividualValue: function (value, singlePattern, rangePattern, incrementsPattern, listPattern) {
                if (value.match(singlePattern) != null)
                    return true;
                if (value.match(rangePattern) != null)
                    return true;
                if (value.match(incrementsPattern) != null)
                    return true;
                if (value.match(listPattern) != null)
                    return true;
                return false;
            },

            /**
             * Creates a daily cron expression. This function allows you to set the daily cron expression's
             * hour and minute start time.
             * If you omit hour or minutes, the function uses the current value for each missing component.
             * You can also limit the cron expression to weekdays only. The cron expression created by this
             * function pertains to every month of every year.
             * @method makeDailyCron
             * @param {Boolean} weekdayOnly Specifies that a job only runs on week days.
             * @param {Number} nDays Specifies that a job runs every <i>n</i> Days every month. Ignored if weekdayOnly == true.
             * @param {Date} startingDate Specifies a start date and time a job will run.
             * @return {String} daily cron expression
             * @example
             *        var dt = new Date();
             *        dt.setHours(6,0);
             *        var dailyCron = CronHelper.makeDailyCron(false,0,dt);
             *        document.write(dailyCron); //returns 0 0 6 * * ? *
             * @example
             *        var dt = new Date();
             *        dt.setHours(20,0);
             *        var dailyCron = CronHelper.makeDailyCron(true,0,dt); // returns 0 0 20 ? * Mon-Fri
             */
            createDailyCronExpression: function (weekdayOnly, nDays, startTime, startDate) {
                var startingTime = startTime.split(":");
                var hour = startingTime[0];
                var minute = startingTime[1];
                try {
                    if (startDate == null) {
                        if (weekdayOnly) {
                            dailyCronExpression = "0 " + minute + " " + hour + " ? * MON-FRI";
                        }
                        else if (nDays) {
                            dailyCronExpression = "0 " + minute + " " + hour + " " + '1/' + nDays + " * ?";
                        }
                        else {
                            dailyCronExpression = "0 " + minute + " " + hour + " * * ?";
                        }
                    }
                    else {
                        var jobStartDate = new Date(startDate);
                        var dayOfMonth = jobStartDate.getUTCDate();
                        var month = jobStartDate.getMonth() + 1;
                        var year = jobStartDate.getFullYear();
                        dailyCronExpression = "0 " + minute + " " + hour + " " + dayOfMonth + " " + month + " ? ";
                    }
                    return dailyCronExpression
                }
                catch (ex) {
                    throw ex;
                }
            },

            /**
             * Creates a weekly cron expression. This function allows you to set a list of days and
             * starting hour and minutes. If you omit starting hour or minutes, the function uses the current
             * value for each missing component. The returned cron expression pertains to every week of
             * every month of every year.
             * @method makeWeeklyCron
             * @param {Array} daysOfWeek Array of days specified as cron Day-of-week component (position 6 in the cron expression). This can be either three character abbreviations or numbers.
             * @param {Date} startingDate Start date and time that a job will run.
             * @return {String} weekly cron expression
             * @example
             *        var dt = new Date();
             *        dt.setHours(22,10);
             *        var nameDays = ['MON','TUE','WED'];
             *        var dailyCron = CronHelper.makeWeeklyCron(nameDays,dt);
             *        document.write(dailyCron);
             */
            createWeeklyCronExpression: function (daysOfWeek, startTime) {
                var startingTime = startTime.split(":");
                var hour = startingTime[0];
                var minute = startingTime[1];
                var weeklyCronExpression = null;
                try {
                    weeklyCronExpression = "0 " + minute + " " + hour + " ? * " + daysOfWeek;
                    return weeklyCronExpression
                }
                catch (ex) {
                    throw ex;
                }
            },

            /**
             * Creates a monthly cron expression. This function allows you to set starting day, hour and minutes.
             * If you omit starting day, hour or minutes, the function uses the current date or time value for each
             * missing component. The returned cron expression pertains to every month of every year.
             * @method makeMonthlyCron
             * @param {Date} startingDate Specifies a starting date and time a job will run.
             * @param {Number} dayOfMonth Specifies a day of the month a job will run.
             * @param {Number} numberOfMonth Specifies that a job runs every <i>n</i> month.
             * @return {String} monthly cron expression
             * @example
             *        var dt = new Date();
             *        dt.setHours(1,10);
             *        dt.setDate(5);
             *        var monthlyCron = CronHelper.makeMonthlyCron(dt);
             *        document.write(monthlyCron); //returns 0 0 10 5 1/1 ? *
             */
            createMonthlyCronExpression: function (startTime, dayOfMonth, numberOfMonth) {
                var startingTime = startTime.split(":");
                var hour = startingTime[0];
                var minute = startingTime[1];
                var monthlyCronExpression = null;

                if (dayOfMonth === undefined) {
                    dayOfMonth = new Date().getUTCMonth() + 1;
                }

                if (numberOfMonth === undefined) {
                    numberOfMonth = 1;
                }
                monthlyCronExpression = "0 " + minute + " " + hour + " " + dayOfMonth + " 1/" + numberOfMonth + " ? *";
                return monthlyCronExpression;
            }
        };
    });

