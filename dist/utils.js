"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Default geohash length
exports.g_GEOHASH_PRECISION = 10;
// Characters used in location geohashes
exports.g_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
// The meridional circumference of the earth in meters
exports.g_EARTH_MERI_CIRCUMFERENCE = 40007860;
// Length of a degree latitude at the equator
exports.g_METERS_PER_DEGREE_LATITUDE = 110574;
// Number of bits per geohash character
exports.g_BITS_PER_CHAR = 5;
// Maximum length of a geohash in bits
exports.g_MAXIMUM_BITS_PRECISION = 22 * exports.g_BITS_PER_CHAR;
// Equatorial radius of the earth in meters
exports.g_EARTH_EQ_RADIUS = 6378137.0;
// The following value assumes a polar radius of
// const g_EARTH_POL_RADIUS = 6356752.3;
// The formulate to calculate g_E2 is
// g_E2 == (g_EARTH_EQ_RADIUS^2-g_EARTH_POL_RADIUS^2)/(g_EARTH_EQ_RADIUS^2)
// The exact value is used here to avoid rounding errors
exports.g_E2 = 0.00669447819799;
// Cutoff for rounding errors on double calculations
exports.g_EPSILON = 1e-12;
Math.log2 = Math.log2 || function (x) {
    return Math.log(x) / Math.log(2);
};
/**
 * Validates the inputted key and throws an error if it is invalid.
 *
 * @param key The key to be verified.
 */
function validateKey(key) {
    var error;
    if (typeof key !== 'string') {
        error = 'key must be a string';
    }
    else if (key.length === 0) {
        error = 'key cannot be the empty string';
    }
    else if (1 + exports.g_GEOHASH_PRECISION + key.length > 755) {
        // Firebase can only stored child paths up to 768 characters
        // The child path for this key is at the least: 'i/<geohash>key'
        error = 'key is too long to be stored in Firebase';
    }
    else if (/[\[\].#$\/\u0000-\u001F\u007F]/.test(key)) {
        // Firebase does not allow node keys to contain the following characters
        error = 'key cannot contain any of the following characters: . # $ ] [ /';
    }
    if (typeof error !== 'undefined') {
        throw new Error('Invalid GeoFire key \'' + key + '\': ' + error);
    }
}
exports.validateKey = validateKey;
;
/**
 * Validates the inputted location and throws an error if it is invalid.
 *
 * @param location The [latitude, longitude] pair to be verified.
 */
function validateLocation(location) {
    var error;
    if (!Array.isArray(location)) {
        error = 'location must be an array';
    }
    else if (location.length !== 2) {
        error = 'expected array of length 2, got length ' + location.length;
    }
    else {
        var latitude = location[0];
        var longitude = location[1];
        if (typeof latitude !== 'number' || isNaN(latitude)) {
            error = 'latitude must be a number';
        }
        else if (latitude < -90 || latitude > 90) {
            error = 'latitude must be within the range [-90, 90]';
        }
        else if (typeof longitude !== 'number' || isNaN(longitude)) {
            error = 'longitude must be a number';
        }
        else if (longitude < -180 || longitude > 180) {
            error = 'longitude must be within the range [-180, 180]';
        }
    }
    if (typeof error !== 'undefined') {
        throw new Error('Invalid GeoFire location \'' + location + '\': ' + error);
    }
}
exports.validateLocation = validateLocation;
;
/**
 * Validates the inputted geohash and throws an error if it is invalid.
 *
 * @param geohash The geohash to be validated.
 */
function validateGeohash(geohash) {
    var error;
    if (typeof geohash !== 'string') {
        error = 'geohash must be a string';
    }
    else if (geohash.length === 0) {
        error = 'geohash cannot be the empty string';
    }
    else {
        for (var _i = 0, geohash_1 = geohash; _i < geohash_1.length; _i++) {
            var letter = geohash_1[_i];
            if (exports.g_BASE32.indexOf(letter) === -1) {
                error = 'geohash cannot contain \'' + letter + '\'';
            }
        }
    }
    if (typeof error !== 'undefined') {
        throw new Error('Invalid GeoFire geohash \'' + geohash + '\': ' + error);
    }
}
exports.validateGeohash = validateGeohash;
;
/**
 * Validates the inputted query criteria and throws an error if it is invalid.
 *
 * @param newQueryCriteria The criteria which specifies the query's center and/or radius.
 * @param requireCenterAndRadius The criteria which center and radius required.
 */
function validateCriteria(newQueryCriteria, requireCenterAndRadius) {
    if (requireCenterAndRadius === void 0) { requireCenterAndRadius = false; }
    if (typeof newQueryCriteria !== 'object') {
        throw new Error('query criteria must be an object');
    }
    else if (typeof newQueryCriteria.center === 'undefined' && typeof newQueryCriteria.radius === 'undefined') {
        throw new Error('radius and/or center must be specified');
    }
    else if (requireCenterAndRadius && (typeof newQueryCriteria.center === 'undefined' || typeof newQueryCriteria.radius === 'undefined')) {
        throw new Error('query criteria for a new query must contain both a center and a radius');
    }
    // Throw an error if there are any extraneous attributes
    var keys = Object.keys(newQueryCriteria);
    for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
        var key = keys_1[_i];
        if (key !== 'center' && key !== 'radius') {
            throw new Error('Unexpected attribute \'' + key + '\' found in query criteria');
        }
    }
    // Validate the 'center' attribute
    if (typeof newQueryCriteria.center !== 'undefined') {
        validateLocation(newQueryCriteria.center);
    }
    // Validate the 'radius' attribute
    if (typeof newQueryCriteria.radius !== 'undefined') {
        if (typeof newQueryCriteria.radius !== 'number' || isNaN(newQueryCriteria.radius)) {
            throw new Error('radius must be a number');
        }
        else if (newQueryCriteria.radius < 0) {
            throw new Error('radius must be greater than or equal to 0');
        }
    }
}
exports.validateCriteria = validateCriteria;
;
/**
 * Converts degrees to radians.
 *
 * @param degrees The number of degrees to be converted to radians.
 * @returns The number of radians equal to the inputted number of degrees.
 */
