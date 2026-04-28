import postgres from 'postgres';
import { config } from '../config.js';

const sql = postgres(config.DATABASE_URL);

async function migrate() {
  // 1. users 테이블에 gold 컬럼 추가
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 100 NOT NULL`;
  console.log('gold column added');

  // 2. quest_definitions 테이블에 gold_reward 컬럼 추가
  await sql`ALTER TABLE quest_definitions ADD COLUMN IF NOT EXISTS gold_reward INTEGER DEFAULT 0 NOT NULL`;
  console.log('gold_reward column added');

  // 3. inventory_items 테이블 생성
  await sql`CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    item_def_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    durability INTEGER DEFAULT -1 NOT NULL,
    equipped BOOLEAN DEFAULT false NOT NULL,
    is_default BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`;
  console.log('inventory_items table created');

  // 4. arena_matches 테이블 생성
  await sql`CREATE TABLE IF NOT EXISTS arena_matches (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(36) UNIQUE NOT NULL,
    mode VARCHAR(20) NOT NULL,
    state VARCHAR(20) NOT NULL,
    floor INTEGER DEFAULT 2 NOT NULL,
    round INTEGER DEFAULT 0 NOT NULL,
    max_rounds INTEGER DEFAULT 10 NOT NULL,
    prize_pool INTEGER DEFAULT 0 NOT NULL,
    winner_team INTEGER,
    is_draw BOOLEAN DEFAULT false NOT NULL,
    rounds_data JSONB DEFAULT '[]' NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    ended_at TIMESTAMP
  )`;
  console.log('arena_matches table created');

  // 5. arena_participants 테이블 생성
  await sql`CREATE TABLE IF NOT EXISTS arena_participants (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(36) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    team INTEGER DEFAULT 0 NOT NULL,
    rank INTEGER,
    gold_earned INTEGER DEFAULT 0 NOT NULL,
    xp_earned INTEGER DEFAULT 0 NOT NULL,
    total_damage_dealt INTEGER DEFAULT 0 NOT NULL,
    total_damage_taken INTEGER DEFAULT 0 NOT NULL,
    rounds_survived INTEGER DEFAULT 0 NOT NULL,
    is_mvp BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`;
  console.log('arena_participants table created');

  await sql.end();
  console.log('Migration complete!');
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
