import { MongoClient } from 'mongodb';
import { log } from '../log';
import config from '../config.json';
import { AssertionError } from 'assert';

let mongodb;

class MongoDB {
    public dbs;

    constructor() {
        if (mongodb)
            return mongodb;
        mongodb = this;
        this.dbs = {};
    }

    init = () => new Promise(resolve => {
        log.INFO('Connecting to databases...');
        const dbs = config.DATABASES;
        const recursiveDatabases = async (index) => {
            if (index < dbs.length) {
                const dbObject = dbs[index];
                await this.connectToDb(dbObject);
                recursiveDatabases(index + 1);
            }
            else {
                resolve();
            }
        };
        recursiveDatabases(0);
    });

    connectToDb = (dbObject:any) => new Promise((resolve, reject) =>
        MongoClient.connect(dbObject.url, (err, client) => {
            if (err) {
                log.WARN(`Error while connecting to database: ${err}`);
                reject();
            }
            this.dbs[dbObject.symbol] = client.db(dbObject.symbol);
            log.INFO(`Succesfully connected to the ${dbObject.symbol.toUpperCase()} database!`);
            resolve();
        })
    );

    getCollection = (dbSymbol:string, collectionSymbol:string) => 
        new Promise(async (resolve, reject) => {
            let cursor;
            try {
                cursor = await this.dbs[dbSymbol].collection(collectionSymbol).find({});
            }
            catch(err) {
                log.WARN(`fetching collection ${dbSymbol}/${collectionSymbol} failed`);
                log.WARN(err);
            }
            cursor.toArray((err, docs) => {
                if (err) {
                    log.WARN(`transforming collection ${dbSymbol}/${collectionSymbol} failed`);
                    log.WARN(err);
                    reject();
                }
                else {
                    resolve(docs);
                }
            });
        })

    getDocument = (dbSymbol:string, collectionSymbol:string, document:object) => 
        new Promise(async (resolve, reject) => {
            const data:Object[] = [];
            let cursor;
            try {
                cursor = await this.dbs[dbSymbol].collection(collectionSymbol).find(document);
            }
            catch(err) {
                log.WARN(`fetching document ${dbSymbol}/${collectionSymbol}/${JSON.stringify(document)} failed`);
                log.WARN(err);
            }
            cursor.toArray((err, docs) => err
                ? reject(err)
                : resolve(docs[0])
            );
        })

    insertData = (dbSymbol:string, col, key, value, cb) => {
        this.dbs[dbSymbol].collection(col).insertOne({ [key]: value }, (err, result) => {
            if (err) {
                log.WARN(`Error during inserting ${key.toUpperCase()} data.`);
                return cb(err);
            }
            log.INFO(`Succesfully added data to ${dbSymbol.toUpperCase()}.${col.toUpperCase()} collection.`)
            return cb(null);
        });
    }

    insertMany = (dbSymbol:string, collection:string, manyObjects:Array<object>, cb) => {
        this.dbs[dbSymbol].collection(collection).insertMany(manyObjects, (err, result) => {
            if (err) {
                log.WARN(`Error during inserting data.`);
                return cb(err);
            }
            log.INFO(`Succesfully added data to ${dbSymbol.toUpperCase()}.${collection.toUpperCase()} collection.`)
            return cb(null);
        });
    }

    updateOne = (dbSymbol:string, collection:string, filter:Object, set:Object, cb) => {
        this.dbs[dbSymbol].collection(collection).updateOne(
            filter, 
            { $set: set },
            // { $unset: unset },
            (err, result) => {
            if (err) {
                log.WARN(`Error during updating data.`);
                return cb(err);
            }
            log.INFO(`Succesfully updated data in ${dbSymbol.toUpperCase()}.${collection.toUpperCase()} collection.`)
            return cb(null);
        });
    }

    updateMany = (dbSymbol:string, collection:string, filter:Object, set:Array<object>, cb) => {
        this.dbs[dbSymbol].collection(collection).updateMany(
            filter, 
            { $set: set },
            // { $unset: unset },
            (err, result) => {
            if (err) {
                log.WARN(`Error during updating data.`);
                return cb(err);
            }
            log.INFO(`Succesfully updated data in ${dbSymbol.toUpperCase()}.${collection.toUpperCase()} collection.`)
            return cb(null);
        });
    }

    replaceOne = (dbSymbol:string, collection:string, filter:Object, replacement:Object, cb) => {
        this.dbs[dbSymbol].collection(collection).replaceOne(
            filter, 
            replacement,
            { upsert: true },
            (err, result) => {
            if (err) {
                log.WARN(`Error during replacing data.`);
                return cb(err);
            }
            log.INFO(`Succesfully replaced data in ${dbSymbol.toUpperCase()}.${collection.toUpperCase()} collection.`)
            return cb(null);
        });
    }

    replaceMany = (dbSymbol:string, collection:string, filter:Object, replacement:Array<object>, cb) => {
        this.dbs[dbSymbol].collection(collection).replaceMany(
            filter, 
            replacement,
            { upsert: true },
            (err, result) => {
            if (err) {
                log.WARN(`Error during replacing data.`);
                return cb(err);
            }
            log.INFO(`Succesfully replaced data in ${dbSymbol.toUpperCase()}.${collection.toUpperCase()} collection.`)
            return cb(null);
        });
    }

    upsertOne = (dbSymbol:string, collection:string, filter:Object, object:Object, cb) => {
        this.dbs[dbSymbol].collection(collection).updateOne(filter, {$set: object}, { upsert: true }, (err, result) => {
            if (err) {
                log.WARN(`Error during upserting data.`);
                return cb(err);
            }
            log.INFO(`Succesfully upserted data to ${dbSymbol.toUpperCase()}.${collection.toUpperCase()} collection.`)
            return cb(null);
        });
    }

    upsertMany = (dbSymbol:string, collection:string, filter:Object, manyObjects:Array<object>, cb) => {
        this.dbs[dbSymbol].collection(collection).updateMany(filter, {$set: manyObjects}, { upsert: true }, (err, result) => {
            if (err) {
                log.WARN(`Error during upserting data.`);
                return cb(err);
            }
            log.INFO(`Succesfully upserted data to ${dbSymbol.toUpperCase()}.${collection.toUpperCase()} collection.`)
            return cb(null);
        });
    }

    deleteOne = (dbSymbol:string, collection:string, filter:Object, cb) => {
        this.dbs[dbSymbol].collection(collection).deleteOne(filter, (err, result) => {
            if (err) {
                log.WARN(`Error during deleting data.`);
                return cb(err);
            }
            log.INFO(`Succesfully deleted data from ${dbSymbol.toUpperCase()}.${collection.toUpperCase()} collection.`)
            return cb(null);
        });
    }

    deleteMany = (dbSymbol:string, collection:string, filter:Object, cb) => {
        this.dbs[dbSymbol].collection(collection).deleteMany(filter, (err, result) => {
            if (err) {
                log.WARN(`Error during deleting data.`);
                return cb(err);
            }
            log.INFO(`Succesfully deleted data from ${dbSymbol.toUpperCase()}.${collection.toUpperCase()} collection.`)
            return cb(null);
        });
    }

    findCollection = (database, collection, cb) => database.collection(collection).find({}).toArray((err, data) => cb(err, data));
}

export const mongo = new MongoDB();
