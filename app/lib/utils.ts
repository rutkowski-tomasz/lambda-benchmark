import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSize(bytes: number) {
  if (bytes === 0) {
      return '0 bytes';
  }
  
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const k = 1024;
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  if (value >= 10) {
      return value.toFixed(0) + ' ' + units[i];
  }

  return value.toFixed(1) + ' ' + units[i];
}
