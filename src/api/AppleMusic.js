const Request = require('../Request');
const SourceError = require('../SourceError');
const Youtube = require('./Youtube');

const {Track, TrackImage, TrackResults, TrackPlaylist} = require('../Track');

class AppleMusicTrack extends Track{
	/** @type {string[]} */
	artists = []
	/** @type {boolean} */
	explicit = false

	constructor(){
		super('AppleMusic');
	}

	/**
	 * 
	 * @protected
	 * @param {string} url 
	 * @param {boolean} [artist] 
	 * @returns {[TrackImage]}
	 */
	gen_image(url, artist){
		const dim = artist ? 220 : 486;
		// @ts-ignore
		return [new TrackImage(url.replaceAll('{w}', dim).replaceAll('{h}', dim).replaceAll('{c}', artist ? 'sr' : 'bb').replaceAll('{f}', 'webp'), dim, dim)];
	}

	/**
	 * 
	 * @param {*} track 
	 * @returns {this}
	 */
	from(track){
		let icon;

		for(const artist of track.relationships.artists.data)
			if(artist.attributes.artwork)
				icon = this.gen_image(artist.attributes.artwork.url, true);
		// @ts-ignore
		this.artists = track.relationships.artists.data.map((artist) => artist.attributes.name);
		this.setOwner(this.artists.join(', '), icon);
		this.setMetadata(track.id, track.attributes.name, track.attributes.durationInMillis / 1000, this.gen_image(track.attributes.artwork.url));

		this.explicit = track.attributes.contentRating == 'explicit';

		return this;
	}

	/**
	 * 
	 * @returns {Promise<AppleMusicTrack>}
	 */
	async fetch(){
		// @ts-ignore
		return api.get(this.id);
	}

	/**
	 * 
	 * @returns {Promise<unknown>}
	 */
	async getStreams(){
		return Youtube.track_match(this);
	}

	/** 
	 * @returns {string}
	 */
	get url(){
		return 'https://music.apple.com/song/' + this.id;
	}
}

class AppleMusicResults extends TrackResults{
	/** @type {any | null} */
	query = null
	/** @type {number | undefined} */
	start

	/**
	 * 
	 * @protected
	 * @param {*} query 
	 * @param {number} start 
	 */
	set_continuation(query, start){
		this.query = query;
		this.start = start;
	}

	/**
	 * 
	 * @returns {Promise<AppleMusicResults | null>}
	 */
	async next(){
		if(this.query != null)
			return await api.search(this.query, this.start);
		return null;
	}
}

class AppleMusicPlaylist extends TrackPlaylist{
	/** @type {string | undefined} */
	type
	/** @type {string | undefined} */
	id
	/** @type {number | undefined} */
	start

	/**
	 * 
	 * @param {string} type 
	 * @param {string} id 
	 */
	set(type, id){
		this.type = type;
		this.id = id;
	}

	/**
	 * 
	 * @protected
	 * @param {*} start 
	 */
	set_continuation(start){
		this.start = start;
	}

	/**
	 * 
	 * @returns {Promise<AppleMusicPlaylist | null>}
	 */
	async next(){
		if(this.start !== undefined)
			// @ts-ignore
			return await api.list_once(this.type, this.id, this.start);
		return null;
	}

	/**
	 * @returns {string}
	 */
	get url(){
		if(this.type == 'playlists')
			return 'https://music.apple.com/playlist/' + this.id;
		return 'https://music.apple.com/album/' + this.id;
	}
}

