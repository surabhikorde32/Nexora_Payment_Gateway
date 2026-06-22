type FirebaseCredential = {
  private_key: string;
  client_email: string;
  project_id: string;
};

const Credential: FirebaseCredential = {
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "",
  client_email: process.env.FIREBASE_CLIENT_EMAIL ?? "",
  project_id: process.env.FIREBASE_PROJECT_ID ?? "",
};

export default Credential;
