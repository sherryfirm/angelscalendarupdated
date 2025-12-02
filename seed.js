#!/usr/bin/env node
import { db } from '../src/firebase.js';
import { initialCalendarItems } from '../src/initialData.js';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

async function clearAllDocs() {
  const col = collection(db, 'calendarItems');
  const snapshot = await getDocs(col);
  if (snapshot.empty) {
    console.log('No existing docs to delete.');
    return;
  }

  console.log(`Deleting ${snapshot.docs.length} existing calendar items...`);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.delete(doc(db, 'calendarItems', d.id)));
  await batch.commit();
  console.log('Deleted existing calendar items.');
}

async function seedAllItems() {
  const items = initialCalendarItems;
  if (items.length === 0) {
    console.log('No items found in initial data to seed.');
    return;
  }

  console.log(`Seeding ${items.length} total items...`);
  const col = collection(db, 'calendarItems');
  const chunkSize = 300; // safe batch size
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach(item => {
      const { id, ...data } = item;
      const docRef = doc(col);
      batch.set(docRef, data);
    });
    await batch.commit();
    console.log(`Uploaded ${Math.min(i + chunkSize, items.length)}/${items.length}`);
  }
  console.log('Seeding complete.');
}

async function main() {
  try {
    await clearAllDocs();
    await seedAllItems();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
}

main();