const api = (new class AppleMusicAPI{
	/** @type {string | null} */
	token
	/** @type {null | Promise<void>} */
	reloading
	/** 
	 * @type {boolean}
	 * @protected
	 */
	needs_reload

	constructor(){
		this.token = null;
		this.reloading = null;
		this.needs_reload = false;
	}

	/**
	 * 
	 * @param {boolean} [force] 
	 * @returns {Promise<void>}
	 */
	async reload(force){
		if(this.reloading){
			if(force)
				this.needs_reload = true;
			return;
		}

		do{
			this.needs_reload = false;
			this.reloading = this.load();

			try{
				await this.reloading;
			}catch(e){

			}

			this.reloading = null;
		}while(this.needs_reload);
	}

	async load(){
		const {body} = await Request.get('https://music.apple.com/us/browse');
		/** @type {any} */
		let config = /<meta name="desktop-music-app\/config\/environment" content="(.*?)">/.exec(body);

		if(!config)
			throw new SourceError.INTERNAL_ERROR(null, new Error('Missing config'));
		try{
			config = JSON.parse(decodeURIComponent(config[1]));
		}catch(e){
			throw new SourceError.INTERNAL_ERROR(null, e);
		}

		if(!config?.MEDIA_API?.token)
			throw new SourceError.INTERNAL_ERROR(null, new Error('Missing token'));
		this.token = config.MEDIA_API.token;
	}

	/**
	 * 
	 * @returns {Promise<void> | undefined}
	 */
	prefetch(){
		if(!this.token)
			this.reload();
		if(this.reloading)
			return this.reloading;
	}

	/**
	 * 
	 * @protected
	 * @param {string} path 
	 * @param {{[key:string]:any}} [query] 
	 * @param {{headers?:{authorization?:string;origin?:string;[key:string]:any};[key:string]:any}} [options] 
	 * @returns 
	 */
	async api_request(path, query = {}, options = {}){
		let res, body 
		/** @type {string[] | string} */
		let queries = [];

		for(const name in query)
			queries.push(encodeURIComponent(name) + '=' + encodeURIComponent(query[name]));
		if(queries.length)
			queries = '?' + queries.join('&');
		else
			queries = '';
		if(!options.headers)
			options.headers = {};
		for(let tries = 0; tries < 2; tries++){
			await this.prefetch();

			options.headers.authorization = `Bearer ${this.token}`;
			options.headers.origin = 'https://music.apple.com';
			res = (await Request.getResponse(`https://amp-api.music.apple.com/v1/catalog/us/${path}${queries}`, options)).res;

			if(res.status == 401){
				if(tries)
					throw new SourceError.INTERNAL_ERROR(null, new Error('Unauthorized'));
				this.reload();

				continue;
			}

			break;
		}

		try{
			body = await res.text();
		}catch(e){
			if(!res.ok)
				throw new SourceError.INTERNAL_ERROR(null, e);
			throw new SourceError.NETWORK_ERROR(null, e);
		}

		if(res.status == 404)
			throw new SourceError.NOT_FOUND();
		if(!res.ok)
			throw new SourceError.INTERNAL_ERROR(null, new Error(body));
		try{
			body = JSON.parse(body);
		}catch(e){
			throw new SourceError.INVALID_RESPONSE(null, e);
		}

		return body;
	}

	/**
	 * 
	 * @protected
	 * @param {string} id 
	 */
	check_valid_id(id){
		if(!/^[\d]+$/.test(id))
			throw new SourceError.NOT_FOUND();
	}

	/**
	 * 
	 * @param {string} id 
	 * @returns 
	 */
	async get(id){
		this.check_valid_id(id);

		const track = await this.api_request('songs/' + id, {
			'fields[artists]': 'url,name,artwork,hero',
			'include[songs]': 'artists',
			'extend': 'artistUrl',
			'art[url]': 'c,f',
		});

		try{
			return new AppleMusicTrack().from(track.data[0]);
		}catch(e){
			throw new SourceError.INTERNAL_ERROR(null, e);
		}
	}

	/**
	 * 
	 * @protected
	 * @param {string} id 
	 * @returns 
	 */
	async get_streams(id){
		return Youtube.track_match(await this.get(id));
	}

	/**
	 * 
	 * @protected
	 * @param {string} url 
	 * @param {*} param 
	 * @returns 
	 */
	get_next(url, param){
		let num;
		// @ts-ignore
		url = new URL(url, 'https://amp-api.music.apple.com');
		// @ts-ignore
		num = parseInt(url.searchParams.get(param));

		if(!Number.isFinite(num))
			throw new Error('Invalid next');
		return num;
	}

	/**
	 * 
	 * @param {*} query 
	 * @param {number} [offset] 
	 * @param {number} [limit] 
	 * @returns {Promise<AppleMusicResults>}
	 */
	async search(query, offset = 0, limit = 25){
		const data = await this.api_request('search', {
			groups: 'song',
			offset,
			limit,
			l: 'en-US',
			term: query,
			platform: 'web',
			types: 'activities,albums,apple-curators,artists,curators,editorial-items,music-movies,music-videos,playlists,songs,stations,tv-episodes,uploaded-videos,record-labels',
			'include[songs]': 'artists',
			'relate[editorial-items]': 'contents',
			'include[editorial-items]': 'contents',
			'include[albums]': 'artists',
			'extend': 'artistUrl',
			'fields[artists]': 'url,name,artwork,hero',
			'fields[albums]': 'artistName,artistUrl,artwork,contentRating,editorialArtwork,name,playParams,releaseDate,url',
			'with': 'serverBubbles,lyricHighlights',
			'art[url]': 'c,f',
			'omit[resource]': 'autos'
		});

		const results = new AppleMusicResults();
		const song = data.results.song;

		if(!song)
			return results;
		try{
			if(song.next)
				// @ts-ignore
				results.set_continuation(query, this.get_next(song.next, 'offset'));
			for(var result of song.data)
				results.push(new AppleMusicTrack().from(result));
		}catch(e){
			throw new SourceError.INTERNAL_ERROR(null, e);
		}

		return results;
	}

	/**
	 * 
	 * @protected
	 * @param {string} type 
	 * @param {string} id 
	 * @param {number} [offset] 
	 * @param {number} [limit] 
	 * @returns {Promise<AppleMusicPlaylist>}
	 */
	async list_once(type, id, offset = 0, limit = 100){
		this.check_valid_playlist_id(id);

		const result = new AppleMusicPlaylist();
		let playlist;

		if(!offset){
			playlist = await this. api_request(`${type}/${id}`, {
				l: 'en-us',
				platform: 'web',
				views: 'featured-artists,contributors',
				extend: 'artistUrl,trackCount,editorialVideo,editorialArtwork',
				include: 'tracks',
				'include[playlists]': 'curator',
				'include[songs]': 'artists',
				'fields[artists]': 'name,url,artwork',
				'art[url]': 'c,f'
			});

			playlist = playlist.data[0];
		}else{
			playlist = await this.api_request(`${type}/${id}/tracks`, {
				l: 'en-us',
				platform: 'web',
				offset,
				limit,
				'include[songs]': 'artists',
				'fields[artists]': 'name,url',
				// TODO? this is overide
				// @ts-ignore
				'fields[artists]': 'name,url,artwork',
			});
		}

		result.set(type, id);

		try{
			if(!offset){
				result.setMetadata(playlist.attributes.name, playlist.attributes.description?.standard);
				id = playlist.id;
				playlist = playlist.relationships.tracks;
			}

			for(var item of playlist.data)
				result.push(new AppleMusicTrack().from(item));
			if(playlist.next)
				// @ts-ignore
				result.set_continuation(this.get_next(playlist.next, 'offset'));
		}catch(e){
			throw new SourceError.INTERNAL_ERROR(null, e);
		}

		return result;
	}

	/**
	 * 
	 * @protected
	 * @param {string} id 
	 */
	check_valid_playlist_id(id){
		if(!/^[\w\.-]+$/.test(id))
			throw new SourceError.NOT_FOUND();
	}

	/**
	 * 
	 * @protected
	 * @param {string} id 
	 * @param {number} [offset] 
	 * @param {number} [length] 
	 * @returns {Promise<AppleMusicPlaylist>}
	 */
	async playlist_once(id, offset, length){
		return await this.list_once('playlists', id, offset, length);
	}

	/**
	 * 
	 * @protected
	 * @param {string} id 
	 * @param {number} [offset] 
	 * @param {number} [length] 
	 * @returns {Promise<AppleMusicPlaylist>}
	 */
	async album_once(id, offset, length){
		return await this.list_once('albums', id, offset, length);
	}

	/**
	 * 
	 * @param {string} type 
	 * @param {string} id 
	 * @param {number} [limit] 
	 * @returns {Promise<AppleMusicPlaylist>}
	 */
	async list(type, id, limit){
		let list = null;
		let offset = 0;

		do{
			const result = await this.list_once(type, id, offset);

			if(!list)
				list = result;
			else
				list = list.concat(result);
			// @ts-ignore
			offset = result.start;
		}while(offset !== undefined && (!limit || list.length < limit));
		// @ts-ignore
		return list;
	}

	/**
	 * 
	 * @param {string} id 
	 * @param {number} [length] 
	 * @returns {Promise<AppleMusicPlaylist>}
	 */
	async playlist(id, length){
		return this.list('playlists', id, length);
	}


	/**
	 * 
	 * @param {string} id 
	 * @param {number} [length] 
	 * @returns 
	 */
	async album(id, length){
		return this.list('albums', id, length);
	}
});

module.exports = api;
module.exports.Track = AppleMusicTrack;
module.exports.Results = AppleMusicResults;
module.exports.Playlist = AppleMusicPlaylist;