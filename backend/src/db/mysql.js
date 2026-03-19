import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let mysqlPool = null;

export const connectMySQL = async () => {
    const host = process.env.MYSQL_HOST;
    const port = Number.parseInt(process.env.MYSQL_PORT || '3306', 10);
    const user = process.env.MYSQL_USER;
    const database = process.env.MYSQL_DATABASE;

    try {
        if (mysqlPool) {
            console.log('MySQL already connected');
            return mysqlPool;
        }

        mysqlPool = mysql.createPool({
            host,
            port,
            user,
            password: process.env.MYSQL_PASSWORD,
            database,
            waitForConnections: true,
            connectionLimit: Number.parseInt(process.env.MYSQL_POOL_MAX || '20', 10),
            queueLimit: Number.parseInt(process.env.MYSQL_POOL_QUEUE_LIMIT || '0', 10),
            connectTimeout: Number.parseInt(process.env.MYSQL_CONNECT_TIMEOUT_MS || '8000', 10),
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
            ssl: {
                rejectUnauthorized: false,
            },
        });

        const connection = await mysqlPool.getConnection();
        await connection.ping();
        connection.release();

        console.log(`MySQL connected successfully (${user}@${host}:${port}/${database})`);
        return mysqlPool;
    } catch (error) {
        console.error(`MySQL connection failed (${user}@${host}:${port}/${database}):`, error.message);
        throw error;
    }
};

export const getMySQLPool = () => {
    if (!mysqlPool) {
        throw new Error('MySQL not connected. Call connectMySQL first.');
    }
    return mysqlPool;
};

export const closeMySQL = async () => {
    if (mysqlPool) {
        await mysqlPool.end();
        mysqlPool = null;
        console.log('MySQL connection closed');
    }
};

export const checkMySQLConnection = async () => {
    try {
        if (!mysqlPool) {
            return false;
        }
        const connection = await mysqlPool.getConnection();
        await connection.ping();
        connection.release();
        return true;
    } catch (error) {
        console.error('MySQL health check failed:', error.message);
        return false;
    }
};

export default {
    connectMySQL,
    getMySQLPool,
    closeMySQL,
    checkMySQLConnection,
};
