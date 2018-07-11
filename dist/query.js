"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _1 = require("./");
var callbackRegistration_1 = require("./callbackRegistration");
var utils_1 = require("./utils");
/**
 * Creates a GeoFirestoreQuery instance.
 */
var GeoFirestoreQuery = /** @class */ (function () {
    /**
     * @param _collectionRef A Firestore Collection reference where the GeoFirestore data will be stored.
     * @param _queryCriteria The criteria which specifies the query's center and radius.
     */
    function GeoFirestoreQuery(_collectionRef, _queryCriteria) {
        var _this = this;
        this._collectionRef = _collectionRef;
        this._queryCriteria = _queryCriteria;
        // Event callbacks
        this._callbacks = { ready: [], key_entered: [], key_exited: [], key_moved: [] };
        // Variable to track when the query is cancelled
        this._cancelled = false;
        // A dictionary of geohash queries which currently have an active callbacks
        this._currentGeohashesQueried = {};
        // A dictionary of locations that a currently active in the queries
        // Note that not all of these are currently within this query
        this._locationsTracked = {};
        // Variables used to keep track of when to fire the 'ready' event
        this._valueEventFired = false;
        // Every ten seconds, clean up the geohashes we are currently querying for. We keep these around
        // for a little while since it's likely that they will need to be re-queried shortly after they
        // move outside of the query's bounding box.
        this._geohashCleanupScheduled = false;
        this._cleanUpCurrentGeohashesQueriedTimeout = null;
        // Firebase reference of the GeoFirestore which created this query
        if (Object.prototype.toString.call(this._collectionRef) !== '[object Object]') {
            throw new Error('firebaseRef must be an instance of Firestore');
        }
        this._cleanUpCurrentGeohashesQueriedInterval = setInterval(function () {
            if (_this._geohashCleanupScheduled === false) {
                _this._cleanUpCurrentGeohashesQueried();
            }
        }, 10000);
        // Validate and save the query criteria
        utils_1.validateCriteria(_queryCriteria, true);
        this._center = _queryCriteria.center;
        this._radius = _queryCriteria.radius;
        // Listen for new geohashes being added around this query and fire the appropriate events
        this._listenForNewGeohashes();
    }
    /********************/
    /*  PUBLIC METHODS  */
    /********************/
    /**
     * Terminates this query so that it no longer sends location updates. All callbacks attached to this
     * query via on() will be cancelled. This query can no longer be used in the future.
     */
    GeoFirestoreQuery.prototype.cancel = function () {
        var _this = this;
        // Mark this query as cancelled
        this._cancelled = true;
        // Cancel all callbacks in this query's callback list
        this._callbacks = { ready: [], key_entered: [], key_exited: [], key_moved: [] };
        // Turn off all Firebase listeners for the current geohashes being queried
        var keys = Object.keys(this._currentGeohashesQueried);
        keys.forEach(function (geohashQueryStr) {
            var query = _this._stringToQuery(geohashQueryStr);
            _this._cancelGeohashQuery(query, _this._currentGeohashesQueried[geohashQueryStr]);
            delete _this._currentGeohashesQueried[geohashQueryStr];
        });
        // Delete any stored locations
        this._locationsTracked = {};
        // Turn off the current geohashes queried clean up interval
        clearInterval(this._cleanUpCurrentGeohashesQueriedInterval);
    };
    ;
    /**
     * Returns the location signifying the center of this query.
     *
     * @returns The [latitude, longitude] pair signifying the center of this query.
     */
    GeoFirestoreQuery.prototype.center = function () {
        return this._center;
    };
    ;
    /**
     * Attaches a callback to this query which will be run when the provided eventType fires. Valid eventType
     * values are 'ready', 'key_entered', 'key_exited', and 'key_moved'. The ready event callback is passed no
     * parameters. All other callbacks will be passed three parameters: (1) the location's key, (2) the location's
     * [latitude, longitude] pair, and (3) the distance, in kilometers, from the location to this query's center
     *
     * 'ready' is used to signify that this query has loaded its initial state and is up-to-date with its corresponding
     * GeoFirestore instance. 'ready' fires when this query has loaded all of the initial data from GeoFirestore and fired all
     * other events for that data. It also fires every time updateCriteria() is called, after all other events have
     * fired for the updated query.
     *
     * 'key_entered' fires when a key enters this query. This can happen when a key moves from a location outside of
     * this query to one inside of it or when a key is written to GeoFirestore for the first time and it falls within
     * this query.
     *
     * 'key_exited' fires when a key moves from a location inside of this query to one outside of it. If the key was
     * entirely removed from GeoFire, both the location and distance passed to the callback will be null.
     *
     * 'key_moved' fires when a key which is already in this query moves to another location inside of it.
     *
     * Returns a GeoCallbackRegistration which can be used to cancel the callback. You can add as many callbacks
     * as you would like for the same eventType by repeatedly calling on(). Each one will get called when its
     * corresponding eventType fires. Each callback must be cancelled individually.
     *
     * @param eventType The event type for which to attach the callback. One of 'ready', 'key_entered',
     * 'key_exited', or 'key_moved'.
     * @param callback Callback function to be called when an event of type eventType fires.
     * @returns A callback registration which can be used to cancel the provided callback.
     */
    GeoFirestoreQuery.prototype.on = function (eventType, callback) {
        var _this = this;
        // Validate the inputs
        if (['ready', 'key_entered', 'key_exited', 'key_moved'].indexOf(eventType) === -1) {
            throw new Error('event type must be \'ready\', \'key_entered\', \'key_exited\', or \'key_moved\'');
        }
        if (typeof callback !== 'function') {
            throw new Error('callback must be a function');
        }
        // Add the callback to this query's callbacks list
        this._callbacks[eventType].push(callback);
        // If this is a 'key_entered' callback, fire it for every location already within this query
        if (eventType === 'key_entered') {
            var keys = Object.keys(this._locationsTracked);
            keys.forEach(function (key) {
                var locationDict = _this._locationsTracked[key];
                if (typeof locationDict !== 'undefined' && locationDict.isInQuery) {
                    callback(key, locationDict.location, locationDict.distanceFromCenter, locationDict.document);
                }
            });
        }
        // If this is a 'ready' callback, fire it if this query is already ready
        if (eventType === 'ready' && this._valueEventFired) {
            callback();
        }
        // Return an event registration which can be used to cancel the callback
        return new callbackRegistration_1.GeoCallbackRegistration(function () {
            _this._callbacks[eventType].splice(_this._callbacks[eventType].indexOf(callback), 1);
        });
    };
    ;
    /**
     * Returns the radius of this query, in kilometers.
     *
     * @returns The radius of this query, in kilometers.
     */
    GeoFirestoreQuery.prototype.radius = function () {
        return this._radius;
    };
    ;
    /**
     * Updates the criteria for this query.
     *
     * @param newQueryCriteria The criteria which specifies the query's center and radius.
     */
    GeoFirestoreQuery.prototype.updateCriteria = function (newQueryCriteria) {
        // Validate and save the new query criteria
        utils_1.validateCriteria(newQueryCriteria);
        this._center = newQueryCriteria.center || this._center;
        this._radius = newQueryCriteria.radius || this._radius;
        // Loop through all of the locations in the query, update their distance from the center of the
        // query, and fire any appropriate events
        var keys = Object.keys(this._locationsTracked);
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            // If the query was cancelled while going through this loop, stop updating locations and stop
            // firing events
            if (this._cancelled === true) {
                break;
            }
            // Get the cached information for this location
            var locationDict = this._locationsTracked[key];
            // Save if the location was already in the query
            var wasAlreadyInQuery = locationDict.isInQuery;
            // Update the location's distance to the new query center
            locationDict.distanceFromCenter = _1.GeoFirestore.distance(locationDict.location, this._center);
            // Determine if the location is now in this query
            locationDict.isInQuery = (locationDict.distanceFromCenter <= this._radius);
            // If the location just left the query, fire the 'key_exited' callbacks
            // Else if the location just entered the query, fire the 'key_entered' callbacks
            if (wasAlreadyInQuery && !locationDict.isInQuery) {
                this._fireCallbacksForKey('key_exited', key, locationDict.location, locationDict.distanceFromCenter, locationDict.document);
            }
            else if (!wasAlreadyInQuery && locationDict.isInQuery) {
                this._fireCallbacksForKey('key_entered', key, locationDict.location, locationDict.distanceFromCenter, locationDict.document);
            }
        }
        // Reset the variables which control when the 'ready' event fires
        this._valueEventFired = false;
        // Listen for new geohashes being added to GeoFirestore and fire the appropriate events
        this._listenForNewGeohashes();
    };
    ;
    /*********************/
    /*  PRIVATE METHODS  */
    /*********************/
    /**
     * Turns off all callbacks for the provide geohash query.
     *
     * @param query The geohash query.
     * @param queryState An object storing the current state of the query.
     */
    GeoFirestoreQuery.prototype._cancelGeohashQuery = function (query, queryState) {
        queryState.childCallback();
        queryState.valueCallback();
    };
    /**
     * Callback for child added events.
     *
     * @param locationDataSnapshot A snapshot of the data stored for this location.
     */
    GeoFirestoreQuery.prototype._childAddedCallback = function (locationDataSnapshot) {
        var data = locationDataSnapshot.data();
        this._updateLocation(utils_1.geoFirestoreGetKey(locationDataSnapshot), utils_1.decodeGeoFireObject(data), utils_1.decodeGeoFireDocumentObject(data));
    };
    /**
     * Callback for child changed events
     *
     * @param locationDataSnapshot A snapshot of the data stored for this location.
     */
    GeoFirestoreQuery.prototype._childChangedCallback = function (locationDataSnapshot) {
        var data = locationDataSnapshot.data();
        this._updateLocation(utils_1.geoFirestoreGetKey(locationDataSnapshot), utils_1.decodeGeoFireObject(data), utils_1.decodeGeoFireDocumentObject(data));
    };
    /**
     * Callback for child removed events
     *
     * @param locationDataSnapshot A snapshot of the data stored for this location.
     */
    GeoFirestoreQuery.prototype._childRemovedCallback = function (locationDataSnapshot) {
        var _this = this;
        var key = utils_1.geoFirestoreGetKey(locationDataSnapshot);
        if (key in this._locationsTracked) {
            this._collectionRef.doc(key).get().then(function (snapshot) {
                var data = (!snapshot.exists) ? null : snapshot.data();
                var location = (!snapshot.exists) ? null : utils_1.decodeGeoFireObject(data);
                var geohash = (location !== null) ? utils_1.encodeGeohash(location) : null;
                // Only notify observers if key is not part of any other geohash query or this actually might not be
                // a key exited event, but a key moved or entered event. These events will be triggered by updates
                // to a different query
                if (!_this._geohashInSomeQuery(geohash)) {
                    _this._removeLocation(key, location);
                }
            });
        }
    };
    /**
     * Removes unnecessary Firebase queries which are currently being queried.
     */
    GeoFirestoreQuery.prototype._cleanUpCurrentGeohashesQueried = function () {
        var _this = this;
        var keys = Object.keys(this._currentGeohashesQueried);
        keys.forEach(function (geohashQueryStr) {
            var queryState = _this._currentGeohashesQueried[geohashQueryStr];
            if (queryState.active === false) {
                var query = _this._stringToQuery(geohashQueryStr);
                // Delete the geohash since it should no longer be queried
                _this._cancelGeohashQuery(query, queryState);
                delete _this._currentGeohashesQueried[geohashQueryStr];
            }
        });
        // Delete each location which should no longer be queried
        keys = Object.keys(this._locationsTracked);
        keys.forEach(function (key) {
            if (!_this._geohashInSomeQuery(_this._locationsTracked[key].geohash)) {
                if (_this._locationsTracked[key].isInQuery) {
                    throw new Error('Internal State error, trying to remove location that is still in query');
                }
                delete _this._locationsTracked[key];
            }
        });
        // Specify that this is done cleaning up the current geohashes queried
        this._geohashCleanupScheduled = false;
        // Cancel any outstanding scheduled cleanup
        if (this._cleanUpCurrentGeohashesQueriedTimeout !== null) {
            clearTimeout(this._cleanUpCurrentGeohashesQueriedTimeout);
            this._cleanUpCurrentGeohashesQueriedTimeout = null;
        }
    };
    /**
     * Fires each callback for the provided eventType, passing it provided key's data.
     *
     * @param eventType The event type whose callbacks to fire. One of 'key_entered', 'key_exited', or 'key_moved'.
     * @param key The key of the location for which to fire the callbacks.
     * @param location The location as [latitude, longitude] pair
     * @param distanceFromCenter The distance from the center or null.
     * @param document The optionally stored document on the index
     */
    GeoFirestoreQuery.prototype._fireCallbacksForKey = function (eventType, key, location, distanceFromCenter, document) {
        if (document === void 0) { document = null; }
        this._callbacks[eventType].forEach(function (callback) {
            if (typeof location === 'undefined' || location === null) {
                callback(key, null, null, null);
            }
            else {
                callback(key, location, distanceFromCenter, document);
            }
        });
    };
    /**
     * Fires each callback for the 'ready' event.
     */
    GeoFirestoreQuery.prototype._fireReadyEventCallbacks = function () {
        this._callbacks.ready.forEach(function (callback) {
            callback();
        });
    };
    /**
     * Checks if this geohash is currently part of any of the geohash queries.
     *
     * @param geohash The geohash.
     * @returns Returns true if the geohash is part of any of the current geohash queries.
     */
    GeoFirestoreQuery.prototype._geohashInSomeQuery = function (geohash) {
        var keys = Object.keys(this._currentGeohashesQueried);
        for (var _i = 0, keys_2 = keys; _i < keys_2.length; _i++) {
            var queryStr = keys_2[_i];
            if (queryStr in this._currentGeohashesQueried) {
                var query = this._stringToQuery(queryStr);
                if (geohash >= query[0] && geohash <= query[1]) {
                    return true;
                }
            }
        }
        return false;
    };
    /**
     * Called once all geohash queries have received all child added events and fires the ready
     * event if necessary.
     */
    GeoFirestoreQuery.prototype._geohashQueryReadyCallback = function (queryStr) {
        var index = this._outstandingGeohashReadyEvents.indexOf(queryStr);
        if (index > -1) {
            this._outstandingGeohashReadyEvents.splice(index, 1);
        }
        this._valueEventFired = (this._outstandingGeohashReadyEvents.length === 0);
        // If all queries have been processed, fire the ready event
        if (this._valueEventFired) {
            this._fireReadyEventCallbacks();
        }
    };
    /**
     * Attaches listeners to Firebase which track when new geohashes are added within this query's
     * bounding box.
     */
    GeoFirestoreQuery.prototype._listenForNewGeohashes = function () {
        var _this = this;
        // Get the list of geohashes to query
        var geohashesToQuery = utils_1.geohashQueries(this._center, this._radius * 1000).map(this._queryToString);
        // Filter out duplicate geohashes
        geohashesToQuery = geohashesToQuery.filter(function (geohash, i) { return geohashesToQuery.indexOf(geohash) === i; });
        // For all of the geohashes that we are already currently querying, check if they are still
        // supposed to be queried. If so, don't re-query them. Otherwise, mark them to be un-queried
        // next time we clean up the current geohashes queried dictionary.
        var keys = Object.keys(this._currentGeohashesQueried);
        keys.forEach(function (geohashQueryStr) {
            var index = geohashesToQuery.indexOf(geohashQueryStr);
            if (index === -1) {
                _this._currentGeohashesQueried[geohashQueryStr].active = false;
            }
            else {
                _this._currentGeohashesQueried[geohashQueryStr].active = true;
                geohashesToQuery.splice(index, 1);
            }
        });
        // If we are not already cleaning up the current geohashes queried and we have more than 25 of them,
        // kick off a timeout to clean them up so we don't create an infinite number of unneeded queries.
        if (this._geohashCleanupScheduled === false && Object.keys(this._currentGeohashesQueried).length > 25) {
            this._geohashCleanupScheduled = true;
            this._cleanUpCurrentGeohashesQueriedTimeout = setTimeout(this._cleanUpCurrentGeohashesQueried, 10);
        }
        // Keep track of which geohashes have been processed so we know when to fire the 'ready' event
        this._outstandingGeohashReadyEvents = geohashesToQuery.slice();
        // Loop through each geohash to query for and listen for new geohashes which have the same prefix.
        // For every match, attach a value callback which will fire the appropriate events.
        // Once every geohash to query is processed, fire the 'ready' event.
        geohashesToQuery.forEach(function (toQueryStr) {
            // decode the geohash query string
            var query = _this._stringToQuery(toQueryStr);
            // Create the Firebase query
            var firestoreQuery = _this._collectionRef.orderBy('g').startAt(query[0]).endAt(query[1]);
            // For every new matching geohash, determine if we should fire the 'key_entered' event
            var childCallback = firestoreQuery.onSnapshot(function (snapshot) {
                snapshot.docChanges.forEach(function (change) {
                    if (change.type === 'added') {
                        _this._childAddedCallback(change.doc);
                    }
                    if (change.type === 'modified') {
                        _this._childChangedCallback(change.doc);
                    }
                    if (change.type === 'removed') {
                        _this._childRemovedCallback(change.doc);
                    }
                });
            });
            // Once the current geohash to query is processed, see if it is the last one to be processed
            // and, if so, mark the value event as fired.
            // Note that Firebase fires the 'value' event after every 'added' event fires.
            var valueCallback = firestoreQuery.onSnapshot(function () {
                valueCallback();
                _this._geohashQueryReadyCallback(toQueryStr);
            });
            // Add the geohash query to the current geohashes queried dictionary and save its state
            _this._currentGeohashesQueried[toQueryStr] = {
                active: true,
                childCallback: childCallback,
                valueCallback: valueCallback
            };
        });
        // Based upon the algorithm to calculate geohashes, it's possible that no 'new'
        // geohashes were queried even if the client updates the radius of the query.
        // This results in no 'READY' event being fired after the .updateCriteria() call.
        // Check to see if this is the case, and trigger the 'READY' event.
        if (geohashesToQuery.length === 0) {
            this._geohashQueryReadyCallback();
        }
    };
    /**
     * Encodes a query as a string for easier indexing and equality.
     *
     * @param query The query to encode.
     * @returns The encoded query as string.
     */
    GeoFirestoreQuery.prototype._queryToString = function (query) {
        if (query.length !== 2) {
            throw new Error('Not a valid geohash query: ' + query);
        }
        return query[0] + ':' + query[1];
    };
    /**
     * Removes the location from the local state and fires any events if necessary.
     *
     * @param key The key to be removed.
     * @param currentLocation The current location as [latitude, longitude] pair or null if removed.
     */
    GeoFirestoreQuery.prototype._removeLocation = function (key, currentLocation) {
        var locationDict = this._locationsTracked[key];
        delete this._locationsTracked[key];
        if (typeof locationDict !== 'undefined' && locationDict.isInQuery) {
            var distanceFromCenter = (currentLocation) ? _1.GeoFirestore.distance(currentLocation, this._center) : null;
            this._fireCallbacksForKey('key_exited', key, currentLocation, distanceFromCenter);
        }
    };
    /**
     * Decodes a query string to a query
     *
     * @param str The encoded query.
     * @returns The decoded query as a [start, end] pair.
     */
    GeoFirestoreQuery.prototype._stringToQuery = function (str) {
        var decoded = str.split(':');
        if (decoded.length !== 2) {
            throw new Error('Invalid internal state! Not a valid geohash query: ' + str);
        }
        return decoded;
    };
    /**
     * Callback for any updates to locations. Will update the information about a key and fire any necessary
     * events every time the key's location changes.
     *
     * When a key is removed from GeoFirestore or the query, this function will be called with null and performs
     * any necessary cleanup.
     *
     * @param key The key of the GeoFirestore location.
     * @param location The location as [latitude, longitude] pair.
     * @param document The optional document to store with the location
     */
    GeoFirestoreQuery.prototype._updateLocation = function (key, location, document) {
        if (document === void 0) { document = null; }
        utils_1.validateLocation(location);
        // Get the key and location
        var distanceFromCenter, isInQuery;
        var wasInQuery = (key in this._locationsTracked) ? this._locationsTracked[key].isInQuery : false;
        var oldLocation = (key in this._locationsTracked) ? this._locationsTracked[key].location : null;
        // Determine if the location is within this query
        distanceFromCenter = _1.GeoFirestore.distance(location, this._center);
        isInQuery = (distanceFromCenter <= this._radius);
        // Add this location to the locations queried dictionary even if it is not within this query
        this._locationsTracked[key] = {
            location: location,
            document: document,
            distanceFromCenter: distanceFromCenter,
            isInQuery: isInQuery,
            geohash: utils_1.encodeGeohash(location)
        };
        // Fire the 'key_entered' event if the provided key has entered this query
        if (isInQuery && !wasInQuery) {
            this._fireCallbacksForKey('key_entered', key, location, distanceFromCenter, document);
        }
        else if (isInQuery && oldLocation !== null && (location[0] !== oldLocation[0] || location[1] !== oldLocation[1])) {
            this._fireCallbacksForKey('key_moved', key, location, distanceFromCenter, document);
        }
        else if (!isInQuery && wasInQuery) {
            this._fireCallbacksForKey('key_exited', key, location, distanceFromCenter, document);
        }
    };
    return GeoFirestoreQuery;
}());
exports.GeoFirestoreQuery = GeoFirestoreQuery;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcXVlcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSx1QkFBa0M7QUFDbEMsK0RBQWlFO0FBQ2pFLGlDQUFrSztBQUlsSzs7R0FFRztBQUNIO0lBdUJFOzs7T0FHRztJQUNILDJCQUFvQixjQUFzRCxFQUFVLGNBQTZCO1FBQWpILGlCQW1CQztRQW5CbUIsbUJBQWMsR0FBZCxjQUFjLENBQXdDO1FBQVUsbUJBQWMsR0FBZCxjQUFjLENBQWU7UUExQmpILGtCQUFrQjtRQUNWLGVBQVUsR0FBUSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUN4RixnREFBZ0Q7UUFDeEMsZUFBVSxHQUFZLEtBQUssQ0FBQztRQUVwQywyRUFBMkU7UUFDbkUsNkJBQXdCLEdBQVEsRUFBRSxDQUFDO1FBQzNDLG1FQUFtRTtRQUNuRSw2REFBNkQ7UUFDckQsc0JBQWlCLEdBQVEsRUFBRSxDQUFDO1FBR3BDLGlFQUFpRTtRQUN6RCxxQkFBZ0IsR0FBWSxLQUFLLENBQUM7UUFFMUMsZ0dBQWdHO1FBQ2hHLCtGQUErRjtRQUMvRiw0Q0FBNEM7UUFDcEMsNkJBQXdCLEdBQVksS0FBSyxDQUFDO1FBRTFDLDJDQUFzQyxHQUFHLElBQUksQ0FBQztRQU9wRCxrRUFBa0U7UUFDbEUsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLGlCQUFpQixFQUFFO1lBQzdFLE1BQU0sSUFBSSxLQUFLLENBQUMsOENBQThDLENBQUMsQ0FBQztTQUNqRTtRQUVELElBQUksQ0FBQyx1Q0FBdUMsR0FBRyxXQUFXLENBQUM7WUFDekQsSUFBSSxLQUFJLENBQUMsd0JBQXdCLEtBQUssS0FBSyxFQUFFO2dCQUMzQyxLQUFJLENB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