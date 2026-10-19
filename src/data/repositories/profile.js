import { db } from '../storage';
import { cleanText, nowISO } from './normalize';

const TABLE = 'profile';
const PROFILE_ID = 'me';

export const profileRepo = {
  async get() {
    const rows = await db.list(TABLE);
    return rows.find((row) => row.id === PROFILE_ID) ?? { id: PROFILE_ID, name: null };
  },

  async save({ name }) {
    const rows = await db.list(TABLE);
    const patch = { name: cleanText(name), updated_at: nowISO() };
    if (rows.some((row) => row.id === PROFILE_ID)) return db.update(TABLE, PROFILE_ID, patch);
    return db.insert(TABLE, { id: PROFILE_ID, ...patch });
  },
};
