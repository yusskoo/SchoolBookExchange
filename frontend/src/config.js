import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';

const firebaseConfig = {
    apiKey: "AIzaSyDTMRmV69xNNK7IFw9UV4OJ9cFTH4Ic5Wo",
    authDomain: "schoolbook-290b6.firebaseapp.com",
    projectId: "schoolbook-290b6",
    storageBucket: "schoolbook-290b6.firebasestorage.app",
    messagingSenderId: "657831894632",
    appId: "1:657831894632:web:5354da4b4a090785ee65dd",
    measurementId: "G-P90QZ00GG7"
};

// Initialize only if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
const functions = firebase.functions();

// Emulator Configuration
// Emulator Configuration
const hostname = window.location.hostname;
if (hostname === "localhost" || hostname === "127.0.0.1") {
    console.log("Using Firebase Emulators");
    db.useEmulator("127.0.0.1", 8088);
    auth.useEmulator("http://127.0.0.1:9099", { disableWarnings: true }); // Disable warning for HTTP
    functions.useEmulator("127.0.0.1", 5001);
}

export { db, auth, functions, firebase };
