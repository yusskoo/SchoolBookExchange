// Firebase Initialization
const firebaseConfig = {
    apiKey: "AIzaSyDummyKeyForEmulatorOnly",
    projectId: "schoolbook-290b6"
};

// Initialize only if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
const functions = firebase.functions();

// Emulator Configuration
db.useEmulator("127.0.0.1", 8085);
auth.useEmulator("http://127.0.0.1:9099");
functions.useEmulator("127.0.0.1", 5001);

export { db, auth, functions };
