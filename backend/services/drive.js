const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID; // Optional: Folder to upload to

let driveClient;

function getDriveClient() {
    if (driveClient) return driveClient;

    if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
        console.warn("Google Drive credentials missing. Drive Sync will be skipped.");
        return null;
    }

    const auth = new google.auth.JWT(
        SERVICE_ACCOUNT_EMAIL,
        null,
        PRIVATE_KEY,
        ['https://www.googleapis.com/auth/drive.file']
    );

    driveClient = google.drive({ version: 'v3', auth });
    return driveClient;
}

/**
 * Uploads a file to Google Drive
 * @param {string} filePath - Local path to file
 * @param {string} mimeType - Mime type of file
 * @param {string} fileName - Name to display on Drive
 * @returns {Promise<string>} - File ID
 */
async function uploadFile(filePath, mimeType, fileName) {
    const drive = getDriveClient();
    if (!drive) return null;

    try {
        const fileMetadata = {
            name: fileName,
            parents: FOLDER_ID ? [FOLDER_ID] : [],
        };

        const media = {
            mimeType: mimeType,
            body: fs.createReadStream(filePath),
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });

        console.log('File uploaded to Drive, ID:', response.data.id);
        return response.data.id;
    } catch (error) {
        console.error('Error uploading to Drive:', error);
        throw error;
    }
}

/**
 * Uploads text content as a file
 */
async function uploadText(content, fileName) {
    const drive = getDriveClient();
    if (!drive) return null;

    try {
        // Create a temporary file
        const tempPath = path.join(__dirname, `../temp_${Date.now()}.txt`);
        fs.writeFileSync(tempPath, content);

        const id = await uploadFile(tempPath, 'text/plain', fileName);

        // Cleanup
        fs.unlinkSync(tempPath);
        return id;
    } catch (error) {
        console.error('Error uploading text to Drive:', error);
        throw error;
    }
}

module.exports = {
    uploadFile,
    uploadText
};
