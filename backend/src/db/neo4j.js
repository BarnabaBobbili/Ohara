import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

let driver = null;

export const connectNeo4j = () => {
    try {
        if (driver) {
            console.log('✓ Neo4j already connected');
            return driver;
        }

        const uri = process.env.NEO4J_URI;
        const user = process.env.NEO4J_USER;
        const password = process.env.NEO4J_PASSWORD;

        driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
            maxConnectionPoolSize: 50,
            connectionAcquisitionTimeout: 2000,
        });

        console.log('✓ Neo4j driver created');
        return driver;
    } catch (error) {
        console.error('✗ Neo4j connection failed:', error.message);
        throw error;
    }
};

export const getNeo4jDriver = () => {
    if (!driver) {
        throw new Error('Neo4j not connected. Call connectNeo4j first.');
    }
    return driver;
};

export const closeNeo4j = async () => {
    if (driver) {
        await driver.close();
        driver = null;
        console.log('Neo4j connection closed');
    }
};

export const checkNeo4jConnection = async () => {
    try {
        if (!driver) {
            return false;
        }
        const session = driver.session();
        await session.run('RETURN 1');
        await session.close();
        return true;
    } catch (error) {
        console.error('Neo4j health check failed:', error.message);
        return false;
    }
};

export const runNeo4jQuery = async (query, params = {}) => {
    const session = driver.session();
    try {
        const result = await session.run(query, params);
        return result.records;
    } finally {
        await session.close();
    }
};

export default {
    connectNeo4j,
    getNeo4jDriver,
    closeNeo4j,
    checkNeo4jConnection,
    runNeo4jQuery
};
