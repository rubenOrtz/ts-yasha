export = VoiceConnection;
declare class VoiceConnection extends voice.VoiceConnection {
    static disconnect_reason(reason: any): "Adapter unavailable" | "Endpoint removed" | "WebSocket closed" | "Manual disconnect" | undefined;
    static connect(channel: import('discord.js').VoiceChannel, options?: Partial<import('@discordjs/voice').JoinConfig>): Promise<VoiceConnection>;
    static get(guild: any): any;
    static disconnect(guild: any, options: any): boolean;
    constructor(channel: any, options: any);
    guild: any;
    connect_timeout: any;
    connected: boolean;
    rejoin_id(channelId: any): void;
    rejoin(channel: any): void;
    ready(): boolean;
    addStatePacket(packet: any): void;
    onNetworkingError(error: any): void;
    handle_state_change(state: any): void;
    set state(arg: any);
    get state(): any;
    disconnect(): void;
    await_connection(): Promise<void>;
    promise: Promise<any> | null | undefined;
    promise_resolve: ((value: any) => void) | null | undefined;
    promise_reject: ((reason?: any) => void) | null | undefined;
    timeout: any;
}
declare namespace VoiceConnection {
    export { VoiceConnectionStatus as Status };
}
import voice = require("@discordjs/voice");
declare const VoiceConnectionStatus: typeof voice.VoiceConnectionStatus;
