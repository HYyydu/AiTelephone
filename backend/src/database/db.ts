// Database connection using Drizzle ORM
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Create PostgreSQL connection pool with proper Supabase settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase requires SSL even in development
  ssl: process.env.DATABASE_URL?.includes('supabase') 
    ? { rejectUnauthorized: false } 
    : false,
  // Connection pool settings to prevent termination errors
  max: 20, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients in the pool (keep connections warm)
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Wait 10 seconds max for new connections
  // Keep connections alive to prevent Supabase timeouts
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Test connection and handle errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected database error:', err);
  console.error('❌ Error details:', {
    message: err.message,
    code: (err as any).code,
    stack: err.stack,
  });
  // Log pool status for debugging
  console.error(`   Pool status: Total=${pool.totalCount}, Idle=${pool.idleCount}, Waiting=${pool.waitingCount}`);
});

// Only log connection events in development
if (process.env.NODE_ENV === 'development' || process.env.DEBUG_DB === 'true') {
  pool.on('connect', (client) => {
    console.log('✅ New database client connected to pool');
  });

  pool.on('acquire', (client) => {
    console.log('🔄 Database client acquired from pool');
  });

  pool.on('remove', (client) => {
    console.log('🗑️  Database client removed from pool');
  });
}

// Create Drizzle instance
export const db = drizzle(pool, { schema });

// Helper function to test connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    console.log(`   Pool status: Total=${pool.totalCount}, Idle=${pool.idleCount}, Waiting=${pool.waitingCount}`);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Helper function to get pool status
export function getPoolStatus() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

// Graceful shutdown - close all pool connections
export async function closePool() {
  try {
    console.log('🔌 Closing database connection pool...');
    await pool.end();
    console.log('✅ Database connection pool closed');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

