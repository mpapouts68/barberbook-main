import { storage } from "../storage";
import { sendNamedayGreetings } from "./notifications";

export async function checkAndSendNamedayGreetings(): Promise<{ sent: number; names: string[] }> {
  // Get today's date in MM-DD format
  const today = new Date();
  const todayString = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  
  // Get today's namedays
  const todaysNamedays = await storage.getNamedaysByDate(todayString);
  
  if (todaysNamedays.length === 0) {
    return { sent: 0, names: [] };
  }

  // Get all users
  const users = await storage.getAllUsers();
  
  let sentCount = 0;
  const celebratingNames: string[] = [];

  // Find users celebrating their nameday
  for (const nameday of todaysNamedays) {
    const celebratingUsers = users.filter(user => 
      user.firstName.toLowerCase() === nameday.name.toLowerCase()
    );
    
    if (celebratingUsers.length > 0) {
      celebratingNames.push(nameday.name);
      sentCount += celebratingUsers.length;
    }
  }

  // Send the greetings
  await sendNamedayGreetings();

  return { sent: sentCount, names: celebratingNames };
}

export async function getTodaysNamedays(): Promise<string[]> {
  const today = new Date();
  const todayString = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  
  const namedays = await storage.getNamedaysByDate(todayString);
  return namedays.map(n => n.name);
}
