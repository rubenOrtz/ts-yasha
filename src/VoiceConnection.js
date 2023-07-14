const voice = require('@discordjs/voice')
const { VoiceConnectionStatus, VoiceConnectionDisconnectReason } = voice

class VoiceConnection extends voice.VoiceConnection {
    /**
     * 
     * @param {import('discord.js').VoiceChannel} channel 
     * @param {voice.JoinConfig} options 
     */
    constructor(channel, options) {
        super(
            {
                // ! This is an a modification of the original file from the project 
                ...options,
                channelId: channel.id,
                guildId: channel.guild.id,
            },
            { adapterCreator: channel.guild.voiceAdapterCreator },
        )

        this.guild = channel.guild
        // @ts-ignore
        this.guild.voice_connection = this
        this.connect_timeout = null
        this.connected = false

        this.await_connection()
        // @ts-ignore
        this._state.status = VoiceConnectionStatus.Ready

        // @ts-ignore
        if (super.rejoin()) this._state.status = VoiceConnectionStatus.Signalling
    }

    /**
     * 
     * @param {string} channelId 
     */
    rejoin_id(channelId) {
        // ? check this
        // @ts-ignore
        if (this.joinConfig.channelId != channelId) super.rejoin({ channelId })
    }

    /**
     * 
     * @param {import('discord.js').VoiceChannel} channel 
     * @override
     */
    // @ts-ignore
    rejoin(channel) {
        if (channel.guild.id != this.guild.id) throw new Error('Channel is not in the same guild')
        if (!channel.joinable) throw new Error(channel.full ? 'Channel is full' : 'No permissions')
        this.rejoin_id(channel.id)
    }

    /**
     * 
     * @param {voice.VoiceConnectionDisconnectReason} reason 
     * @returns 
     */
    static disconnect_reason(reason) {
        switch (reason) {
            case VoiceConnectionDisconnectReason.AdapterUnavailable:
                return 'Adapter unavailable'
            case VoiceConnectionDisconnectReason.EndpointRemoved:
                return 'Endpoint removed'
            case VoiceConnectionDisconnectReason.WebSocketClose:
                return 'WebSocket closed'
            case VoiceConnectionDisconnectReason.Manual:
                return 'Manual disconnect'
        }
    }

    ready() {
        return this.state.status == VoiceConnectionStatus.Ready
    }

    /**
     * 
     * @param {*} packet 
     */
    addStatePacket(packet) {
        if (!packet.channel_id) this.destroy()
        // @ts-ignore
        else super.addStatePacket(packet)
    }

    /**
     * 
     * @param {Error} error 
     */
    onNetworkingError(error) {
        // @ts-ignore
        if (this.promise) this.promise_reject(error)
        else {
            this.emit('error', error)
            this.destroy()
        }
    }

    /**
     * 
     * @param {{status: voice.VoiceConnectionStatus; reason: voice.VoiceConnectionDisconnectReason}} state 
     */
    handle_state_change(state) {
        switch (state.status) {
            case VoiceConnectionStatus.Destroyed:
                // @ts-ignore
                this.promise_reject(new Error('Connection destroyed'))

                break
            case VoiceConnectionStatus.Disconnected:
                // @ts-ignore
                this.promise_reject(new Error(VoiceConnection.disconnect_reason(state.reason)))

                break
            case VoiceConnectionStatus.Ready:
                // @ts-ignore
                this.promise_resolve()

                break
        }
    }

    /**
     * @param {{status: voice.VoiceConnectionStatus; reason: voice.VoiceConnectionDisconnectReason}} state
     */
    // @ts-ignore
    set state(state) {
        if (state.status != this.state.status) {
            if (this.promise) this.handle_state_change(state)
            else if (state.status == VoiceConnectionStatus.Disconnected) {
                if (state.reason == VoiceConnectionDisconnectReason.WebSocketClose) this.await_connection()
                else this.destroy(state.reason != VoiceConnectionDisconnectReason.AdapterUnavailable)
            }
        }

        // @ts-ignore
        super.state = state
    }

