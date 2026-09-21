export const RELOAD_AFTER_CLEAR_KEY = "reloadAfterClear";

export async function loadReloadPreference(storageArea) {
  const stored = await storageArea.get({ [RELOAD_AFTER_CLEAR_KEY]: false });
  return stored[RELOAD_AFTER_CLEAR_KEY] === true;
}

export async function saveReloadPreference(storageArea, checked) {
  await storageArea.set({ [RELOAD_AFTER_CLEAR_KEY]: checked });
}
