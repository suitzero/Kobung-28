import * as FileSystem from 'expo-file-system';

const TRAINING_DIR = FileSystem.documentDirectory + 'training_data/';

const ensureDirectoryExists = async () => {
    const dirInfo = await FileSystem.getInfoAsync(TRAINING_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(TRAINING_DIR, { intermediates: true });
    }
};

export const saveTrainingData = async (audioUri, transcription) => {
    try {
        await ensureDirectoryExists();

        // Generate a unique ID (timestamp)
        const timestamp = Date.now();
        const audioFilename = `${timestamp}.m4a`;
        const textFilename = `${timestamp}.txt`;

        const newAudioPath = TRAINING_DIR + audioFilename;
        const newTextPath = TRAINING_DIR + textFilename;

        // Copy audio
        await FileSystem.copyAsync({
            from: audioUri,
            to: newAudioPath
        });

        // Write text
        await FileSystem.writeAsStringAsync(newTextPath, transcription, {
            encoding: FileSystem.EncodingType.UTF8
        });

        console.log(`[TrainingData] Saved pair: ${audioFilename} & ${textFilename}`);
        return { audioPath: newAudioPath, textPath: newTextPath };

    } catch (error) {
        console.error('Error saving training data:', error);
        throw error;
    }
};

export const getTrainingDataList = async () => {
    try {
        await ensureDirectoryExists();
        const files = await FileSystem.readDirectoryAsync(TRAINING_DIR);
        return files;
    } catch (e) {
        return [];
    }
};
