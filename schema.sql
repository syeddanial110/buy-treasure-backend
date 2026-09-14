-- Run this in phpMyAdmin SQL tab on the `buytreasurecoast_db` database

CREATE TABLE IF NOT EXISTS leads (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL,
  phone            VARCHAR(50),
  message          TEXT,
  listing_key      VARCHAR(255),
  listing_address  VARCHAR(255),
  listing_price    VARCHAR(50),
  lead_type        ENUM('listing-detail', 'popup-form'),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS home_value_leads (
  id               INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  full_name        VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL,
  phone            VARCHAR(50)  DEFAULT NULL,
  message          TEXT,
  property_address TEXT         NOT NULL,
  house_size       INT          DEFAULT NULL,
  bedrooms         INT          DEFAULT NULL,
  bathrooms        DECIMAL(3,1) DEFAULT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS popup_leads (
  id               INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL,
  phone            VARCHAR(50)  DEFAULT NULL,
  interested_area  VARCHAR(255) DEFAULT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_leads (
  id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  phone      VARCHAR(50)  DEFAULT NULL,
  message    TEXT         DEFAULT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
