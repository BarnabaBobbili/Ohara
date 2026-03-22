import { getMongoDatabase } from './mongodb.js';
import { getMySQLPool } from './mysql.js';
import prisma from './prisma.js';
import { DATA_STORES } from '../config/dataStores.js';

// ─── Generic Data Store Adapter ───────────────────────────────────

export class DataStoreAdapter {
    constructor(storeConfig) {
        this.provider = storeConfig.provider;
        this.collectionName = storeConfig.collection;
        this.tableName = storeConfig.table;
        this.enabled = storeConfig.enabled;
    }

    get collection() {
        return this.provider === 'mongodb' ? this.collectionName : this.tableName;
    }

    getConnection() {
        switch (this.provider) {
            case 'mongodb':
                return getMongoDatabase();
            case 'mysql':
                return getMySQLPool();
            case 'postgres':
                return prisma;
            default:
                throw new Error(`Unsupported provider: ${this.provider}`);
        }
    }

    async find(query = {}, options = {}) {
        if (!this.enabled) return [];

        try {
            switch (this.provider) {
                case 'mongodb': {
                    const db = this.getConnection();
                    if (!db) return [];
                    
                    let cursor = db.collection(this.collection).find(query);
                    
                    if (options.sort) cursor = cursor.sort(options.sort);
                    if (options.skip) cursor = cursor.skip(options.skip);
                    if (options.limit) cursor = cursor.limit(options.limit);
                    if (options.projection) cursor = cursor.project(options.projection);
                    
                    return await cursor.toArray();
                }

                case 'mysql': {
                    const pool = this.getConnection();
                    let sql = `SELECT * FROM ${this.collection}`;
                    const params = [];

                    // Basic WHERE clause support
                    if (query && Object.keys(query).length > 0) {
                        const conditions = Object.entries(query).map(([key, value]) => {
                            params.push(value);
                            return `${key} = ?`;
                        });
                        sql += ` WHERE ${conditions.join(' AND ')}`;
                    }

                    // Order by
                    if (options.sort) {
                        const sortFields = Object.entries(options.sort)
                            .map(([field, dir]) => `${field} ${dir === 1 ? 'ASC' : 'DESC'}`)
                            .join(', ');
                        sql += ` ORDER BY ${sortFields}`;
                    }

                    // Pagination
                    if (options.limit) {
                        sql += ` LIMIT ${options.limit}`;
                        if (options.skip) sql += ` OFFSET ${options.skip}`;
                    }

                    const [rows] = await pool.query(sql, params);
                    return rows;
                }

                case 'postgres': {
                    // Use Prisma's raw query for generic access
                    const tableName = this.collection;
                    let sql = `SELECT * FROM "${tableName}"`;
                    const params = [];

                    if (query && Object.keys(query).length > 0) {
                        const conditions = Object.entries(query).map(([key, value], index) => {
                            params.push(value);
                            return `"${key}" = $${index + 1}`;
                        });
                        sql += ` WHERE ${conditions.join(' AND ')}`;
                    }

                    if (options.sort) {
                        const sortFields = Object.entries(options.sort)
                            .map(([field, dir]) => `"${field}" ${dir === 1 ? 'ASC' : 'DESC'}`)
                            .join(', ');
                        sql += ` ORDER BY ${sortFields}`;
                    }

                    if (options.limit) {
                        sql += ` LIMIT ${options.limit}`;
                        if (options.skip) sql += ` OFFSET ${options.skip}`;
                    }

                    return await prisma.$queryRawUnsafe(sql, ...params);
                }

                default:
                    return [];
            }
        } catch (error) {
            console.error(`DataStoreAdapter.find error (${this.provider}):`, error.message);
            return [];
        }
    }

    async findOne(query = {}) {
        if (!this.enabled) return null;

        try {
            switch (this.provider) {
                case 'mongodb': {
                    const db = this.getConnection();
                    if (!db) return null;
                    return await db.collection(this.collection).findOne(query);
                }

                case 'mysql': {
                    const results = await this.find(query, { limit: 1 });
                    return results.length > 0 ? results[0] : null;
                }

                case 'postgres': {
                    const results = await this.find(query, { limit: 1 });
                    return results.length > 0 ? results[0] : null;
                }

                default:
                    return null;
            }
        } catch (error) {
            console.error(`DataStoreAdapter.findOne error (${this.provider}):`, error.message);
            return null;
        }
    }

    async insertOne(data) {
        if (!this.enabled) {
            console.warn(`DataStoreAdapter.insertOne: Store ${this.collection} is disabled`);
            return null;
        }

        try {
            switch (this.provider) {
                case 'mongodb': {
                    const db = this.getConnection();
                    if (!db) {
                        console.error(`DataStoreAdapter.insertOne: MongoDB not connected for collection ${this.collection}`);
                        return null;
                    }
                    const result = await db.collection(this.collection).insertOne(data);
                    return { ...data, _id: result.insertedId };
                }

                case 'mysql': {
                    const pool = this.getConnection();
                    const fields = Object.keys(data);
                    const values = Object.values(data);
                    const placeholders = fields.map(() => '?').join(', ');
                    
                    const sql = `INSERT INTO ${this.collection} (${fields.join(', ')}) VALUES (${placeholders})`;
                    const [result] = await pool.query(sql, values);
                    return { ...data, id: result.insertId };
                }

                case 'postgres': {
                    const fields = Object.keys(data);
                    const values = Object.values(data);
                    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
                    const fieldNames = fields.map(f => `"${f}"`).join(', ');
                    
                    const sql = `INSERT INTO "${this.collection}" (${fieldNames}) VALUES (${placeholders}) RETURNING *`;
                    const result = await prisma.$queryRawUnsafe(sql, ...values);
                    return result[0];
                }

                default:
                    return null;
            }
        } catch (error) {
            console.error(`DataStoreAdapter.insertOne error (${this.provider}):`, error.message);
            throw error;
        }
    }

