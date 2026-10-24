export type StoreErrorCode = 'not_found' | 'conflict' | 'owner_required' | 'invalid_menu' | 'invalid_page' | 'invalid_site' | 'invalid_email' | 'invalid_identity';

// The messages are the Go server's, word for word, because handlers and docs quote them.
const MESSAGES: Record<StoreErrorCode, string> = {
  not_found: 'not found',
  conflict: 'code already exists',
  owner_required: 'link needs an owner',
  invalid_menu: 'menu needs a title and at least one item with a name and a price',
  invalid_page: 'link page needs a title and at least one link with a name and a valid http(s) URL',
  invalid_site: 'site needs a title',
  invalid_email: 'invalid email',
  invalid_identity: 'invalid oauth identity',
};

export class StoreError extends Error {
  code: StoreErrorCode;
  constructor(code: StoreErrorCode) {
    super(MESSAGES[code]);
    this.code = code;
  }
}

export const isStoreError = (err: unknown, code: StoreErrorCode): boolean => err instanceof StoreError && err.code === code;
