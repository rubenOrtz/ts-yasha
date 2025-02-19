const EventEmitter = require('events');

const VoiceConnection = require('./VoiceConnection');
// @ts-ignore
const AudioPlayer = require('sange');

		// @ts-ignore
const sodium = require('sodium');
const { TrackStream, TrackStreams } = require('./Track');

const random_bytes = Buffer.alloc(24);
const connection_nonce = Buffer.alloc(24);
const audio_nonce = Buffer.alloc(24);
const audio_buffer = Buffer.alloc(8192);
const audio_output = Buffer.alloc(8192);

const silence = Buffer.from([0xf8, 0xff, 0xfe]);

/* these bytes never change */
audio_buffer[0] = 0x80;
audio_buffer[1] = 0x78;

const MAX_PLAY_ID = 2 ** 32 - 1;
const ERROR_INTERVAL = 5 * 60 * 1000; /* 5 minutes */

const EncryptionMode = {
	NONE: 0,
	LITE: 1,
	SUFFIX: 2,
	DEFAULT: 3
};

class Subscription{
	/**
	 * @param {VoiceConnection} connection
	 * @param {TrackPlayer} player
	 */
	constructor(connection, player){
		this.connection = connection;
		this.player = player;
	}

	unsubscribe(){
		// @ts-ignore
		this.connection.onSubscriptionRemoved(this);
		this.player.unsubscribe(this);
	}
}

class TrackPlayer extends EventEmitter{
	/** @type {boolean} */
	normalize_volume = false
	/** @type {boolean} */
	external_encrypt = false
	/** @type {boolean} */
	external_packet_send = false
	/** @type {number} */
	last_error = 0
	/** @type {Awaited<ReturnType<typeof import('./Source').resolve>> | null} */
	track
	/** @type {unknown} */
	stream
	/** @type {Subscription[]} */
	subscriptions
	/** @type {number} */
	play_id = 0
	/** @type {number | null} */
	silence_frames_interval = null
	/** @type {number} */
	silence_frames_left = 0
	/** @type {boolean} */
	silence_frames_needed = false
	/** @type {AudioPlayer} */
	player
	/**
	 * 
	 * @param {{normalize_volume:boolean;external_encrypt:boolean;external_packet_send:boolean}} [options] 
	 */
	constructor(options){
		super();

		if(options){
			this.normalize_volume = options.normalize_volume;
			this.external_encrypt = options.external_encrypt;
			this.external_packet_send = options.external_packet_send;
		}

		this.last_error = 0;

		this.track = null;
		this.stream = null;
		this.subscriptions = [];

		this.play_id = 0;

		this.silence_frames_interval = null;
		this.silence_frames_left = 0;
		this.silence_frames_needed = false;

		this.onstatechange = this.onstatechange.bind(this);

		this.player = null;
	}

	/**
	 * 
	 * @param {*} old 
	 * @param {*} cur 
	 */
	onstatechange(old, cur){
		if(cur.status == VoiceConnection.Status.Ready)
			this.init_secretbox();
		else if(this.external_encrypt && this.external_packet_send && this.player)
			this.player.ffplayer.pipe();
	}

	/**
	 * 
	 * @param {*} connection 
	 * @returns {Subscription}
	 */
	subscribe(connection){
		if(this.external_encrypt){
			if(this.subscriptions.length)
				throw new Error('Cannot subscribe to multiple connections when external encryption is enabled');
			connection.on('stateChange', this.onstatechange);
		}

		var subscription = new Subscription(connection, this);

		this.subscriptions.push(subscription);

		this.init_secretbox();

		return subscription;
	}

	/**
	 * 
	 * @param {Subscription} subscription 
	 * @returns {void}
	 */
	unsubscribe(subscription){
		var index = this.subscriptions.indexOf(subscription);

		if(index == -1)
			return;
		if(this.external_encrypt)
			this.subscriptions[index].connection.removeListener('stateChange', this.onstatechange);
		this.subscriptions.splice(index, 1);

		if(!this.subscriptions.length)
			this.destroy();
	}

	/**
	 * 
	 */
	unsubscribe_all(){
		while(this.subscriptions.length)
			this.subscriptions[0].unsubscribe();
	}

	/**
	 * 
	 * @param {*} packet 
	 * @param {number} length 
	 * @param {number} frame_size
	 */
	onpacket(packet, length, frame_size){
		this.stop_silence_frames();

		packet = new Uint8Array(packet.buffer, 0, length);

		if(!this.external_packet_send)
			this.send(packet, frame_size);
		this.emit('packet', packet, frame_size);
	}

