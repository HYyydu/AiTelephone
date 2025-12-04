// Database schema for AI Customer Call System
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 255 }),
  name: varchar("name", { length: 255 }),
  avatar_url: text("avatar_url"),
  organization_id: uuid("organization_id"),
  role: varchar("role", { length: 50 }).default("user"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Organizations table
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  subscription_plan: varchar("subscription_plan", { length: 50 }).default("free"),
  subscription_status: varchar("subscription_status", { length: 50 }).default("active"),
  created_at: timestamp("created_at").defaultNow(),
});

// Calls table (enhanced from your existing structure)
export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id"),
  organization_id: uuid("organization_id"),
  call_sid: varchar("call_sid", { length: 255 }),
  to_number: varchar("to_number", { length: 50 }).notNull(),
  purpose: text("purpose").notNull(),
  additional_instructions: text("additional_instructions"),
  voice_preference: varchar("voice_preference", { length: 50 }).default("professional_female"),
  status: varchar("status", { length: 50 }).default("pending"),
  outcome: text("outcome"),
  recording_url: text("recording_url"), // URL to call recording
  duration: integer("duration"), // seconds
  cost: integer("cost"), // cents
  created_at: timestamp("created_at").defaultNow(),
  started_at: timestamp("started_at"),
  ended_at: timestamp("ended_at"),
});

// Transcripts table
export const transcripts = pgTable("transcripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  call_id: uuid("call_id").notNull(),
  speaker: varchar("speaker", { length: 50 }).notNull(),
  message: text("message").notNull(),
  confidence: integer("confidence"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// API Keys table (for future use)
export const api_keys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  organization_id: uuid("organization_id").notNull(),
  name: varchar("name", { length: 255 }),
  key_hash: varchar("key_hash", { length: 255 }).notNull(),
  last_used: timestamp("last_used"),
  created_at: timestamp("created_at").defaultNow(),
});

// Analytics table (for future use)
export const call_analytics = pgTable("call_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  call_id: uuid("call_id").notNull(),
  total_words: integer("total_words"),
  avg_confidence: integer("avg_confidence"),
  sentiment_score: integer("sentiment_score"),
  resolved: boolean("resolved"),
  tags: jsonb("tags"), // Array of strings
  created_at: timestamp("created_at").defaultNow(),
});

