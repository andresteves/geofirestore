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
import * as firebase from 'firebase';
import { GeoFirestoreQuery } from './query';
import { QueryCriteria } from './interfaces';
/**
 * Creates a GeoFirestore instance.
 */
export declare class GeoFirestore {
    private _collectionRef;
    /**
     * @param _collectionRef A Firestore Collection reference where the GeoFirestore data will be stored.
     */
    constructor(_collectionRef: firebase.firestore.CollectionReference);
    /********************/
    /********************/
    /**
     * Returns a promise fulfilled with the location corresponding to the provided key.
     *
     * If the provided key does not exist, the returned promise is fulfilled with null.
     *
     * @param key The key of the location to retrieve.
     * @returns A promise that is fulfilled with the location of the given key.
     */
    get(key: string): Promise<number[]>;
    /**
     * Returns a promise fulfilled with the key, location, and document stored in the GeoFire index
     * corresponding to the provided key.
     *
     * If the provided key does not exist in the index, the returned promise is fulfilled with null.
     *
     * @param key The key of the geofire object to retrieve
     * @return A promise that is fulfilled with an object of {key, location, document}
     */
    getWithDocument(key: string): Promise<any>;
    /**
     * Returns the Firestore Collection used to create this GeoFirestore instance.
     *
     * @returns The Firestore Collection used to create this GeoFirestore instance.
     */
    ref(): firebase.firestore.CollectionReference;
    /**
     * Removes the provided key from this GeoFirestore. Returns an empty promise fulfilled when the key has been removed.
     *
     * If the provided key is not in this GeoFirestore, the promise will still successfully resolve.
     *
     * @param key The key of the location to remove.
     * @returns A promise that is fulfilled after the inputted key is removed.
     */
    remove(key: string): Promise<void>;
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
    setWithDocument(keyOrLocations: string | any, location?: number[], document?: any): Promise<void>;
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
    set(keyOrLocations: string | any, location?: number[]): Promise<void>;
    /**
     * Returns a new GeoQuery instance with the provided queryCriteria.
     *
     * @param queryCriteria The criteria which specifies the GeoQuery's center and radius.
     * @return A new GeoFirestoreQuery object.
     */
    query(queryCriteria: QueryCriteria): GeoFirestoreQuery;
    /********************/
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
    static distance(location1: number[], location2: number[]): number;
}