	onfinish(){
		this.emit('finish');
		this.start_silence_frames();
	}

	/**
	 * 
	 * @param {*} error 
	 * @param {*} code 
	 * @param {*} retryable 
	 * @returns {void}
	 */
	onerror(error, code, retryable){
		if(this.error(error, retryable))
			return;
			// @ts-ignore
		this.track.streams = null;
		this.create_player(this.getTime());
		this.start();
	}

	secretbox_ready(){
		return this.subscriptions.length && this.subscriptions[0].connection.ready();
	}

	get_connection(){
		return this.subscriptions[0].connection;
	}

	get_connection_data(){
		// @ts-ignore
		return this.get_connection().state.networking.state.connectionData;
	}

	get_connection_udp(){
		// @ts-ignore
		return this.get_connection().state.networking.state.udp;
	}

	init_secretbox(){
		if(!this.external_encrypt || !this.player)
			return;
		if(this.secretbox_ready()){
			var connection_data = this.get_connection_data(),
				udp = this.get_connection_udp();
			var mode;

			switch(connection_data.encryptionMode){
				case 'xsalsa20_poly1305_lite':
					mode = EncryptionMode.LITE;

					break;
				case 'xsalsa20_poly1305_suffix':
					mode = EncryptionMode.SUFFIX;

					break;
				default:
					mode = EncryptionMode.DEFAULT;

					break;
			}

			var data = this.get_connection_data();

			try{
				this.player.ffplayer.setSecretBox(connection_data.secretKey, mode, connection_data.ssrc);
				this.player.ffplayer.updateSecretBox(data.sequence, data.timestamp, data.nonce);

				if(this.external_packet_send)
					this.player.ffplayer.pipe(udp.remote.ip, udp.remote.port);
			}catch(e){
				this.cleanup();
				this.emit('error', e);

				return;
			}

			if(this.external_packet_send)
				this.get_connection().setSpeaking(true);
			return;
		}

		try{
			this.player.ffplayer.setSecretBox(new Uint8Array(32), 0, 0);
		}catch(e){
			this.cleanup();
			this.emit('error', e);
		}

		if(this.external_packet_send)
			this.player.ffplayer.pipe();
	}

	/**
	 * 
	 * @param {number} start_time 
	 * @returns 
	 */
	create_player(start_time){
		this.destroy_player();

		// @ts-ignore
		if(this.track.player){
			// @ts-ignore
			this.player = new this.track.player(this.external_encrypt ? new Uint8Array(4096) : audio_output, false);
			this.player.setTrack(this.track);
		}else{
			try{
				this.player = new AudioPlayer(this.external_encrypt ? new Uint8Array(4096) : audio_output, false);
			}catch(e){
				this.emit('error', e);

				return;
			}
		}

		this.player.setOutput(2, 48000, 256000);

		if(start_time)
			this.player.seek(start_time);
		this.player.ffplayer.onready = this.emit.bind(this, 'ready');
		this.player.ffplayer.onpacket = this.onpacket.bind(this);
		this.player.ffplayer.onfinish = this.onfinish.bind(this);
		this.player.ffplayer.onerror = this.onerror.bind(this);
		this.player.ffplayer.ondebug = this.emit.bind(this, 'debug');

		this.init_secretbox();
	}