function degreesToRadians(degrees) {
    if (typeof degrees !== 'number' || isNaN(degrees)) {
        throw new Error('Error: degrees must be a number');
    }
    return (degrees * Math.PI / 180);
}
exports.degreesToRadians = degreesToRadians;
;
/**
 * Generates a geohash of the specified precision/string length from the  [latitude, longitude]
 * pair, specified as an array.
 *
 * @param location The [latitude, longitude] pair to encode into a geohash.
 * @param precision The length of the geohash to create. If no precision is specified, the
 * global default is used.
 * @returns The geohash of the inputted location.
 */
function encodeGeohash(location, precision) {
    if (precision === void 0) { precision = exports.g_GEOHASH_PRECISION; }
    validateLocation(location);
    if (typeof precision !== 'undefined') {
        if (typeof precision !== 'number' || isNaN(precision)) {
            throw new Error('precision must be a number');
        }
        else if (precision <= 0) {
            throw new Error('precision must be greater than 0');
        }
        else if (precision > 22) {
            throw new Error('precision cannot be greater than 22');
        }
        else if (Math.round(precision) !== precision) {
            throw new Error('precision must be an integer');
        }
    }
    var latitudeRange = {
        min: -90,
        max: 90
    };
    var longitudeRange = {
        min: -180,
        max: 180
    };
    var hash = '';
    var hashVal = 0;
    var bits = 0;
    var even = 1;
    while (hash.length < precision) {
        var val = even ? location[1] : location[0];
        var range = even ? longitudeRange : latitudeRange;
        var mid = (range.min + range.max) / 2;
        if (val > mid) {
            hashVal = (hashVal << 1) + 1;
            range.min = mid;
        }
        else {
            hashVal = (hashVal << 1) + 0;
            range.max = mid;
        }
        even = !even;
        if (bits < 4) {
            bits++;
        }
        else {
            bits = 0;
            hash += exports.g_BASE32[hashVal];
            hashVal = 0;
        }
    }
    return hash;
}
exports.encodeGeohash = encodeGeohash;
;
/**
 * Calculates the number of degrees a given distance is at a given latitude.
 *
 * @param distance The distance to convert.
 * @param latitude The latitude at which to calculate.
 * @returns The number of degrees the distance corresponds to.
 */
