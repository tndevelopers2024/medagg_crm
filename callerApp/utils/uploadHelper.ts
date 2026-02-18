import { Platform } from 'react-native';

export const uploadFileWithXHR = (
    url: string,
    filePath: string,
    formFields: Record<string, string>,
    token: string,
    onProgress?: (progress: number) => void
): Promise<any> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText));
                } catch {
                    resolve({ success: true, data: xhr.responseText });
                }
            } else {
                reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
            }
        };

        xhr.onerror = () => reject(new Error('Network request failed'));
        xhr.ontimeout = () => reject(new Error('Upload timeout'));
        xhr.onabort = () => reject(new Error('Upload aborted'));

        xhr.open('POST', url);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 60000;

        const formData = new FormData();

        formData.append('recording', {
            uri: Platform.OS === 'android' ? filePath : `file://${filePath}`,
            type: 'audio/mp4',
            name: formFields.name || 'recording.mp4',
        } as any);

        Object.entries(formFields).forEach(([key, value]) => {
            if (key !== 'name') {
                formData.append(key, value);
            }
        });

        xhr.send(formData);
    });
};