    async updateOne(query, update) {
        if (!this.enabled) return null;

        try {
            switch (this.provider) {
                case 'mongodb': {
                    const db = this.getConnection();
                    if (!db) return null;
                    const result = await db.collection(this.collection).findOneAndUpdate(
                        query,
                        update,
                        { returnDocument: 'after' }
                    );
                    return result;
                }

                case 'mysql': {
                    const pool = this.getConnection();
                    const updateData = update.$set || update;
                    const setFields = Object.entries(updateData)
                        .map(([key]) => `${key} = ?`)
                        .join(', ');
                    const setValues = Object.values(updateData);
                    
                    const whereFields = Object.entries(query)
                        .map(([key]) => `${key} = ?`)
                        .join(' AND ');
                    const whereValues = Object.values(query);
                    
                    const sql = `UPDATE ${this.collection} SET ${setFields} WHERE ${whereFields}`;
                    await pool.query(sql, [...setValues, ...whereValues]);
                    
                    return await this.findOne(query);
                }

                case 'postgres': {
                    const updateData = update.$set || update;
                    const setFields = Object.entries(updateData)
                        .map(([key], i) => `"${key}" = $${i + 1}`)
                        .join(', ');
                    const setValues = Object.values(updateData);
                    
                    const whereFields = Object.entries(query)
                        .map(([key], i) => `"${key}" = $${setValues.length + i + 1}`)
                        .join(' AND ');
                    const whereValues = Object.values(query);
                    
                    const sql = `UPDATE "${this.collection}" SET ${setFields} WHERE ${whereFields} RETURNING *`;
                    const result = await prisma.$queryRawUnsafe(sql, ...setValues, ...whereValues);
                    return result[0];
                }

                default:
                    return null;
            }
        } catch (error) {
            console.error(`DataStoreAdapter.updateOne error (${this.provider}):`, error.message);
            throw error;
        }
    }

    async deleteOne(query) {
        if (!this.enabled) return false;

        try {
            switch (this.provider) {
                case 'mongodb': {
                    const db = this.getConnection();
                    if (!db) return false;
                    const result = await db.collection(this.collection).deleteOne(query);
                    return result.deletedCount > 0;
                }

                case 'mysql': {
                    const pool = this.getConnection();
                    const whereFields = Object.entries(query)
                        .map(([key]) => `${key} = ?`)
                        .join(' AND ');
                    const whereValues = Object.values(query);
                    
                    const sql = `DELETE FROM ${this.collection} WHERE ${whereFields}`;
                    const [result] = await pool.query(sql, whereValues);
                    return result.affectedRows > 0;
                }

                case 'postgres': {
                    const whereFields = Object.entries(query)
                        .map(([key], i) => `"${key}" = $${i + 1}`)
                        .join(' AND ');
                    const whereValues = Object.values(query);
                    
                    const sql = `DELETE FROM "${this.collection}" WHERE ${whereFields}`;
                    await prisma.$queryRawUnsafe(sql, ...whereValues);
                    return true;
                }

                default:
                    return false;
            }
        } catch (error) {
            console.error(`DataStoreAdapter.deleteOne error (${this.provider}):`, error.message);
            return false;
        }
    }

    async count(query = {}) {
        if (!this.enabled) return 0;

        try {
            switch (this.provider) {
                case 'mongodb': {
                    const db = this.getConnection();
                    if (!db) return 0;
                    return await db.collection(this.collection).countDocuments(query);
                }

                case 'mysql': {
                    const pool = this.getConnection();
                    let sql = `SELECT COUNT(*) as count FROM ${this.collection}`;
                    const params = [];

                    if (query && Object.keys(query).length > 0) {
                        const conditions = Object.entries(query).map(([key, value]) => {
                            params.push(value);
                            return `${key} = ?`;
                        });
                        sql += ` WHERE ${conditions.join(' AND ')}`;
                    }

                    const [rows] = await pool.query(sql, params);
                    return rows[0]?.count || 0;
                }

                case 'postgres': {
                    let sql = `SELECT COUNT(*) as count FROM "${this.collection}"`;
                    const params = [];

                    if (query && Object.keys(query).length > 0) {
                        const conditions = Object.entries(query).map(([key, value], index) => {
                            params.push(value);
                            return `"${key}" = $${index + 1}`;
                        });
                        sql += ` WHERE ${conditions.join(' AND ')}`;
                    }

                    const result = await prisma.$queryRawUnsafe(sql, ...params);
                    return Number(result[0]?.count || 0);
                }

                default:
                    return 0;
            }
        } catch (error) {
            console.error(`DataStoreAdapter.count error (${this.provider}):`, error.message);
            return 0;
        }
    }
}

// ─── Pre-configured Store Instances ───────────────────────────────

export const ActivityLogsStore = new DataStoreAdapter(DATA_STORES.ACTIVITY_LOGS);
export const AuditTrailStore = new DataStoreAdapter(DATA_STORES.AUDIT_TRAIL);
export const AnalyticsStore = new DataStoreAdapter(DATA_STORES.ANALYTICS);

export default DataStoreAdapter;
