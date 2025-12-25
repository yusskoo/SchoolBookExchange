import { functions } from '../config.js';

export const aiService = {
    async analyzeImage(file) {
        // Convert File to Base64
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result); // Contains "data:image/..."
            reader.onerror = error => reject(error);
        });

        // Call Cloud Function
        const analyzeFn = functions.httpsCallable('analyzeImage');
        const result = await analyzeFn({ imageBase64: base64 });
        return result.data;
    }
};
