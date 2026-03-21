export interface TrackedMessage {
    chatId: number;
    messageId: number;
    type: 'personnel_list' | 'regulation_list';
}

export const activeMessages: TrackedMessage[] = [];

export function trackMessage(chatId: number, messageId: number, type: 'personnel_list' | 'regulation_list') {
    const index = activeMessages.findIndex(m => m.chatId === chatId && m.type === type);
    if (index !== -1) {
        activeMessages.splice(index, 1);
    }
    activeMessages.push({ chatId, messageId, type });
}

export function getTrackedMessages(type: 'personnel_list' | 'regulation_list') {
    return activeMessages.filter(m => m.type === type);
}
