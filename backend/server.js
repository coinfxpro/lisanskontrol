require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id SERIAL PRIMARY KEY,
        license_key VARCHAR(255) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        machine_id VARCHAR(255),
        expires_at DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        max_activations INTEGER DEFAULT 1,
        activation_count INTEGER DEFAULT 0
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS validation_logs (
        id SERIAL PRIMARY KEY,
        license_key VARCHAR(255) NOT NULL,
        machine_id VARCHAR(255),
        validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_valid BOOLEAN,
        ip_address VARCHAR(45)
      );
    `);
    
    console.log('Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

initDB();

app.post('/api/validate-license', async (req, res) => {
  const { license_key, machine_id } = req.body;
  const ip_address = req.ip || req.connection.remoteAddress;

  if (!license_key || !machine_id) {
    return res.status(400).json({ 
      valid: false, 
      error: 'License key and machine ID are required' 
    });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM licenses WHERE license_key = $1 AND is_active = true`,
      [license_key]
    );

    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO validation_logs (license_key, machine_id, is_valid, ip_address) 
         VALUES ($1, $2, $3, $4)`,
        [license_key, machine_id, false, ip_address]
      );
      
      return res.json({ 
        valid: false, 
        error: 'Invalid license key' 
      });
    }

    const license = result.rows[0];
    const expiresAt = new Date(license.expires_at);
    const today = new Date();

    if (expiresAt < today) {
      await pool.query(
        `INSERT INTO validation_logs (license_key, machine_id, is_valid, ip_address) 
         VALUES ($1, $2, $3, $4)`,
        [license_key, machine_id, false, ip_address]
      );
      
      return res.json({ 
        valid: false, 
        error: 'License expired',
        expires_at: license.expires_at 
      });
    }

    if (license.machine_id && license.machine_id !== machine_id) {
      await pool.query(
        `INSERT INTO validation_logs (license_key, machine_id, is_valid, ip_address) 
         VALUES ($1, $2, $3, $4)`,
        [license_key, machine_id, false, ip_address]
      );
      
      return res.json({ 
        valid: false, 
        error: 'License already activated on another machine' 
      });
    }

    if (!license.machine_id) {
      await pool.query(
        `UPDATE licenses SET machine_id = $1, activation_count = activation_count + 1 
         WHERE license_key = $2`,
        [machine_id, license_key]
      );
    }

    await pool.query(
      `INSERT INTO validation_logs (license_key, machine_id, is_valid, ip_address) 
       VALUES ($1, $2, $3, $4)`,
      [license_key, machine_id, true, ip_address]
    );

    res.json({
      valid: true,
      expires_at: license.expires_at,
      customer: license.customer_name
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ 
      valid: false, 
      error: 'Internal server error' 
    });
  }
});

app.get('/api/licenses', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, license_key, customer_name, machine_id, expires_at, 
              created_at, is_active, activation_count 
       FROM licenses 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching licenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/licenses', async (req, res) => {
  const { license_key, customer_name, expires_at } = req.body;

  if (!license_key || !customer_name || !expires_at) {
    return res.status(400).json({ 
      error: 'License key, customer name, and expiration date are required' 
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO licenses (license_key, customer_name, expires_at) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [license_key, customer_name, expires_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'License key already exists' });
    }
    console.error('Error creating license:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/licenses/:id', async (req, res) => {
  const { id } = req.params;
  const { customer_name, expires_at, is_active } = req.body;

  try {
    const result = await pool.query(
      `UPDATE licenses 
       SET customer_name = COALESCE($1, customer_name),
           expires_at = COALESCE($2, expires_at),
           is_active = COALESCE($3, is_active)
       WHERE id = $4
       RETURNING *`,
      [customer_name, expires_at, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating license:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/licenses/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM licenses WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }

    res.json({ message: 'License deleted successfully' });
  } catch (error) {
    console.error('Error deleting license:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM validation_logs 
       ORDER BY validated_at DESC 
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const totalLicenses = await pool.query('SELECT COUNT(*) FROM licenses');
    const activeLicenses = await pool.query('SELECT COUNT(*) FROM licenses WHERE is_active = true');
    const expiredLicenses = await pool.query('SELECT COUNT(*) FROM licenses WHERE expires_at < CURRENT_DATE');
    const totalValidations = await pool.query('SELECT COUNT(*) FROM validation_logs');

    res.json({
      total_licenses: parseInt(totalLicenses.rows[0].count),
      active_licenses: parseInt(activeLicenses.rows[0].count),
      expired_licenses: parseInt(expiredLicenses.rows[0].count),
      total_validations: parseInt(totalValidations.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`License Control API running on port ${PORT}`);
});
