
/**
 * Converts 24-hour time format to 12-hour AM/PM format
 * @param time24 - Time string in 24-hour format (e.g., "17:00", "09:30")
 * @returns Time string in 12-hour AM/PM format (e.g., "5:00 PM", "9:30 AM")
 */
export function formatTo12Hour(time24: string): string {
  if (!time24) return '';
  
  try {
    // Split the time string
    const [hoursStr, minutesStr] = time24.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr || '00';
    
    // Determine AM/PM
    const period = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    if (hours === 0) {
      hours = 12; // Midnight
    } else if (hours > 12) {
      hours = hours - 12;
    }
    
    // Format the time
    return `${hours}:${minutes} ${period}`;
  } catch (error) {
    console.error('[timeFormat] Error converting time:', error);
    return time24; // Return original if conversion fails
  }
}
