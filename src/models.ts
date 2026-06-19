export interface UserBasicInfo {
    userId: string;
    nickname: string;
    mail: string;
    avatar: string;
}

export interface MMONewRoomResponse {
    connectKey: string;
    edgeUrl: string;
    roomId: string;
    protocol: string;
}

export interface MMOJoinRoomResponse {
    connectKey: string;
    edgeUrl: string;
    roomId: string;
    protocol: string;
    assignedUid?: string;
}
