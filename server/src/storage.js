import fs from 'fs';
import { DATA_DIR } from './config.js';
import { join } from 'path';

const DB_FILE = join(DATA_DIR, 'db.json');

const defaultDB = {
  exhibitions: [],
  materials: [],
  timelines: [],
  messages: [],
  shares: [],
  shareViews: [],
  memoryMaps: [],
  familyAlbums: [],
  familyMembers: [],
  appointments: [],
  timeSlots: [],
  reminderTemplates: [],
  visitRecords: [],
  memorialRituals: [],
  ritualMessages: [],
  ritualPlayStates: [],
  collections: [],
  growthTrajectoryCovers: []
};

export const initStorage = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
  }
};

export const readDB = () => {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return { ...defaultDB };
  }
};

export const writeDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

export const getCollection = (name) => {
  const db = readDB();
  return db[name] || [];
};

export const saveCollection = (name, collection) => {
  const db = readDB();
  db[name] = collection;
  writeDB(db);
};
