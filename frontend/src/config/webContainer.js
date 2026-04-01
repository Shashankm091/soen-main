import { WebContainer } from '@webcontainer/api';

let webContainerPromise = null;

export const getWebContainer = async () => {
    if (!webContainerPromise) {
        webContainerPromise = WebContainer.boot();
    }
    return webContainerPromise;
}