function metersToLongitudeDegrees(distance, latitude) {
    var radians = degreesToRadians(latitude);
    var num = Math.cos(radians) * exports.g_EARTH_EQ_RADIUS * Math.PI / 180;
    var denom = 1 / Math.sqrt(1 - exports.g_E2 * Math.sin(radians) * Math.sin(radians));
    var deltaDeg = num * denom;
    if (deltaDeg < exports.g_EPSILON) {
        return distance > 0 ? 360 : 0;
    }
    else {
        return Math.min(360, distance / deltaDeg);
    }
}
exports.metersToLongitudeDegrees = metersToLongitudeDegrees;
;
/**
 * Calculates the bits necessary to reach a given resolution, in meters, for the longitude at a
 * given latitude.
 *
 * @param resolution The desired resolution.
 * @param latitude The latitude used in the conversion.
 * @return The bits necessary to reach a given resolution, in meters.
 */
function longitudeBitsForResolution(resolution, latitude) {
    var degs = metersToLongitudeDegrees(resolution, latitude);
    return (Math.abs(degs) > 0.000001) ? Math.max(1, Math.log2(360 / degs)) : 1;
}
exports.longitudeBitsForResolution = longitudeBitsForResolution;
;
/**
 * Calculates the bits necessary to reach a given resolution, in meters, for the latitude.
 *
 * @param resolution The bits necessary to reach a given resolution, in meters.
 * @returns Bits necessary to reach a given resolution, in meters, for the latitude.
 */
function latitudeBitsForResolution(resolution) {
    return Math.min(Math.log2(exports.g_EARTH_MERI_CIRCUMFERENCE / 2 / resolution), exports.g_MAXIMUM_BITS_PRECISION);
}
exports.latitudeBitsForResolution = latitudeBitsForResolution;
;
/**
 * Wraps the longitude to [-180,180].
 *
 * @param longitude The longitude to wrap.
 * @returns longitude The resulting longitude.
 */
function wrapLongitude(longitude) {
    if (longitude <= 180 && longitude >= -180) {
        return longitude;
    }
    var adjusted = longitude + 180;
    if (adjusted > 0) {
        return (adjusted % 360) - 180;
    }
    else {
        return 180 - (-adjusted % 360);
    }
}
exports.wrapLongitude = wrapLongitude;
;
/**
 * Calculates the maximum number of bits of a geohash to get a bounding box that is larger than a
 * given size at the given coordinate.
 *
 * @param coordinate The coordinate as a [latitude, longitude] pair.
 * @param size The size of the bounding box.
 * @returns The number of bits necessary for the geohash.
 */
function boundingBoxBits(coordinate, size) {
    var latDeltaDegrees = size / exports.g_METERS_PER_DEGREE_LATITUDE;
    var latitudeNorth = Math.min(90, coordinate[0] + latDeltaDegrees);
    var latitudeSouth = Math.max(-90, coordinate[0] - latDeltaDegrees);
    var bitsLat = Math.floor(latitudeBitsForResolution(size)) * 2;
    var bitsLongNorth = Math.floor(longitudeBitsForResolution(size, latitudeNorth)) * 2 - 1;
    var bitsLongSouth = Math.floor(longitudeBitsForResolution(size, latitudeSouth)) * 2 - 1;
    return Math.min(bitsLat, bitsLongNorth, bitsLongSouth, exports.g_MAXIMUM_BITS_PRECISION);
}
exports.boundingBoxBits = boundingBoxBits;
;
/**
 * Calculates eight points on the bounding box and the center of a given circle. At least one
 * geohash of these nine coordinates, truncated to a precision of at most radius, are guaranteed
 * to be prefixes of any geohash that lies within the circle.
 *
 * @param center The center given as [latitude, longitude].
 * @param radius The radius of the circle.
 * @returns The eight bounding box points.
 */
