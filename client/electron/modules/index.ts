import { registerDatabaseHandlers } from './database/ipc';
import { registerResourceHandlers } from './resources/ipc';
import { registerSystemHandlers } from './system/ipc';
import { registerChatHandlers } from './chat/ipc';
import { registerVideoHandlers } from './video/ipc';

export function registerAllIpcHandlers() {
    registerDatabaseHandlers();
    registerResourceHandlers();
    registerSystemHandlers();
    registerChatHandlers();
    registerVideoHandlers();
}