	async load_streams(){
		var streams, play_id = this.play_id;

		// @ts-ignore
		if(this.track.streams && !this.track.streams.expired())
		// @ts-ignore
			streams = this.track.streams;
		else{
			try{
				// @ts-ignore
				streams = await this.track.getStreams();
			}catch(error){
				if(this.play_id == play_id)
					this.emit('error', error);
				return false;
			}

			if(this.play_id != play_id)
				return false;
				// @ts-ignore
			this.track.streams = streams;
		}

		this.stream = this.get_best_stream(streams);

		if(!this.stream){
			this.emit('error', new Error('No streams found'));

			return false;
		}

		// @ts-ignore
		if(!this.stream.url){
			try{
				// @ts-ignore
				this.stream.url = await this.stream.getUrl();
			}catch(error){
				if(this.play_id == play_id)
					this.emit('error', error);
				return false;
			}

			if(this.play_id != play_id)
				return false;
		}

		return true;
	}
	/**
	 * 
	 * @param {Buffer} buffer 
	 * @param {number} [frame_size] 
	 * @param {boolean} [is_silence] 
	 */
	send(buffer, frame_size, is_silence){
		var subscriptions = this.subscriptions, connection;

		for(var i = 0; i < subscriptions.length; i++){
			connection = subscriptions[i].connection;

			if(!connection.ready())
				continue;
			connection.setSpeaking(true);

			// @ts-ignore
			var state = connection.state.networking.state,
				connection_data = state.connectionData,
				mode = connection_data.encryption_mode;
			if(this.external_encrypt && !is_silence){
				state.udp.send(buffer);

				continue;
			}

			if(!mode){
				switch(connection_data.encryptionMode){
					case 'xsalsa20_poly1305_lite':
						connection_data.encryption_mode = EncryptionMode.LITE;

						break;
					case 'xsalsa20_poly1305_suffix':
						connection_data.encryption_mode = EncryptionMode.SUFFIX;

						break;
					default:
						connection_data.encryption_mode = EncryptionMode.DEFAULT;

						break;
				}

				mode = connection_data.encryption_mode;
			}

			connection_data.sequence++;
			connection_data.timestamp += frame_size;

			if(connection_data.sequence > 65535)
				connection_data.sequence = 0;
			if(connection_data.timestamp > 4294967295)
				connection_data.timestamp = 0;
			audio_buffer.writeUIntBE(connection_data.sequence, 2, 2);
			audio_buffer.writeUIntBE(connection_data.timestamp, 4, 4);
			audio_buffer.writeUIntBE(connection_data.ssrc, 8, 4);

			var len, buf;

			switch(mode){
				case EncryptionMode.LITE:
					len = 16;
					connection_data.nonce++;

					if(connection_data.nonce > 4294967295)
						connection_data.nonce = 0;
					connection_nonce.writeUInt32BE(connection_data.nonce, 0);
					buf = sodium.api.crypto_secretbox_easy(buffer, connection_nonce, connection_data.secretKey);
					audio_buffer.set(connection_nonce.slice(0, 4), 12 + buf.length);

					break;
				case EncryptionMode.SUFFIX:
					len = 36;
					sodium.api.randombytes_buf(random_bytes);
					buf = sodium.api.crypto_secretbox_easy(buffer, random_bytes, connection_data.secretKey);
					audio_buffer.set(random_bytes, 12 + buf.length);

					break;
				case EncryptionMode.DEFAULT:
					len = 12;
					audio_buffer.copy(audio_nonce, 0, 0, 12);
					buf = sodium.api.crypto_secretbox_easy(buffer, audio_nonce, connection_data.secretKey);

					break;
			}

			audio_buffer.set(buf, 12);
			state.udp.send(new Uint8Array(audio_buffer.buffer, 0, len + buf.length));
		}
	}

	start_silence_frames(){
		if(!this.silence_frames_needed || this.silence_frames_interval)
			return;
		this.silence_frames_needed = false;

		if(this.player && this.external_encrypt && this.secretbox_ready()){
			/* restore modified secretbox state from the player */
			var box = this.player.ffplayer.getSecretBox(),
				data = this.get_connection_data();
			data.nonce = box.nonce;
			data.timestamp = box.timestamp;
			data.sequence = box.sequence;
		}

		// @ts-ignore
		this.silence_frames_interval = setInterval(() => {
			this.silence_frames_left--;

			this.send(silence, 960, true);

			if(this.player && this.external_encrypt && this.secretbox_ready()){
				/* save modified secretbox state to the player */
				var data = this.get_connection_data();

				this.player.ffplayer.updateSecretBox(data.sequence, data.timestamp, data.nonce);
			}

			if(!this.silence_frames_left){
				// @ts-ignore
				clearInterval(this.silence_frames_interval);

				this.silence_frames_interval = null;
			}
		}, 20);
	}

	stop_silence_frames(){
		if(this.silence_frames_needed)
			return;
		if(this.silence_frames_interval){
			clearInterval(this.silence_frames_interval);

			this.silence_frames_interval = null;
		}

		this.silence_frames_needed = true;
		this.silence_frames_left = 5;
	}

	/**
	 * 
	 * @param {Error} error 
	 * @param {boolean} [retryable] 
	 * @returns 
	 */
	error(error, retryable){
		if(!retryable || Date.now() - this.last_error < ERROR_INTERVAL){
			this.destroy_player();
			this.emit('error', error);

			return true;
		}

		this.last_error = Date.now();

		return false;
	}

	/**
	 * 
	 * @param {TrackStreams} streams 
	 * @returns 
	 */
	get_best_stream_one(streams){
		var opus = [], audio = [], other = [];

		for(var stream of streams){
			if(stream.video){
				other.push(stream);

				continue;
			}

			if(stream.codecs == 'opus')
				opus.push(stream);
			else
				audio.push(stream);
		}

		if(opus.length)
		// @ts-ignore
			streams = opus;
		else if(audio.length)
		// @ts-ignore
			streams = audio;
		else
		// @ts-ignore
			streams = other;
		if(!streams.length)
			return null;
		return streams.reduce((best, cur) => {
			return cur.bitrate > best.bitrate ? cur : best;
		});
	}

