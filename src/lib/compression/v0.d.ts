/** Prefix-free code tables: value to its bit string, or bit string to its value. */
export type CodeTable = Record<string, string>;

export function compress(input: string, alphabet: string[]): string;
export function decompress(input: string, alphabet: string[]): string;

export function numberToString(number: bigint, alphabet: readonly string[]): string;
export function stringToNumber(string: string, alphabet: readonly string[]): bigint;
export function huffmanEncode(number: bigint, sequence: string): bigint;
export function huffmanDecode(number: bigint, lookup: CodeTable): { newNumber: bigint; digit: string };
export function numberToIPv6(number: bigint): string;
export function ipv6ToNumber(input: string): bigint;

export function decompressionTables(): {
  subalphabets: string[];
  tldDecode: CodeTable;
  sldDecode: CodeTable;
  domainDecode: CodeTable;
  pathDecode: CodeTable;
};

export function encodingTables(): {
  tldEncode: CodeTable;
  sldEncode: CodeTable;
  domainEncode: CodeTable;
  /** Known second-level domains, longest first. */
  sldList: string[];
};