function boundingBoxCoordinates(center, radius) {
    var latDegrees = radius / exports.g_METERS_PER_DEGREE_LATITUDE;
    var latitudeNorth = Math.min(90, center[0] + latDegrees);
    var latitudeSouth = Math.max(-90, center[0] - latDegrees);
    var longDegsNorth = metersToLongitudeDegrees(radius, latitudeNorth);
    var longDegsSouth = metersToLongitudeDegrees(radius, latitudeSouth);
    var longDegs = Math.max(longDegsNorth, longDegsSouth);
    return [
        [center[0], center[1]],
        [center[0], wrapLongitude(center[1] - longDegs)],
        [center[0], wrapLongitude(center[1] + longDegs)],
        [latitudeNorth, center[1]],
        [latitudeNorth, wrapLongitude(center[1] - longDegs)],
        [latitudeNorth, wrapLongitude(center[1] + longDegs)],
        [latitudeSouth, center[1]],
        [latitudeSouth, wrapLongitude(center[1] - longDegs)],
        [latitudeSouth, wrapLongitude(center[1] + longDegs)]
    ];
}
exports.boundingBoxCoordinates = boundingBoxCoordinates;
;
/**
 * Calculates the bounding box query for a geohash with x bits precision.
 *
 * @param geohash The geohash whose bounding box query to generate.
 * @param bits The number of bits of precision.
 * @returns A [start, end] pair of geohashes.
 */
function geohashQuery(geohash, bits) {
    validateGeohash(geohash);
    var precision = Math.ceil(bits / exports.g_BITS_PER_CHAR);
    if (geohash.length < precision) {
        return [geohash, geohash + '~'];
    }
    geohash = geohash.substring(0, precision);
    var base = geohash.substring(0, geohash.length - 1);
    var lastValue = exports.g_BASE32.indexOf(geohash.charAt(geohash.length - 1));
    var significantBits = bits - (base.length * exports.g_BITS_PER_CHAR);
    var unusedBits = (exports.g_BITS_PER_CHAR - significantBits);
    // delete unused bits
    var startValue = (lastValue >> unusedBits) << unusedBits;
    var endValue = startValue + (1 << unusedBits);
    if (endValue > 31) {
        return [base + exports.g_BASE32[startValue], base + '~'];
    }
    else {
        return [base + exports.g_BASE32[startValue], base + exports.g_BASE32[endValue]];
    }
}
exports.geohashQuery = geohashQuery;
;
/**
 * Calculates a set of queries to fully contain a given circle. A query is a [start, end] pair
 * where any geohash is guaranteed to be lexiographically larger then start and smaller than end.
 *
 * @param center The center given as [latitude, longitude] pair.
 * @param radius The radius of the circle.
 * @return An array of geohashes containing a [start, end] pair.
 */
function geohashQueries(center, radius) {
    validateLocation(center);
    var queryBits = Math.max(1, boundingBoxBits(center, radius));
    var geohashPrecision = Math.ceil(queryBits / exports.g_BITS_PER_CHAR);
    var coordinates = boundingBoxCoordinates(center, radius);
    var queries = coordinates.map(function (coordinate) {
        return geohashQuery(encodeGeohash(coordinate, geohashPrecision), queryBits);
    });
    // remove duplicates
    return queries.filter(function (query, index) {
        return !queries.some(function (other, otherIndex) {
            return index > otherIndex && query[0] === other[0] && query[1] === other[1];
        });
    });
}
exports.geohashQueries = geohashQueries;
;
/**
 * Encodes a location and geohash as a GeoFire object.
 *
 * @param location The location as [latitude, longitude] pair.
 * @param geohash The geohash of the location.
 * @returns The location encoded as GeoFire object.
 */
function encodeGeoFireObject(location, geohash) {
    validateLocation(location);
    validateGeohash(geohash);
    return { '.priority': geohash, 'g': geohash, 'l': location };
}
exports.encodeGeoFireObject = encodeGeoFireObject;
/**
 * Encodes a location and geohash as a GeoFire object.
 *
 * @param location The location as [latitude, longitude] pair.
 * @param geohash The geohash of the location.
 * @param document The optional document to include on the index (keep this small)
 * @returns The location encoded as GeoFire object.
 */
