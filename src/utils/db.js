const DB_NAME = "GrapeditDB";
const DB_VERSION = 1;
const STORE_NAME = "downloads";

let dbPromise = null;

export const initDB = () => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB Open Error:", event.target.error);
            dbPromise = null; // Reset on error
            reject("IndexedDB error: " + event.target.error);
        };

        request.onblocked = (event) => {
            console.warn("IndexedDB Blocked: Please close other tabs with this app open.");
            // We can't do much automatically if other tabs hold the version lock
            dbPromise = null;
            reject("IndexedDB blocked");
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            db.onclose = () => {
                console.log("IndexedDB Connection Closed");
                dbPromise = null; // Reset if connection closes
            };
            db.onversionchange = () => {
                console.log("IndexedDB Version Change");
                db.close();
                dbPromise = null;
            }
            db.onerror = (e) => {
                console.error("IndexedDB Generic Error:", e.target.error);
            };
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "id" });
                objectStore.createIndex("status", "status", { unique: false });
                objectStore.createIndex("createdAt", "createdAt", { unique: false });
            }
        };
    });

    return dbPromise;
};

export const saveDownload = async (download) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(download); // put handles both add and update

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject("Error saving download: " + event.target.error);
    });
};

export const updateDownloadProgress = async (id, status, progress, speed) => {
    // Optimization: Don't open a full DB connection for every tick if performance is an issue.
    // However, basic IDB puts are usually fast enough for UI updates (e.g. 1-2 times per sec).
    // For now, we'll fetch-modify-save. A cursor would be faster but more complex.
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const data = getRequest.result;
            if (data) {
                data.status = status;
                data.progress = progress;
                if (speed !== undefined) data.speed = speed;
                store.put(data);
                resolve();
            } else {
                resolve(); // Item might have been deleted
            }
        };
        getRequest.onerror = (e) => reject(e);
    });
};

export const getDownloads = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        // Get all - for production with huge lists, use a cursor or range.
        const request = store.getAll();

        request.onsuccess = () => {
            // Sort by createdAt desc manually since getAll order is by Key (ID)
            const results = request.result;
            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            resolve(results);
        };
        request.onerror = (event) => reject("Error fetching downloads: " + event.target.error);
    });
};

export const deleteDownload = async (id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject("Error deleting download: " + event.target.error);
    });
};

export const getDownloadBlob = async (id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result ? request.result.blob : null);
        };
        request.onerror = (e) => reject(e);
    });
}
