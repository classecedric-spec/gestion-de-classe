/**
 * Utility function to get the standardized color class for a percentage performance.
 * 
 * Logic based on user feedback:
 * - < 50%    : Red (text-rose-500)
 * - 50% - 60%: Orange (text-amber-500)
 * - 60% - 80%: Blue (text-info)
 * - >= 80%   : Green (text-emerald-500)
 * 
 * @param percentage The percentage to colorize (0-100)
 * @returns A tailwind CSS class for the text color
 */
export const getPercentageColor = (percentage: number | null): string => {
  if (percentage === null || isNaN(percentage)) return 'text-grey-medium';
  
  if (percentage < 50) return 'text-rose-500';
  if (percentage < 60) return 'text-amber-500';
  if (percentage < 80) return 'text-info';
  return 'text-emerald-500';
};
