import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User,
  Auth
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App & Auth
const app = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

// Provider with Sheets & Drive File Scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('bucici_google_access_token') : null;

// Initialize Auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = localStorage.getItem('bucici_google_access_token');
      }
      // If we already have the token cached, trigger success
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If logged in but no token, we can trigger login flow or ask user to click button
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('bucici_google_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google.');
    }
    cachedAccessToken = credential.accessToken;
    localStorage.setItem('bucici_google_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Login error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Logout from Google
export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('bucici_google_access_token');
};

// Get current token
export const getCachedToken = () => cachedAccessToken;

// Create New Google Spreadsheet
export const createSpreadsheetInDrive = async (accessToken: string, title: string): Promise<string> => {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title
      }
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Gagal membuat spreadsheet baru.');
  }

  const data = await res.json();
  return data.spreadsheetId;
};

// Ensure sheet tab exists in spreadsheet, otherwise create it
export const ensureSheetTabExists = async (accessToken: string, spreadsheetId: string, sheetName: string): Promise<void> => {
  // 1. Get spreadsheet sheets
  const resMetadata = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!resMetadata.ok) {
    throw new Error('Gagal memeriksa metadata spreadsheet.');
  }

  const metadata = await resMetadata.json();
  const existingSheets = metadata.sheets || [];
  const tabExists = existingSheets.some((s: any) => s.properties?.title === sheetName);

  if (tabExists) return; // Tab already exists

  // 2. Add the missing tab sheet using batchUpdate
  const resUpdate = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetName
            }
          }
        }
      ]
    })
  });

  if (!resUpdate.ok) {
    const errData = await resUpdate.json().catch(() => ({}));
    console.warn('Gagal membuat tab otomatis, mungkin sudah ada:', errData);
  }
};

// Write (Update/Overwrite) table values to a sheet range
export const writeValuesToRange = async (
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  rows: any[][]
): Promise<void> => {
  // First ensure tab exists
  await ensureSheetTabExists(accessToken, spreadsheetId, sheetName);

  // Clear existing content in the tab first to prevent leftover rows
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z1000:clear`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (e) {
    console.warn('Gagal membersihkan area sheet sebelum menulis data:', e);
  }

  // Update values
  const range = `${sheetName}!A1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: range,
      majorDimension: 'ROWS',
      values: [headers, ...rows]
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Gagal menyimpan data ke spreadsheet.');
  }
};

// Read values from a sheet range
export const readValuesFromRange = async (
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<any[][]> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gagal membaca data dari range: ${range}`);
  }

  const data = await res.json();
  return data.values || [];
};
