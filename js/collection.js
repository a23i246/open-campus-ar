const COLLECTION_KEY = 'oc_dinosaur_collection_v1';

function getCollection() {
  try {
    const raw = localStorage.getItem(COLLECTION_KEY);
    const values = raw ? JSON.parse(raw) : [];
    return Array.isArray(values) ? values : [];
  } catch (error) {
    console.warn('collection read error', error);
    return [];
  }
}

function saveCollection(ids) {
  const uniqueIds = [...new Set(ids)];
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(uniqueIds));
  return uniqueIds;
}

function addToCollection(id) {
  const current = getCollection();
  if (!current.includes(id)) current.push(id);
  return saveCollection(current);
}

function removeFromCollection(id) {
  return saveCollection(getCollection().filter((value) => value !== id));
}

function clearCollection() {
  localStorage.removeItem(COLLECTION_KEY);
}

function findDinosaur(id) {
  return (window.DINOSAURS || []).find((dino) => dino.id === id);
}
