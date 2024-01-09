import BetterSqlite3 from 'better-sqlite3';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const EMPTY_CONTENT_HASH = '0x';

//const db = Database;// new Database('../ensnames.db', { verbose: console.log });

export class SQLiteDatabase {

  db: BetterSqlite3.Database;

  //db: Database = new SQLiteDb('foobar.db', { verbose: console.log });

  constructor(dbName: string) {
    this.db = new BetterSqlite3(dbName, { verbose: console.log });
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS names (
        name TEXT PRIMARY KEY,
        addresses TEXT,
        text TEXT,
        contenthash TEXT,
        chain_id INTEGER,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_chain_id(chain_id),
        INDEX idx_createdAt(createdAt)
      )
    `);
  }

  addr(name: string, coinType: number) {
    const row = this.db.prepare('SELECT addresses FROM names WHERE name = ?').get(name.toLowerCase());
    const addresses = row ? JSON.parse(row.addresses) : null;

    if (!addresses || !addresses[coinType]) {
      return { addr: ZERO_ADDRESS };
    }

    return { addr: addresses[coinType] };
  }

  text(name: string, key: string) {
    const row = this.db.prepare('SELECT text FROM names WHERE name = ?').get(name.toLowerCase());
    const text = row ? JSON.parse(row.text) : null;

    if (!text || !text[key]) {
      return { value: '' };
    }

    return { value: text[key] };
  }

  contenthash(name: string) {
    const row = this.db.prepare('SELECT contenthash FROM names WHERE name = ?').get(name.toLowerCase());
    const contenthash = row ? row.contenthash : null;

    if (!contenthash) {
      return { contenthash: EMPTY_CONTENT_HASH };
    }

    return { contenthash };
  }

  checkAvailable(name: string): boolean {
    const row = this.db.prepare('SELECT * FROM names WHERE name = ?').get(name.toLowerCase());
    return !row;
  }

  addElement(name: string, address: string, chainId: 137) {
    const fullName = name.toLowerCase() + '.smartcat.eth';
    const existingRow = this.db.prepare('SELECT * FROM names WHERE name = ?').get(fullName);
    const addresses = { 60: address };
    // TODO - confirm the correct approach to manage off chain content not on IPFS or 
    const contenthash = '0xe301017012204edd2984eeaf3ddf50bac238ec95c5713fb40b5e428b508fdbe55d3b9f155ffe';
    if (!existingRow) {
      const stmt = this.db.prepare('INSERT INTO names (name, addresses, contenthash, chain_id) VALUES (?, ?, ?, ?)');
      stmt.run(fullName, JSON.stringify(addresses), contenthash, chainId);
    } else {
      const stmt = this.db.prepare('UPDATE names SET addresses = ?, contenthash = ?, chain_id = ? WHERE name = ?');
      stmt.run(JSON.stringify(addresses), contenthash, chainId, fullName);
    }
  }
}
