import BetterSqlite3 from 'better-sqlite3';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const EMPTY_CONTENT_HASH = '0x';

export class SQLiteDatabase {

  db: BetterSqlite3.Database;

  constructor(dbName: string) {
    this.db = new BetterSqlite3(dbName, { verbose: console.log });
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS names (
        name TEXT PRIMARY KEY,
        addresses TEXT,
        text TEXT,
        contenthash TEXT,
        chain_id INTEGER,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP );
    `);
  }

  addr(name: string, coinType = 60) {
    const row = this.db.prepare('SELECT addresses FROM names WHERE name = ?').get(name.toLowerCase());

    // @ts-ignore
    const addresses = row ? JSON.parse(row.addresses) : null;

    if (!addresses || !addresses[coinType]) {
      return { addr: ZERO_ADDRESS };
    }

    return { addr: addresses[coinType] };
  }

  getNameFromAddress(address: string): string | null {
    const row = this.db.prepare('SELECT name FROM names WHERE addresses LIKE ? ORDER BY createdAt DESC LIMIT 1').get(`%"${address}"%`);
    if (row) {
      // @ts-ignore
      return row.name;
    } else {
      return null;
    }
  }

  text(name: string, key: string) {
    const row = this.db.prepare('SELECT text FROM names WHERE name = ?').get(name.toLowerCase());

    console.log(row);

    // @ts-ignore
    const text = row ? JSON.parse(row.text) : null;

    if (!text || !text[key]) {
      return { value: '' };
    }

    return { value: text[key] };
  }

  contenthash(name: string) {
    const row = this.db.prepare('SELECT contenthash FROM names WHERE name = ?').get(name.toLowerCase());

    console.log(row);

    //const contenthash = row ? row.contenthash : null;
    const contenthash = null;

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
    const santisedName = name.toLowerCase().replace(/\s+/g, '-').replace(/-{2,}/g, '').replace(/^-+/g, '').replace(/[;'"`\\]/g, '').replace(/^-+|-+$/g, '');
    const truncatedText = santisedName.slice(0, 255); // limit name to 255
    const fullName = truncatedText + '.smartcat.eth';
    // const fullName = truncatedText + '.thesmartcats.eth';
    const existingRow = this.db.prepare('SELECT * FROM names WHERE name = ?').get(fullName);

    // if (existingRow) {
    //   // Decide what to do when the limit is reached, e.g., replace an existing entry or do nothing
    //   console.warn('Limit of 1 entrie(s) reached. Skipping addition of a new entry.');
    //   return;
    // }
    // const addresses = { 60: address };
    // // TODO - confirm the correct approach to manage off chain content not on IPFS or 
    // const contenthash = '0xe301017012204edd2984eeaf3ddf50bac238ec95c5713fb40b5e428b508fdbe55d3b9f155ffe';
    // if (!existingRow) {
    //   const stmt = this.db.prepare('INSERT INTO names (name, addresses, contenthash, chain_id) VALUES (?, ?, ?, ?)');
    //   stmt.run(fullName, JSON.stringify(addresses), contenthash, chainId);
    // } else {
    //   const stmt = this.db.prepare('UPDATE names SET addresses = ?, contenthash = ?, chain_id = ? WHERE name = ?');
    //   stmt.run(JSON.stringify(addresses), contenthash, chainId, fullName);
    // }

    const addresses = { 60: address };
    const contenthash = '0xe301017012204edd2984eeaf3ddf50bac238ec95c5713fb40b5e428b508fdbe55d3b9f155ffe';
    if (!existingRow) {
      const stmt = this.db.prepare('INSERT INTO names (name, addresses, contenthash, chain_id) VALUES (?, ?, ?, ?)');
      stmt.run(fullName, JSON.stringify(addresses), contenthash, chainId);
    }
  }
}
