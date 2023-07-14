export = VoiceConnection;
declare class VoiceConnection extends voice.VoiceConnection {
    static disconnect_reason(reason: voice.VoiceConnectionDisconnectReason): "Adapter unavailable" | "Endpoint removed" | "WebSocket closed" | "Manual disconnect";
    static connect(channel: import('discord.js').VoiceChannel, options?: Partial<import('@discordjs/voice').JoinConfig>): Promise<VoiceConnection>;
    static get(guild: import('discord.js').Guild): VoiceConnection;
    static disconnect(guild: import('discord.js').Guild, options: Partial<voice.JoinConfig>): boolean;
    constructor(channel: import('discord.js').VoiceChannel, options: voice.JoinConfig);
    guild: import("discord.js").Guild;
    connect_timeout: any;
    connected: boolean;
    rejoin_id(channelId: string): void;
    override rejoin(channel: import('discord.js').VoiceChannel): void;
    ready(): boolean;
    addStatePacket(packet: any): void;
    onNetworkingError(error: Error): void;
    handle_state_change(state: {
        status: voice.VoiceConnectionStatus;
        reason: voice.VoiceConnectionDisconnectReason;
    }): void;
    set state(arg: {
        status: voice.VoiceConnectionStatus;
        reason: voice.VoiceConnectionDisconnectReason;
    });
    get state(): {
        status: voice.VoiceConnectionStatus;
        reason: voice.VoiceConnectionDisconnectReason;
    };
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
declare const VoiceConnectionDisconnectReason: typeof voice.VoiceConnectionDisconnectReason;
