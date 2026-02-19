'use strict';
/**
 * Database abstraction layer.
 *
 * Local dev  → SQLite via better-sqlite3  (DATABASE_URL not set)
 * Production → PostgreSQL via pg           (DATABASE_URL set by Render)
 *
 * Exports { db, USE_PG }
 *   db.all(sql, params[])   → Promise<row[]>
 *   db.get(sql, params[])   → Promise<row | undefined>
 *   db.run(sql, params[])   → Promise<{ lastInsertRowid }>
 *   db.init()               → Promise<void>  (schema + seed on first run)
 *
 * SQL dialect notes:
 *   - Use $1, $2 … positional placeholders (PostgreSQL style) in all queries.
 *   - The SQLite adapter converts them to ? before execution.
 */

const USE_PG = !!process.env.DATABASE_URL;

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_EVENTS = [
  // February 2026
  { title: 'Blood Pressure & Diabetes Screening', description: 'Free health screening for seniors aged 60 and above. Includes blood pressure, blood glucose, and BMI checks. Pre-registration preferred.', date: '2026-02-21', time: '09:00', end_time: '12:00', location: 'Tampines CC, 1 Tampines Walk, Singapore 528523', region: 'Tampines', source: 'Tampines CC', source_url: 'https://www.pa.gov.sg', category: 'Health Screening', organizer: 'Tampines Community Club', image_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop' },
  { title: 'Line Dancing for Seniors', description: 'Fun weekly line dancing session for seniors of all fitness levels. Instructor-led with beginner-friendly steps. Wear comfortable shoes.', date: '2026-02-23', time: '10:00', end_time: '11:30', location: 'Tampines Hub, 1 Tampines Walk, Singapore 528523', region: 'Tampines', source: "People's Association (PA)", source_url: 'https://www.pa.gov.sg', category: 'Exercise', organizer: 'PA Tampines Division', image_url: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&auto=format&fit=crop' },
  { title: 'Caregiver Support Group Monthly Meeting', description: 'A safe space for caregivers of elderly loved ones to share experiences, learn coping strategies, and receive information on AIC services.', date: '2026-02-25', time: '14:00', end_time: '16:00', location: 'AIC Link @ Ang Mo Kio Polyclinic, 21 Ang Mo Kio Ave 9', region: 'Ang Mo Kio', source: 'AIC', source_url: 'https://www.aic.sg', category: 'Social', organizer: 'Agency for Integrated Care', image_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop' },
  { title: 'Smartphone Basics for Seniors', description: 'Learn to use WhatsApp, make video calls, and access government services on your phone. Bring your own smartphone. Limited seats.', date: '2026-02-26', time: '10:00', end_time: '12:00', location: 'Woodlands CC, 1 Woodlands Street 81, Singapore 738526', region: 'Woodlands', source: 'Woodlands CC', source_url: 'https://www.pa.gov.sg', category: 'Workshop', organizer: 'Woodlands Community Club', image_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&auto=format&fit=crop' },
  { title: 'Gentle Yoga for Seniors', description: 'Chair-assisted yoga session designed to improve flexibility, balance, and reduce joint pain. Suitable for all fitness levels.', date: '2026-02-28', time: '08:30', end_time: '09:30', location: 'Bedok CC, 850 New Upper Changi Rd, Singapore 467352', region: 'Bedok', source: "People's Association (PA)", source_url: 'https://www.pa.gov.sg', category: 'Exercise', organizer: 'PA Bedok Division', image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop' },
  // March 2026
  { title: 'Healthy Ageing Talk: Preventing Falls', description: 'Learn practical tips on home safety modifications, exercise to improve balance, and when to seek medical attention. Q&A session included.', date: '2026-03-03', time: '10:00', end_time: '11:30', location: 'Jurong East CC, 21 Jurong East St 31, Singapore 609517', region: 'Jurong East', source: 'AIC', source_url: 'https://www.aic.sg', category: 'Talk', organizer: 'Agency for Integrated Care', image_url: 'https://images.unsplash.com/photo-1607962837359-5e7e89f86776?w=800&auto=format&fit=crop' },
  { title: 'Morning Taichi at Bishan Park', description: 'Outdoor group taichi session every Tuesday and Thursday at Bishan-Ang Mo Kio Park. Suitable for beginners. Bring water and a mat.', date: '2026-03-05', time: '07:30', end_time: '08:30', location: 'Bishan-Ang Mo Kio Park (near Carpark 3)', region: 'Ang Mo Kio', source: "People's Association (PA)", source_url: 'https://www.pa.gov.sg', category: 'Exercise', organizer: 'Ang Mo Kio Town Council', image_url: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=800&auto=format&fit=crop' },
  { title: 'Senior Social Outing: Gardens by the Bay', description: 'Subsidised group outing to Gardens by the Bay. Transport provided. Includes guided tour of Flower Dome. Open to seniors aged 65+.', date: '2026-03-07', time: '09:00', end_time: '15:00', location: 'Departure from Toa Payoh CC, 93 Toa Payoh Central, Singapore 319194', region: 'Toa Payoh', source: 'Silver Generation Office', source_url: 'https://www.silvergenerationoffice.org.sg', category: 'Outing', organizer: 'Silver Generation Office', image_url: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&auto=format&fit=crop' },
  { title: 'Memory Cafe: Social Engagement for Persons with Dementia', description: 'A welcoming café setting for persons with dementia and their caregivers to socialise and engage in meaningful activities.', date: '2026-03-10', time: '10:00', end_time: '12:00', location: 'Clementi CC, 518 Clementi Ave 3, Singapore 129908', region: 'Clementi', source: 'AIC', source_url: 'https://www.aic.sg', category: 'Social', organizer: 'Agency for Integrated Care', image_url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&auto=format&fit=crop' },
  { title: 'CPF & Silver Support Scheme Talk', description: 'Understand your CPF savings, Silver Support payouts, and financial assistance schemes available to seniors. Free admission.', date: '2026-03-12', time: '14:00', end_time: '15:30', location: 'Jurong CC, 21 Jurong East St 31, Singapore 609517', region: 'Jurong East', source: 'Jurong CC', source_url: 'https://www.pa.gov.sg', category: 'Talk', organizer: 'Jurong Community Club', image_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop' },
  { title: 'Cooking Class: Healthier Nyonya Dishes', description: 'Learn to cook three classic Nyonya recipes with reduced sodium and fat. Ingredients and aprons provided. Limited to 15 participants.', date: '2026-03-14', time: '10:00', end_time: '13:00', location: 'Bukit Merah CC, 3779 Jalan Bukit Merah, Singapore 159462', region: 'Bukit Merah', source: "People's Association (PA)", source_url: 'https://www.pa.gov.sg', category: 'Workshop', organizer: 'PA Bukit Merah Division', image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&fit=crop' },
  { title: 'Dental Health Screening for Seniors', description: 'Free dental check for seniors aged 60+. Oral hygiene advice provided. Subsidised referral to CHAS polyclinics if follow-up needed.', date: '2026-03-17', time: '09:00', end_time: '12:00', location: 'Tampines Polyclinic, 1 Tampines St 41, Singapore 529203', region: 'Tampines', source: 'AIC', source_url: 'https://www.aic.sg', category: 'Health Screening', organizer: 'Agency for Integrated Care', image_url: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&auto=format&fit=crop' },
  { title: 'Intergenerational Art Workshop', description: 'Seniors and youths paint together! Guided watercolour session on the theme of Singapore landscapes. Materials provided.', date: '2026-03-19', time: '14:00', end_time: '16:30', location: 'Woodlands CC, 1 Woodlands Street 81, Singapore 738526', region: 'Woodlands', source: 'Woodlands CC', source_url: 'https://www.pa.gov.sg', category: 'Workshop', organizer: 'Woodlands Community Club', image_url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&auto=format&fit=crop' },
  { title: 'Senior Karaoke Afternoon', description: 'Monthly karaoke session with a mix of Chinese, Malay, and English oldies. Refreshments provided. All are welcome to sing or watch!', date: '2026-03-21', time: '14:00', end_time: '16:30', location: 'Bedok Community Centre, 850 New Upper Changi Rd', region: 'Bedok', source: 'Bedok CC', source_url: 'https://www.pa.gov.sg', category: 'Social', organizer: 'Bedok Community Club', image_url: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&auto=format&fit=crop' },
  { title: 'Eye Health Screening', description: 'Screening for glaucoma, cataracts, and diabetic retinopathy. Seniors aged 60+ with CHAS card get subsidised rates. Walk-ins welcome.', date: '2026-03-24', time: '09:00', end_time: '13:00', location: 'Ang Mo Kio Polyclinic, 21 Ang Mo Kio Ave 9, Singapore 569761', region: 'Ang Mo Kio', source: 'Silver Generation Office', source_url: 'https://www.silvergenerationoffice.org.sg', category: 'Health Screening', organizer: 'Silver Generation Office', image_url: 'https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?w=800&auto=format&fit=crop' },
  { title: 'Digital Payment Workshop: PayNow & GrabPay', description: 'Step-by-step guide to setting up and using PayNow and GrabPay safely. Volunteers on hand to assist. Bring your phone and bank card.', date: '2026-03-26', time: '10:00', end_time: '12:00', location: 'Toa Payoh CC, 93 Toa Payoh Central, Singapore 319194', region: 'Toa Payoh', source: 'Silver Generation Office', source_url: 'https://www.silvergenerationoffice.org.sg', category: 'Workshop', organizer: 'Silver Generation Office', image_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&auto=format&fit=crop' },
  { title: 'Aqua Aerobics for Seniors', description: 'Low-impact water aerobics class in the leisure pool. No swimming ability required. Improve cardiovascular fitness without joint strain.', date: '2026-03-28', time: '08:00', end_time: '09:00', location: 'Jurong East Swimming Complex, 21 Jurong East St 31', region: 'Jurong East', source: "People's Association (PA)", source_url: 'https://www.pa.gov.sg', category: 'Exercise', organizer: 'PA Jurong Division', image_url: 'https://images.unsplash.com/photo-1600965962361-9035dbfd1c50?w=800&auto=format&fit=crop' },
  { title: 'Dementia Care Information Session', description: 'Overview of dementia symptoms, early intervention, and care resources available in Singapore. Caregivers and family members welcome.', date: '2026-03-31', time: '14:00', end_time: '16:00', location: 'Clementi Polyclinic, 451 Clementi Ave 3, Singapore 120451', region: 'Clementi', source: 'AIC', source_url: 'https://www.aic.sg', category: 'Talk', organizer: 'Agency for Integrated Care', image_url: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800&auto=format&fit=crop' },
  // April 2026
  { title: 'Mass Walk: Active Ageing Festival', description: 'Guided 5km heritage walk through Bukit Merah. Commemorates Active Ageing Month. Participants receive a goodie bag. Register online.', date: '2026-04-04', time: '07:30', end_time: '10:30', location: 'Bukit Merah Town Park, Alexandra Road', region: 'Bukit Merah', source: "People's Association (PA)", source_url: 'https://www.pa.gov.sg', category: 'Exercise', organizer: 'PA Bukit Merah Division', image_url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop' },
  { title: 'Community Befriending Visit (Volunteer Sign-up)', description: 'Join as a volunteer befriender to visit elderly residents living alone. Training provided. Sessions held on alternate weekends.', date: '2026-04-05', time: '10:00', end_time: '12:00', location: 'Woodlands Community Club, 1 Woodlands Street 81', region: 'Woodlands', source: 'Silver Generation Office', source_url: 'https://www.silvergenerationoffice.org.sg', category: 'Social', organizer: 'Silver Generation Office', image_url: 'https://images.unsplash.com/photo-1543269664-56d93c1b41a6?w=800&auto=format&fit=crop' },
  { title: 'Blood Donation Drive for Seniors and Families', description: 'Community blood donation drive. Seniors who do not donate are invited as moral supporters. Refreshments provided for all.', date: '2026-04-07', time: '09:00', end_time: '17:00', location: 'Tampines Hub, 1 Tampines Walk, Singapore 528523', region: 'Tampines', source: 'Tampines CC', source_url: 'https://www.pa.gov.sg', category: 'Health Screening', organizer: 'Tampines Community Club', image_url: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800&auto=format&fit=crop' },
  { title: 'Traditional Chinese Medicine (TCM) Talk', description: 'A registered TCM practitioner explains common senior ailments (joint pain, insomnia) and safe home remedies. Free consultation slots available.', date: '2026-04-09', time: '14:00', end_time: '16:00', location: 'Ang Mo Kio CC, 795 Ang Mo Kio Ave 1, Singapore 560795', region: 'Ang Mo Kio', source: 'Ang Mo Kio CC', source_url: 'https://www.pa.gov.sg', category: 'Talk', organizer: 'Ang Mo Kio Community Club', image_url: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&auto=format&fit=crop' },
  { title: 'Seniors Photo Walk: Bedok Heritage Trail', description: 'Guided photography walk for seniors along the Bedok heritage trail. Bring any camera or smartphone. Prints mailed to participants.', date: '2026-04-11', time: '08:00', end_time: '11:00', location: 'Bedok Town Park, New Upper Changi Road', region: 'Bedok', source: "People's Association (PA)", source_url: 'https://www.pa.gov.sg', category: 'Outing', organizer: 'PA Bedok Division', image_url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop' },
  { title: 'Advance Care Planning Workshop', description: 'Learn about Advance Medical Directives and Lasting Power of Attorney. AIC care advisor and lawyer present to answer questions.', date: '2026-04-14', time: '10:00', end_time: '12:30', location: 'Jurong CC, 21 Jurong East St 31, Singapore 609517', region: 'Jurong East', source: 'AIC', source_url: 'https://www.aic.sg', category: 'Workshop', organizer: 'Agency for Integrated Care', image_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop' },
  { title: 'Festive Lantern Craft Workshop', description: 'Make decorative paper lanterns to celebrate the Mid-Autumn season. All materials provided. Suitable for seniors aged 55 and above.', date: '2026-04-16', time: '14:00', end_time: '16:00', location: 'Toa Payoh CC, 93 Toa Payoh Central, Singapore 319194', region: 'Toa Payoh', source: 'Toa Payoh CC', source_url: 'https://www.pa.gov.sg', category: 'Workshop', organizer: 'Toa Payoh Community Club', image_url: 'https://images.unsplash.com/photo-1519750783826-e2420f4d687f?w=800&auto=format&fit=crop' },
  { title: 'Falls Prevention Exercise Programme (FPEP)', description: '10-week structured exercise programme targeting muscle strength and balance. Referral from GP or polyclinic preferred but not required.', date: '2026-04-20', time: '09:00', end_time: '10:30', location: 'Clementi CC, 518 Clementi Ave 3, Singapore 129908', region: 'Clementi', source: 'AIC', source_url: 'https://www.aic.sg', category: 'Exercise', organizer: 'Agency for Integrated Care', image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop' },
  { title: 'Senior Singalong Concert', description: 'Live concert featuring familiar songs from the 60s, 70s, and 80s. Performed by local musicians. Complimentary refreshments. Free entry.', date: '2026-04-25', time: '15:00', end_time: '17:00', location: 'Bukit Merah CC, 3779 Jalan Bukit Merah, Singapore 159462', region: 'Bukit Merah', source: 'Silver Generation Office', source_url: 'https://www.silvergenerationoffice.org.sg', category: 'Social', organizer: 'Silver Generation Office', image_url: 'https://images.unsplash.com/photo-1468359601543-843bfaef291a?w=800&auto=format&fit=crop' },
  { title: 'Nutrition Talk: Eating Well After 60', description: 'Registered dietitian shares evidence-based advice on balanced diets, managing diabetes through food, and meal planning on a budget.', date: '2026-04-28', time: '10:00', end_time: '11:30', location: 'Woodlands Health Campus Community Hub, 17 Woodlands Dr 17', region: 'Woodlands', source: 'AIC', source_url: 'https://www.aic.sg', category: 'Talk', organizer: 'Agency for Integrated Care', image_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&auto=format&fit=crop' },
  { title: 'Seniors Movie Screening: "Ilo Ilo"', description: 'Community screening of the acclaimed Singapore film "Ilo Ilo" (2013). Subtitles in English, Chinese, and Malay. Refreshments included.', date: '2026-04-30', time: '14:30', end_time: '17:00', location: 'Tampines Hub The Star Performing Arts Centre (Function Room)', region: 'Tampines', source: 'Tampines CC', source_url: 'https://www.pa.gov.sg', category: 'Social', organizer: 'Tampines Community Club', image_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop' },
];

// ── PostgreSQL ────────────────────────────────────────────────────────────────
if (USE_PG) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  async function query(sql, params = []) {
    const client = await pool.connect();
    try {
      return await client.query(sql, params);
    } finally {
      client.release();
    }
  }

  const db = {
    async all(sql, params = []) {
      const res = await query(sql, params);
      return res.rows;
    },
    async get(sql, params = []) {
      const res = await query(sql, params);
      return res.rows[0];
    },
    async run(sql, params = []) {
      // Append RETURNING id so we can surface lastInsertRowid
      const res = await query(sql + ' RETURNING id', params);
      return { lastInsertRowid: res.rows[0]?.id };
    },
    async init() {
      await query(`
        CREATE TABLE IF NOT EXISTS events (
          id          SERIAL PRIMARY KEY,
          title       TEXT    NOT NULL,
          description TEXT,
          date        TEXT    NOT NULL,
          time        TEXT,
          end_time    TEXT,
          location    TEXT,
          region      TEXT    NOT NULL,
          source      TEXT    NOT NULL,
          source_url  TEXT,
          category    TEXT,
          organizer   TEXT,
          image_url   TEXT,
          created_at  TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await query('CREATE INDEX IF NOT EXISTS idx_events_date   ON events(date)');
      await query('CREATE INDEX IF NOT EXISTS idx_events_region ON events(region)');
      await query('CREATE INDEX IF NOT EXISTS idx_events_source ON events(source)');

      const { rows } = await query('SELECT COUNT(*) AS n FROM events');
      if (parseInt(rows[0].n, 10) > 0) return;

      for (const e of SEED_EVENTS) {
        await query(
          `INSERT INTO events
             (title,description,date,time,end_time,location,region,source,source_url,category,organizer,image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [e.title, e.description, e.date, e.time, e.end_time,
           e.location, e.region, e.source, e.source_url, e.category, e.organizer, e.image_url]
        );
      }
      console.log(`[db] Seeded ${SEED_EVENTS.length} events (PostgreSQL).`);
    },
  };

  module.exports = { db, USE_PG: true };

// ── SQLite ────────────────────────────────────────────────────────────────────
} else {
  const BetterSQLite = require('better-sqlite3');
  const path = require('path');
  const sqlite = new BetterSQLite(
    process.env.DB_PATH || path.join(__dirname, 'events.db')
  );
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Convert $1, $2, … → ? for SQLite
  function toSQLite(sql) {
    return sql.replace(/\$\d+/g, '?');
  }

  const db = {
    all(sql, params = [])  { return Promise.resolve(sqlite.prepare(toSQLite(sql)).all(params)); },
    get(sql, params = [])  { return Promise.resolve(sqlite.prepare(toSQLite(sql)).get(params)); },
    run(sql, params = [])  {
      const info = sqlite.prepare(toSQLite(sql)).run(params);
      return Promise.resolve({ lastInsertRowid: info.lastInsertRowid });
    },
    async init() {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS events (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          title       TEXT    NOT NULL,
          description TEXT,
          date        TEXT    NOT NULL,
          time        TEXT,
          end_time    TEXT,
          location    TEXT,
          region      TEXT    NOT NULL,
          source      TEXT    NOT NULL,
          source_url  TEXT,
          category    TEXT,
          organizer   TEXT,
          image_url   TEXT,
          created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_events_date   ON events(date);
        CREATE INDEX IF NOT EXISTS idx_events_region ON events(region);
        CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
      `);
      const row = sqlite.prepare('SELECT COUNT(*) as n FROM events').get();
      if (row.n > 0) return;
      const insert = sqlite.prepare(`
        INSERT INTO events
          (title,description,date,time,end_time,location,region,source,source_url,category,organizer,image_url)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      `);
      const insertMany = sqlite.transaction((evts) => {
        for (const e of evts)
          insert.run([e.title, e.description, e.date, e.time, e.end_time,
                      e.location, e.region, e.source, e.source_url, e.category, e.organizer, e.image_url]);
      });
      insertMany(SEED_EVENTS);
      console.log(`[db] Seeded ${SEED_EVENTS.length} events (SQLite).`);
    },
  };

  module.exports = { db, USE_PG: false };
}