	/**
	 * 
	 * @param {TrackStream} streams 
	 * @returns 
	 */
	get_best_stream(streams){
		// @ts-ignore
		var result, volume = streams.volume;

		// @ts-ignore
		streams = streams.filter((stream) => stream.audio);
		// @ts-ignore
		result = this.get_best_stream_one(streams.filter((stream) => stream.default_audio_track))

		if(!result)
		// @ts-ignore
			result = this.get_best_stream_one(streams);
		if(result)
			result.volume = volume;
		return result;
	}

	/**
	 * 
	 * @param {import('./Track').Track<any>} track 
	 * @returns {void}
	 */
	play(track){
		this.play_id++;
		this.last_error = 0;

		this.stream = null;
		// @ts-ignore
		this.track = track;

		if(this.play_id > MAX_PLAY_ID)
			this.play_id = 0;
			// @ts-ignore
		this.create_player();
	}

	async start(){
		if(!await this.load_streams() || !this.player) /* destroy could have been called while waiting */
			return;
		if(this.normalize_volume)
		// @ts-ignore
			this.player.setVolume(this.stream.volume);
		try{
			// @ts-ignore
			this.player.setURL(this.stream.url, this.stream.is_file);
			this.player.start();
		}catch(e){
			this.emit('error', e);
		}
	}

	check_destroyed(){
		if(!this.player)
			throw new Error('Player was destroyed or nothing was playing');
	}

	hasPlayer(){
		return this.player != null;
	}

	isPaused(){
		this.check_destroyed();

		return this.player.isPaused();
	}

	/**
	 * 
	 * @param {boolean} paused 
	 * @returns 
	 */
	setPaused(paused){
		this.check_destroyed();

		if(paused)
			this.start_silence_frames();
		return this.player.setPaused(paused);
	}

	/**
	 * 
	 * @param {number} volume 
	 * @returns 
	 */
	setVolume(volume){
		this.check_destroyed();

		return this.player.setVolume(volume);
	}

	/**
	 * 
	 * @param {number} bitrate 
	 * @returns 
	 */
	setBitrate(bitrate){
		this.check_destroyed();

		return this.player.setBitrate(bitrate);
	}

	/**
	 * 
	 * @param {number} rate 
	 * @returns 
	 */
	setRate(rate){
		this.check_destroyed();

		return this.player.setRate(rate);
	}

	/**
	 * 
	 * @param {*} tempo 
	 * @returns 
	 */
	setTempo(tempo){
		this.check_destroyed();

		return this.player.setTempo(tempo);
	}

	/**
	 * 
	 * @param {*} depth 
	 * @param {number} rate 
	 * @returns 
	 */
	setTremolo(depth, rate){
		this.check_destroyed();

		return this.player.setTremolo(depth, rate);
	}

	/**
	 * 
	 * @param {*} eqs 
	 * @returns 
	 */
	setEqualizer(eqs){
		this.check_destroyed();

		return this.player.setEqualizer(eqs);
	}

	/**
	 * 
	 * @param {number} time 
	 * @returns 
	 */
	seek(time){
		this.check_destroyed();
		this.start_silence_frames();

		return this.player.seek(time);
	}

	getTime(){
		this.check_destroyed();

		return this.player.getTime();
	}

	getDuration(){
		this.check_destroyed();

		return this.player.getDuration();
	}

	getFramesDropped(){
		this.check_destroyed();

		return this.player.getFramesDropped();
	}

	getTotalFrames(){
		this.check_destroyed();

		return this.player.getTotalFrames();
	}

	isCodecCopy(){
		this.check_destroyed();

		return this.player.ffplayer.isCodecCopy();
	}

	stop(){
		this.start_silence_frames();

		if(this.player)
			return this.player.stop();
	}

	destroy_player(){
		if(this.player){
			this.start_silence_frames();
			this.player.destroy();
			this.player = null;
		}
	}

	cleanup(){
		this.destroy_player();
	}

	destroy(){
		this.unsubscribe_all();

		if(this.player){
			this.player.destroy();
			this.player = null;
		}

		if(this.silence_frames_interval){
			clearInterval(this.silence_frames_interval);

			this.silence_frames_interval = null;
		}
	}
}

module.exports = TrackPlayer;