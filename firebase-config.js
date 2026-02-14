/*
  FIREBASE CONFIGURATION

  To set up Firebase for your team dashboard:

  1. Go to https://console.firebase.google.com/
  2. Click "Create a project" (or "Add project")
  3. Give it a name (e.g., "todo-dashboard") and follow the prompts
  4. In the project dashboard, click the web icon (</>) to add a web app
  5. Register the app (no need to enable Firebase Hosting yet)
  6. Copy the config values below from the Firebase console

  IMPORTANT - Enable Realtime Database:
  7. In the Firebase console sidebar, click "Build" > "Realtime Database"
  8. Click "Create Database"
  9. Choose a location (any region works)
  10. Start in TEST MODE (allows read/write for 30 days)
      - You can adjust rules later for production use
*/

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