function encodeGeoFireDocumentObject(location, geohash, document) {
    if (document === void 0) { document = null; }
    validateLocation(location);
    validateGeohash(geohash);
    return { '.priority': geohash, 'g': geohash, 'l': location, 'd': document };
}
exports.encodeGeoFireDocumentObject = encodeGeoFireDocumentObject;
/**
 * Decodes the location given as GeoFire object. Returns null if decoding fails.
 *
 * @param geoFireObj The location encoded as GeoFire object.
 * @returns The location as [latitude, longitude] pair or null if decoding fails.
 */
function decodeGeoFireObject(geoFireObj) {
    if (geoFireObj && 'l' in geoFireObj && Array.isArray(geoFireObj.l) && geoFireObj.l.length === 2) {
        return geoFireObj.l;
    }
    else {
        throw new Error('Unexpected location object encountered: ' + JSON.stringify(geoFireObj));
    }
}
exports.decodeGeoFireObject = decodeGeoFireObject;
/**
 * Decodes a GeoFire snapshot value to get the optionally stored document object
 *
 * @param geoFireObj The GeoFire snapshot value
 * @returns The optionally stored document object, if it exists
 */
function decodeGeoFireDocumentObject(geoFireObj) {
    if (geoFireObj && 'd' in geoFireObj) {
        return geoFireObj.d;
    }
}
exports.decodeGeoFireDocumentObject = decodeGeoFireDocumentObject;
/**
 * Returns the key of a Firebase snapshot across SDK versions.
 *
 * @param A Firebase snapshot.
 * @returns The Firebase snapshot's key.
 */
function geoFireGetKey(snapshot) {
    var key;
    if (typeof snapshot.key === 'string' || snapshot.key === null) {
        key = snapshot.key;
    }
    return key;
}
exports.geoFireGetKey = geoFireGetKey;
/**
 * Returns the id of a Firestore snapshot across SDK versions.
 *
 * @param A Firestore snapshot.
 * @returns The Firestore snapshot's id.
 */
function geoFirestoreGetKey(snapshot) {
    var id;
    if (typeof snapshot.id === 'string' || snapshot.id === null) {
        id = snapshot.id;
    }
    return id;
}
exports.geoFirestoreGetKey = geoFirestoreGetKey;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFJQSx5QkFBeUI7QUFDWixRQUFBLG1CQUFtQixHQUFXLEVBQUUsQ0FBQztBQUU5Qyx3Q0FBd0M7QUFDM0IsUUFBQSxRQUFRLEdBQVcsa0NBQWtDLENBQUM7QUFFbkUsc0RBQXNEO0FBQ3pDLFFBQUEsMEJBQTBCLEdBQVcsUUFBUSxDQUFDO0FBRTNELDZDQUE2QztBQUNoQyxRQUFBLDRCQUE0QixHQUFXLE1BQU0sQ0FBQztBQUUzRCx1Q0FBdUM7QUFDMUIsUUFBQSxlQUFlLEdBQVcsQ0FBQyxDQUFDO0FBRXpDLHNDQUFzQztBQUN6QixRQUFBLHdCQUF3QixHQUFXLEVBQUUsR0FBRyx1QkFBZSxDQUFDO0FBRXJFLDJDQUEyQztBQUM5QixRQUFBLGlCQUFpQixHQUFXLFNBQVMsQ0FBQztBQUVuRCxnREFBZ0Q7QUFDaEQsd0NBQXdDO0FBQ3hDLHFDQUFxQztBQUNyQywyRUFBMkU7QUFDM0Usd0RBQXdEO0FBQzNDLFFBQUEsSUFBSSxHQUFXLGdCQUFnQixDQUFDO0FBRTdDLG9EQUFvRDtBQUN2QyxRQUFBLFNBQVMsR0FBVyxLQUFLLENBQUM7QUFFdkMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLFVBQVUsQ0FBQztJQUNsQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUM7QUFFRjs7OztHQUlHO0FBQ0gscUJBQTRCLEdBQVc7SUFDckMsSUFBSSxLQUFhLENBQUM7SUFFbEIsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7UUFDM0IsS0FBSyxHQUFHLHNCQUFzQixDQUFDO0tBQ2hDO1NBQU0sSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUMzQixLQUFLLEdB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