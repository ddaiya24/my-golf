// 테이블 단위로 행 배열을 localStorage에 저장하는 어댑터.
// 기존 버전 데이터와 섞이지 않도록 'mgd2:' 접두어를 쓰고, 다른 키는 읽거나 지우지 않는다.

const PREFIX = 'mgd2:';

export class StorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}

function read(table) {
  let raw;
  try {
    raw = window.localStorage.getItem(PREFIX + table);
  } catch (error) {
    throw new StorageError('브라우저 저장소에 접근할 수 없습니다.', error);
  }
  if (raw == null) return [];
  try {
    const rows = JSON.parse(raw);
    if (Array.isArray(rows)) return rows;
  } catch {
    // 아래에서 처리
  }
  // 손상된 데이터를 빈 배열로 덮어쓰지 않도록 저장을 중단한다.
  throw new StorageError(`저장된 데이터(${table})를 읽을 수 없습니다.`);
}

function write(table, rows) {
  try {
    window.localStorage.setItem(PREFIX + table, JSON.stringify(rows));
  } catch (error) {
    throw new StorageError('기록을 저장하지 못했습니다. 저장 공간을 확인해 주세요.', error);
  }
}

export const localStorageAdapter = {
  async list(table) {
    return read(table);
  },

  async insert(table, row) {
    const rows = read(table);
    rows.push(row);
    write(table, rows);
    return row;
  },

  async insertMany(table, newRows) {
    if (newRows.length === 0) return [];
    write(table, [...read(table), ...newRows]);
    return newRows;
  },

  async update(table, id, patch) {
    const rows = read(table);
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) throw new StorageError('수정할 기록을 찾을 수 없습니다.');
    rows[index] = { ...rows[index], ...patch, id };
    write(table, rows);
    return rows[index];
  },

  async remove(table, id) {
    write(table, read(table).filter((row) => row.id !== id));
  },

  async removeWhere(table, field, value) {
    write(table, read(table).filter((row) => row[field] !== value));
  },
};
