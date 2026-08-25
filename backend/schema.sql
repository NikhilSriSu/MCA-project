CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL
);

CREATE TABLE transactions (
  id VARCHAR(30) PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  channel VARCHAR(40) NOT NULL,
  device_trust VARCHAR(20) NOT NULL,
  location_match VARCHAR(20) NOT NULL,
  velocity_last_hour INTEGER NOT NULL,
  prior_flags INTEGER NOT NULL,
  time_band VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id VARCHAR(30) NOT NULL,
  risk_score INTEGER NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  prediction VARCHAR(20) NOT NULL,
  alert_level VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

CREATE TABLE officer_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id VARCHAR(30) NOT NULL,
  decision VARCHAR(40) NOT NULL,
  officer_name VARCHAR(100),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

SELECT id, customer_name, amount, channel
FROM transactions
WHERE amount >= 40000 OR prior_flags > 0;

SELECT transaction_id, risk_score, prediction, alert_level
FROM predictions
WHERE risk_score >= 70
ORDER BY risk_score DESC;
