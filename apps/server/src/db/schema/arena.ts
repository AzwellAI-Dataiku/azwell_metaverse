import { pgTable, serial, integer, varchar, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const arenaMatches = pgTable('arena_matches', {
  id: serial('id').primaryKey(),
  matchId: varchar('match_id', { length: 36 }).unique().notNull(),
  mode: varchar('mode', { length: 20 }).notNull(),           // 'ffa' | 'team_2v2' | 'team_3v3'
  state: varchar('state', { length: 20 }).notNull(),          // MatchState
  floor: integer('floor').default(2).notNull(),
  round: integer('round').default(0).notNull(),
  maxRounds: integer('max_rounds').default(10).notNull(),
  prizePool: integer('prize_pool').default(0).notNull(),
  winnerTeam: integer('winner_team'),                         // null = FFA or draw
  isDraw: boolean('is_draw').default(false).notNull(),
  roundsData: jsonb('rounds_data').default('[]').notNull(),   // RoundResult[]
  createdAt: timestamp('created_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
});

export const arenaParticipants = pgTable('arena_participants', {
  id: serial('id').primaryKey(),
  matchId: varchar('match_id', { length: 36 }).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  team: integer('team').default(0).notNull(),                 // 0 = FFA, 1 or 2 = team
  rank: integer('rank'),                                      // 최종 순위 (1-indexed)
  goldEarned: integer('gold_earned').default(0).notNull(),
  xpEarned: integer('xp_earned').default(0).notNull(),
  totalDamageDealt: integer('total_damage_dealt').default(0).notNull(),
  totalDamageTaken: integer('total_damage_taken').default(0).notNull(),
  roundsSurvived: integer('rounds_survived').default(0).notNull(),
  isMvp: boolean('is_mvp').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
