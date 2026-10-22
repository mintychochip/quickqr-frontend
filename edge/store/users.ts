import type { Db } from '../db';
import { randomCode, sha256Hex } from '../ids';
import type { User } from '../types';
import { StoreError } from './errors';

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

interface UserRow {
  id: string;
  email: string;
  created_at: string;
}

const toUser = (row: UserRow): User => ({ id: row.id, email: row.email, created_at: row.created_at });

const USER_BY_EMAIL = 'SELECT id, email, created_at FROM users WHERE email = ?';

/**
 * Finds or creates the user for a provider identity and opens a session: the identity if it is known, else the account
 * with that email (the identity is linked to it), else a new account. The returned token is shown once; only its hash
 * is stored. Providers must have verified the email before this is called (see routes/auth.ts).
 */
export async function loginOrRegisterOAuth(
  db: Db,
  provider: string,
  subject: string,
  email: string,
  now = new Date(),
): Promise<{ user: User; token: string }> {
  provider = provider.trim().toLowerCase();
  subject = subject.trim();
  email = email.trim().toLowerCase();
  if (!provider || !subject) throw new StoreError('invalid_identity');
  if (!email || !email.includes('@')) throw new StoreError('invalid_email');

  let row = await db
    .prepare('SELECT u.id, u.email, u.created_at FROM oauth_identities i JOIN users u ON u.id = i.user_id WHERE i.provider = ? AND i.subject = ?')
    .bind(provider, subject)
    .first<UserRow>();

  if (!row) {
    row = await db.prepare(USER_BY_EMAIL).bind(email).first<UserRow>();
    if (!row) {
      // Two first sign-ins for one address race on the unique email: the loser ignores its insert and reads the winner's row.
      await db
        .prepare('INSERT OR IGNORE INTO users (id, email, created_at) VALUES (?, ?, ?)')
        .bind(`usr-${randomCode(10)}`, email, now.toISOString())
        .run();
      row = await db.prepare(USER_BY_EMAIL).bind(email).first<UserRow>();
    }
    if (!row) throw new Error('could not create the user');
    await db.prepare('INSERT OR IGNORE INTO oauth_identities (provider, subject, user_id) VALUES (?, ?, ?)').bind(provider, subject, row.id).run();
  }

  const token = randomCode(40);
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now.toISOString()),
    db
      .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(await sha256Hex(token), row.id, new Date(now.getTime() + SESSION_MS).toISOString()),
  ]);
  return { user: toUser(row), token };
}

export async function linkOAuthIdentity(db: Db, provider: string, subject: string, userId: string): Promise<void> {
  provider = provider.trim().toLowerCase();
  subject = subject.trim();
  if (!provider || !subject || !userId) throw new Error('invalid oauth link');
  await db.prepare('INSERT OR REPLACE INTO oauth_identities (provider, subject, user_id) VALUES (?, ?, ?)').bind(provider, subject, userId).run();
}

/** The user a live session token belongs to, or null for an empty, unknown, or expired token. */
export async function userFromToken(db: Db, token: string, now = new Date()): Promise<User | null> {
  token = token.trim();
  if (!token) return null;
  const row = await db
    .prepare('SELECT u.id, u.email, u.created_at, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?')
    .bind(await sha256Hex(token))
    .first<UserRow & { expires_at: string }>();
  if (!row || now.getTime() > Date.parse(row.expires_at)) return null;
  return toUser(row);
}

export async function logoutToken(db: Db, token: string): Promise<void> {
  token = token.trim();
  if (!token) return;
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
}

export interface OAuthState {
  provider: string;
  returnTo: string;
  expiresAt: Date;
  /** The button the person clicked on the local stand-in ("google" or "github"). */
  as: string;
}

interface StateRow {
  provider: string;
  return_to: string;
  as_button: string;
  expires_at: string;
}

const toState = (row: StateRow): OAuthState => ({ provider: row.provider, returnTo: row.return_to, expiresAt: new Date(row.expires_at), as: row.as_button });

/** Saves sign-in state, sweeping any that has already expired so the table cannot grow without bound. */
export async function saveOAuthState(db: Db, state: string, st: OAuthState, now = new Date()): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM oauth_states WHERE expires_at < ?').bind(now.toISOString()),
    db
      .prepare('INSERT OR REPLACE INTO oauth_states (state, provider, return_to, as_button, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind(state, st.provider, st.returnTo, st.as, st.expiresAt.toISOString()),
  ]);
}

/** Reads sign-in state without using it up. Null when it is empty, unknown, or expired. */
export async function peekOAuthState(db: Db, state: string, now = new Date()): Promise<OAuthState | null> {
  state = state.trim();
  if (!state) return null;
  const row = await db.prepare('SELECT provider, return_to, as_button, expires_at FROM oauth_states WHERE state = ?').bind(state).first<StateRow>();
  return row && now.getTime() <= Date.parse(row.expires_at) ? toState(row) : null;
}

/** Uses sign-in state up. It is deleted even when it has expired, so a state can never be tried twice. */
export async function consumeOAuthState(db: Db, state: string, now = new Date()): Promise<OAuthState | null> {
  state = state.trim();
  if (!state) return null;
  const row = await db
    .prepare('DELETE FROM oauth_states WHERE state = ? RETURNING provider, return_to, as_button, expires_at')
    .bind(state)
    .first<StateRow>();
  return row && now.getTime() <= Date.parse(row.expires_at) ? toState(row) : null;
}
