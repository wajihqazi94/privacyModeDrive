/**
 * @returns {{initialize: Function, focus: Function, blur: Function}}
 */
geotab.addin.addInGeotabDrivePrivacy = function () {
    'use strict';

    //Highlight 'Information' section
    var personal =document.getElementById("personal");
    var business =document.getElementById("business");

    function highlightInfo(activeStatus, inactiveStatus) {
        activeStatus.classList.remove("panel");
        activeStatus.classList.add("infoSelected");
        inactiveStatus.classList.remove("infoSelected");
        inactiveStatus.classList.add("panel");
    }

    // the root container
    var elAddin,
        api,
        deviceId,
        state,
        privacyStatuses,
        currentPrivacyStatus = document.getElementById("currentStatus"),
        driveAddInName = "Privacy Mode",
        msDay = 1000*60*60*24,
        msTime = 3 * 60 * 1000, //3 min
        consoleErr = function (msg) {
            console.log(driveAddInName + ': ' + msg);
        },
        notify = function (msg) {
            if (Boolean(api.mobile) && api.mobile.exists()) {
                api.mobile.notify(msg, driveAddInName);
            } else {
                alert(msg); // eslint-disable-line no-alert
            }
        },
        updateStatusUI = function (notifyChange) {
            //TODO: fix workaround after the interpolation for current status is fixed. Right now check all the changes since yesterday
            var fromDate = new Date(Date.now() - (msDay*60));
            api.call("Get", {
                "typeName": "TripTypeChange",
                "search": {
                    "deviceSearch": {"id": deviceId},
                    "fromDate": fromDate.toISOString()
                }
            }, function (result) {
                console.log("getDeviceStatus result ", result);
                if (result && result.length) {
                    //Sort the results
                    result.sort(
                        function (a, b) {
                            return (a.dateTime > b.dateTime) ? 1 : ((b.dateTime > a.dateTime) ? -1 : 0);
                        }
                    );
                    var tripType = result[result.length - 1].tripType;
                    console.log("getDeviceStatus tripType ", tripType);
                    if (tripType === "Unknown") {
                        tripType = "Business";           
                        highlightInfo(business, personal);
                    }
                    if (tripType === "Private") {
                        tripType = "Personal";
                        highlightInfo(personal, business);
                    }
                    if(notifyChange && tripType !== currentPrivacyStatus.innerHTML) {
                        notify('Driver status changed to: ' + tripType);
                    }
                    currentPrivacyStatus.innerHTML = tripType;
                    console.log(tripType + " info highlighted");  
                }

            }, function (error) {
                var msg = "getDeviceStatus error: " + error;
                consoleErr(msg);
                currentPrivacyStatus.innerHTML = "Unknown (Error)";
            });

        },
        setDeviceStatus = function (status) {
            api.call("Add", {
                "typeName": "TripTypeChange",
                "entity": {
                    "device": {"id": deviceId},
                    "dateTime": new Date().toISOString(),
                    "tripType": status
                }
            }, function (result) {
                console.log("Device \"" + deviceId + "\" is moved to status \"" + status + "\"");
                updateStatusUI(false);
            }, function (error) {
                var msg = "setDeviceStatus error: " + error;
                consoleErr(msg);
            });
        },
        statusClick = function (e) {
            var status = e.currentTarget.dataset.status;
            console.log("statusClick called", status);

            setDeviceStatus(status);
        },
        addEventListeners = function () {
            for (var i = 0; i < privacyStatuses.length; i++) {
                privacyStatuses[i].addEventListener('click', statusClick, false);
            }
        },
        removeEventListeners = function () {
            for (var i = 0; i < privacyStatuses.length; i++) {
                privacyStatuses[i].removeEventListener('click', statusClick, false);
            }
        },
        periodicPrivacyStatusCheck = function () {
            console.log(Date.now().toISOString() + ' ' + driveAddInName + ': ' + 'periodicPrivacyStatusCheck');
            updateStatusUI(true);
            window.setTimeout(periodicPrivacyStatusCheck, msTime);
        };   

    return {
        /**
         * initialize() is called only once when the Add-In is first loaded. Use this function to initialize the
         * Add-In's state such as default values or make API requests (MyGeotab or external) to ensure interface
         * is ready for the user.
         * @param {object} freshApi - The GeotabApi object for making calls to MyGeotab.
         * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
         * @param {function} initializeCallback - Call this when your initialize route is complete. Since your initialize routine
         *        might be doing asynchronous operations, you must call this method when the Add-In is ready
         *        for display to the user.
         */
        initialize: function (freshApi, freshState, initializeCallback) {
            elAddin = document.querySelector('#addInGeotabDrivePrivacy');
            privacyStatuses = elAddin.getElementsByClassName("status");

            api = freshApi;
            state = freshState;
            console.log("Initialize state : ", state);
            deviceId = state.device.id;
            console.log("deviceId ", deviceId);

            window.setTimeout(periodicPrivacyStatusCheck, msTime);

            // MUST call initializeCallback when done any setup
            initializeCallback();
        },

        /**
         * focus() is called whenever the Add-In receives focus.
         *
         * The first time the user clicks on the Add-In menu, initialize() will be called and when completed, focus().
         * focus() will be called again when the Add-In is revisited. Note that focus() will also be called whenever
         * the global state of the MyGeotab application changes, for example, if the user changes the global group
         * filter in the UI.
         *
         * @param {object} freshApi - The GeotabApi object for making calls to MyGeotab.
         * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
         */
        focus: function (freshApi, freshState) {
            api = freshApi;
            state = freshState;
            console.log("Focus state: ", state);

            updateStatusUI(false);

            // show main content
            elAddin.className = 'panel';

            addEventListeners();
        },

        /**
         * blur() is called whenever the user navigates away from the Add-In.
         *
         * Use this function to save the page state or commit changes to a data store or release memory.
         *
         * @param {object} freshApi - The GeotabApi object for making calls to MyGeotab.
         * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
         */
        blur: function (freshApi, freshState) {
            api = freshApi;
            state = freshState;
            // hide main content
            elAddin.className = 'hidden';

            removeEventListeners();
        }
    };
};
