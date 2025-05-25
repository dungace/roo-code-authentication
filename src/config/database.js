const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection to become available
});

// Test the connection and set schema
pool.on('connect', async (client) => {
  console.log('Connected to PostgreSQL database');
  
  // Set schema for this connection
  const schema = process.env.DB_SCHEMA || 'dev';
  try {
    await client.query(`SET search_path TO ${schema},public`);
    console.log(`Connection search_path set to: ${schema}`);
  } catch (error) {
    console.error('Error setting search_path:', error);
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Set the default schema
const setSchema = async () => {
  try {
    // Get schema from environment variable or use default
    const schema = process.env.DB_SCHEMA || 'dev';
    await pool.query(`SET search_path TO ${schema},public`);
    console.log(`Schema set to: ${schema}`);
  } catch (error) {
    console.error('Error setting schema:', error);
  }
};

// Execute query with schema setting
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    // The search_path is already set in the 'connect' event handler
    return await client.query(text, params);
  } finally {
    client.release();
  }
};

// Initialize schema
const initSchema = async () => {
  try {
    const schema = process.env.DB_SCHEMA || 'dev';
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    console.log(`Schema initialized: ${schema}`);
    await setSchema();
  } catch (error) {
    console.error('Error initializing schema:', error);
  }
};

module.exports = {
  query,
  pool,
  initSchema
};
