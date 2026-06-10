-- Run this in phpMyAdmin SQL tab on the `buytreasure` database

CREATE TABLE IF NOT EXISTS leads (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL,
  phone            VARCHAR(50),
  message          TEXT,
  listing_key      VARCHAR(255),
  listing_address  VARCHAR(255),
  listing_price    VARCHAR(50),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
