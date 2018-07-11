"use strict";
/*!
 * GeoFire is an open-source library that allows you to store and query a set
 * of keys based on their geographic location. At its heart, GeoFire simply
 * stores locations with string keys. Its main benefit, however, is the
 * possibility of retrieving only those keys within a given geographic area -
 * all in realtime.
 *
 * GeoFire 0.0.0
 * https://github.com/firebase/geofire-js/
 * License: MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
var query_1 = require("./query");
var utils_1 = require("./utils");
/**
 * Creates a GeoFirestore instance.
 */
var GeoFirestore = /** @class */ (function () {
    /**
     * @param _collectionRef A Firestore Collection reference where the GeoFirestore data will be stored.
     */
    function GeoFirestore(_collectionRef) {
        this._collectionRef = _collectionRef;
        if (Object.prototype.toString.call(this._collectionRef) !== '[object Object]') {
            throw new Error('collectionRef must be an instance of a Firestore Collection');
        }
    }
    /********************/
    /*  PUBLIC METHODS  */
    /********************/
    /**
     * Returns a promise fulfilled with the location corresponding to the provided key.
     *
     * If the provided key does not exist, the returned promise is fulfilled with null.
     *
     * @param key The key of the location to retrieve.
     * @returns A promise that is fulfilled with the location of the given key.
     */
    GeoFirestore.prototype.get = function (key) {
        utils_1.validateKey(key);
        return this._collectionRef.doc(key).get().then(function (documentSnapshot) {
            if (!documentSnapshot.exists) {
                return null;
            }
            else {
                var snapshotVal = documentSnapshot.data();
                return utils_1.decodeGeoFireObject(snapshotVal);
            }
        });
    };
    ;
    /**
     * Returns a promise fulfilled with the key, location, and document stored in the GeoFire index
     * corresponding to the provided key.
     *
     * If the provided key does not exist in the index, the returned promise is fulfilled with null.
     *
     * @param key The key of the geofire object to retrieve
     * @return A promise that is fulfilled with an object of {key, location, document}
     */
    GeoFirestore.prototype.getWithDocument = function (key) {
        utils_1.validateKey(key);
        return this._collectionRef.doc(key).get().then(function (documentSnapshot) {
            if (!documentSnapshot.exists) {
                return null;
            }
            else {
                var snapshotVal = documentSnapshot.data();
                return {
                    key: key,
                    location: utils_1.decodeGeoFireObject(snapshotVal),
                    document: utils_1.decodeGeoFireDocumentObject(snapshotVal)
                };
            }
        });
    };
    ;
    /**
     * Returns the Firestore Collection used to create this GeoFirestore instance.
     *
     * @returns The Firestore Collection used to create this GeoFirestore instance.
     */
    GeoFirestore.prototype.ref = function () {
        return this._collectionRef;
    };
    ;
    /**
     * Removes the provided key from this GeoFirestore. Returns an empty promise fulfilled when the key has been removed.
     *
     * If the provided key is not in this GeoFirestore, the promise will still successfully resolve.
     *
     * @param key The key of the location to remove.
     * @returns A promise that is fulfilled after the inputted key is removed.
     */
    GeoFirestore.prototype.remove = function (key) {
        return this.set(key, null);
    };
    ;
    /**
     * Adds the provided key - location pair(s) to Firestore. Returns an empty promise which is fulfilled when the write is complete.
     *
     * If any provided key already exists in this GeoFirestore, it will be overwritten with the new location value.
     *
     * @param keyOrLocations The key representing the location to add or a mapping of key - location pairs which
     * represent the locations to add.
     * @param location The [latitude, longitude] pair to add.
     * @param document Document to add to location.
     * @returns A promise that is fulfilled when the write is complete.
     */
    GeoFirestore.prototype.setWithDocument = function (keyOrLocations, location, document) {
        var _this = this;
        if (typeof keyOrLocations === 'string' && keyOrLocations.length !== 0) {
            utils_1.validateKey(keyOrLocations);
            if (location === null) {
                // Setting location to null is valid since it will remove the key
                return this._collectionRef.doc(keyOrLocations).delete();
            }
            else {
                utils_1.validateLocation(location);
                var geohash = utils_1.encodeGeohash(location);
                return this._collectionRef.doc(keyOrLocations).set(utils_1.encodeGeoFireDocumentObject(location, geohash, document));
            }
        }
        else if (typeof keyOrLocations === 'object') {
            if (typeof location !== 'undefined') {
                throw new Error('The location argument should not be used if you pass an object to set().');
            }
        }
        else {
            throw new Error('keyOrLocations must be a string or a mapping of key - location pairs.');
        }
        var batch = this._collectionRef.firestore.batch();
        Object.keys(keyOrLocations).forEach(function (key) {
            utils_1.validateKey(key);
            var ref = _this._collectionRef.doc(key);
            var location = keyOrLocations[key].location;
            var document = keyOrLocations[key].document;
            if (location === null) {
                batch.delete(ref);
            }
            else {
                utils_1.validateLocation(location);
                var geohash = utils_1.encodeGeohash(location);
                batch.set(ref, utils_1.encodeGeoFireDocumentObject(location, geohash, document), { merge: true });
            }
        });
        return batch.commit();
    };
    ;
    /**
     * Adds the provided key - location pair(s) to Firestore. Returns an empty promise which is fulfilled when the write is complete.
     *
     * If any provided key already exists in this GeoFirestore, it will be overwritten with the new location value.
     *
     * @param keyOrLocations The key representing the location to add or a mapping of key - location pairs which
     * represent the locations to add.
     * @param location The [latitude, longitude] pair to add.
     * @returns A promise that is fulfilled when the write is complete.
     */
    GeoFirestore.prototype.set = function (keyOrLocations, location) {
        var _this = this;
        if (typeof keyOrLocations === 'string' && keyOrLocations.length !== 0) {
            utils_1.validateKey(keyOrLocations);
            if (location === null) {
                // Setting location to null is valid since it will remove the key
                return this._collectionRef.doc(keyOrLocations).delete();
            }
            else {
                utils_1.validateLocation(location);
                var geohash = utils_1.encodeGeohash(location);
                return this._collectionRef.doc(keyOrLocations).set(utils_1.encodeGeoFireObject(location, geohash));
            }
        }
        else if (typeof keyOrLocations === 'object') {
            if (typeof location !== 'undefined') {
                throw new Error('The location argument should not be used if you pass an object to set().');
            }
        }
        else {
            throw new Error('keyOrLocations must be a string or a mapping of key - location pairs.');
        }
        var batch = this._collectionRef.firestore.batch();
        Object.keys(keyOrLocations).forEach(function (key) {
            utils_1.validateKey(key);
            var ref = _this._collectionRef.doc(key);
            var location = keyOrLocations[key];
            if (location === null) {
                batch.delete(ref);
            }
            else {
                utils_1.validateLocation(location);
                var geohash = utils_1.encodeGeohash(location);
                batch.set(ref, utils_1.encodeGeoFireObject(location, geohash), { merge: true });
            }
        });
        return batch.commit();
    };
    ;
    /**
     * Returns a new GeoQuery instance with the provided queryCriteria.
     *
     * @param queryCriteria The criteria which specifies the GeoQuery's center and radius.
     * @return A new GeoFirestoreQuery object.
     */
    GeoFirestore.prototype.query = function (queryCriteria) {
        return new query_1.GeoFirestoreQuery(this._collectionRef, queryCriteria);
    };
    ;
    /********************/
    /*  STATIC METHODS  */
    /********************/
    /**
     * Static method which calculates the distance, in kilometers, between two locations,
     * via the Haversine formula. Note that this is approximate due to the fact that the
     * Earth's radius varies between 6356.752 km and 6378.137 km.
     *
     * @param location1 The [latitude, longitude] pair of the first location.
     * @param location2 The [latitude, longitude] pair of the second location.
     * @returns The distance, in kilometers, between the inputted locations.
     */
    GeoFirestore.distance = function (location1, location2) {
        utils_1.validateLocation(location1);
        utils_1.validateLocation(location2);
        var radius = 6371; // Earth's radius in kilometers
        var latDelta = utils_1.degreesToRadians(location2[0] - location1[0]);
        var lonDelta = utils_1.degreesToRadians(location2[1] - location1[1]);
        var a = (Math.sin(latDelta / 2) * Math.sin(latDelta / 2)) +
            (Math.cos(utils_1.degreesToRadians(location1[0])) * Math.cos(utils_1.degreesToRadians(location2[0])) *
                Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2));
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return radius * c;
    };
    ;
    return GeoFirestore;
}());
exports.GeoFirestore = GeoFirestore;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VvZmlyZXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2dlb2ZpcmVzdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7R0FVRzs7QUFJSCxpQ0FBNEM7QUFDNUMsaUNBQTZMO0FBSTdMOztHQUVHO0FBQ0g7SUFDRTs7T0FFRztJQUNILHNCQUFvQixjQUFzRDtRQUF0RCxtQkFBYyxHQUFkLGNBQWMsQ0FBd0M7UUFDeEUsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLGlCQUFpQixFQUFFO1lBQzdFLE1BQU0sSUFBSSxLQUFLLENBQUMsNkRBQTZELENBQUMsQ0FBQztTQUNoRjtJQUNILENBQUM7SUFFRCxzQkFBc0I7SUFDdEIsc0JBQXNCO0lBQ3RCLHNCQUFzQjtJQUN0Qjs7Ozs7OztPQU9HO0lBQ0ksMEJBQUcsR0FBVixVQUFXLEdBQVc7UUFDcEIsbUJBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFDLGdCQUFxRDtZQUNuRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFO2dCQUM1QixPQUFPLElBQUksQ0FBQzthQUNiO2lCQUFNO2dCQUNMLElBQU0sV0FBVyxHQUFlLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN4RCxPQUFPLDJCQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQ3pDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUEsQ0FBQztJQUVGOzs7Ozs7OztPQVFHO0lBQ0ksc0NBQWUsR0FBdEIsVUFBdUIsR0FBVztRQUNoQyxtQkFBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxH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