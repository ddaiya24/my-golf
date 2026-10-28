// 이전 버전(localStorage 'mgd2:*')의 기록을 읽어 백업·가져오기에 쓴다.
// 기존 키는 읽기만 하고 수정·삭제하지 않는다. 가져오기 완료 표시는 별도 키에 저장한다.
import { api } from '../api';

const LEGACY_KEYS = {
  rounds: 'mgd2:rounds',
  practice_sessions: 'mgd2:practice_sessions',
  practice_clubs: 'mgd2:practice_clubs',
  goals: 'mgd2:goals',
  profile: 'mgd2:profile',
};

const importRecordKey = (userId) => `mgd2:imported:${userId}`;

function readArray(key) {
  const raw = window.localStorage.getItem(key);
  if (raw == null) return [];
  const value = JSON.parse(raw);
  return Array.isArray(value) ? value : [];
}

/** 이 브라우저에 남아 있는 이전 기록. 저장소에 접근할 수 없으면 null. */
export function readLegacyData() {
  try {
    const data = {};
    const unreadable = [];
    for (const [table, key] of Object.entries(LEGACY_KEYS)) {
      try {
        data[table] = readArray(key);
      } catch {
        data[table] = [];
        unreadable.push(table);
      }
    }
    const profileRow = data.profile.find((row) => row?.id === 'me') ?? null;
    return {
      data: { ...data, profile: profileRow ? { name: profileRow.name ?? null } : null },
      counts: {
        rounds: data.rounds.length,
        practice_sessions: data.practice_sessions.length,
        goals: data.goals.length,
      },
      total: data.rounds.length + data.practice_sessions.length + data.goals.length,
      unreadable,
    };
  } catch {
    return null;
  }
}

export function getImportRecord(userId) {
  try {
    const raw = window.localStorage.getItem(importRecordKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveImportRecord(userId, record) {
  try {
    window.localStorage.setItem(importRecordKey(userId), JSON.stringify(record));
  } catch {
    // 표시용 기록이라 저장에 실패해도 가져오기 결과에는 영향이 없다.
  }
}

export function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function backupFileName(prefix, today) {
  return `${prefix}-${today}.json`;
}

/** 원본 그대로 백업 파일을 내려받게 한 뒤 서버로 가져온다. 이미 있는 기록은 서버가 건너뛴다. */
export async function importLegacyData(userId, legacy, today) {
  downloadJson(backupFileName('my-golf-local-backup', today), {
    app: 'my-golf-diary',
    source: 'localStorage',
    origin: window.location.origin,
    exported_at: new Date().toISOString(),
    data: legacy.data,
  });
  const result = await api('import', { method: 'POST', body: legacy.data });
  saveImportRecord(userId, { at: new Date().toISOString(), inserted: result.inserted, skipped: result.skipped.length });
  return result;
}
