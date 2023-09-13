const { Pool } = require('pg')
const dotenv = require('dotenv')

dotenv.config({ path: `.env.${process.env.APP_ENV}`, override: true })
dotenv.config({ path: `.env.${process.env.APP_ENV}.local`, override: true })

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_CONNECTION,
})

// SQL queries for database and table creation
const createRequestsTableQuery = `
  CREATE TABLE IF NOT EXISTS requests
  (
    id SERIAL PRIMARY KEY,
    function_data TEXT NOT NULL,
    tx_id VARCHAR(66) NOT NULL,
    chain_id INTEGER NOT NULL,
    log_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`
const createPackedTransactionsTableQuery = `
  CREATE TABLE IF NOT EXISTS packed_transactions
  (
    id SERIAL PRIMARY KEY,
    nonce INTEGER NOT NULL,
    tx_id VARCHAR(66) NOT NULL,
    chain_id INTEGER NOT NULL,
    max_fee_per_gas VARCHAR(20) DEFAULT '',
    max_priority_fee_per_gas VARCHAR(20) DEFAULT '',
    gas_price VARCHAR(20) DEFAULT '',
    effective_gas_price VARCHAR(20) DEFAULT '',
    gas_used VARCHAR(20) DEFAULT '',
    request_ids TEXT NOT NULL,
    confirmation INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`
const createWithdrawalHashTableQuery = `
  CREATE TABLE IF NOT EXISTS withdrawal_hash
  (
    id SERIAL PRIMARY KEY,
    executed_hash VARCHAR(66) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    amount VARCHAR(66) NOT NULL,
    token_id INTEGER NOT NULL,
    log_index INTEGER NOT NULL,
    withdrawal_hash VARCHAR(66) NOT NULL,
    status SMALLINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`

// Function to initialize the database and tables
async function initializeDatabase() {
  // Connect to the default PostgreSQL database (e.g., 'postgres')
  const client = await pool.connect()

  try {
    // Create the tables
    await client.query(createRequestsTableQuery)
    await client.query(createPackedTransactionsTableQuery)
    await client.query(createProcessedLogsTableQuery)
    await client.query(createWithdrawalHashTableQuery)

    console.log('Database and tables created successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
  } finally {
    // Release the client connection
    client.release()
  }
}

// Call the initializeDatabase function to start the initialization process
initializeDatabase()
