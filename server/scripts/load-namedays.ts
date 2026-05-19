import { readFileSync } from 'fs';
import { db } from '../db';
import { namedays } from '@shared/schema';

interface NamedayEntry {
  date: string;
  name: string;
}

export async function loadGreekNamedays() {
  try {
    console.log('Loading Greek namedays...');
    
    // Read the Greek namedays file
    const csvContent = readFileSync('./namedays_greek.csv', 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    const namedayEntries: NamedayEntry[] = [];
    
    for (const line of lines) {
      const [dateStr, nameStr] = line.split(',');
      
      if (!dateStr || !nameStr) continue;
      
      // Parse date (format: "1/1/2004 0:00:00")
      const datePart = dateStr.split(' ')[0];
      const [month, day] = datePart.split('/');
      
      // Parse name (remove quotes)
      const name = nameStr.replace(/"/g, '').trim();
      
      if (name && month && day) {
        // Format as MM-DD (ignoring year since it's always the same cycle)
        const formattedDate = `${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        namedayEntries.push({
          date: formattedDate,
          name: name
        });
      }
    }
    
    console.log(`Parsed ${namedayEntries.length} nameday entries`);
    
    // Clear existing namedays
    await db.delete(namedays);
    console.log('Cleared existing namedays');
    
    // Insert new namedays in batches
    const batchSize = 100;
    for (let i = 0; i < namedayEntries.length; i += batchSize) {
      const batch = namedayEntries.slice(i, i + batchSize);
      await db.insert(namedays).values(batch);
    }
    
    console.log('Greek namedays loaded successfully!');
    
    // Show some examples
    const sampleNamedays = await db.select().from(namedays).limit(10);
    console.log('Sample namedays:', sampleNamedays);
    
  } catch (error) {
    console.error('Error loading Greek namedays:', error);
    throw error;
  }
}