const requestErrorBrand=Symbol.for('pokemon-tower.request-error');
export class BattleRequestError extends Error {
  readonly [requestErrorBrand]=true;
  // Page and API bundles can share a service singleton without sharing class identity.
  static [Symbol.hasInstance](value:unknown){return value instanceof Error && (value as Error & {[requestErrorBrand]?:boolean})[requestErrorBrand]===true;}
  constructor(message: string, public status: number) { super(message); }
}