    /**
     * @returns {{status: voice.VoiceConnectionStatus; reason: voice.VoiceConnectionDisconnectReason}}
     */
    // @ts-ignore
    get state() {
        // @ts-ignore
        return this._state
    }

    destroy(adapter_available = true) {
        if (this.state.status == VoiceConnectionStatus.Destroyed) return
        if (adapter_available) {
            // @ts-ignore
            this._state.status = VoiceConnectionStatus.Destroyed

            /* remove the subscription */
            this.state = {
                status: VoiceConnectionStatus.Destroyed,
                // @ts-ignore
                adapter: this.state.adapter,
            }

            // @ts-ignore
            this._state.status = VoiceConnectionStatus.Disconnected

            super.disconnect()
        }

            // @ts-ignore
        if (this.guild.voice_connection == this) this.guild.voice_connection = null
        else console.warn('Voice connection mismatch')
        // @ts-ignore
        this.state = { status: VoiceConnectionStatus.Destroyed }
    }

    // @ts-ignore
    disconnect() {
        this.destroy()
    }

    async await_connection() {
        if (this.state.status == VoiceConnectionStatus.Ready || this.promise) return
        this.promise = new Promise((resolve, reject) => {
            this.promise_resolve = resolve
            this.promise_reject = reject
        })

        this.timeout = setTimeout(() => {
            this.timeout = null
            // @ts-ignore
            this.promise_reject(new Error('Connection timed out'))
        }, 15000)

        try {
            await this.promise

            this.connected = true
        } catch (e) {
            if (this.connected) this.emit('error', e)
            this.destroy()
        } finally {
            clearTimeout(this.timeout)

            this.timeout = null
            this.promise = null
            this.promise_resolve = null
            this.promise_reject = null
        }
    }

    /**
     *
     * @param {import('discord.js').VoiceChannel} channel
     * @param {Partial<import('@discordjs/voice').JoinConfig>} options
     * @returns {Promise<VoiceConnection>}
     */
    static async connect(channel, options = {}) {
        if (!channel.joinable) throw new Error(channel.full ? 'Channel is full' : 'No permissions')
        // @ts-ignore
        var connection = channel.guild.voice_connection

        // @ts-ignore
        if (!connection) connection = new VoiceConnection(channel, options)
        else connection.rejoin_id(channel.id)
        if (connection.ready()) return connection
        connection.await_connection()

        await connection.promise

        return connection
    }

    /**
     * 
     * @param {import('discord.js').Guild} guild 
     * @returns {VoiceConnection}
     */
    static get(guild) {
        // @ts-ignore
        return guild.voice_connection
    }

    /**
     * 
     * @param {import('discord.js').Guild} guild 
     * @param {Partial<voice.JoinConfig>} options 
     * @returns 
     */
    static disconnect(guild, options) {
        // @ts-ignore
        if (guild.voice_connection) {
            // @ts-ignore
            guild.voice_connection.disconnect()

            return true
        }

        // ! This is an a modification of the original file from the project
        if (!guild.members.me?.voice.channel) return false
        var { rejoin, disconnect } = voice.VoiceConnection.prototype

        var dummy = {
            state: {
                // ? check this
                // @ts-ignore
                status: VoiceConnectionStatus.ready,
                adapter: guild.voiceAdapterCreator({
                    onVoiceServerUpdate() {},
                    onVoiceStateUpdate() {},
                    destroy() {},
                }),
            },

            joinConfig: {
                guildId: guild.id,
                // ! This is an a modification of the original file from the project
                channelId: guild.members.me?.voice.channel?.id,
                ...options,
            },
        }

        if (!rejoin.call(dummy))
            throw new Error(this.disconnect_reason(VoiceConnectionDisconnectReason.AdapterUnavailable))
        dummy.state.status = VoiceConnectionStatus.Ready

        if (!disconnect.call(dummy))
            throw new Error(this.disconnect_reason(VoiceConnectionDisconnectReason.AdapterUnavailable))
        return true
    }
}

VoiceConnection.Status = VoiceConnectionStatus

module.exports = VoiceConnection
