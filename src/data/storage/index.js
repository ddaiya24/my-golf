// 저장소 교체 지점. Supabase로 옮길 때는 같은 메서드
// (list, insert, insertMany, update, remove, removeWhere)를 가진 어댑터를 만들어 여기서 바꾼다.
import { localStorageAdapter } from './localStorageAdapter';

export const db = localStorageAdapter;
