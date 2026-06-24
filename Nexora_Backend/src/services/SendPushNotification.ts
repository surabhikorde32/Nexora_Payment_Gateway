import { cert, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
// import Credential from "../utils/PushNotification.js"
import Credential from "../config/PushNotificationJson.js";

initializeApp({
  credential: cert({
    privateKey: Credential.private_key,
    clientEmail: Credential.client_email,
    projectId: Credential.project_id,
  }),
});

const SendPushNotification = function (title: string, body: string, data: string) {
  const message = {
    notification: { title: title, body: body },
    token: data,
  };

  return getMessaging()
    .send(message)
    .then(function (data: string) {
      return data;
    })
    .catch(function (error: unknown) {});
};

export { SendPushNotification };
