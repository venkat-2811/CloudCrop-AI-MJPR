/**
 * Personalization Engine — persists user preferences in localStorage
 */

const PROFILE_KEY = "cloudcrop_user_profile";

export interface UserProfile {
  location: string;
  cropPreferences: string[];
  soilType: string;
  language: string;
  interactionHistory: string[];
}

const DEFAULT_PROFILE: UserProfile = {
  location: "",
  cropPreferences: [],
  soilType: "",
  language: "en",
  interactionHistory: [],
};

export function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveUserProfile(profile: Partial<UserProfile>): void {
  const current = getUserProfile();
  const updated = { ...current, ...profile };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
}

export function addInteraction(summary: string): void {
  const profile = getUserProfile();
  profile.interactionHistory.push(summary);
  // Keep only last 20 interactions
  if (profile.interactionHistory.length > 20) {
    profile.interactionHistory = profile.interactionHistory.slice(-20);
  }
  saveUserProfile(profile);
}

export function getTranslationCache(langCode: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(`cloudcrop_translations_${langCode}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setTranslationCache(langCode: string, texts: Record<string, string>): void {
  try {
    localStorage.setItem(`cloudcrop_translations_${langCode}`, JSON.stringify(texts));
  } catch {
    // localStorage full or unavailable
  }
}
