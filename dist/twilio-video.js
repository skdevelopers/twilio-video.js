/*! twilio-video.js 2.0.0-rc35

The following license applies to all parts of this software except as
documented below.

    Copyright (c) 2019, Twilio, inc.
    All rights reserved.

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are
    met:

      1. Redistributions of source code must retain the above copyright
         notice, this list of conditions and the following disclaimer.

      2. Redistributions in binary form must reproduce the above copyright
         notice, this list of conditions and the following disclaimer in
         the documentation and/or other materials provided with the
         distribution.

      3. Neither the name of Twilio nor the names of its contributors may
         be used to endorse or promote products derived from this software
         without specific prior written permission.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
    "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
    LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
    A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
    HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
    SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
    LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
    DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
    OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 */
/* eslint strict:0 */
(function(root) {
  var bundle = (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

var CancelablePromise = require('./util/cancelablepromise');

/**
 * Create a {@link CancelablePromise<Room>}.
 * @param {function(function(Array<LocalTrack>): CancelablePromise<RoomSignaling>):
 *   Promise<function(): CancelablePromise<RoomSignaling>>} getLocalTracks
 * @param {function(Array<LocalTrack>): LocalParticipant} createLocalParticipant
 * @param {function(Array<LocalTrack>): CancelablePromise<RoomSignaling>} createRoomSignaling
 * @param {function(LocalParticipant, RoomSignaling): Room} createRoom
 * @returns CancelablePromise<Room>
 */
function createCancelableRoomPromise(getLocalTracks, createLocalParticipant, createRoomSignaling, createRoom) {
  var cancelableRoomSignalingPromise = void 0;
  var cancelationError = new Error('Canceled');

  return new CancelablePromise(function onCreate(resolve, reject, isCanceled) {
    var localParticipant = void 0;
    getLocalTracks(function getLocalTracksSucceeded(localTracks) {
      if (isCanceled()) {
        return CancelablePromise.reject(cancelationError);
      }
      localParticipant = createLocalParticipant(localTracks);
      return createRoomSignaling(localParticipant).then(function createRoomSignalingSucceeded(getCancelableRoomSignalingPromise) {
        if (isCanceled()) {
          throw cancelationError;
        }
        cancelableRoomSignalingPromise = getCancelableRoomSignalingPromise();
        return cancelableRoomSignalingPromise;
      });
    }).then(function roomSignalingConnected(roomSignaling) {
      if (isCanceled()) {
        roomSignaling.disconnect();
        throw cancelationError;
      }
      resolve(createRoom(localParticipant, roomSignaling));
    }).catch(function onError(error) {
      reject(error);
    });
  }, function onCancel() {
    if (cancelableRoomSignalingPromise) {
      cancelableRoomSignalingPromise.cancel();
    }
  });
}

module.exports = createCancelableRoomPromise;
},{"./util/cancelablepromise":109}],2:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _require = require('@twilio/webrtc/lib/util'),
    guessBrowser = _require.guessBrowser;

var CancelablePromise = require('./util/cancelablepromise');
var createCancelableRoomPromise = require('./cancelableroompromise');
var createLocalTracks = require('./createlocaltracks');
var ConstantIceServerSource = require('./iceserversource/constant');
var constants = require('./util/constants');
var Room = require('./room');

var _require2 = require('./util/constants'),
    subscriptionMode = _require2.subscriptionMode,
    E = _require2.typeErrors;

var EncodingParametersImpl = require('./encodingparameters');
var LocalAudioTrack = require('./media/track/es5/localaudiotrack');
var LocalDataTrack = require('./media/track/es5/localdatatrack');
var LocalParticipant = require('./localparticipant');
var LocalVideoTrack = require('./media/track/es5/localvideotrack');
var Log = require('./util/log');

var _require3 = require('@twilio/webrtc'),
    MediaStreamTrack = _require3.MediaStreamTrack;

var NTSIceServerSource = require('./iceserversource/nts');
var SignalingV2 = require('./signaling/v2');
var NetworkQualityConfigurationImpl = require('./networkqualityconfiguration');

var _require4 = require('./util'),
    asLocalTrack = _require4.asLocalTrack,
    buildLogLevels = _require4.buildLogLevels,
    filterObject = _require4.filterObject,
    isNonArrayObject = _require4.isNonArrayObject;

// This is used to make out which connect() call a particular Log statement
// belongs to. Each call to connect() increments this counter.


var connectCalls = 0;

var didPrintSafariWarning = false;

/**
 * Connect to a {@link Room}.
 *   <br><br>
 *   By default, this will automatically acquire an array containing a
 *   {@link LocalAudioTrack} and {@link LocalVideoTrack} before connecting to
 *   the {@link Room}. These will be stopped when you disconnect from the
 *   {@link Room}.
 *   <br><br>
 *   You can override the default behavior by specifying
 *   <code>options</code>. For example, rather than acquiring a
 *   {@link LocalAudioTrack} and {@link LocalVideoTrack} automatically, you can
 *   pass your own array which you can stop yourself. See {@link ConnectOptions}
 *   for more information.
 * @param {string} token - The Access Token string
 * @param {ConnectOptions} [options] - Options to override the default behavior
 * @returns {CancelablePromise<Room>}
 * @throws {RangeError}
 * @throws {TwilioError}
 * @throws {TypeError}
 * @example
 * var Video = require('twilio-video');
 * var token = getAccessToken();
 * Video.connect(token, {
 *   name: 'my-cool-room'
 * }).then(function(room) {
 *   room.on('participantConnected', function(participant) {
 *     console.log(participant.identity + ' has connected');
 *   });

 *   room.once('disconnected', function() {
 *     console.log('You left the Room:', room.name);
 *   });
 * });
 * @example
 * var Video = require('twilio-video');
 * var token = getAccessToken();
 *
 * // Connect with audio-only
 * Video.connect(token, {
 *   name: 'my-cool-room',
 *   audio: true
 * }).then(function(room) {
 *   room.on('participantConnected', function(participant) {
 *     console.log(participant.identity + ' has connected');
 *   });
 *
 *   room.once('disconnected', function() {
 *     console.log('You left the Room:', room.name);
 *   });
 * });
 * @example
 * var Video = require('twilio-video');
 * var token = getAccessToken();
 *
 * // Connect with media acquired using getUserMedia()
 * navigator.mediaDevices.getUserMedia({
 *   audio: true,
 *   video: true
 * }).then(function(mediaStream) {
 *   return Video.connect(token, {
 *     name: 'my-cool-room',
 *     tracks: mediaStream.getTracks()
 *   });
 * }).then(function(room) {
 *   room.on('participantConnected', function(participant) {
 *     console.log(participant.identity + ' has connected');
 *   });
 *
 *   room.once('disconnected', function() {
 *     console.log('You left the Room:', room.name);
 *   });
 * });
 * @example
 * var Video = require('twilio-video');
 * var token = getAccessToken();
 *
 * // Connect with custom names for LocalAudioTrack and LocalVideoTrack
 * Video.connect(token, {
 *   name: 'my-cool-room'
 *   audio: { name: 'microphone' },
 *   video: { name: 'camera' }
 * }).then(function(room) {
 *   room.localParticipants.trackPublications.forEach(function(publication) {
 *     console.log('The LocalTrack "' + publication.trackName + '" was successfully published');
 *   });
 * });
 */
function connect(token, options) {
  if (typeof options === 'undefined') {
    options = {};
  }
  if (!isNonArrayObject(options)) {
    return CancelablePromise.reject(E.INVALID_TYPE('options', 'object'));
  }

  options = Object.assign({
    abortOnIceServersTimeout: false,
    automaticSubscription: true,
    createLocalTracks: createLocalTracks,
    dominantSpeaker: false,
    environment: constants.DEFAULT_ENVIRONMENT,
    iceServersTimeout: constants.ICE_SERVERS_TIMEOUT_MS,
    insights: true,
    LocalAudioTrack: LocalAudioTrack,
    LocalDataTrack: LocalDataTrack,
    LocalParticipant: LocalParticipant,
    LocalVideoTrack: LocalVideoTrack,
    MediaStreamTrack: MediaStreamTrack,
    logLevel: constants.DEFAULT_LOG_LEVEL,
    maxAudioBitrate: null,
    maxVideoBitrate: null,
    name: null,
    networkQuality: false,
    preferredAudioCodecs: [],
    preferredVideoCodecs: [],
    realm: constants.DEFAULT_REALM,
    region: constants.DEFAULT_REGION,
    // TODO(mmalavalli): Remove once we decide to support Unified Plan on Chrome 72+
    sdpSemantics: constants.DEFAULT_CHROME_SDP_SEMANTICS,
    signaling: SignalingV2
  }, filterObject(options));

  /* eslint new-cap:0 */
  var wsServer = constants.WS_SERVER(options.environment, options.region);

  options = Object.assign({ wsServer: wsServer }, options);

  var logLevels = buildLogLevels(options.logLevel);
  var logComponentName = '[connect #' + ++connectCalls + ']';

  var log = void 0;
  try {
    log = new Log('default', logComponentName, logLevels);
  } catch (error) {
    return CancelablePromise.reject(error);
  }
  options.log = log;

  // NOTE(mroberts): Print the Safari warning once if the log-level is at least
  // "warn", i.e. neither "error" nor "off".
  if (guessBrowser() === 'safari' && !didPrintSafariWarning && log.logLevel !== 'error' && log.logLevel !== 'off') {
    didPrintSafariWarning = true;
    log.warn(['This release of twilio-video.js includes experimental support for', 'Safari 11 and newer. Support for Safari is "experimental" because,', 'at the time of writing, Safari does not support VP8. This means you', 'may experience codec issues in Group Rooms. You may also experience', 'codec issues in Peer-to-Peer (P2P) Rooms containing Android- or', 'iOS-based Participants who do not support H.264. However, P2P Rooms', 'with browser-based Participants should work. Please test this release', 'and report any issues to https://github.com/twilio/twilio-video.js'].join(' '));
  }

  if (typeof token !== 'string') {
    return CancelablePromise.reject(E.INVALID_TYPE('token', 'string'));
  }

  // NOTE(mmalavalli): The Room "name" in "options" was being used
  // as the LocalTrack name in asLocalTrack(). So we pass a copy of
  // "options" without the "name".
  var localTrackOptions = Object.assign({}, options);
  delete localTrackOptions.name;

  if ('tracks' in options) {
    if (!Array.isArray(options.tracks)) {
      return CancelablePromise.reject(E.INVALID_TYPE('options.tracks', 'Array of LocalAudioTrack, LocalVideoTrack or MediaStreamTrack'));
    }
    try {
      options.tracks = options.tracks.map(function (track) {
        return asLocalTrack(track, localTrackOptions);
      });
    } catch (error) {
      return CancelablePromise.reject(error);
    }
  }

  var error = validateBandwidthProfile(options.bandwidthProfile);
  if (error) {
    return CancelablePromise.reject(error);
  }

  var Signaling = options.signaling;
  var signaling = new Signaling(options.wsServer, options);

  log.info('Connecting to a Room');
  log.debug('Options:', options);

  var encodingParameters = new EncodingParametersImpl({
    maxAudioBitrate: options.maxAudioBitrate,
    maxVideoBitrate: options.maxVideoBitrate
  });

  var ntsIceServerSourceOptions = Object.assign({}, options, {
    abortOnTimeout: options.abortOnIceServersTimeout,
    timeout: options.iceServersTimeout
  });

  var iceServerSource = Array.isArray(options.iceServers) ? new ConstantIceServerSource(options.iceServers) : _typeof(options.iceServers) === 'object' ? options.iceServers : new NTSIceServerSource(token, ntsIceServerSourceOptions);

  var preferredCodecs = {
    audio: options.preferredAudioCodecs,
    video: options.preferredVideoCodecs.map(normalizeVideoCodecSettings)
  };

  var networkQualityConfiguration = new NetworkQualityConfigurationImpl(isNonArrayObject(options.networkQuality) ? options.networkQuality : {});

  // Convert options.networkQuality to boolean to configure Media Signaling
  options.networkQuality = isNonArrayObject(options.networkQuality) || options.networkQuality;

  // Create a CancelableRoomPromise<Room> that resolves after these steps:
  // 1 - Get the LocalTracks.
  // 2 - Create the LocalParticipant using options.tracks.
  // 3 - Connect to rtc-room-service and create the RoomSignaling.
  // 4 - Create the Room and then resolve the CancelablePromise.
  var cancelableRoomPromise = createCancelableRoomPromise(getLocalTracks.bind(null, options), createLocalParticipant.bind(null, signaling, log, encodingParameters, networkQualityConfiguration, options), createRoomSignaling.bind(null, token, options, signaling, iceServerSource, encodingParameters, preferredCodecs), createRoom.bind(null, options));

  cancelableRoomPromise.then(function (room) {
    log.info('Connected to Room:', room.toString());
    log.info('Room name:', room.name);
    log.debug('Room:', room);
    return room;
  }, function (error) {
    if (iceServerSource.isStarted) {
      iceServerSource.stop();
    }
    if (cancelableRoomPromise._isCanceled) {
      log.info('Attempt to connect to a Room was canceled');
    } else {
      log.info('Error while connecting to a Room:', error);
    }
  });

  return cancelableRoomPromise;
}

/**
 * You may pass these options to {@link connect} in order to override the
 * default behavior.
 * @typedef {object} ConnectOptions
 * @property {boolean} [abortOnIceServersTimeout=false] - If fetching ICE
 *   servers times out (for example, due to a restrictive network or slow HTTP
 *   proxy), then, by default, twilio-video.js will fallback to using hard-coded
 *   STUN servers and continue connecting to the Room. Setting this property to
 *   <code>true</code> will cause twilio-video.js to abort instead, and
 *   {@link connect} will reject with a {@link ConfigurationAcquireFailedError}.
 * @property {boolean|CreateLocalTrackOptions} [audio=true] - Whether or not to
 *   get local audio with <code>getUserMedia</code> when <code>tracks</code>
 *   are not provided.
 * @property {boolean} [automaticSubscription=true] - By default, you will subscribe
 *   to all RemoteTracks shared by other Participants in a Room. You can now override this
 *   behavior by setting this flag to <code>false</code>. It will make sure that you will
 *   not subscribe to any RemoteTrack in a Group or Small Group Room. Setting it to
 *   <code>true</code>, or not setting it at all preserves the default behavior. This
 *   flag does not have any effect in a Peer-to-Peer Room.
 * @property {BandwidthProfileOptions} [bandwidthProfile] - You can optionally configure
 *   how your available downlink bandwidth is shared among the RemoteTracks you have subscribed
 *   to in a Group Room. By default, bandwidth is shared equally among the RemoteTracks.
 *   This has no effect in Peer-to-Peer Rooms.
 * @property {boolean} [dominantSpeaker=false] - Whether to enable the Dominant
 *   Speaker API or not. This only takes effect in Group Rooms.
 * @property {Array<RTCIceServer>} iceServers - Override the STUN and TURN
 *   servers used when connecting to {@link Room}s
 * @property {number} [iceServersTimeout=3000] - Override the amount of time, in
 *   milliseconds, that the SDK will wait when acquiring STUN and TURN servers
 * @property {RTCIceTransportPolicy} [iceTransportPolicy="all"] - Override the
 *   ICE transport policy to be one of "relay" or "all"
 * @property {boolean} [insights=true] - Whether publishing events
 *   to the Insights gateway is enabled or not
 * @property {?number} [maxAudioBitrate=null] - Max outgoing audio bitrate (bps);
 *   A <code>null</code> value does not set any bitrate limit; This value is set
 *   as a hint for variable bitrate codecs, but will not take effect for fixed
 *   bitrate codecs
 * @property {?number} [maxVideoBitrate=null] - Max outgoing video bitrate (bps);
 *   A <code>null</code> value does not set any bitrate limit; This value is set
 *   as a hint for variable bitrate codecs, but will not take effect for fixed
 *   bitrate codecs
 * @property {?string} [name=null] - Set to connect to a {@link Room} by name
 * @property {boolean|NetworkQualityConfiguration} [networkQuality=false] - Whether to enable the Network
 *   Quality API or not. This only takes effect in Group Rooms. Pass a {@link NetworkQualityConfiguration}
 *   to configure verbosity levels for network quality information for {@link LocalParticipant}
 *   and {@link RemoteParticipant}s. A <code>true</code> value will set the {@link NetworkQualityVerbosity}
 *   for the {@link LocalParticipant} to {@link NetworkQualityVerbosity}<code style="padding:0 0">#minimal</code>
 *   and the {@link NetworkQualityVerbosity} for {@link RemoteParticipant}s to
 *   {@link NetworkQualityVerbosity}<code style="padding:0 0">#none</code>.
 * @property {string} [region='gll'] - Preferred signaling region; By default, you will be connected to the
 *   nearest signaling server determined by latency based routing. Setting a value other
 *   than <code style="padding:0 0">gll</code> bypasses routing and guarantees that signaling traffic will be
 *   terminated in the region that you prefer. Please refer to this <a href="https://www.twilio.com/docs/video/ip-address-whitelisting#signaling-communication" target="_blank">table</a>
 *   for the list of supported signaling regions.
 * @property {Array<AudioCodec>} [preferredAudioCodecs=[]] - Preferred audio codecs;
 *  An empty array preserves the current audio codec preference order.
 * @property {Array<VideoCodec|VideoCodecSettings>} [preferredVideoCodecs=[]] -
 *  Preferred video codecs; An empty array preserves the current video codec
 *  preference order. If you want to set a preferred video codec on a Group Room,
 *  you will need to create the Room using the REST API and set the
 *  <code>VideoCodecs</code> property.
 *  See <a href="https://www.twilio.com/docs/api/video/rooms-resource#create-room">
 *  here</a> for more information.
 * @property {LogLevel|LogLevels} [logLevel='warn'] - Set the log verbosity
 *   of logging to console. Passing a {@link LogLevel} string will use the same
 *   level for all components. Pass a {@link LogLevels} to set specific log
 *   levels.
 * @property {Array<LocalTrack|MediaStreamTrack>} [tracks] - The
 *   {@link LocalTrack}s or MediaStreamTracks with which to join the
 *   {@link Room}. These tracks can be obtained either by calling
 *   {@link createLocalTracks}, or by constructing them from the MediaStream
 *   obtained by calling <code>getUserMedia()</code>.
 * @property {boolean|CreateLocalTrackOptions} [video=true] - Whether or not to
 *   get local video with <code>getUserMedia</code> when <code>tracks</code>
 *   are not provided.
 */

/**
 * {@link BandwidthProfileOptions} allows you to configure how your available downlink
 * bandwidth is shared among the RemoteTracks you have subscribed to in a Group Room.
 * @typedef {object} BandwidthProfileOptions
 * @property {VideoBandwidthProfileOptions} [video] - Optional parameter to configure
 *   how your available downlink bandwidth is shared among the RemoteVideoTracks you
 *   have subscribed to in a Group Room.
 */

/**
 * {@link VideoBandwidthProfileOptions} allows you to configure how your available downlink
 * bandwidth is shared among the RemoteVideoTracks you have subscribed to in a Group Room.
 * @typedef {object} VideoBandwidthProfileOptions
 * @property {number} [maxSubscriptionBitrate] - Optional parameter to specify the maximum
 *   downlink video bandwidth in bits per second (bps). For mobile devices, it defaults to 2400000.
 *   For desktop browsers it defaults to 8000000 in Group Rooms and 4000000 in Small Group Rooms.
 *   0 or a negative value will remove any limit on downlink bandwidth.
 * @property {number} [maxTracks] - Optional parameter to specify the maximum number of visible
 *   RemoteVideoTracks, which will be selected based on {@link Track.Priority} and an N-Loudest
 *   policy. By default there are no limits on the number of visible RemoteVideoTracks.
 *   0 or a negative value will remove any limit on the maximum number of visible RemoteVideoTracks.
 * @property {BandwidthProfileMode} [mode="grid"] - Optional parameter to specify how the RemoteVideoTracks'
 *   TrackPriority values are mapped to bandwidth allocation in Group Rooms. This defaults to "grid",
 *   which results in equal bandwidth share allocation to all RemoteVideoTracks.
 */

/**
 * Configure verbosity levels for network quality information for
 * {@link LocalParticipant} and {@link RemoteParticipant}s.
 * @typedef {object} NetworkQualityConfiguration
 * @property {NetworkQualityVerbosity} [local=1] - Verbosity level for {@link LocalParticipant}
 * @property {NetworkQualityVerbosity} [remote=0] - Verbosity level for {@link RemoteParticipant}s
 */

/**
 * You may pass these levels to {@link ConnectOptions} to override
 * log levels for individual components.
 * @typedef {object} LogLevels
 * @property {LogLevel} [default='warn'] - Log level for 'default' modules.
 * @property {LogLevel} [media='warn'] - Log level for 'media' modules.
 * @property {LogLevel} [signaling='warn'] - Log level for 'signaling' modules.
 * @property {LogLevel} [webrtc='warn'] - Log level for 'webrtc' modules.
 */

/**
 * Video codec settings.
 * @typedef {object} VideoCodecSettings
 * @property {VideoCodec} codec - Video codec name
 */

/**
 * VP8 codec settings.
 * @typedef {VideoCodecSettings} VP8CodecSettings
 * @property {VideoCodec} name - "VP8"
 * @property {boolean} [simulcast=false] - Enable/disable VP8 simulcast; if
 *   enabled, Twilio's Video SDK will send three video streams of different
 *   qualities
 */

/**
 * Names of the supported audio codecs.
 * @enum {string}
 */
// eslint-disable-next-line
var AudioCodec = {
  isac: 'isac',
  opus: 'opus',
  PCMA: 'PCMA',
  PCMU: 'PCMU'
};

/**
 * Names of the supported video codecs.
 * @enum {string}
 */
// eslint-disable-next-line
var VideoCodec = {
  H264: 'H264',
  VP8: 'VP8',
  VP9: 'VP9'
};

/**
 * Levels for logging verbosity.
 * @enum {string}
 */
// eslint-disable-next-line
var LogLevel = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  off: 'off'
};

/**
 * The verbosity level of network quality information of a {@link Participant}.
 * @enum {number}
 */
// eslint-disable-next-line
var NetworkQualityVerbosity = {
  /**
   * Nothing is reported for the {@link Participant}. This has no effect and
   * defaults to {@link NetworkQualityVerbosity}<code style="padding:0 0">#minimal</code>
   * for the {@link LocalParticipant}.
   */
  none: 0,
  /**
   * Reports {@link NetworkQualityLevel} for the {@link Participant}.
   */
  minimal: 1,
  /**
   * Reports {@link NetworkQualityLevel} and {@link NetworkQualityStats} for the {@link Participant}.
   * {@link NetworkQualityStats} is populated with audio and video {@link NetworkQualityLevel}s
   * based on which the {@link Participant}'s {@link NetworkQualityLevel} is calculated.
   */
  moderate: 2,
  /**
   * Reports {@link NetworkQualityLevel} and {@link NetworkQualityStats} for the {@link Participant}.
   * {@link NetworkQualityStats} is populated with audio and Video {@link NetworkQualityLevel}s
   * and their corresponding {@link NetworkQualityMediaStats} based on which the
   * {@link Participant}'s {@link NetworkQualityLevel} is calculated.
   */
  detailed: 3
};

/**
 * {@link BandwidthProfileMode} specifies how RemoteVideoTracks' TrackPriority values
 * are mapped to bandwidth allocation in Group Rooms.
 * @enum {string}
 */
// eslint-disable-next-line
var BandwidthProfileMode = {
  /**
   * This mode is for use cases where all the subscribed RemoteVideoTracks are
   * equally important. The bandwidth allocation algorithm will share the available
   * downlink bandwidth equally among the subscribed RemoteVideoTracks.
   */
  grid: 'grid',
  /**
   * This mode is for use cases where some RemoteVideoTracks are prioritized more than
   * others. However, the lower priority RemoteVideoTracks still need to be visible.
   * In case of low downlink bandwidth, the quality of higher priority RemoteVideoTracks
   * may be degraded to avoid switching off lower priority RemoteVideoTracks.
   */
  collaboration: 'collaboration',
  /**
   * This mode is for use cases where some RemoteVideoTracks are deemed critical and must
   * be preserved at any cost over the other RemoteVideoTracks. The bandwidth allocation
   * algorithm will allocate as big a share of the available downlink bandwidth as it possibly
   * can to the higher priority RemoteVideoTracks, and only then consider the lower priority
   * RemoteVideoTracks. In case of low downlink bandwidth, the lower priority RemoteVideoTracks
   * are switched off in order to preserve the quality of the higher priority RemoteVideoTracks.
   */
  presentation: 'presentation'
};

function createLocalParticipant(signaling, log, encodingParameters, networkQualityConfiguration, options, localTracks) {
  var localParticipantSignaling = signaling.createLocalParticipantSignaling(encodingParameters, networkQualityConfiguration);
  log.debug('Creating a new LocalParticipant:', localParticipantSignaling);
  return new options.LocalParticipant(localParticipantSignaling, localTracks, options);
}

function createRoom(options, localParticipant, roomSignaling) {
  var room = new Room(localParticipant, roomSignaling, options);
  var log = options.log;

  log.debug('Creating a new Room:', room);
  roomSignaling.on('stateChanged', function stateChanged(state) {
    if (state === 'disconnected') {
      log.info('Disconnected from Room:', room.toString());
      roomSignaling.removeListener('stateChanged', stateChanged);
    }
  });

  return room;
}

function createRoomSignaling(token, options, signaling, iceServerSource, encodingParameters, preferredCodecs, localParticipant) {
  var log = options.log;
  log.info('Getting ICE servers');
  log.debug('Options:', options);

  return iceServerSource.start().then(function (iceServers) {
    var roomSignalingParams = {
      token: token
    };

    log.info('Got ICE servers');
    log.debug('ICE servers:', iceServers);

    options.iceServers = iceServers;
    log.debug('Creating a new RoomSignaling');
    log.debug('RoomSignaling params:', roomSignalingParams);

    return signaling.connect(localParticipant._signaling, token, iceServerSource, encodingParameters, preferredCodecs, options);
  });
}

function getLocalTracks(options, handleLocalTracks) {
  var log = options.log;

  options.shouldStopLocalTracks = !options.tracks;
  if (options.shouldStopLocalTracks) {
    log.info('LocalTracks were not provided, so they will be acquired ' + 'automatically before connecting to the Room. LocalTracks will ' + 'be released if connecting to the Room fails or if the Room ' + 'is disconnected');
  } else {
    log.info('Getting LocalTracks');
    log.debug('Options:', options);
  }

  return options.createLocalTracks(options).then(function getLocalTracksSucceeded(localTracks) {
    var promise = handleLocalTracks(localTracks);

    promise.catch(function handleLocalTracksFailed() {
      if (options.shouldStopLocalTracks) {
        log.info('The automatically acquired LocalTracks will now be stopped');
        localTracks.forEach(function (track) {
          track.stop();
        });
      }
    });

    return promise;
  });
}

function normalizeVideoCodecSettings(nameOrSettings) {
  var settings = typeof nameOrSettings === 'string' ? { codec: nameOrSettings } : nameOrSettings;
  switch (settings.codec.toLowerCase()) {
    case 'vp8':
      {
        return Object.assign({ simulcast: false }, settings);
      }
    default:
      {
        return settings;
      }
  }
}

function validateBandwidthProfile(bandwidthProfile) {
  if (typeof bandwidthProfile === 'undefined') {
    return null;
  }
  if (bandwidthProfile === null || !isNonArrayObject(bandwidthProfile)) {
    return E.INVALID_TYPE('options.bandwidthProfile', 'object');
  }
  if (!('video' in bandwidthProfile)) {
    return null;
  }
  var video = bandwidthProfile.video;
  if (video === null || !isNonArrayObject(video)) {
    return E.INVALID_TYPE('options.bandwidthProfile.video', 'object');
  }
  return [['maxSubscriptionBitrate', 'number', E.INVALID_TYPE], ['maxTracks', 'number', E.INVALID_TYPE], ['mode', Object.values(subscriptionMode), E.INVALID_VALUE]].reduce(function (error, _ref) {
    var _ref2 = _slicedToArray(_ref, 3),
        prop = _ref2[0],
        typeOrValues = _ref2[1],
        Error = _ref2[2];

    if (error || !(prop in video)) {
      return error;
    }
    if (Array.isArray(typeOrValues)) {
      return typeOrValues.includes(video[prop]) ? null : Error('options.bandwidthProfile.video.' + prop, typeOrValues);
    }
    return _typeof(video[prop]) === typeOrValues ? null : Error('options.bandwidthProfile.video.' + prop, typeOrValues);
  }, null);
}

module.exports = connect;
},{"./cancelableroompromise":1,"./createlocaltracks":4,"./encodingparameters":10,"./iceserversource/constant":12,"./iceserversource/nts":13,"./localparticipant":15,"./media/track/es5/localaudiotrack":17,"./media/track/es5/localdatatrack":18,"./media/track/es5/localvideotrack":19,"./networkqualityconfiguration":43,"./room":48,"./signaling/v2":62,"./util":112,"./util/cancelablepromise":109,"./util/constants":110,"./util/log":115,"@twilio/webrtc":132,"@twilio/webrtc/lib/util":145}],3:[function(require,module,exports){
'use strict';

var defaultCreateLocalTracks = require('./createlocaltracks');
var DEFAULT_LOG_LEVEL = require('./util/constants').DEFAULT_LOG_LEVEL;

/**
 * Request a {@link LocalAudioTrack} or {@link LocalVideoTrack}.
 * @param {Track.Kind} kind - "audio" or "video"
 * @param {CreateLocalTrackOptions} [options]
 * @returns {Promise<LocalAudioTrack|LocalVideoTrack>}
 * @private
 */
function createLocalTrack(kind, options) {
  options = Object.assign({
    createLocalTracks: defaultCreateLocalTracks,
    logLevel: DEFAULT_LOG_LEVEL
  }, options);

  var createOptions = {};
  createOptions.logLevel = options.logLevel;
  delete options.logLevel;

  var createLocalTracks = options.createLocalTracks;
  delete options.createLocalTracks;
  createOptions[kind] = Object.keys(options).length > 0 ? options : true;

  return createLocalTracks(createOptions).then(function (localTracks) {
    return localTracks[0];
  });
}

/**
 * Request a {@link LocalAudioTrack}.
 * @param {CreateLocalTrackOptions} [options] - Options for requesting a {@link LocalAudioTrack}
 * @returns {Promise<LocalAudioTrack>}
 * @example
 * var Video = require('twilio-video');
 *
 * // Connect to the Room with just video
 * Video.connect('my-token', {
 *   name: 'my-cool-room',
 *   video: true
 * }).then(function(room) {
 *   // Add audio after connecting to the Room
 *   Video.createLocalAudioTrack().then(function(localTrack) {
 *     room.localParticipant.publishTrack(localTrack);
 *   });
 * });
 * @example
 * var Video = require('twilio-video');
 *
 * // Request the default LocalAudioTrack with a custom name
 * Video.createLocalAudioTrack({ name: 'microphone' }).then(function(localTrack) {
 *   console.log(localTrack.name); // 'microphone'
 * });
 */
function createLocalAudioTrack(options) {
  return createLocalTrack('audio', options);
}

/**
 * Request a {@link LocalVideoTrack}.
 * @param {CreateLocalTrackOptions} [options] - Options for requesting a {@link LocalVideoTrack}
 * @returns {Promise<LocalVideoTrack>}
 * @example
 * var Video = require('twilio-video');
 *
 * // Connect to the Room with just audio
 * Video.connect('my-token', {
 *   name: 'my-cool-room',
 *   audio: true
 * }).then(function(room) {
 *   // Add video after connecting to the Room
 *   Video.createLocalVideoTrack().then(function(localTrack) {
 *     room.localParticipant.publishTrack(localTrack);
 *   });
 * });
 * @example
 * var Video = require('twilio-video');
 *
 * // Request the default LocalVideoTrack with a custom name
 * Video.createLocalVideoTrack({ name: 'camera' }).then(function(localTrack) {
 *   console.log(localTrack.name); // 'camera'
 * });
 */
function createLocalVideoTrack(options) {
  return createLocalTrack('video', options);
}

/**
 * Create {@link LocalTrack} options.
 * @typedef {MediaTrackConstraints} CreateLocalTrackOptions
 * @property {LogLevel|LogLevels} logLevel
 * @property {string} [name] - The {@link LocalTrack}'s name; by default,
 *   it is set to the {@link LocalTrack}'s ID.
 * @property {boolean} [workaroundWebKitBug180748=false] - Only valid for
 *   {@link LocalAudioTrack}s; setting this attempts to workaround WebKit Bug
 *   180748, where, in Safari, getUserMedia may return a silent audio
 *   MediaStreamTrack.
 */

module.exports = {
  audio: createLocalAudioTrack,
  video: createLocalVideoTrack
};
},{"./createlocaltracks":4,"./util/constants":110}],4:[function(require,module,exports){
'use strict';

var asLocalTrack = require('./util').asLocalTrack;
var buildLogLevels = require('./util').buildLogLevels;
var getUserMedia = require('@twilio/webrtc').getUserMedia;
var LocalAudioTrack = require('./media/track/es5/localaudiotrack');
var LocalDataTrack = require('./media/track/es5/localdatatrack');
var LocalVideoTrack = require('./media/track/es5/localvideotrack');
var MediaStreamTrack = require('@twilio/webrtc').MediaStreamTrack;
var Log = require('./util/log');
var DEFAULT_LOG_LEVEL = require('./util/constants').DEFAULT_LOG_LEVEL;
var workaround180748 = require('./webaudio/workaround180748');

// This is used to make out which createLocalTracks() call a particular Log
// statement belongs to. Each call to createLocalTracks() increments this
// counter.
var createLocalTrackCalls = 0;

/**
 * Request {@link LocalTrack}s. By default, it requests a
 * {@link LocalAudioTrack} and a {@link LocalVideoTrack}.
 * @param {CreateLocalTracksOptions} [options]
 * @returns {Promise<Array<LocalTrack>>}
 * @example
 * var Video = require('twilio-video');
 * // Request audio and video tracks
 * Video.createLocalTracks().then(function(localTracks) {
 *   var localMediaContainer = document.getElementById('local-media-container-id');
 *   localTracks.forEach(function(track) {
 *     localMediaContainer.appendChild(track.attach());
 *   });
 * });
 * @example
 * var Video = require('twilio-video');
 * // Request just the default audio track
 * Video.createLocalTracks({ audio: true }).then(function(localTracks) {
 *   return Video.connect('my-token', {
 *     name: 'my-cool-room',
 *     tracks: localTracks
 *   });
 * });
 * @example
 * var Video = require('twilio-video');
 * // Request the audio and video tracks with custom names
 * Video.createLocalTracks({
 *   audio: { name: 'microphone' },
 *   video: { name: 'camera' }
 * }).then(function(localTracks) {
 *   localTracks.forEach(function(localTrack) {
 *     console.log(localTrack.name);
 *   });
 * });
 */
function createLocalTracks(options) {
  var isAudioVideoAbsent = !(options && ('audio' in options || 'video' in options));

  options = Object.assign({
    audio: isAudioVideoAbsent,
    getUserMedia: getUserMedia,
    logLevel: DEFAULT_LOG_LEVEL,
    LocalAudioTrack: LocalAudioTrack,
    LocalDataTrack: LocalDataTrack,
    LocalVideoTrack: LocalVideoTrack,
    MediaStreamTrack: MediaStreamTrack,
    Log: Log,
    video: isAudioVideoAbsent
  }, options);

  var logComponentName = '[createLocalTracks #' + ++createLocalTrackCalls + ']';
  var logLevels = buildLogLevels(options.logLevel);
  var log = new options.Log('default', logComponentName, logLevels);

  // NOTE(mmalavalli): The Room "name" in "options" was being used
  // as the LocalTrack name in asLocalTrack(). So we pass a copy of
  // "options" without the "name".
  var localTrackOptions = Object.assign({ log: log }, options);
  delete localTrackOptions.name;

  if (options.audio === false && options.video === false) {
    log.info('Neither audio nor video requested, so returning empty LocalTracks');
    return Promise.resolve([]);
  }

  if (options.tracks) {
    log.info('Adding user-provided LocalTracks');
    log.debug('LocalTracks:', options.tracks);
    return Promise.resolve(options.tracks);
  }

  var localTrackNameOptions = {
    audio: options.audio && options.audio.name ? { name: options.audio.name } : {},
    video: options.video && options.video.name ? { name: options.video.name } : {}
  };

  if (options.audio) {
    delete options.audio.name;
  }
  if (options.video) {
    delete options.video.name;
  }

  var mediaStreamConstraints = {
    audio: options.audio,
    video: options.video
  };

  var workaroundWebKitBug180748 = options.audio && options.audio.workaroundWebKitBug180748;

  var mediaStreamPromise = workaroundWebKitBug180748 ? workaround180748(log, options.getUserMedia, mediaStreamConstraints) : options.getUserMedia(mediaStreamConstraints);

  return mediaStreamPromise.then(function (mediaStream) {
    var mediaStreamTracks = mediaStream.getAudioTracks().concat(mediaStream.getVideoTracks());

    log.info('Call to getUserMedia successful; got MediaStreamTracks:', mediaStreamTracks);

    return mediaStreamTracks.map(function (mediaStreamTrack) {
      return asLocalTrack(mediaStreamTrack, Object.assign(localTrackNameOptions[mediaStreamTrack.kind], localTrackOptions));
    });
  }, function (error) {
    log.warn('Call to getUserMedia failed:', error);
    throw error;
  });
}

/**
 * {@link createLocalTracks} options
 * @typedef {object} CreateLocalTracksOptions
 * @property {boolean|CreateLocalTrackOptions} [audio=true] - Whether or not to
 *   get local audio with <code>getUserMedia</code> when <code>tracks</code>
 *   are not provided.
 * @property {LogLevel|LogLevels} [logLevel='warn'] - Set the log verbosity
 *   of logging to console. Passing a {@link LogLevel} string will use the same
 *   level for all components. Pass a {@link LogLevels} to set specific log
 *   levels.
 * @property {boolean|CreateLocalTrackOptions} [video=true] - Whether or not to
 *   get local video with <code>getUserMedia</code> when <code>tracks</code>
 *   are not provided.
 */

module.exports = createLocalTracks;
},{"./media/track/es5/localaudiotrack":17,"./media/track/es5/localdatatrack":18,"./media/track/es5/localvideotrack":19,"./util":112,"./util/constants":110,"./util/log":115,"./webaudio/workaround180748":129,"@twilio/webrtc":132}],5:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DataTrackTransceiver = require('./transceiver');
var DataTransport = require('./transport');

/**
 * A {@link DataTrackReceiver} represents a {@link DataTrackTransceiver} over
 * which data can be received. Internally, it users a single RTCDataChannel to
 * receive data.
 * @extends DataTrackTransceiver
 * @emits DataTrackReceiver#message
 * @emits DataTrackReceiver#close
 */

var DataTrackReceiver = function (_DataTrackTransceiver) {
  _inherits(DataTrackReceiver, _DataTrackTransceiver);

  /**
   * Construct an {@link DataTrackReceiver}.
   * @param {RTCDataChannel} dataChannel
   */
  function DataTrackReceiver(dataChannel) {
    _classCallCheck(this, DataTrackReceiver);

    var _this = _possibleConstructorReturn(this, (DataTrackReceiver.__proto__ || Object.getPrototypeOf(DataTrackReceiver)).call(this, dataChannel.label, dataChannel.maxPacketLifeTime, dataChannel.maxRetransmits, dataChannel.ordered));

    Object.defineProperties(_this, {
      _dataChannel: {
        value: dataChannel
      }
    });

    // NOTE(mmalavalli): In Firefox, the default value for "binaryType" is "blob".
    // So, we set it to "arraybuffer" to ensure that it is consistent with Chrome
    // and Safari.
    dataChannel.binaryType = 'arraybuffer';

    dataChannel.addEventListener('message', function (event) {
      _this.emit('message', event.data);
    });

    dataChannel.addEventListener('close', function () {
      _this.emit('close');
    });
    return _this;
  }

  _createClass(DataTrackReceiver, [{
    key: 'stop',
    value: function stop() {
      this._dataChannel.close();
      _get(DataTrackReceiver.prototype.__proto__ || Object.getPrototypeOf(DataTrackReceiver.prototype), 'stop', this).call(this);
    }

    /**
     * Create a {@link DataTransport} from the {@link DataTrackReceiver}.
     * @returns {DataTransport}
     */

  }, {
    key: 'toDataTransport',
    value: function toDataTransport() {
      return new DataTransport(this._dataChannel);
    }
  }]);

  return DataTrackReceiver;
}(DataTrackTransceiver);

/**
 * @event DataTrackReceiver#message
 * @param {string|ArrayBuffer} data
 */

/**
 * @event DataTrackReceiver#close
 */

module.exports = DataTrackReceiver;
},{"./transceiver":7,"./transport":8}],6:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DataTrackTransceiver = require('./transceiver');
var makeUUID = require('../util').makeUUID;

/**
 * A {@link DataTrackSender} represents a {@link DataTrackTransceiver} over
 * which data can be sent. Internally, it uses a collection of RTCDataChannels
 * to send data.
 * @extends DataTrackTransceiver
 */

var DataTrackSender = function (_DataTrackTransceiver) {
  _inherits(DataTrackSender, _DataTrackTransceiver);

  /**
   * Construct a {@link DataTrackSender}.
   * @param {?number} maxPacketLifeTime
   * @param {?number} maxRetransmits
   * @param {boolean} ordered
   */
  function DataTrackSender(maxPacketLifeTime, maxRetransmtis, ordered) {
    _classCallCheck(this, DataTrackSender);

    var _this = _possibleConstructorReturn(this, (DataTrackSender.__proto__ || Object.getPrototypeOf(DataTrackSender)).call(this, makeUUID(), maxPacketLifeTime, maxRetransmtis, ordered));

    Object.defineProperties(_this, {
      _clones: {
        value: new Set()
      },
      _dataChannels: {
        value: new Set()
      }
    });
    return _this;
  }

  /**
   * Add a cloned {@link DataTrackSender}.
   * @private
   * @returns {void}
   */


  _createClass(DataTrackSender, [{
    key: '_addClone',
    value: function _addClone(clone) {
      this._clones.add(clone);
    }

    /**
     * Remove a cloned {@link DataTrackSender}.
     * @private
     * @returns {void}
     */

  }, {
    key: '_removeClone',
    value: function _removeClone(clone) {
      this._clones.delete(clone);
    }

    /**
     * Add an RTCDataChannel to the {@link DataTrackSender}.
     * @param {RTCDataChannel} dataChannel
     * @returns {this}
     */

  }, {
    key: 'addDataChannel',
    value: function addDataChannel(dataChannel) {
      this._dataChannels.add(dataChannel);
      return this;
    }

    /**
     * Return a new {@link DataTrackSender}. Any message sent over this
     * {@link DataTrackSender} will also be sent over the clone. Whenever this
     * {@link DataTrackSender} is stopped, so to will the clone.
     * @returns {DataTrackSender}
     */

  }, {
    key: 'clone',
    value: function clone() {
      var _this2 = this;

      var clone = new DataTrackSender(this.maxPacketLifeTime, this.maxRetransmits, this.ordered);
      this._addClone(clone);
      clone.once('stopped', function () {
        return _this2._removeClone(clone);
      });
      return clone;
    }

    /**
     * Remove an RTCDataChannel from the {@link DataTrackSender}.
     * @param {RTCDataChannel} dataChannel
     * @returns {this}
     */

  }, {
    key: 'removeDataChannel',
    value: function removeDataChannel(dataChannel) {
      this._dataChannels.delete(dataChannel);
      return this;
    }

    /**
     * Send data over the {@link DataTrackSender}. Internally, this calls
     * <code>send</code> over each of the underlying RTCDataChannels.
     * @param {string|Blob|ArrayBuffer|ArrayBufferView} data
     * @returns {this}
     */

  }, {
    key: 'send',
    value: function send(data) {
      this._dataChannels.forEach(function (dataChannel) {
        try {
          dataChannel.send(data);
        } catch (error) {
          // Do nothing.
        }
      });
      this._clones.forEach(function (clone) {
        try {
          clone.send(data);
        } catch (error) {
          // Do nothing.
        }
      });
      return this;
    }
  }, {
    key: 'stop',
    value: function stop() {
      this._dataChannels.forEach(function (dataChannel) {
        return dataChannel.close();
      });
      this._clones.forEach(function (clone) {
        return clone.stop();
      });
      _get(DataTrackSender.prototype.__proto__ || Object.getPrototypeOf(DataTrackSender.prototype), 'stop', this).call(this);
    }
  }]);

  return DataTrackSender;
}(DataTrackTransceiver);

module.exports = DataTrackSender;
},{"../util":112,"./transceiver":7}],7:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TrackTransceiver = require('../transceiver');

/**
 * A {@link DataTrackTransceiver} represents either one or more local
 * RTCDataChannels or a single remote RTCDataChannel. It can be used to send or
 * receive data.
 * @extends TrackTransceiver
 * @property {string} id
 * @property {string} kind - "data"
 * @property {?number} maxPacketLifeTime
 * @property {?number} maxRetransmits
 * @property {boolean} ordered
 */

var DataTrackTransceiver = function (_TrackTransceiver) {
  _inherits(DataTrackTransceiver, _TrackTransceiver);

  /**
   * Construct a {@link DataTrackTransceiver}.
   * @param {string} id
   * @param {?number} maxPacketLifeTime
   * @param {?number} maxRetransmits
   * @param {boolean} ordered
   */
  function DataTrackTransceiver(id, maxPacketLifeTime, maxRetransmits, ordered) {
    _classCallCheck(this, DataTrackTransceiver);

    var _this = _possibleConstructorReturn(this, (DataTrackTransceiver.__proto__ || Object.getPrototypeOf(DataTrackTransceiver)).call(this, id, 'data'));

    Object.defineProperties(_this, {
      maxPacketLifeTime: {
        enumerable: true,
        value: maxPacketLifeTime
      },
      maxRetransmits: {
        enumerable: true,
        value: maxRetransmits
      },
      ordered: {
        enumerable: true,
        value: ordered
      }
    });
    return _this;
  }

  return DataTrackTransceiver;
}(TrackTransceiver);

module.exports = DataTrackTransceiver;
},{"../transceiver":106}],8:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('events'),
    EventEmitter = _require.EventEmitter;

/**
 * @classdesc A {@link DataTransport} implements {@link MediaSignalingTransport}
 *   in terms of an RTCDataChannel.
 * @extends EventEmitter
 * @implements MediaSignalingTransport
 * @emits DataTransport#message
 */


var DataTransport = function (_EventEmitter) {
  _inherits(DataTransport, _EventEmitter);

  /**
   * Construct a {@link DataTransport}.
   * @param {RTCDataChannel} dataChannel
   */
  function DataTransport(dataChannel) {
    _classCallCheck(this, DataTransport);

    var _this = _possibleConstructorReturn(this, (DataTransport.__proto__ || Object.getPrototypeOf(DataTransport)).call(this));

    Object.defineProperties(_this, {
      _dataChannel: {
        value: dataChannel
      },
      _messageQueue: {
        value: []
      }
    });

    dataChannel.addEventListener('open', function () {
      _this._messageQueue.splice(0).forEach(function (message) {
        return _this._publish(message);
      });
    });

    dataChannel.addEventListener('message', function (_ref) {
      var data = _ref.data;

      try {
        var message = JSON.parse(data);
        _this.emit('message', message);
      } catch (error) {
        // Do nothing.
      }
    });

    _this.publish({ type: 'ready' });
    return _this;
  }

  /**
   * @param message
   * @private
   */


  _createClass(DataTransport, [{
    key: '_publish',
    value: function _publish(message) {
      var data = JSON.stringify(message);
      try {
        this._dataChannel.send(data);
      } catch (error) {
        // Do nothing.
      }
    }

    /**
     * Publish a message. Returns true if calling the method resulted in
     * publishing (or eventually publishing) the update.
     * @param {object} message
     * @returns {boolean}
     */

  }, {
    key: 'publish',
    value: function publish(message) {
      var dataChannel = this._dataChannel;
      if (dataChannel.readyState === 'closing' || dataChannel.readyState === 'closed') {
        return false;
      }
      if (dataChannel.readyState === 'connecting') {
        this._messageQueue.push(message);
        return true;
      }
      this._publish(message);
      return true;
    }
  }]);

  return DataTransport;
}(EventEmitter);

/**
 * The {@link DataTransport} received a message.
 * @event DataTransport#message
 * @param {object} message
 */

module.exports = DataTransport;
},{"events":149}],9:[function(require,module,exports){
'use strict';

var request = require('./request');
var createTwilioError = require('./util/twilio-video-errors').createTwilioError;
var ConfigurationAcquireFailedError = require('./util/twilio-video-errors').ConfigurationAcquireFailedError;

var CONFIG_URL = 'https://ecs.us1.twilio.com/v1/Configuration';

/**
 * Request a configuration setting for the specified JWT.
 * @param {String} token - A JWT String representing a valid AccessToken.
 * @param {?ECS.getConfigurationOptions} [options]
 * @returns {Promise<Object>} configuration - An unformatted map of
 *   configuration settings specific to the specified service.
 * @throws {TwilioError}
*/ /**
   * @typedef {Object} ECS.getConfigurationOptions
   * @property {?Object} [body] - A valid JSON payload to send to the
   *   ECS endpoint.
   * @property {?String} [configUrl='https://ecs.us1.twilio.com/v1/Configuration'] - A
   *   custom URL to POST ECS configuration requests to.
   */
function getConfiguration(token, options) {
  if (!token) {
    throw new Error('<String>token is a required argument.');
  }

  options = Object.assign({
    configUrl: CONFIG_URL
  }, options);

  var postData = {
    url: options.configUrl,
    headers: {
      'X-Twilio-Token': token,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  if (options.body) {
    postData.body = toQueryString(options.body);
  }

  return request.post(postData).then(function (responseText) {
    return parseJsonTextFromECS(responseText);
  }, function (errorText) {
    var error = parseJsonTextFromECS(errorText);
    throw createTwilioError(error.code, error.message);
  });
}

function parseJsonTextFromECS(jsonText) {
  var json = null;
  try {
    json = JSON.parse(jsonText);
  } catch (error) {
    throw new ConfigurationAcquireFailedError();
  }
  return json;
}

function toQueryString(params) {
  return Object.keys(params || {}).map(function (key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
  }).join('&');
}

module.exports.getConfiguration = getConfiguration;
},{"./request":47,"./util/twilio-video-errors":125}],10:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;

/**
 * {@link EncodingParametersImpl} represents an object which notifies its
 * listeners of any changes in the values of its properties.
 * @extends EventEmitter
 * @implements EncodingParameters
 * @emits EncodingParametersImpl#changed
 * @property {?number} maxAudioBitrate
 * @property {?number} maxVideoBitrate
 */

var EncodingParametersImpl = function (_EventEmitter) {
  _inherits(EncodingParametersImpl, _EventEmitter);

  /**
   * Construct an {@link EncodingParametersImpl}.
   * @param {EncodingParamters} encodingParameters - Initial {@link EncodingParameters}
   */
  function EncodingParametersImpl(encodingParameters) {
    _classCallCheck(this, EncodingParametersImpl);

    var _this = _possibleConstructorReturn(this, (EncodingParametersImpl.__proto__ || Object.getPrototypeOf(EncodingParametersImpl)).call(this));

    encodingParameters = Object.assign({
      maxAudioBitrate: null,
      maxVideoBitrate: null
    }, encodingParameters);

    Object.defineProperties(_this, {
      maxAudioBitrate: {
        value: encodingParameters.maxAudioBitrate,
        writable: true
      },
      maxVideoBitrate: {
        value: encodingParameters.maxVideoBitrate,
        writable: true
      }
    });
    return _this;
  }

  /**
   * Returns the bitrate values in an {@link EncodingParameters}.
   * @returns {EncodingParameters}
   */


  _createClass(EncodingParametersImpl, [{
    key: 'toJSON',
    value: function toJSON() {
      return {
        maxAudioBitrate: this.maxAudioBitrate,
        maxVideoBitrate: this.maxVideoBitrate
      };
    }

    /**
     * Update the bitrate values with those in the given {@link EncodingParameters}.
     * @param {EncodingParameters} encodingParameters - The new {@link EncodingParameters}
     * @fires EncodingParametersImpl#changed
     */

  }, {
    key: 'update',
    value: function update(encodingParameters) {
      var _this2 = this;

      encodingParameters = Object.assign({
        maxAudioBitrate: this.maxAudioBitrate,
        maxVideoBitrate: this.maxVideoBitrate
      }, encodingParameters);

      var shouldEmitChanged = ['maxAudioBitrate', 'maxVideoBitrate'].reduce(function (shouldEmitChanged, maxKindBitrate) {
        if (_this2[maxKindBitrate] !== encodingParameters[maxKindBitrate]) {
          _this2[maxKindBitrate] = encodingParameters[maxKindBitrate];
          shouldEmitChanged = true;
        }
        return shouldEmitChanged;
      }, false);

      if (shouldEmitChanged) {
        this.emit('changed');
      }
    }
  }]);

  return EncodingParametersImpl;
}(EventEmitter);

/**
 * At least one of the {@link EncodingParametersImpl}'s bitrate values changed.
 * @event EncodingParametersImpl#changed
 */

module.exports = EncodingParametersImpl;
},{"events":149}],11:[function(require,module,exports){
'use strict';

var _require = require('events'),
    EventEmitter = _require.EventEmitter;

var _require2 = require('./util'),
    hidePrivateAndCertainPublicPropertiesInClass = _require2.hidePrivateAndCertainPublicPropertiesInClass;

module.exports = hidePrivateAndCertainPublicPropertiesInClass(EventEmitter, ['domain']);
},{"./util":112,"events":149}],12:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;

var instances = 0;

/**
 * A {@link ConstantIceServerSource} only ever returns a single set of ICE
 * servers. It is useful for providing a hard-coded set of ICE servers.
 * @extends EventEmitter
 * @implements {IceServerSource}
 */

var ConstantIceServerSource = function (_EventEmitter) {
  _inherits(ConstantIceServerSource, _EventEmitter);

  /**
   * Construct a {@link ConstantIceServerSource}.
   * @param {Array<RTCIceServerInit>} iceServers
   */
  function ConstantIceServerSource(iceServers) {
    _classCallCheck(this, ConstantIceServerSource);

    var _this = _possibleConstructorReturn(this, (ConstantIceServerSource.__proto__ || Object.getPrototypeOf(ConstantIceServerSource)).call(this));

    Object.defineProperties(_this, {
      _instance: {
        value: ++instances
      },
      _iceServers: {
        enumerable: true,
        value: iceServers,
        writable: true
      },
      _isStarted: {
        value: false,
        writable: true
      },
      isStarted: {
        enumerable: true,
        get: function get() {
          return this._isStarted;
        }
      },
      status: {
        enumerable: true,
        value: 'overrode'
      }
    });
    return _this;
  }

  _createClass(ConstantIceServerSource, [{
    key: 'start',
    value: function start() {
      this._isStarted = true;
      return Promise.resolve(this._iceServers);
    }
  }, {
    key: 'stop',
    value: function stop() {
      this._isStarted = false;
    }
  }, {
    key: 'toString',
    value: function toString() {
      return '[ConstantIceServerSource #' + this._instance + ']';
    }
  }]);

  return ConstantIceServerSource;
}(EventEmitter);

module.exports = ConstantIceServerSource;
},{"events":149}],13:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var constants = require('../util/constants');
var ECS = require('../ecs');
var EventEmitter = require('events').EventEmitter;
var Log = require('../util/log');
var TimeoutPromise = require('../util/timeoutpromise');
var util = require('../util');

var _require = require('../util/twilio-video-errors'),
    ConfigurationAcquireFailedError = _require.ConfigurationAcquireFailedError;

var version = require('../../package.json').version;

var instances = 0;

/**
 * @typedef {ECS.getConfigurationOptions} NTSIceServerSourceOptions
 * @property {Array<RTCIceServerInit>} [defaultIceServers]
 * @property {number} [defaultTTL]
 * @property {string} [ecsServer]
 * @property {string} [environment="prod"]
 * @property {function(string, ECS.getConfigurationOptions): Promise<object>} [getConfiguration]
 * @property {string} [realm="us1"]
 * @property {Log} [log]
 * @property {number} [timeout]
 */

/**
 * A Network Traversal Service (NTS)-backed implementation of
 * {@link IceServerSource}; useful for getting fresh TURN servers from Twilio.
 * @extends EventEmitter
 * @implements {IceServerSource}
 */

var NTSIceServerSource = function (_EventEmitter) {
  _inherits(NTSIceServerSource, _EventEmitter);

  /**
   * Construct an {@link NTSIceServerSource}.
   * @param {string} token - Access Token
   * @param {NTSIceServerSourceOptions} [options]
   */
  function NTSIceServerSource(token, options) {
    _classCallCheck(this, NTSIceServerSource);

    var _this = _possibleConstructorReturn(this, (NTSIceServerSource.__proto__ || Object.getPrototypeOf(NTSIceServerSource)).call(this));

    options = Object.assign({
      abortOnTimeout: false,
      defaultTTL: constants.ICE_SERVERS_DEFAULT_TTL,
      environment: constants.DEFAULT_ENVIRONMENT,
      getConfiguration: ECS.getConfiguration,
      realm: constants.DEFAULT_REALM,
      timeout: constants.ICE_SERVERS_TIMEOUT_MS
    }, options);

    /* eslint-disable new-cap */
    var defaultIceServers = constants.DEFAULT_ICE_SERVERS(options.environment);
    var ecsServer = options.ecsServer || constants.ECS_SERVER(options.environment, options.realm);
    /* eslint-enable new-cap */

    var log = options.log ? options.log.createLog('default', _this) : new Log('default', _this, util.buildLogLevels('off'));

    Object.defineProperties(_this, {
      _abortOnTimeout: {
        value: options.abortOnTimeout
      },
      // This Promise represents the current invocation of `poll`. `start` sets it
      // and `stop` clears it out.
      _currentPoll: {
        value: null,
        writable: true
      },
      // In the event that ECS or NTS fail to return ICE servers in a timely
      // manner, NTSIceServerSource falls back to these servers.
      _defaultIceServers: {
        value: defaultIceServers
      },
      _defaultTTL: {
        value: options.defaultTTL
      },
      // This is the ECS server NTSIceServerSource communicates with.
      _ecsServer: {
        value: ecsServer
      },
      _getConfiguration: {
        value: options.getConfiguration
      },
      _instance: {
        value: ++instances
      },
      // This timer ID represents the next invocation of `poll`.
      _nextPoll: {
        value: null,
        writable: true
      },
      _log: {
        value: log
      },
      _status: {
        value: null,
        writable: true
      },
      // This Deferred remains unresolved until `stop` is called. We use it to
      // short-circuit in `poll`.
      _stopped: {
        value: util.defer(),
        writable: true
      },
      // This value configures the amount of time NTSIceServerSource will wait
      // when fetching ICE servers.
      _timeout: {
        value: options.timeout
      },
      // This is the Access Token NTSIceServerSource makes requests to ECS with.
      _token: {
        value: token
      }
    });

    _this._log.info('Created a new NTSIceServerSource');
    _this._log.debug('ECS server:', _this._ecsServer);
    return _this;
  }

  _createClass(NTSIceServerSource, [{
    key: 'start',
    value: function start() {
      if (!this.isStarted) {
        this._log.info('Starting');
        this._currentPoll = poll(this);
      } else {
        this._log.warn('Already started');
      }
      return this._currentPoll;
    }
  }, {
    key: 'stop',
    value: function stop() {
      if (!this.isStarted) {
        this._log.warn('Already stopped');
        return;
      }
      this._log.info('Stopping');
      this._currentPoll = null;
      clearTimeout(this._nextPoll);
      this._stopped.resolve();
      this._stopped = util.defer();
      this._log.debug('Stopped');
    }
  }, {
    key: 'toString',
    value: function toString() {
      return '[NTSIceServerSource #' + this._instance + ']';
    }
  }, {
    key: 'isStarted',
    get: function get() {
      return !!this._currentPoll;
    }
  }, {
    key: 'status',
    get: function get() {
      return this._status;
    }
  }]);

  return NTSIceServerSource;
}(EventEmitter);

/**
 * Parse an ECS configuration value, log any warnings, and return a tuple of
 * ICE servers and TTL.
 * @param {NTSIceServerSource} client
 * @param {object} config
 * @returns {Array<Array<RTCIceServerInit>|Number>} iceServersAndTTL
 * @throws {Error}
 */


function parseECSConfig(client, config) {
  var nts = util.getOrNull(config, 'video.network_traversal_service');
  if (!nts) {
    throw new Error('network_traversal_service not available');
  } else if (nts.warning) {
    client._log.warn(nts.warning);
  }

  var iceServers = nts.ice_servers;
  if (!iceServers) {
    throw new Error('ice_servers not available');
  }
  client._log.info('Got ICE servers: ' + JSON.stringify(iceServers));

  var ttl = nts.ttl || client._defaultTTL;
  return [iceServers, ttl];
}

/**
 * Get ICE servers and their TTL.
 * @private
 * @param {NTSIceServerSource} nts
 * @returns {Promise<Array<RTCIceServerInit>>} iceServers
 */
function poll(client) {
  // We race `getConfiguration` against the `_stopped` Promise so that, when
  // `stop` is called on the NTSIceServerSource, we can immediately proceed
  // without waiting on `getConfiguration`.
  client._log.debug('Getting ECS configuration');

  var options = {
    configUrl: client._ecsServer + '/v2/Configuration',
    body: {
      service: 'video',
      /* eslint-disable camelcase */
      sdk_version: version
      /* eslint-enable camelcase */
    }
  };

  var alreadyStopped = new Error('Already stopped');
  var config = client._getConfiguration(client._token, options);
  var configWithTimeout = new TimeoutPromise(config, client._timeout);

  return Promise.race([configWithTimeout, client._stopped.promise]).then(function (config) {
    if (!config) {
      throw alreadyStopped;
    }
    var iceServersAndTTL = parseECSConfig(client, config);
    client._status = 'success';
    return iceServersAndTTL;
  }).catch(function (error) {
    client._status = 'failure';
    if (!client.isStarted) {
      throw alreadyStopped;
    } else if (configWithTimeout.isTimedOut) {
      if (client._abortOnTimeout) {
        client._log.warn('Getting ICE servers took too long');
        throw new ConfigurationAcquireFailedError();
      }
      client._log.warn('Getting ICE servers took too long (using defaults)');
    } else {
      // NOTE(mroberts): Stop if we get an Access Token error (2xxxx)
      if (error.code && Math.floor(error.code / 10000) === 2) {
        client.stop();
      }
      client._log.warn('Failed to get ICE servers (using defaults):', error);
    }
    return [client._defaultIceServers, client._defaultTTL];
  }).then(function (iceServersAndTTL) {
    var iceServers = iceServersAndTTL[0];
    var ttl = iceServersAndTTL[1];

    if (client.isStarted) {
      client._log.info('Getting ICE servers again in ' + ttl + ' seconds');
      client._nextPoll = setTimeout(function nextPoll() {
        if (client.isStarted) {
          client._currentPoll = poll(client);
        }
      }, (ttl - constants.ECS_TIMEOUT) * 1000);
    }

    client._iceServers = iceServers;
    try {
      client.emit('iceServers', iceServers);
    } catch (error) {
      // Do nothing.
    }
    return iceServers;
  });
}

module.exports = NTSIceServerSource;
},{"../../package.json":154,"../ecs":9,"../util":112,"../util/constants":110,"../util/log":115,"../util/timeoutpromise":124,"../util/twilio-video-errors":125,"events":149}],14:[function(require,module,exports){
'use strict';

var version = require('../package.json').version;
var Video = {};

Object.defineProperties(Video, {
  connect: {
    enumerable: true,
    value: require('./connect')
  },
  createLocalAudioTrack: {
    enumerable: true,
    value: require('./createlocaltrack').audio
  },
  createLocalTracks: {
    enumerable: true,
    value: require('./createlocaltracks')
  },
  createLocalVideoTrack: {
    enumerable: true,
    value: require('./createlocaltrack').video
  },
  isSupported: {
    enumerable: true,
    value: require('./util/support')()
  },
  LocalAudioTrack: {
    enumerable: true,
    value: require('./media/track/es5/localaudiotrack')
  },
  LocalDataTrack: {
    enumerable: true,
    value: require('./media/track/es5/localdatatrack')
  },
  LocalVideoTrack: {
    enumerable: true,
    value: require('./media/track/es5/localvideotrack')
  },
  version: {
    enumerable: true,
    value: version
  }
});

module.exports = Video;
},{"../package.json":154,"./connect":2,"./createlocaltrack":3,"./createlocaltracks":4,"./media/track/es5/localaudiotrack":17,"./media/track/es5/localdatatrack":18,"./media/track/es5/localvideotrack":19,"./util/support":122}],15:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('@twilio/webrtc'),
    MediaStreamTrack = _require.MediaStreamTrack;

var util = require('./util');

var _require2 = require('./util/constants'),
    E = _require2.typeErrors,
    trackPriority = _require2.trackPriority;

var LocalAudioTrack = require('./media/track/es5/localaudiotrack');
var LocalDataTrack = require('./media/track/es5/localdatatrack');
var LocalVideoTrack = require('./media/track/es5/localvideotrack');
var Participant = require('./participant');
var LocalAudioTrackPublication = require('./media/track/localaudiotrackpublication');
var LocalDataTrackPublication = require('./media/track/localdatatrackpublication');
var LocalVideoTrackPublication = require('./media/track/localvideotrackpublication');

/**
 * A {@link LocalParticipant} represents the local {@link Participant} in a
 * {@link Room}.
 * @extends Participant
 * @property {Map<Track.SID, LocalAudioTrackPublication>} audioTracks -
 *    The {@link LocalParticipant}'s {@link LocalAudioTrackPublication}s
 * @property {Map<Track.SID, LocalDataTrackPublication>} dataTracks -
 *    The {@link LocalParticipant}'s {@link LocalDataTrackPublication}s
 * @property {Map<Track.SID, LocalTrackPublication>} tracks -
 *    The {@link LocalParticipant}'s {@link LocalTrackPublication}s
 * @property {Map<Track.SID, LocalVideoTrackPublication>} videoTracks -
 *    The {@link LocalParticipant}'s {@link LocalVideoTrackPublication}s
 * @emits LocalParticipant#trackDimensionsChanged
 * @emits LocalParticipant#trackDisabled
 * @emits LocalParticipant#trackEnabled
 * @emits LocalParticipant#trackPublicationFailed
 * @emits LocalParticipant#trackPublished
 * @emits LocalParticipant#trackStarted
 * @emits LocalParticipant#trackStopped
 */

var LocalParticipant = function (_Participant) {
  _inherits(LocalParticipant, _Participant);

  /**
   * Construct a {@link LocalParticipant}.
   * @param {ParticipantSignaling} signaling
   * @param {Array<LocalTrack>} localTracks
   * @param {Object} options
   */
  function LocalParticipant(signaling, localTracks, options) {
    _classCallCheck(this, LocalParticipant);

    options = Object.assign({
      LocalAudioTrack: LocalAudioTrack,
      LocalVideoTrack: LocalVideoTrack,
      LocalDataTrack: LocalDataTrack,
      MediaStreamTrack: MediaStreamTrack,
      LocalAudioTrackPublication: LocalAudioTrackPublication,
      LocalVideoTrackPublication: LocalVideoTrackPublication,
      LocalDataTrackPublication: LocalDataTrackPublication,
      shouldStopLocalTracks: false,
      tracks: localTracks
    }, options);

    var tracksToStop = options.shouldStopLocalTracks ? new Set(localTracks.filter(function (localTrack) {
      return localTrack.kind !== 'data';
    })) : new Set();

    var _this = _possibleConstructorReturn(this, (LocalParticipant.__proto__ || Object.getPrototypeOf(LocalParticipant)).call(this, signaling, options));

    Object.defineProperties(_this, {
      _LocalAudioTrack: {
        value: options.LocalAudioTrack
      },
      _LocalDataTrack: {
        value: options.LocalDataTrack
      },
      _LocalVideoTrack: {
        value: options.LocalVideoTrack
      },
      _MediaStreamTrack: {
        value: options.MediaStreamTrack
      },
      _LocalAudioTrackPublication: {
        value: options.LocalAudioTrackPublication
      },
      _LocalDataTrackPublication: {
        value: options.LocalDataTrackPublication
      },
      _LocalVideoTrackPublication: {
        value: options.LocalVideoTrackPublication
      },
      _tracksToStop: {
        value: tracksToStop
      }
    });

    _this._handleTrackSignalingEvents();
    return _this;
  }

  /**
   * @private
   * @param {LocalTrack} track
   * @param {Track.ID} id
   * @param {Track.Priority} priority
   * @returns {?LocalTrack}
   */


  _createClass(LocalParticipant, [{
    key: '_addTrack',
    value: function _addTrack(track, id, priority) {
      var addedTrack = _get(LocalParticipant.prototype.__proto__ || Object.getPrototypeOf(LocalParticipant.prototype), '_addTrack', this).call(this, track, id);
      if (addedTrack && this.state !== 'disconnected') {
        this._addLocalTrack(track, priority);
      }
      return addedTrack;
    }

    /**
     * @private
     * @param {LocalTrack} track
     * @param {Track.Priority} priority
     * @returns {void}
     */

  }, {
    key: '_addLocalTrack',
    value: function _addLocalTrack(track, priority) {
      this._signaling.addTrack(track._trackSender, track.name, priority);
      this._log.info('Added a new ' + util.trackClass(track, true) + ':', track.id);
      this._log.debug(util.trackClass(track, true) + ':', track);
    }

    /**
     * @private
     * @param {LocalTrack} track
     * @param {Track.ID} id
     * @returns {?LocalTrack}
     */

  }, {
    key: '_removeTrack',
    value: function _removeTrack(track, id) {
      var removedTrack = _get(LocalParticipant.prototype.__proto__ || Object.getPrototypeOf(LocalParticipant.prototype), '_removeTrack', this).call(this, track, id);
      if (removedTrack && this.state !== 'disconnected') {
        this._signaling.removeTrack(track._trackSender);
        this._log.info('Removed a ' + util.trackClass(track, true) + ':', track.id);
        this._log.debug(util.trackClass(track, true) + ':', track);
      }
      return removedTrack;
    }

    /**
     * Get the {@link LocalTrack} events to re-emit.
     * @private
     * @returns {Array<Array<string>>} events
     */

  }, {
    key: '_getTrackEvents',
    value: function _getTrackEvents() {
      return _get(LocalParticipant.prototype.__proto__ || Object.getPrototypeOf(LocalParticipant.prototype), '_getTrackEvents', this).call(this).concat([['disabled', 'trackDisabled'], ['enabled', 'trackEnabled'], ['stopped', 'trackStopped']]);
    }
  }, {
    key: 'toString',
    value: function toString() {
      return '[LocalParticipant #' + this._instanceId + (this.sid ? ': ' + this.sid : '') + ']';
    }

    /**
     * @private
     */

  }, {
    key: '_handleTrackSignalingEvents',
    value: function _handleTrackSignalingEvents() {
      var _this2 = this;

      var log = this._log;

      if (this.state === 'disconnected') {
        return;
      }

      var signaling = this._signaling;

      function localTrackDisabled(localTrack) {
        var trackSignaling = signaling.getPublication(localTrack._trackSender);
        if (trackSignaling) {
          trackSignaling.disable();
          log.debug('Disabled the ' + util.trackClass(localTrack, true) + ':', localTrack.id);
        }
      }

      function localTrackEnabled(localTrack) {
        var trackSignaling = signaling.getPublication(localTrack._trackSender);
        if (trackSignaling) {
          trackSignaling.enable();
          log.debug('Enabled the ' + util.trackClass(localTrack, true) + ':', localTrack.id);
        }
      }

      function localTrackStopped(localTrack) {
        // NOTE(mroberts): We shouldn't need to check for `stop`, since DataTracks
        // do not emit "stopped".
        var trackSignaling = signaling.getPublication(localTrack._trackSender);
        if (trackSignaling) {
          trackSignaling.stop();
        }
      }

      this.on('trackDisabled', localTrackDisabled);
      this.on('trackEnabled', localTrackEnabled);
      this.on('trackStopped', localTrackStopped);

      this._tracks.forEach(function (track) {
        _this2._addLocalTrack(track, trackPriority.PRIORITY_STANDARD);
        _this2._getOrCreateLocalTrackPublication(track).catch(function (error) {
          // Just log a warning for now.
          log.warn('Failed to get or create LocalTrackPublication for ' + track + ':', error);
        });
      });

      var self = this;
      signaling.on('stateChanged', function stateChanged(state) {
        log.debug('Transitioned to state:', state);
        if (state === 'disconnected') {
          log.debug('Removing LocalTrack event listeners');
          signaling.removeListener('stateChanged', stateChanged);
          self.removeListener('trackDisabled', localTrackDisabled);
          self.removeListener('trackEnabled', localTrackEnabled);
          self.removeListener('trackStopped', localTrackStopped);
          self._tracks.forEach(localTrackStopped);

          log.info('LocalParticipant disconnected. Stopping ' + self._tracksToStop.size + ' automatically-acquired LocalTracks');
          self._tracksToStop.forEach(function (track) {
            track.stop();
          });
        }
      });
    }

    /**
     * @private
     * @param {LocalTrack} localTrack
     * @returns {Promise<LocalTrackPublication>}
     */

  }, {
    key: '_getOrCreateLocalTrackPublication',
    value: function _getOrCreateLocalTrackPublication(localTrack) {
      var localTrackPublication = getTrackPublication(this.tracks, localTrack);
      if (localTrackPublication) {
        return Promise.resolve(localTrackPublication);
      }

      var log = this._log;
      var self = this;

      var trackSignaling = this._signaling.getPublication(localTrack._trackSender);
      if (!trackSignaling) {
        return Promise.reject(new Error('Unexpected error: The ' + localTrack + ' cannot be published'));
      }

      function unpublish(publication) {
        self.unpublishTrack(publication.track);
      }

      return new Promise(function (resolve, reject) {
        function updated() {
          var error = trackSignaling.error;
          if (error) {
            trackSignaling.removeListener('updated', updated);
            log.warn('Failed to publish the ' + util.trackClass(localTrack, true) + ': ' + error.message);
            self._removeTrack(localTrack, localTrack.id);
            setTimeout(function () {
              self.emit('trackPublicationFailed', error, localTrack);
            });
            reject(error);
            return;
          }

          if (!self._tracks.has(localTrack.id)) {
            trackSignaling.removeListener('updated', updated);
            reject(new Error('The ' + localTrack + ' was unpublished'));
            return;
          }

          var sid = trackSignaling.sid;
          if (!sid) {
            return;
          }

          trackSignaling.removeListener('updated', updated);

          var options = {
            log: log,
            LocalAudioTrackPublication: self._LocalAudioTrackPublication,
            LocalDataTrackPublication: self._LocalDataTrackPublication,
            LocalVideoTrackPublication: self._LocalVideoTrackPublication
          };

          localTrackPublication = getTrackPublication(self.tracks, localTrack);

          if (!localTrackPublication) {
            localTrackPublication = util.asLocalTrackPublication(localTrack, trackSignaling, unpublish, options);
            self._addTrackPublication(localTrackPublication);
          }

          if (self._signaling.state === 'connected') {
            setTimeout(function () {
              self.emit('trackPublished', localTrackPublication);
            });
          }
          resolve(localTrackPublication);
        }

        trackSignaling.on('updated', updated);
      });
    }

    /**
     * Publishes a {@link LocalTrack} to the {@link Room}.
     * @param {LocalTrack} localTrack - The {@link LocalTrack} to publish
     * @param {LocalTrackPublishOptions} [options] - The {@link LocalTrackPublishOptions}
     *   for publishing the {@link LocalTrack}
     * @returns {Promise<LocalTrackPublication>} - Resolves with the corresponding
     *   {@link LocalTrackPublication} if successful
     * @throws {TypeError}
     * @throws {RangeError}
     * @example
     * var Video = require('twilio-video');
     *
     * Video.connect(token, {
     *   name: 'my-cool-room',
     *   audio: true
     * }).then(function(room) {
     *   return Video.createLocalVideoTrack({
     *     name: 'camera'
     *   }).then(function(localVideoTrack) {
     *     return room.localParticipant.publishTrack(localVideoTrack, {
     *       priority: 'high'
     *     });
     *   });
     * }).then(function(publication) {
     *   console.log('The LocalTrack "' + publication.trackName
     *     + '" was successfully published with priority "'
     *     * publication.priority + '"');
     * });
    */ /**
       * Publishes a MediaStreamTrack to the {@link Room}.
       * @param {MediaStreamTrack} mediaStreamTrack - The MediaStreamTrack
       *   to publish; if a corresponding {@link LocalAudioTrack} or
       *   {@link LocalVideoTrack} has not yet been published, this method will
       *   construct one
       * @param {MediaStreamTrackPublishOptions} [options] - The options for publishing
       *   the MediaStreamTrack
       * @returns {Promise<LocalTrackPublication>} - Resolves with the corresponding
       *   {@link LocalTrackPublication} if successful
       * @throws {TypeError}
       * @throws {RangeError}
       * @example
       * var Video = require('twilio-video');
       *
       * Video.connect(token, {
       *   name: 'my-cool-room',
       *   audio: true
       * }).then(function(room) {
       *   return navigator.mediaDevices.getUserMedia({
       *     video: true
       *   }).then(function(mediaStream) {
       *     var mediaStreamTrack = mediaStream.getTracks()[0];
       *     return room.localParticipant.publishTrack(mediaStreamTrack, {
       *       name: 'camera',
       *       priority: 'high'
       *     });
       *   });
       * }).then(function(publication) {
       *   console.log('The LocalTrack "' + publication.trackName
       *     + '" was successfully published with priority "'
       *     * publication.priority + '"');
       * });
       */

  }, {
    key: 'publishTrack',
    value: function publishTrack(localTrackOrMediaStreamTrack, options) {
      var trackPublication = getTrackPublication(this.tracks, localTrackOrMediaStreamTrack);
      if (trackPublication) {
        return Promise.resolve(trackPublication);
      }

      options = Object.assign({
        log: this._log,
        priority: trackPriority.PRIORITY_STANDARD,
        LocalAudioTrack: this._LocalAudioTrack,
        LocalDataTrack: this._LocalDataTrack,
        LocalVideoTrack: this._LocalVideoTrack,
        MediaStreamTrack: this._MediaStreamTrack
      }, options);

      var localTrack = void 0;
      try {
        localTrack = util.asLocalTrack(localTrackOrMediaStreamTrack, options);
      } catch (error) {
        return Promise.reject(error);
      }

      var priorityValues = Object.values(trackPriority);
      if (!priorityValues.includes(options.priority)) {
        // eslint-disable-next-line new-cap
        return Promise.reject(E.INVALID_VALUE('LocalTrackPublishOptions.priority', priorityValues));
      }

      var addedLocalTrack = this._addTrack(localTrack, localTrack.id, options.priority) || this._tracks.get(localTrack.id);

      return this._getOrCreateLocalTrackPublication(addedLocalTrack);
    }

    /**
     * Publishes multiple {@link LocalTrack}s to the {@link Room}.
     * @param {Array<LocalTrack|MediaStreamTrack>} tracks - The {@link LocalTrack}s
     *   to publish; for any MediaStreamTracks provided, if a corresponding
     *   {@link LocalAudioTrack} or {@link LocalVideoTrack} has not yet been
     *   published, this method will construct one
     * @returns {Promise<Array<LocalTrackPublication>>} - The resulting
     *   {@link LocalTrackPublication}s
     * @throws {TypeError}
     */

  }, {
    key: 'publishTracks',
    value: function publishTracks(tracks) {
      if (!Array.isArray(tracks)) {
        // eslint-disable-next-line new-cap
        throw E.INVALID_TYPE('tracks', 'Array of LocalAudioTrack, LocalVideoTrack, LocalDataTrack, or MediaStreamTrack');
      }
      return Promise.all(tracks.map(this.publishTrack, this));
    }

    /**
     * Sets the {@link NetworkQualityVerbosity} for the {@link LocalParticipant} and
     * {@link RemoteParticipant}s. It does nothing if Network Quality is not enabled
     * while calling {@link connect}.
     * @param {NetworkQualityConfiguration} networkQualityConfiguration - The new
     *   {@link NetworkQualityConfiguration}; If either or both of the local and
     *   remote {@link NetworkQualityVerbosity} values are absent, then the corresponding
     *   existing values are retained
     * @returns {this}
     * @example
     * // Update verbosity levels for both LocalParticipant and RemoteParticipants
     * localParticipant.setNetworkQualityConfiguration({
     *   local: 1,
     *   remote: 2
     * });
     * @example
     * // Update verbosity level for only the LocalParticipant
     * localParticipant.setNetworkQualityConfiguration({
     *   local: 1
     * });
     *  @example
     * // Update verbosity level for only the RemoteParticipants
     * localParticipant.setNetworkQualityConfiguration({
     *   remote: 2
     * });
     */

  }, {
    key: 'setNetworkQualityConfiguration',
    value: function setNetworkQualityConfiguration(networkQualityConfiguration) {
      if ((typeof networkQualityConfiguration === 'undefined' ? 'undefined' : _typeof(networkQualityConfiguration)) !== 'object' || networkQualityConfiguration === null) {
        // eslint-disable-next-line new-cap
        throw E.INVALID_TYPE('networkQualityConfiguration', 'NetworkQualityConfiguration');
      }
      ['local', 'remote'].forEach(function (prop) {
        if (prop in networkQualityConfiguration && typeof networkQualityConfiguration[prop] !== 'number') {
          // eslint-disable-next-line new-cap
          throw E.INVALID_TYPE('networkQualityConfiguration.' + prop, 'number');
        }
      });
      this._signaling.setNetworkQualityConfiguration(networkQualityConfiguration);
      return this;
    }

    /**
     * Set the {@link LocalParticipant}'s {@link EncodingParameters}.
     * @param {?EncodingParameters} [encodingParameters] - The new
     *   {@link EncodingParameters}; If null, then the bitrate limits are removed;
     *   If not specified, then the existing bitrate limits are preserved
     * @returns {this}
     * @throws {TypeError}
     */

  }, {
    key: 'setParameters',
    value: function setParameters(encodingParameters) {
      if (typeof encodingParameters !== 'undefined' && (typeof encodingParameters === 'undefined' ? 'undefined' : _typeof(encodingParameters)) !== 'object') {
        // eslint-disable-next-line new-cap
        throw E.INVALID_TYPE('encodingParameters', 'EncodingParameters, null or undefined');
      }

      if (encodingParameters) {
        ['maxAudioBitrate', 'maxVideoBitrate'].forEach(function (prop) {
          if (typeof encodingParameters[prop] !== 'undefined' && typeof encodingParameters[prop] !== 'number' && encodingParameters[prop] !== null) {
            // eslint-disable-next-line new-cap
            throw E.INVALID_TYPE('encodingParameters.' + prop, 'number, null or undefined');
          }
        });
      } else if (encodingParameters === null) {
        encodingParameters = { maxAudioBitrate: null, maxVideoBitrate: null };
      }

      this._signaling.setParameters(encodingParameters);
      return this;
    }

    /**
     * Stops publishing a {@link LocalTrack} to the {@link Room}.
     * @param {LocalTrack|MediaStreamTrack} track - The {@link LocalTrack}
     *   to stop publishing; if a MediaStreamTrack is provided, this method
     *   looks up the corresponding {@link LocalAudioTrack} or
     *   {@link LocalVideoTrack} to stop publishing
     * @returns {?LocalTrackPublication} - The corresponding
     *   {@link LocalTrackPublication} if the {@link LocalTrack} was previously
     *   published, null otherwise
     * @throws {TypeError}
    */

  }, {
    key: 'unpublishTrack',
    value: function unpublishTrack(track) {
      util.validateLocalTrack(track, {
        LocalAudioTrack: this._LocalAudioTrack,
        LocalDataTrack: this._LocalDataTrack,
        LocalVideoTrack: this._LocalVideoTrack,
        MediaStreamTrack: this._MediaStreamTrack
      });

      var localTrack = this._tracks.get(track.id);
      if (!localTrack) {
        return null;
      }

      var trackSignaling = this._signaling.getPublication(localTrack._trackSender);
      trackSignaling.publishFailed(new Error('The ' + localTrack + ' was unpublished'));

      localTrack = this._removeTrack(localTrack, localTrack.id);
      if (!localTrack) {
        return null;
      }

      var localTrackPublication = getTrackPublication(this.tracks, localTrack);
      if (localTrackPublication) {
        this._removeTrackPublication(localTrackPublication);
      }
      return localTrackPublication;
    }

    /**
     * Stops publishing multiple {@link LocalTrack}s to the {@link Room}.
     * @param {Array<LocalTrack|MediaStreamTrack>} tracks - The {@link LocalTrack}s
     *   to stop publishing; for any MediaStreamTracks provided, this method looks
     *   up the corresponding {@link LocalAudioTrack} or {@link LocalVideoTrack} to
     *   stop publishing
     * @returns {Array<LocalTrackPublication>} - The corresponding
     *   {@link LocalTrackPublication}s that were successfully unpublished
     * @throws {TypeError}
     */

  }, {
    key: 'unpublishTracks',
    value: function unpublishTracks(tracks) {
      var _this3 = this;

      if (!Array.isArray(tracks)) {
        // eslint-disable-next-line new-cap
        throw E.INVALID_TYPE('tracks', 'Array of LocalAudioTrack, LocalVideoTrack, LocalDataTrack, or MediaStreamTrack');
      }

      return tracks.reduce(function (unpublishedTracks, track) {
        var unpublishedTrack = _this3.unpublishTrack(track);
        return unpublishedTrack ? unpublishedTracks.concat(unpublishedTrack) : unpublishedTracks;
      }, []);
    }
  }]);

  return LocalParticipant;
}(Participant);

/**
 * One of the {@link LocalParticipant}'s {@link LocalVideoTrack}'s dimensions changed.
 * @param {LocalVideoTrack} track - The {@link LocalVideoTrack} whose dimensions changed
 * @event LocalParticipant#trackDimensionsChanged
 */

/**
 * A {@link LocalTrack} was disabled by the {@link LocalParticipant}.
 * @param {LocalTrack} track - The {@link LocalTrack} that was disabled
 * @event LocalParticipant#trackDisabled
 */

/**
 * A {@link LocalTrack} was enabled by the {@link LocalParticipant}.
 * @param {LocalTrack} track - The {@link LocalTrack} that was enabled
 * @event LocalParticipant#trackEnabled
 */

/**
 * A {@link LocalTrack} failed to publish. Check the error message for more
 * information.
 * @param {TwilioError} error - A {@link TwilioError} explaining why publication
 *   failed
 * @param {LocalTrack} localTrack - The {@link LocalTrack} that failed to
 *   publish
 * @event LocalParticipant#trackPublicationFailed
 */

/**
 * A {@link LocalTrack} was successfully published.
 * @param {LocalTrackPublication} publication - The resulting
 *   {@link LocalTrackPublication} for the published {@link LocalTrack}
 * @event LocalParticipant#trackPublished
 */

/**
 * One of the {@link LocalParticipant}'s {@link LocalTrack}s started.
 * @param {LocalTrack} track - The {@link LocalTrack} that started
 * @event LocalParticipant#trackStarted
 */

/**
 * One of the {@link LocalParticipant}'s {@link LocalTrack}s stopped, either
 * because {@link LocalTrack#stop} was called or because the underlying
 * MediaStreamTrack ended).
 * @param {LocalTrack} track - The {@link LocalTrack} that stopped
 * @event LocalParticipant#trackStopped
 */

/**
 * Outgoing media encoding parameters.
 * @typedef {object} EncodingParameters
 * @property {?number} [maxAudioBitrate] - Max outgoing audio bitrate (bps);
 *   If not specified, retains the existing bitrate limit; A <code>null</code>
 *   value removes any previously set bitrate limit
 * @property {?number} [maxVideoBitrate] - Max outgoing video bitrate (bps);
 *   If not specified, retains the existing bitrate limit; A <code>null</code>
 *   value removes any previously set bitrate limit
 */

/**
 * Options for publishing a {@link LocalTrack}.
 * @typedef {object} LocalTrackPublishOptions
 * @property {Track.Priority} [priority='standard'] - The priority with which the {@link LocalTrack}
 *   is to be published; In Group or Small Group Rooms, the appropriate bandwidth is
 *   allocated to the {@link LocalTrack} based on its {@link Track.Priority}; It has no
 *   effect in Peer-to-Peer Rooms; It defaults to "standard" when not provided
 */

/**
 * Options for publishing a {@link MediaStreamTrack}.
 * @typedef {LocalTrackOptions} MediaStreamTrackPublishOptions
 * @property {Track.Priority} [priority='standard'] - The priority with which the {@link LocalTrack}
 *   is to be published; In Group or Small Group Rooms, the appropriate bandwidth is
 *   allocated to the {@link LocalTrack} based on its {@link Track.Priority}; It has no
 *   effect in Peer-to-Peer Rooms; It defaults to "standard" when not provided
 */

/**
 * @private
 * @param {Map<Track.SID, LocalTrackPublication>} trackPublications
 * @param {LocalTrack|MediaStreamTrack} track
 * @returns {?LocalTrackPublication} trackPublication
 */


function getTrackPublication(trackPublications, track) {
  return Array.from(trackPublications.values()).find(function (trackPublication) {
    return trackPublication.track === track || trackPublication.track.mediaStreamTrack === track;
  }) || null;
}

module.exports = LocalParticipant;
},{"./media/track/es5/localaudiotrack":17,"./media/track/es5/localdatatrack":18,"./media/track/es5/localvideotrack":19,"./media/track/localaudiotrackpublication":22,"./media/track/localdatatrackpublication":24,"./media/track/localvideotrackpublication":28,"./participant":44,"./util":112,"./util/constants":110,"@twilio/webrtc":132}],16:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MediaTrack = require('./mediatrack');

/**
 * An {@link AudioTrack} is a {@link Track} representing audio.
 * @extends Track
 * @property {boolean} isStarted - Whether or not the {@link AudioTrack} has
 *   started; if the {@link AudioTrack} started, there is enough audio data to
 *   begin playback
 * @property {boolean} isEnabled - Whether or not the {@link AudioTrack} is
 *   enabled; if the {@link AudioTrack} is not enabled, it is "muted"
 * @property {Track.Kind} kind - "audio"
 * @property {MediaStreamTrack} mediaStreamTrack - An audio MediaStreamTrack
 * @emits AudioTrack#disabled
 * @emits AudioTrack#enabled
 * @emits AudioTrack#started
 */

var AudioTrack = function (_MediaTrack) {
  _inherits(AudioTrack, _MediaTrack);

  /**
   * Construct an {@link AudioTrack}.
   * @param {MediaTrackTransceiver} mediaTrackTransceiver
   * @param {{log: Log}} options
   */
  function AudioTrack(mediaTrackTransceiver, options) {
    _classCallCheck(this, AudioTrack);

    return _possibleConstructorReturn(this, (AudioTrack.__proto__ || Object.getPrototypeOf(AudioTrack)).call(this, mediaTrackTransceiver, options));
  }

  /**
   * @private
   */


  _createClass(AudioTrack, [{
    key: '_start',
    value: function _start() {
      _get(AudioTrack.prototype.__proto__ || Object.getPrototypeOf(AudioTrack.prototype), '_start', this).call(this);
      if (this._dummyEl) {
        this._detachElement(this._dummyEl);
      }
    }

    /**
     * Create an HTMLAudioElement and attach the {@link AudioTrack} to it.
     *
     * The HTMLAudioElement's <code>srcObject</code> will be set to a new
     * MediaStream containing the {@link AudioTrack}'s MediaStreamTrack.
     *
     * @returns {HTMLAudioElement} audioElement
     * @example
     * const Video = require('twilio-video');
     *
     * Video.createLocalAudioTrack().then(function(audioTrack) {
     *   const audioElement = audioTrack.attach();
     *   document.body.appendChild(audioElement);
     * });
    */ /**
       * Attach the {@link AudioTrack} to an existing HTMLMediaElement. The
       * HTMLMediaElement could be an HTMLAudioElement or an HTMLVideoElement.
       *
       * If the HTMLMediaElement's <code>srcObject</code> is not set to a MediaStream,
       * this method sets it to a new MediaStream containing the {@link AudioTrack}'s
       * MediaStreamTrack; otherwise, it adds the {@link MediaTrack}'s
       * MediaStreamTrack to the existing MediaStream. Finally, if there are any other
       * MediaStreamTracks of the same kind on the MediaStream, this method removes
       * them.
       *
       * @param {HTMLMediaElement} mediaElement - The HTMLMediaElement to attach to
       * @returns {HTMLMediaElement} mediaElement
       * @example
       * const Video = require('twilio-video');
       *
       * const videoElement = document.createElement('video');
       * document.body.appendChild(videoElement);
       *
       * Video.createLocalAudioTrack().then(function(audioTrack) {
       *   audioTrack.attach(videoElement);
       * });
       */ /**
          * Attach the {@link AudioTrack} to an HTMLMediaElement selected by
          * <code>document.querySelector</code>. The HTMLMediaElement could be an
          * HTMLAudioElement or an HTMLVideoElement.
          *
          * If the HTMLMediaElement's <code>srcObject</code> is not set to a MediaStream,
          * this method sets it to a new MediaStream containing the {@link AudioTrack}'s
          * MediaStreamTrack; otherwise, it adds the {@link AudioTrack}'s
          * MediaStreamTrack to the existing MediaStream. Finally, if there are any other
          * MediaStreamTracks of the same kind on the MediaStream, this method removes
          * them.
          *
          * @param {string} selector - A query selector for the HTMLMediaElement to
          *   attach to
          * @returns {HTMLMediaElement} mediaElement
          * @example
          * const Video = require('twilio-video');
          *
          * const videoElement = document.createElement('video');
          * videoElement.id = 'my-video-element';
          * document.body.appendChild(videoElement);
          *
          * Video.createLocalAudioTrack().then(function(track) {
          *   track.attach('#my-video-element');
          * });
          */

  }, {
    key: 'attach',
    value: function attach() {
      return _get(AudioTrack.prototype.__proto__ || Object.getPrototypeOf(AudioTrack.prototype), 'attach', this).apply(this, arguments);
    }

    /**
     * Detach the {@link AudioTrack} from all previously attached HTMLMediaElements.
     * @returns {Array<HTMLMediaElement>} mediaElements
     * @example
     * const mediaElements = audioTrack.detach();
     * mediaElements.forEach(mediaElement => mediaElement.remove());
    */ /**
       * Detach the {@link AudioTrack} from a previously attached HTMLMediaElement.
       * @param {HTMLMediaElement} mediaElement - One of the HTMLMediaElements to
       *   which the {@link AudioTrack} is attached
       * @returns {HTMLMediaElement} mediaElement
       * @example
       * const videoElement = document.getElementById('my-video-element');
       * audioTrack.detach(videoElement).remove();
       */ /**
          * Detach the {@link AudioTrack} from a previously attached HTMLMediaElement
          *   specified by <code>document.querySelector</code>.
          * @param {string} selector - The query selector of HTMLMediaElement to which
          *    the {@link AudioTrack} is attached
          * @returns {HTMLMediaElement} mediaElement
          * @example
          * audioTrack.detach('#my-video-element').remove();
          */

  }, {
    key: 'detach',
    value: function detach() {
      return _get(AudioTrack.prototype.__proto__ || Object.getPrototypeOf(AudioTrack.prototype), 'detach', this).apply(this, arguments);
    }
  }]);

  return AudioTrack;
}(MediaTrack);

/**
 * The {@link AudioTrack} was disabled, i.e. "muted".
 * @param {AudioTrack} track - The {@link AudioTrack} that was disabled
 * @event AudioTrack#disabled
 */

/**
 * The {@link AudioTrack} was enabled, i.e. "unmuted".
 * @param {AudioTrack} track - The {@link AudioTrack} that was enabled
 * @event AudioTrack#enabled
 */

/**
 * The {@link AudioTrack} started. This means there is enough audio data to
 * begin playback.
 * @param {AudioTrack} track - The {@link AudioTrack} that started
 * @event AudioTrack#started
 */

module.exports = AudioTrack;
},{"./mediatrack":29}],17:[function(require,module,exports){
// TODO(mroberts): Remove this when we go to the next major version. This is
// only in place so that we can support ES6 classes without requiring `new`.
'use strict';

var _require = require('util'),
    inherits = _require.inherits;

var LocalAudioTrackClass = require('../localaudiotrack');

function LocalAudioTrack(mediaStreamTrack, options) {
  var track = new LocalAudioTrackClass(mediaStreamTrack, options);
  Object.setPrototypeOf(track, LocalAudioTrack.prototype);
  return track;
}

inherits(LocalAudioTrack, LocalAudioTrackClass);

module.exports = LocalAudioTrack;
},{"../localaudiotrack":21,"util":153}],18:[function(require,module,exports){
// TODO(mroberts): Remove this when we go to the next major version. This is
// only in place so that we can support ES6 classes without requiring `new`.
'use strict';

var _require = require('util'),
    inherits = _require.inherits;

var LocalDataTrackClass = require('../localdatatrack');

function LocalDataTrack(options) {
  var track = new LocalDataTrackClass(options);
  Object.setPrototypeOf(track, LocalDataTrack.prototype);
  return track;
}

inherits(LocalDataTrack, LocalDataTrackClass);

module.exports = LocalDataTrack;
},{"../localdatatrack":23,"util":153}],19:[function(require,module,exports){
// TODO(mroberts): Remove this when we go to the next major version. This is
// only in place so that we can support ES6 classes without requiring `new`.
'use strict';

var _require = require('util'),
    inherits = _require.inherits;

var LocalVideoTrackClass = require('../localvideotrack');

function LocalVideoTrack(mediaStreamTrack, options) {
  var track = new LocalVideoTrackClass(mediaStreamTrack, options);
  Object.setPrototypeOf(track, LocalVideoTrack.prototype);
  return track;
}

inherits(LocalVideoTrack, LocalVideoTrackClass);

module.exports = LocalVideoTrack;
},{"../localvideotrack":27,"util":153}],20:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('../../eventemitter');

var _require = require('../../util'),
    buildLogLevels = _require.buildLogLevels,
    valueToJSON = _require.valueToJSON;

var DEFAULT_LOG_LEVEL = require('../../util/constants').DEFAULT_LOG_LEVEL;
var Log = require('../../util/log');

var nInstances = 0;

/**
 * A {@link Track} represents a stream of audio, video, or data.
 * @extends EventEmitter
 * @property {Track.Kind} kind - The {@link Track}'s kind
 * @property {string} name - The {@link Track}'s name
 */

var Track = function (_EventEmitter) {
  _inherits(Track, _EventEmitter);

  /**
   * Construct a {@link Track}.
   * @param {Track.ID} id - The {@link Track}'s ID
   * @param {Track.Kind} kind - The {@link Track}'s kind
   * @param {{ log: Log, name: ?string }} options
   */
  function Track(id, kind, options) {
    _classCallCheck(this, Track);

    options = Object.assign({
      name: id,
      log: null,
      logLevel: DEFAULT_LOG_LEVEL
    }, options);

    var _this = _possibleConstructorReturn(this, (Track.__proto__ || Object.getPrototypeOf(Track)).call(this));

    var name = String(options.name);

    var logLevels = buildLogLevels(options.logLevel);
    var log = options.log ? options.log.createLog('media', _this) : new Log('media', _this, logLevels);

    Object.defineProperties(_this, {
      _instanceId: {
        value: ++nInstances
      },
      _log: {
        value: log
      },
      kind: {
        enumerable: true,
        value: kind
      },
      name: {
        enumerable: true,
        value: name
      }
    });
    return _this;
  }

  _createClass(Track, [{
    key: 'toJSON',
    value: function toJSON() {
      return valueToJSON(this);
    }
  }]);

  return Track;
}(EventEmitter);

/**
 * The {@link Track} ID is a string identifier for the {@link Track}.
 * @typedef {string} Track.ID
 */

/**
 * The {@link Track} kind is either "audio", "video", or "data".
 * @typedef {string} Track.Kind
 */

/**
 * The {@link Track}'s priority can be "low", "standard", or "high".
 * @typedef {string} Track.Priority
 */

/**
 * The {@link Track} SID is a unique string identifier for the {@link Track}
 * that is published to a {@link Room}.
 * @typedef {string} Track.SID
 */

/**
 * A {@link DataTrack} is a {@link LocalDataTrack} or {@link RemoteDataTrack}.
 * @typedef {LocalDataTrack|RemoteDataTrack} DataTrack
 */

/**
 * A {@link LocalTrack} is a {@link LocalAudioTrack}, {@link LocalVideoTrack},
 * or {@link LocalDataTrack}.
 * @typedef {LocalAudioTrack|LocalVideoTrack|LocalDataTrack} LocalTrack
 */

/**
 * {@link LocalTrack} options
 * @typedef {object} LocalTrackOptions
 * @property {LogLevel|LogLevels} logLevel - Log level for 'media' modules
 * @property {string} [name] - The {@link LocalTrack}'s name; by default,
 *   it is set to the {@link LocalTrack}'s ID.
 */

/**
 * A {@link RemoteTrack} is a {@link RemoteAudioTrack},
 * {@link RemoteVideoTrack}, or {@link RemoteDataTrack}.
 * @typedef {RemoteAudioTrack|RemoteVideoTrack|RemoteDataTrack} RemoteTrack
 */

module.exports = Track;
},{"../../eventemitter":11,"../../util":112,"../../util/constants":110,"../../util/log":115}],21:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var AudioTrack = require('./audiotrack');
var mixinLocalMediaTrack = require('./localmediatrack');

var LocalMediaAudioTrack = mixinLocalMediaTrack(AudioTrack);

/**
 * A {@link LocalAudioTrack} is an {@link AudioTrack} representing audio that
 * your {@link LocalParticipant} can publish to a {@link Room}. It can be
 * enabled and disabled with {@link LocalAudioTrack#enable} and
 * {@link LocalAudioTrack#disable} or stopped completely with
 * {@link LocalAudioTrack#stop}.
 * @extends AudioTrack
 * @property {Track.ID} id - The {@link LocalAudioTrack}'s ID
 * @property {boolean} isStopped - Whether or not the {@link LocalAudioTrack} is
 *   stopped
 * @emits LocalAudioTrack#disabled
 * @emits LocalAudioTrack#enabled
 * @emits LocalAudioTrack#started
 * @emits LocalAudioTrack#stopped
 */

var LocalAudioTrack = function (_LocalMediaAudioTrack) {
  _inherits(LocalAudioTrack, _LocalMediaAudioTrack);

  /**
   * Construct a {@link LocalAudioTrack} from a MediaStreamTrack.
   * @param {MediaStreamTrack} mediaStreamTrack - An audio MediaStreamTrack
   * @param {LocalTrackOptions} [options] - {@link LocalTrack} options
   */
  function LocalAudioTrack(mediaStreamTrack, options) {
    _classCallCheck(this, LocalAudioTrack);

    return _possibleConstructorReturn(this, (LocalAudioTrack.__proto__ || Object.getPrototypeOf(LocalAudioTrack)).call(this, mediaStreamTrack, options));
  }

  _createClass(LocalAudioTrack, [{
    key: 'toString',
    value: function toString() {
      return '[LocalAudioTrack #' + this._instanceId + ': ' + this.id + ']';
    }
  }, {
    key: 'attach',
    value: function attach(el) {
      el = _get(LocalAudioTrack.prototype.__proto__ || Object.getPrototypeOf(LocalAudioTrack.prototype), 'attach', this).call(this, el);
      el.muted = true;
      return el;
    }

    /**
     * @private
     */

  }, {
    key: '_end',
    value: function _end() {
      return _get(LocalAudioTrack.prototype.__proto__ || Object.getPrototypeOf(LocalAudioTrack.prototype), '_end', this).apply(this, arguments);
    }

    /**
     * Disable the {@link LocalAudioTrack}. This is effectively "mute".
     * @returns {this}
     * @fires LocalAudioTrack#disabled
     */

  }, {
    key: 'disable',
    value: function disable() {
      return _get(LocalAudioTrack.prototype.__proto__ || Object.getPrototypeOf(LocalAudioTrack.prototype), 'disable', this).apply(this, arguments);
    }

    /**
     * Enable the {@link LocalAudioTrack}. This is effectively "unmute".
     * @returns {this}
     * @fires LocalAudioTrack#enabled
    */ /**
       * Enable or disable the {@link LocalAudioTrack}. This is effectively "unmute"
       * or "mute".
       * @param {boolean} [enabled] - Specify false to mute the
       *   {@link LocalAudioTrack}
       * @returns {this}
       * @fires LocalAudioTrack#disabled
       * @fires LocalAudioTrack#enabled
       */

  }, {
    key: 'enable',
    value: function enable() {
      return _get(LocalAudioTrack.prototype.__proto__ || Object.getPrototypeOf(LocalAudioTrack.prototype), 'enable', this).apply(this, arguments);
    }

    /**
     * Calls stop on the underlying MediaStreamTrack. If you choose to stop a
     * {@link LocalAudioTrack}, you should unpublish it after stopping.
     * @returns {this}
     * @fires LocalAudioTrack#stopped
     */

  }, {
    key: 'stop',
    value: function stop() {
      return _get(LocalAudioTrack.prototype.__proto__ || Object.getPrototypeOf(LocalAudioTrack.prototype), 'stop', this).apply(this, arguments);
    }
  }]);

  return LocalAudioTrack;
}(LocalMediaAudioTrack);

/**
 * The {@link LocalAudioTrack} was disabled, i.e. "muted".
 * @param {LocalAudioTrack} track - The {@link LocalAudioTrack} that was
 *   disabled
 * @event LocalAudioTrack#disabled
 */

/**
 * The {@link LocalAudioTrack} was enabled, i.e. "unmuted".
 * @param {LocalAudioTrack} track - The {@link LocalAudioTrack} that was enabled
 * @event LocalAudioTrack#enabled
 */

/**
 * The {@link LocalAudioTrack} started. This means there is enough audio data to
 * begin playback.
 * @param {LocalAudioTrack} track - The {@link LocalAudioTrack} that started
 * @event LocalAudioTrack#started
 */

/**
 * The {@link LocalAudioTrack} stopped, either because
 * {@link LocalAudioTrack#stop} was called or because the underlying
 * MediaStreamTrack ended).
 * @param {LocalAudioTrack} track - The {@link LocalAudioTrack} that stopped
 * @event LocalAudioTrack#stopped
 */

module.exports = LocalAudioTrack;
},{"./audiotrack":16,"./localmediatrack":25}],22:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LocalTrackPublication = require('./localtrackpublication');

/**
 * A {@link LocalAudioTrackPublication} is a {@link LocalAudioTrack} that has
 * been published to a {@link Room}.
 * @extends LocalTrackPublication
 * @property {Track.Kind} kind - "audio"
 * @property {LocalAudioTrack} track - the {@link LocalAudioTrack}
 */

var LocalAudioTrackPublication = function (_LocalTrackPublicatio) {
  _inherits(LocalAudioTrackPublication, _LocalTrackPublicatio);

  /**
   * Construct a {@link LocalAudioTrackPublication}.
   * @param {LocalTrackPublicationSignaling} signaling - The corresponding
   *   {@link LocalTrackPublicationSignaling}
   * @param {LocalAudioTrack} track - the {@link LocalAudioTrack}
   * @param {function(LocalTrackPublication): void} unpublish - The callback
   *    that unpublishes the {@link LocalTrackPublication}
   * @param {TrackPublicationOptions} options - {@link LocalTrackPublication} options
   */
  function LocalAudioTrackPublication(signaling, track, unpublish, options) {
    _classCallCheck(this, LocalAudioTrackPublication);

    return _possibleConstructorReturn(this, (LocalAudioTrackPublication.__proto__ || Object.getPrototypeOf(LocalAudioTrackPublication)).call(this, signaling, track, unpublish, options));
  }

  _createClass(LocalAudioTrackPublication, [{
    key: 'toString',
    value: function toString() {
      return '[LocalAudioTrackPublication #' + this._instanceId + ': ' + this.trackSid + ']';
    }
  }]);

  return LocalAudioTrackPublication;
}(LocalTrackPublication);

module.exports = LocalAudioTrackPublication;
},{"./localtrackpublication":26}],23:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Track = require('./');
var DefaultDataTrackSender = require('../../data/sender');

/**
 * A {@link LocalDataTrack} is a {@link Track} representing data that your
 * {@link LocalParticipant} can publish to a {@link Room}.
 * @extends Track
 * @property {Track.ID} id - The {@link LocalDataTrack}'s ID
 * @property {Track.Kind} kind - "data"
 * @property {?number} maxPacketLifeTime - If non-null, this represents a time
 *   limit (in milliseconds) during which the {@link LocalDataTrack} will send
 *   or re-send data if not acknowledged on the underlying RTCDataChannel(s).
 * @property {?number} maxRetransmits - If non-null, this represents the number
 *   of times the {@link LocalDataTrack} will resend data if not successfully
 *   delivered on the underlying RTCDataChannel(s).
 * @property {boolean} ordered - true if data on the {@link LocalDataTrack} is
 *   guaranteed to be sent in order.
 * @property {boolean} reliable - This is true if both
 *   <code>maxPacketLifeTime</code> and <code>maxRetransmits</code> are set to
 *   null. In other words, if this is true, there is no bound on packet lifetime
 *   or the number of times the {@link LocalDataTrack} will attempt to send
 *   data, ensuring "reliable" transmission.
 * @example
 * var Video = require('twilio-video');
 *
 * var localDataTrack = new Video.LocalDataTrack();
 * window.addEventListener('mousemove', function(event) {
 *   localDataTrack.send({
 *     x: e.clientX,
 *     y: e.clientY
 *   });
 * });
 *
 * var token1 = getAccessToken();
 * Video.connect(token1, {
 *   name: 'my-cool-room',
 *   tracks: [localDataTrack]
 * });
 *
 * var token2 = getAccessToken();
 * Video.connect(token2, {
 *   name: 'my-cool-room',
 *   tracks: []
 * }).then(function(room) {
 *   room.on('trackSubscribed', function(track) {
 *     track.on('message', function(message) {
 *       console.log(message); // { x: <number>, y: <number> }
 *     });
 *   });
 * });
 */

var LocalDataTrack = function (_Track) {
  _inherits(LocalDataTrack, _Track);

  /**
   * Construct a {@link LocalDataTrack}.
   * @param {LocalDataTrackOptions} [options] - {@link LocalDataTrack} options
   */
  function LocalDataTrack(options) {
    _classCallCheck(this, LocalDataTrack);

    options = Object.assign({
      DataTrackSender: DefaultDataTrackSender,
      maxPacketLifeTime: null,
      maxRetransmits: null,
      ordered: true
    }, options);

    var DataTrackSender = options.DataTrackSender;
    var dataTrackSender = new DataTrackSender(options.maxPacketLifeTime, options.maxRetransmits, options.ordered);

    var _this = _possibleConstructorReturn(this, (LocalDataTrack.__proto__ || Object.getPrototypeOf(LocalDataTrack)).call(this, dataTrackSender.id, 'data', options));

    Object.defineProperties(_this, {
      _trackSender: {
        value: dataTrackSender
      },
      id: {
        enumerable: true,
        value: dataTrackSender.id
      },
      maxPacketLifeTime: {
        enumerable: true,
        value: options.maxPacketLifeTime
      },
      maxRetransmits: {
        enumerable: true,
        value: options.maxRetransmits
      },
      ordered: {
        enumerable: true,
        value: options.ordered
      },
      reliable: {
        enumerable: true,
        value: options.maxPacketLifeTime === null && options.maxRetransmits === null
      }
    });
    return _this;
  }

  /**
   * Send a message over the {@link LocalDataTrack}.
   * @param {string|Blob|ArrayBuffer|ArrayBufferView} data
   * @returns {void}
   */


  _createClass(LocalDataTrack, [{
    key: 'send',
    value: function send(data) {
      this._trackSender.send(data);
    }
  }]);

  return LocalDataTrack;
}(Track);

/**
 * {@link LocalDataTrack} options
 * @typedef {LocalTrackOptions} LocalDataTrackOptions
 * @property {?number} [maxPacketLifeTime=null] - Set this to limit the time
 *   (in milliseconds) during which the LocalDataTrack will send or re-send data
 *   if not successfully delivered on the underlying RTCDataChannel(s). It is an
 *   error to specify both this and <code>maxRetransmits</code>.
 * @property {?number} [maxRetransmits=null] - Set this to limit the number of
 *   times the {@link LocalDataTrack} will send or re-send data if not
 *   acknowledged on the underlying RTCDataChannel(s). It is an error to specify
 *   both this and <code>maxPacketLifeTime</code>.
 * @property {boolean} [ordered=true] - Set this to false to allow data on the
 *   LocalDataTrack to be sent out-of-order.
 */

module.exports = LocalDataTrack;
},{"../../data/sender":6,"./":20}],24:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LocalTrackPublication = require('./localtrackpublication');

/**
 * A {@link LocalDataTrackPublication} is a {@link LocalDataTrack} that has been
 * published to a {@link Room}.
 * @extends LocalTrackPublication
 * @property {Track.Kind} kind - "data"
 * @property {LocalDataTrack} track - the {@link LocalDataTrack}
 */

var LocalDataTrackPublication = function (_LocalTrackPublicatio) {
  _inherits(LocalDataTrackPublication, _LocalTrackPublicatio);

  /**
   * Construct a {@link LocalDataTrackPublication}.
   * @param {LocalTrackPublicationSignaling} signaling - The corresponding
   *   {@link LocalTrackPublicationSignaling}
   * @param {LocalDataTrack} track - the {@link LocalDataTrack}
   * @param {function(LocalTrackPublication): void} unpublish - The callback
   *    that unpublishes the {@link LocalTrackPublication}
   * @param {TrackPublicationOptions} options - {@link LocalTrackPublication} options
   */
  function LocalDataTrackPublication(signaling, track, unpublish, options) {
    _classCallCheck(this, LocalDataTrackPublication);

    return _possibleConstructorReturn(this, (LocalDataTrackPublication.__proto__ || Object.getPrototypeOf(LocalDataTrackPublication)).call(this, signaling, track, unpublish, options));
  }

  _createClass(LocalDataTrackPublication, [{
    key: 'toString',
    value: function toString() {
      return '[LocalDataTrackPublication #' + this._instanceId + ': ' + this.trackSid + ']';
    }
  }]);

  return LocalDataTrackPublication;
}(LocalTrackPublication);

module.exports = LocalDataTrackPublication;
},{"./localtrackpublication":26}],25:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MediaTrackSender = require('./sender');

function mixinLocalMediaTrack(AudioOrVideoTrack) {
  /**
   * A {@link LocalMediaTrack} represents audio or video that your
   * {@link LocalParticipant} is sending to a {@link Room}. As such, it can be
   * enabled and disabled with {@link LocalMediaTrack#enable} and
   * {@link LocalMediaTrack#disable} or stopped completely with
   * {@link LocalMediaTrack#stop}.
   * @emits LocalMediaTrack#stopped
   */
  return function (_AudioOrVideoTrack) {
    _inherits(LocalMediaTrack, _AudioOrVideoTrack);

    /**
     * Construct a {@link LocalMediaTrack} from a MediaStreamTrack.
     * @param {MediaStreamTrack} mediaStreamTrack - The underlying MediaStreamTrack
     * @param {LocalTrackOptions} [options] - {@link LocalTrack} options
     */
    function LocalMediaTrack(mediaStreamTrack, options) {
      _classCallCheck(this, LocalMediaTrack);

      options = Object.assign({}, options);

      var mediaTrackSender = new MediaTrackSender(mediaStreamTrack);

      var _this = _possibleConstructorReturn(this, (LocalMediaTrack.__proto__ || Object.getPrototypeOf(LocalMediaTrack)).call(this, mediaTrackSender, options));

      Object.defineProperties(_this, {
        _didCallEnd: {
          value: false,
          writable: true
        },
        _trackSender: {
          value: mediaTrackSender
        },
        id: {
          enumerable: true,
          value: mediaStreamTrack.id
        },
        isEnabled: {
          enumerable: true,
          get: function get() {
            return mediaStreamTrack.enabled;
          }
        },
        isStopped: {
          enumerable: true,
          get: function get() {
            return mediaStreamTrack.readyState === 'ended';
          }
        }
      });
      return _this;
    }

    /**
     * @private
     */


    _createClass(LocalMediaTrack, [{
      key: '_end',
      value: function _end() {
        if (this._didCallEnd) {
          return;
        }
        _get(LocalMediaTrack.prototype.__proto__ || Object.getPrototypeOf(LocalMediaTrack.prototype), '_end', this).call(this);
        this._didCallEnd = true;
        this.emit('stopped', this);
      }
    }, {
      key: 'enable',
      value: function enable(enabled) {
        enabled = typeof enabled === 'boolean' ? enabled : true;
        if (enabled !== this.mediaStreamTrack.enabled) {
          this._log.info((enabled ? 'En' : 'Dis') + 'abling');
          this.mediaStreamTrack.enabled = enabled;
          this.emit(enabled ? 'enabled' : 'disabled', this);
        }
        return this;
      }
    }, {
      key: 'disable',
      value: function disable() {
        return this.enable(false);
      }
    }, {
      key: 'stop',
      value: function stop() {
        this._log.info('Stopping');
        this.mediaStreamTrack.stop();
        this._end();
        return this;
      }
    }]);

    return LocalMediaTrack;
  }(AudioOrVideoTrack);
}

module.exports = mixinLocalMediaTrack;
},{"./sender":39}],26:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TrackPublication = require('./trackpublication');

/**
 * A {@link LocalTrackPublication} is a {@link LocalTrack} that has been
 * published to a {@link Room}.
 * @property {boolean} isTrackEnabled - whether the published {@link LocalTrack}
 *   is enabled
 * @property {Track.Kind} kind - kind of the published {@link LocalTrack}
 * @property {Track.Priority} priority - the publish priority of the {@link LocalTrack}
 * @property {LocalTrack} track - the {@link LocalTrack}
 */

var LocalTrackPublication = function (_TrackPublication) {
  _inherits(LocalTrackPublication, _TrackPublication);

  /**
   * Construct a {@link LocalTrackPublication}.
   * @param {LocalTrackPublicationSignaling} signaling - The corresponding
   *   {@link LocalTrackPublicationSignaling}
   * @param {LocalTrack} track - The {@link LocalTrack}
   * @param {function(LocalTrackPublication): void} unpublish - The callback
   *   that unpublishes the {@link LocalTrackPublication}
   * @param {TrackPublicationOptions} options - {@link LocalTrackPublication}
   *   options
   */
  function LocalTrackPublication(signaling, track, unpublish, options) {
    _classCallCheck(this, LocalTrackPublication);

    var _this = _possibleConstructorReturn(this, (LocalTrackPublication.__proto__ || Object.getPrototypeOf(LocalTrackPublication)).call(this, track.name, signaling.sid, options));

    Object.defineProperties(_this, {
      _reemitTrackEvent: {
        value: function value() {
          return _this.emit(_this.isTrackEnabled ? 'trackEnabled' : 'trackDisabled');
        }
      },
      _signaling: {
        value: signaling
      },
      _unpublish: {
        value: unpublish
      },
      isTrackEnabled: {
        enumerable: true,
        get: function get() {
          return this.track.kind === 'data' ? true : this.track.isEnabled;
        }
      },
      kind: {
        enumerable: true,
        value: track.kind
      },
      priority: {
        enumerable: true,
        get: function get() {
          return signaling.priority;
        }
      },
      track: {
        enumerable: true,
        value: track
      }
    });

    track.on('disabled', _this._reemitTrackEvent);
    track.on('enabled', _this._reemitTrackEvent);
    return _this;
  }

  _createClass(LocalTrackPublication, [{
    key: 'toString',
    value: function toString() {
      return '[LocalTrackPublication #' + this._instanceId + ': ' + this.trackSid + ']';
    }

    /**
     * Unpublish a {@link LocalTrackPublication}. This means that the media
     * from this {@link LocalTrackPublication} is no longer available to the
     * {@link Room}'s {@link RemoteParticipant}s.
     * @returns {this}
     */

  }, {
    key: 'unpublish',
    value: function unpublish() {
      this.track.removeListener('disabled', this._reemitTrackEvent);
      this.track.removeListener('enabled', this._reemitTrackEvent);
      this._unpublish(this);
      return this;
    }
  }]);

  return LocalTrackPublication;
}(TrackPublication);

module.exports = LocalTrackPublication;
},{"./trackpublication":40}],27:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var mixinLocalMediaTrack = require('./localmediatrack');
var VideoTrack = require('./videotrack');

var LocalMediaVideoTrack = mixinLocalMediaTrack(VideoTrack);

/**
 * A {@link LocalVideoTrack} is a {@link VideoTrack} representing video that
 * your {@link LocalParticipant} can publish to a {@link Room}. It can be
 * enabled and disabled with {@link LocalVideoTrack#enable} and
 * {@link LocalVideoTrack#disable} or stopped completely with
 * {@link LocalVideoTrack#stop}.
 * @extends VideoTrack
 * @property {Track.ID} id - The {@link LocalVideoTrack}'s ID
 * @property {boolean} isStopped - Whether or not the {@link LocalVideoTrack} is
 *   stopped
 * @emits LocalVideoTrack#stopped
 */

var LocalVideoTrack = function (_LocalMediaVideoTrack) {
  _inherits(LocalVideoTrack, _LocalMediaVideoTrack);

  /**
   * Construct a {@link LocalVideoTrack} from a MediaStreamTrack.
   * @param {MediaStreamTrack} mediaStreamTrack - The underlying MediaStreamTrack
   * @param {LocalTrackOptions} [options] - {@link LocalTrack} options
   */
  function LocalVideoTrack(mediaStreamTrack, options) {
    _classCallCheck(this, LocalVideoTrack);

    return _possibleConstructorReturn(this, (LocalVideoTrack.__proto__ || Object.getPrototypeOf(LocalVideoTrack)).call(this, mediaStreamTrack, options));
  }

  _createClass(LocalVideoTrack, [{
    key: 'toString',
    value: function toString() {
      return '[LocalVideoTrack #' + this._instanceId + ': ' + this.id + ']';
    }

    /**
     * @private
     */

  }, {
    key: '_end',
    value: function _end() {
      return _get(LocalVideoTrack.prototype.__proto__ || Object.getPrototypeOf(LocalVideoTrack.prototype), '_end', this).apply(this, arguments);
    }

    /**
     * Disable the {@link LocalVideoTrack}. This is effectively "pause".
     * @returns {this}
     * @fires VideoTrack#disabled
     */

  }, {
    key: 'disable',
    value: function disable() {
      return _get(LocalVideoTrack.prototype.__proto__ || Object.getPrototypeOf(LocalVideoTrack.prototype), 'disable', this).apply(this, arguments);
    }

    /**
     * Enable the {@link LocalVideoTrack}. This is effectively "unpause".
     * @returns {this}
     * @fires VideoTrack#enabled
    */ /**
       * Enable or disable the {@link LocalVideoTrack}. This is effectively "unpause"
       * or "pause".
       * @param {boolean} [enabled] - Specify false to pause the
       *   {@link LocalVideoTrack}
       * @returns {this}
       * @fires VideoTrack#disabled
       * @fires VideoTrack#enabled
       */

  }, {
    key: 'enable',
    value: function enable() {
      return _get(LocalVideoTrack.prototype.__proto__ || Object.getPrototypeOf(LocalVideoTrack.prototype), 'enable', this).apply(this, arguments);
    }

    /**
     * Calls stop on the underlying MediaStreamTrack. If you choose to stop a
     * {@link LocalVideoTrack}, you should unpublish it after stopping.
     * @returns {this}
     * @fires LocalVideoTrack#stopped
     */

  }, {
    key: 'stop',
    value: function stop() {
      return _get(LocalVideoTrack.prototype.__proto__ || Object.getPrototypeOf(LocalVideoTrack.prototype), 'stop', this).apply(this, arguments);
    }
  }]);

  return LocalVideoTrack;
}(LocalMediaVideoTrack);

/**
 * The {@link LocalVideoTrack} was disabled, i.e. "muted".
 * @param {LocalVideoTrack} track - The {@link LocalVideoTrack} that was
 *   disabled
 * @event LocalVideoTrack#disabled
 */

/**
 * The {@link LocalVideoTrack} was enabled, i.e. "unmuted".
 * @param {LocalVideoTrack} track - The {@link LocalVideoTrack} that was enabled
 * @event LocalVideoTrack#enabled
 */

/**
 * The {@link LocalVideoTrack} started. This means there is enough video data
 * to begin playback.
 * @param {LocalVideoTrack} track - The {@link LocalVideoTrack} that started
 * @event LocalVideoTrack#started
 */

/**
 * The {@link LocalVideoTrack} stopped, either because
 * {@link LocalVideoTrack#stop} was called or because the underlying
 * MediaStreamTrack ended).
 * @param {LocalVideoTrack} track - The {@link LocalVideoTrack} that stopped
 * @event LocalVideoTrack#stopped
 */

module.exports = LocalVideoTrack;
},{"./localmediatrack":25,"./videotrack":42}],28:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LocalTrackPublication = require('./localtrackpublication');

/**
 * A {@link LocalVideoTrackPublication} is a {@link LocalVideoTrack} that has
 * been published to a {@link Room}.
 * @extends LocalTrackPublication
 * @property {Track.Kind} kind - "video"
 * @property {LocalVideoTrack} track - the {@link LocalVideoTrack}
 */

var LocalVideoTrackPublication = function (_LocalTrackPublicatio) {
  _inherits(LocalVideoTrackPublication, _LocalTrackPublicatio);

  /**
   * Construct a {@link LocalVideoTrackPublication}.
   * @param {LocalTrackPublicationSignaling} signaling - The corresponding
   *   {@link LocalTrackPublicationSignaling}
   * @param {LocalVideoTrack} track - the {@link LocalVideoTrack}
   * @param {function(LocalTrackPublication): void} unpublish - The callback
   *    that unpublishes the {@link LocalTrackPublication}
   * @param {TrackPublicationOptions} options - {@link LocalTrackPublication} options
   */
  function LocalVideoTrackPublication(signaling, track, unpublish, options) {
    _classCallCheck(this, LocalVideoTrackPublication);

    return _possibleConstructorReturn(this, (LocalVideoTrackPublication.__proto__ || Object.getPrototypeOf(LocalVideoTrackPublication)).call(this, signaling, track, unpublish, options));
  }

  _createClass(LocalVideoTrackPublication, [{
    key: 'toString',
    value: function toString() {
      return '[LocalVideoTrackPublication #' + this._instanceId + ': ' + this.trackSid + ']';
    }
  }]);

  return LocalVideoTrackPublication;
}(LocalTrackPublication);

module.exports = LocalVideoTrackPublication;
},{"./localtrackpublication":26}],29:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MediaStream = require('@twilio/webrtc').MediaStream;
var Track = require('./');

/**
 * A {@link MediaTrack} represents audio or video that can be sent to or
 * received from a {@link Room}.
 * @extends Track
 * @property {Track.ID} id - This {@link Track}'s ID
 * @property {boolean} isStarted - Whether or not the {@link MediaTrack} has
 *   started
 * @property {boolean} isEnabled - Whether or not the {@link MediaTrack} is
 *   enabled (i.e., whether it is paused or muted)
 * @property {Track.Kind} kind - The kind of the underlying
 *   MediaStreamTrack, "audio" or "video"
 * @property {MediaStreamTrack} mediaStreamTrack - The underlying
 *   MediaStreamTrack
 * @emits MediaTrack#disabled
 * @emits MediaTrack#enabled
 * @emits MediaTrack#started
 */

var MediaTrack = function (_Track) {
  _inherits(MediaTrack, _Track);

  /**
   * Construct a {@link MediaTrack}.
   * @param {MediaTrackTransceiver} mediaTrackTransceiver
   * @param {{log: Log}} options
   */
  function MediaTrack(mediaTrackTransceiver, options) {
    _classCallCheck(this, MediaTrack);

    var _this = _possibleConstructorReturn(this, (MediaTrack.__proto__ || Object.getPrototypeOf(MediaTrack)).call(this, mediaTrackTransceiver.id, mediaTrackTransceiver.kind, options));

    var isStarted = false;

    options = Object.assign({
      MediaStream: MediaStream
    }, options);

    /* istanbul ignore next */
    Object.defineProperties(_this, {
      _attachments: {
        value: new Set()
      },
      _dummyEl: {
        value: null,
        writable: true
      },
      _isStarted: {
        get: function get() {
          return isStarted;
        },
        set: function set(_isStarted) {
          isStarted = _isStarted;
        }
      },
      _MediaStream: {
        value: options.MediaStream
      },
      isStarted: {
        enumerable: true,
        get: function get() {
          return isStarted;
        }
      },
      mediaStreamTrack: {
        enumerable: true,
        value: mediaTrackTransceiver.track
      }
    });

    _this._initialize();
    return _this;
  }

  /**
   * @private
   */


  _createClass(MediaTrack, [{
    key: '_start',
    value: function _start() {
      this._log.debug('Started');
      this._isStarted = true;
      if (this._dummyEl) {
        this._dummyEl.oncanplay = null;
      }
      // eslint-disable-next-line no-use-before-define
      this.emit('started', this);
    }

    /**
     * @private
     */

  }, {
    key: '_initialize',
    value: function _initialize() {
      var self = this;

      this._log.debug('Initializing');
      this._dummyEl = this._createElement();

      this.mediaStreamTrack.addEventListener('ended', function onended() {
        self._end();
        self.mediaStreamTrack.removeEventListener('ended', onended);
      });

      if (this._dummyEl) {
        this._dummyEl.muted = true;
        this._dummyEl.oncanplay = this._start.bind(this, this._dummyEl);
        this._attach(this._dummyEl);
        this._attachments.delete(this._dummyEl);
      }
    }

    /**
     * @private
     */

  }, {
    key: '_end',
    value: function _end() {
      this._log.debug('Ended');
      if (this._dummyEl) {
        this._detachElement(this._dummyEl);
        this._dummyEl.oncanplay = null;
      }
    }
  }, {
    key: 'attach',
    value: function attach(el) {
      if (typeof el === 'string') {
        el = this._selectElement(el);
      } else if (!el) {
        el = this._createElement();
      }
      this._log.debug('Attempting to attach to element:', el);
      el = this._attach(el);

      return el;
    }

    /**
     * @private
     */

  }, {
    key: '_attach',
    value: function _attach(el) {
      var mediaStream = el.srcObject;
      if (!(mediaStream instanceof this._MediaStream)) {
        mediaStream = new this._MediaStream();
      }

      var getTracks = this.mediaStreamTrack.kind === 'audio' ? 'getAudioTracks' : 'getVideoTracks';

      mediaStream[getTracks]().forEach(function (mediaStreamTrack) {
        mediaStream.removeTrack(mediaStreamTrack);
      });
      mediaStream.addTrack(this.mediaStreamTrack);

      // NOTE(mroberts): Although we don't necessarily need to reset `srcObject`,
      // we've been doing it here for a while, and it turns out it has allowed us
      // to sidestep the following issue:
      //
      //   https://bugs.chromium.org/p/chromium/issues/detail?id=720258
      //
      el.srcObject = mediaStream;
      el.autoplay = true;
      el.playsInline = true;

      if (!this._attachments.has(el)) {
        this._attachments.add(el);
      }

      return el;
    }

    /**
     * @private
     */

  }, {
    key: '_selectElement',
    value: function _selectElement(selector) {
      var el = document.querySelector(selector);

      if (!el) {
        throw new Error('Selector matched no element: ' + selector);
      }

      return el;
    }

    /**
     * @private
     */

  }, {
    key: '_createElement',
    value: function _createElement() {
      return typeof document !== 'undefined' ? document.createElement(this.kind) : null;
    }
  }, {
    key: 'detach',
    value: function detach(el) {
      var els = void 0;

      if (typeof el === 'string') {
        els = [this._selectElement(el)];
      } else if (!el) {
        els = this._getAllAttachedElements();
      } else {
        els = [el];
      }

      this._log.debug('Attempting to detach from elements:', els);
      this._detachElements(els);
      return el ? els[0] : els;
    }

    /**
     * @private
     */

  }, {
    key: '_detachElements',
    value: function _detachElements(elements) {
      return elements.map(this._detachElement.bind(this));
    }

    /**
     * @private
     */

  }, {
    key: '_detachElement',
    value: function _detachElement(el) {
      if (!this._attachments.has(el)) {
        return el;
      }

      var mediaStream = el.srcObject;
      if (mediaStream instanceof this._MediaStream) {
        mediaStream.removeTrack(this.mediaStreamTrack);
        // NOTE(mroberts): It's as if, in Chrome and Safari, the <audio> element's
        // `srcObject` setter is taking a "snapshot" of the MediaStream's
        // MediaStreamTracks in order to playback; hence, calls to `removeTrack`
        // don't take effect unless you set the <audio> element's `srcObject` again.
        //
        //   https://bugs.chromium.org/p/chromium/issues/detail?id=749928
        //
        el.srcObject = mediaStream;
      }

      this._attachments.delete(el);
      return el;
    }

    /**
     * @private
     */

  }, {
    key: '_getAllAttachedElements',
    value: function _getAllAttachedElements() {
      var els = [];

      this._attachments.forEach(function (el) {
        els.push(el);
      });

      return els;
    }
  }]);

  return MediaTrack;
}(Track);

module.exports = MediaTrack;
},{"./":20,"@twilio/webrtc":132}],30:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MediaTrackTransceiver = require('./transceiver');

/**
 * A {@link MediaTrackReceiver} represents a remote MediaStreamTrack.
 * @extends MediaTrackTransceiver
 */

var MediaTrackReceiver = function (_MediaTrackTransceive) {
  _inherits(MediaTrackReceiver, _MediaTrackTransceive);

  /**
   * Construct a {@link MediaTrackReceiver}.
   * @param {Track.ID} id - The MediaStreamTrack ID signaled through RSP/SDP
   * @param {MediaStreamTrack} mediaStreamTrack - The remote MediaStreamTrack
   */
  function MediaTrackReceiver(id, mediaStreamTrack) {
    _classCallCheck(this, MediaTrackReceiver);

    return _possibleConstructorReturn(this, (MediaTrackReceiver.__proto__ || Object.getPrototypeOf(MediaTrackReceiver)).call(this, id, mediaStreamTrack));
  }

  return MediaTrackReceiver;
}(MediaTrackTransceiver);

module.exports = MediaTrackReceiver;
},{"./transceiver":41}],31:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var AudioTrack = require('./audiotrack');
var mixinRemoteMediaTrack = require('./remotemediatrack');

var RemoteMediaAudioTrack = mixinRemoteMediaTrack(AudioTrack);

/**
 * A {@link RemoteAudioTrack} represents an {@link AudioTrack} published to a
 * {@link Room} by a {@link RemoteParticipant}.
 * @extends AudioTrack
 * @property {Track.SID} sid - The {@link RemoteAudioTrack}'s SID
 * @emits RemoteAudioTrack#disabled
 * @emits RemoteAudioTrack#enabled
 * @emits RemoteAudioTrack#started
 * @emits RemoteAudioTrack#switchedOff
 * @emits RemoteAudioTrack#switchedOn
 */

var RemoteAudioTrack = function (_RemoteMediaAudioTrac) {
  _inherits(RemoteAudioTrack, _RemoteMediaAudioTrac);

  /**
   * Construct a {@link RemoteAudioTrack}.
   * @param {Track.SID} sid - The {@link RemoteAudioTrack}'s SID
   * @param {MediaTrackReceiver} mediaTrackReceiver - An audio MediaStreamTrack container
   * @param {boolean} isEnabled - Whether the {@link RemoteAudioTrack} is enabled
   * @param {{log: Log}} options - The {@link RemoteTrack} options
   */
  function RemoteAudioTrack(sid, mediaTrackReceiver, isEnabled, options) {
    _classCallCheck(this, RemoteAudioTrack);

    return _possibleConstructorReturn(this, (RemoteAudioTrack.__proto__ || Object.getPrototypeOf(RemoteAudioTrack)).call(this, sid, mediaTrackReceiver, isEnabled, options));
  }

  _createClass(RemoteAudioTrack, [{
    key: 'toString',
    value: function toString() {
      return '[RemoteAudioTrack #' + this._instanceId + ': ' + this.sid + ']';
    }
  }]);

  return RemoteAudioTrack;
}(RemoteMediaAudioTrack);

/**
 * The {@link RemoteAudioTrack} was disabled, i.e. "muted".
 * @param {RemoteAudioTrack} track - The {@link RemoteAudioTrack} that was
 *   disabled
 * @event RemoteAudioTrack#disabled
 */

/**
 * The {@link RemoteAudioTrack} was enabled, i.e. "unmuted".
 * @param {RemoteAudioTrack} track - The {@link RemoteAudioTrack} that was
 *   enabled
 * @event RemoteAudioTrack#enabled
 */

/**
 * The {@link RemoteAudioTrack} started. This means there is enough audio data
 * to begin playback.
 * @param {RemoteAudioTrack} track - The {@link RemoteAudioTrack} that started
 * @event RemoteAudioTrack#started
 */

/**
 * A {@link RemoteAudioTrack} was switched off.
 * @param {RemoteAudioTrack} track - The {@link RemoteAudioTrack} that was
 *   switched off
 * @event RemoteAudioTrack#switchedOff
 */

/**
 * A {@link RemoteAudioTrack} was switched on.
 * @param {RemoteAudioTrack} track - The {@link RemoteAudioTrack} that was
 *   switched on
 * @event RemoteAudioTrack#switchedOn
 */

module.exports = RemoteAudioTrack;
},{"./audiotrack":16,"./remotemediatrack":35}],32:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RemoteTrackPublication = require('./remotetrackpublication');

/**
 * A {@link RemoteAudioTrackPublication} represents a {@link RemoteAudioTrack}
 * that has been published to a {@link Room}.
 * @property {Track.Kind} kind - "audio"
 * @property {?RemoteAudioTrack} track - unless you have subscribed to the
 *   {@link RemoteAudioTrack}, this property is null
 * @emits RemoteAudioTrackPublication#subscribed
 * @emits RemoteAudioTrackPublication#subscriptionFailed
 * @emits RemoteAudioTrackPublication#trackDisabled
 * @emits RemoteAudioTrackPublication#trackEnabled
 * @emits RemoteAudioTrackPublication#unsubscribed
 */

var RemoteAudioTrackPublication = function (_RemoteTrackPublicati) {
  _inherits(RemoteAudioTrackPublication, _RemoteTrackPublicati);

  /**
   * Construct a {@link RemoteAudioTrackPublication}.
   * @param {RemoteTrackPublicationSignaling} signaling - {@link RemoteTrackPublication} signaling
   * @param {RemoteTrackPublicationOptions} options - {@link RemoteTrackPublication}
   *   options
   */
  function RemoteAudioTrackPublication(signaling, options) {
    _classCallCheck(this, RemoteAudioTrackPublication);

    return _possibleConstructorReturn(this, (RemoteAudioTrackPublication.__proto__ || Object.getPrototypeOf(RemoteAudioTrackPublication)).call(this, signaling, options));
  }

  _createClass(RemoteAudioTrackPublication, [{
    key: 'toString',
    value: function toString() {
      return '[RemoteAudioTrackPublication #' + this._instanceId + ': ' + this.trackSid + ']';
    }
  }]);

  return RemoteAudioTrackPublication;
}(RemoteTrackPublication);

/**
 * Your {@link LocalParticipant} subscribed to the {@link RemoteAudioTrack}.
 * @param {RemoteAudioTrack} track - the {@link RemoteAudioTrack} that was subscribed to
 * @event RemoteAudioTrackPublication#subscribed
 */

/**
 * Your {@link LocalParticipant} failed to subscribe to the {@link RemoteAudioTrack}.
 * @param {TwilioError} error - the reason the {@link RemoteAudioTrack} could not be
 *   subscribed to
 * @event RemoteAudioTrackPublication#subscriptionFailed
 */

/**
 * The {@link RemoteAudioTrack} was disabled.
 * @event RemoteAudioTrackPublication#trackDisabled
 */

/**
 * The {@link RemoteAudioTrack} was enabled.
 * @event RemoteAudioTrackPublication#trackEnabled
 */

/**
 * Your {@link LocalParticipant} unsubscribed from the {@link RemoteAudioTrack}.
 * @param {RemoteAudioTrack} track - the {@link RemoteAudioTrack} that was unsubscribed from
 * @event RemoteAudioTrackPublication#unsubscribed
 */

module.exports = RemoteAudioTrackPublication;
},{"./remotetrackpublication":36}],33:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Track = require('./');

/**
 * A {@link RemoteDataTrack} represents data published to a {@link Room} by a
 * {@link RemoteParticipant}.
 * @extends Track
 * @property {boolean} isEnabled - true
 * @property {boolean} isSubscribed - Whether the {@link RemoteDataTrack} is
 *   subscribed to
 * @property {Track.Kind} kind - "data"
 * @property {?number} maxPacketLifeTime - If non-null, this represents a time
 *   limit (in milliseconds) during which data will be transmitted or
 *   retransmitted if not acknowledged on the underlying RTCDataChannel.
 * @property {?number} maxRetransmits - If non-null, this represents the number
 *   of times the data will be retransmitted if not successfully received on the
 *   underlying RTCDataChannel.
 * @property {boolean} ordered - true if data on the {@link RemoteDataTrack} can
 *   be received out-of-order.
 * @property {boolean} reliable - This is true if both
 *   <code>maxPacketLifeTime</code> and <code>maxRetransmits</code> are set to
 *   null. In other words, if this is true, there is no bound on packet lifetime
 *   or the number of retransmits that will be attempted, ensuring "reliable"
 *   transmission.
 * @property {Track.SID} sid - The SID assigned to the {@link RemoteDataTrack}
 * @emits RemoteDataTrack#message
 * @emits RemoteDataTrack#switchedOff
 * @emits RemoteDataTrack#switchedOn
 */

var RemoteDataTrack = function (_Track) {
  _inherits(RemoteDataTrack, _Track);

  /**
   * Construct a {@link RemoteDataTrack} from a {@link DataTrackReceiver}.
   * @param {Track.SID} sid
   * @param {DataTrackReceiver} dataTrackReceiver
   * @param {{log: Log, name: ?string}} options
   */
  function RemoteDataTrack(sid, dataTrackReceiver, options) {
    _classCallCheck(this, RemoteDataTrack);

    var _this = _possibleConstructorReturn(this, (RemoteDataTrack.__proto__ || Object.getPrototypeOf(RemoteDataTrack)).call(this, dataTrackReceiver.id, 'data', options));

    Object.defineProperties(_this, {
      _isSwitchedOff: {
        value: false,
        writable: true
      },
      isEnabled: {
        enumerable: true,
        value: true
      },
      isSwitchedOff: {
        enumerable: true,
        get: function get() {
          return this._isSwitchedOff;
        }
      },
      maxPacketLifeTime: {
        enumerable: true,
        value: dataTrackReceiver.maxPacketLifeTime
      },
      maxRetransmits: {
        enumerable: true,
        value: dataTrackReceiver.maxRetransmits
      },
      ordered: {
        enumerable: true,
        value: dataTrackReceiver.ordered
      },
      reliable: {
        enumerable: true,
        value: dataTrackReceiver.maxPacketLifeTime === null && dataTrackReceiver.maxRetransmits === null
      },
      sid: {
        enumerable: true,
        value: sid
      }
    });

    dataTrackReceiver.on('message', function (data) {
      _this.emit('message', data, _this);
    });
    return _this;
  }

  /**
   * @private
   */


  _createClass(RemoteDataTrack, [{
    key: '_setEnabled',
    value: function _setEnabled() {}
    // Do nothing.


    /**
     * @private
     * @param {boolean} isSwitchedOff
     */

  }, {
    key: '_setSwitchedOff',
    value: function _setSwitchedOff(isSwitchedOff) {
      if (this._isSwitchedOff !== isSwitchedOff) {
        this._isSwitchedOff = isSwitchedOff;
        this.emit(isSwitchedOff ? 'switchedOff' : 'switchedOn', this);
      }
    }
  }]);

  return RemoteDataTrack;
}(Track);

/**
 * A message was received over the {@link RemoteDataTrack}.
 * @event RemoteDataTrack#message
 * @param {string|ArrayBuffer} data
 * @param {RemoteDataTrack} track - The {@link RemoteDataTrack} that received
 *   the message
 */

/**
 * A {@link RemoteDataTrack} was switched off.
 * @param {RemoteDataTrack} track - The {@link RemoteDataTrack} that was
 *   switched off
 * @event RemoteDataTrack#switchedOff
 */

/**
* A {@link RemoteDataTrack} was switched on.
* @param {RemoteDataTrack} track - The {@link RemoteDataTrack} that was
*   switched on
* @event RemoteDataTrack#switchedOn
*/

module.exports = RemoteDataTrack;
},{"./":20}],34:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RemoteTrackPublication = require('./remotetrackpublication');

/**
 * A {@link RemoteDataTrackPublication} represents a {@link RemoteDataTrack}
 * that has been published to a {@link Room}.
 * @property {Track.Kind} kind - "data"
 * @property {?RemoteDataTrack} track - unless you have subscribed to the
 *   {@link RemoteDataTrack}, this property is null
 * @emits RemoteDataTrackPublication#subscribed
 * @emits RemoteDataTrackPublication#subscriptionFailed
 * @emits RemoteDataTrackPublication#unsubscribed
 */

var RemoteDataTrackPublication = function (_RemoteTrackPublicati) {
  _inherits(RemoteDataTrackPublication, _RemoteTrackPublicati);

  /**
   * Construct a {@link RemoteDataTrackPublication}.
   * @param {RemoteTrackPublicationSignaling} signaling - {@link RemoteTrackPublication} signaling
   * @param {RemoteTrackPublicationOptions} options - {@link RemoteTrackPublication}
   *   options
   */
  function RemoteDataTrackPublication(signaling, options) {
    _classCallCheck(this, RemoteDataTrackPublication);

    return _possibleConstructorReturn(this, (RemoteDataTrackPublication.__proto__ || Object.getPrototypeOf(RemoteDataTrackPublication)).call(this, signaling, options));
  }

  _createClass(RemoteDataTrackPublication, [{
    key: 'toString',
    value: function toString() {
      return '[RemoteDataTrackPublication #' + this._instanceId + ': ' + this.trackSid + ']';
    }
  }]);

  return RemoteDataTrackPublication;
}(RemoteTrackPublication);

/**
 * Your {@link LocalParticipant} subscribed to the {@link RemoteDataTrack}.
 * @param {RemoteDataTrack} track - the {@link RemoteDataTrack} that was subscribed to
 * @event RemoteDataTrackPublication#subscribed
 */

/**
 * Your {@link LocalParticipant} failed to subscribe to the {@link RemoteDataTrack}.
 * @param {TwilioError} error - the reason the {@link RemoteDataTrack} could not be
 *   subscribed to
 * @event RemoteDataTrackPublication#subscriptionFailed
 */

/**
 * Your {@link LocalParticipant} unsubscribed from the {@link RemoteDataTrack}.
 * @param {RemoteDataTrack} track - the {@link RemoteDataTrack} that was unsubscribed from
 * @event RemoteDataTrackPublication#unsubscribed
 */

module.exports = RemoteDataTrackPublication;
},{"./remotetrackpublication":36}],35:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function mixinRemoteMediaTrack(AudioOrVideoTrack) {
  /**
   * A {@link RemoteMediaTrack} represents a {@link MediaTrack} published to a
   * {@link Room} by a {@link RemoteParticipant}.
   * @property {Track.SID} sid - The SID assigned to the {@link RemoteMediaTrack}
   * @emits RemoteMediaTrack#disabled
   * @emits RemoteMediaTrack#enabled
   * @emits RemoteMediaTrack#switchedOff
   * @emits RemoteMediaTrack#switchedOn
   */
  return function (_AudioOrVideoTrack) {
    _inherits(RemoteMediaTrack, _AudioOrVideoTrack);

    /**
     * Construct a {@link RemoteMediaTrack}.
     * @param {Track.SID} sid
     * @param {MediaTrackReceiver} mediaTrackReceiver
     * @param {boolean} isEnabled
     * @param {{log: Log, name: ?string}} options
     */
    function RemoteMediaTrack(sid, mediaTrackReceiver, isEnabled, options) {
      _classCallCheck(this, RemoteMediaTrack);

      var _this = _possibleConstructorReturn(this, (RemoteMediaTrack.__proto__ || Object.getPrototypeOf(RemoteMediaTrack)).call(this, mediaTrackReceiver, options));

      Object.defineProperties(_this, {
        _isEnabled: {
          value: isEnabled,
          writable: true
        },
        _isSwitchedOff: {
          value: false,
          writable: true
        },
        isEnabled: {
          enumerable: true,
          get: function get() {
            return this._isEnabled;
          }
        },
        isSwitchedOff: {
          enumerable: true,
          get: function get() {
            return this._isSwitchedOff;
          }
        },
        sid: {
          enumerable: true,
          value: sid
        }
      });
      return _this;
    }

    /**
     * @private
     * @param {boolean} isEnabled
     */


    _createClass(RemoteMediaTrack, [{
      key: '_setEnabled',
      value: function _setEnabled(isEnabled) {
        if (this._isEnabled !== isEnabled) {
          this._isEnabled = isEnabled;
          this.emit(this._isEnabled ? 'enabled' : 'disabled', this);
        }
      }

      /**
       * @private
       * @param {boolean} isSwitchedOff
       */

    }, {
      key: '_setSwitchedOff',
      value: function _setSwitchedOff(isSwitchedOff) {
        if (this._isSwitchedOff !== isSwitchedOff) {
          this._isSwitchedOff = isSwitchedOff;
          this.emit(isSwitchedOff ? 'switchedOff' : 'switchedOn', this);
        }
      }
    }]);

    return RemoteMediaTrack;
  }(AudioOrVideoTrack);
}

/**
 * A {@link RemoteMediaTrack} was disabled.
 * @param {RemoteMediaTrack} track - The {@link RemoteMediaTrack} that was
 *   disabled
 * @event RemoteMediaTrack#disabled
 */

/**
 * A {@link RemoteMediaTrack} was enabled.
 * @param {RemoteMediaTrack} track - The {@link RemoteMediaTrack} that was
 *   enabled
 * @event RemoteMediaTrack#enabled
 */

/**
* A {@link RemoteMediaTrack} was switched off.
* @param {RemoteMediaTrack} track - The {@link RemoteMediaTrack} that was
*   switched off
* @event RemoteMediaTrack#switchedOff
*/

/**
 * A {@link RemoteMediaTrack} was switched on.
 * @param {RemoteMediaTrack} track - The {@link RemoteMediaTrack} that was
 *   switched on
 * @event RemoteMediaTrack#switchedOn
 */

module.exports = mixinRemoteMediaTrack;
},{}],36:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TrackPublication = require('./trackpublication');

/**
 * A {@link RemoteTrackPublication} represents a {@link RemoteTrack} that has
 * been published to a {@link Room}.
 * @property {boolean} isSubscribed - whether the published {@link RemoteTrack}
 *   is subscribed to
 * @property {boolean} isTrackEnabled - whether the published
 *   {@link RemoteTrack} is enabled
 * @property {Track.Kind} kind - kind of the published {@link RemoteTrack}
 * @property {Track.Priority} publishPriority - the priority of the published
 *   {@link RemoteTrack} set by the {@link RemoteParticipant}
 * @property {?RemoteTrack} track - Unless you have subscribed to the
 *   {@link RemoteTrack}, this property is null
 * @emits RemoteTrackPublication#subscribed
 * @emits RemoteTrackPublication#subscriptionFailed
 * @emits RemoteTrackPublication#trackDisabled
 * @emits RemoteTrackPublication#trackEnabled
 * @emits RemoteTrackPublication#unsubscribed
 */

var RemoteTrackPublication = function (_TrackPublication) {
  _inherits(RemoteTrackPublication, _TrackPublication);

  /**
   * Construct a {@link RemoteTrackPublication}.
   * @param {RemoteTrackPublicationSignaling} signaling - {@link RemoteTrackPublication} signaling
   * @param {RemoteTrackPublicationOptions} options - {@link RemoteTrackPublication}
   *   options
   */
  function RemoteTrackPublication(signaling, options) {
    _classCallCheck(this, RemoteTrackPublication);

    var _this = _possibleConstructorReturn(this, (RemoteTrackPublication.__proto__ || Object.getPrototypeOf(RemoteTrackPublication)).call(this, signaling.name, signaling.sid, options));

    Object.defineProperties(_this, {
      _signaling: {
        value: signaling
      },
      _track: {
        value: null,
        writable: true
      },
      isSubscribed: {
        enumerable: true,
        get: function get() {
          return !!this._track;
        }
      },
      isTrackEnabled: {
        enumerable: true,
        get: function get() {
          return this._signaling.isEnabled;
        }
      },
      kind: {
        enumerable: true,
        value: signaling.kind
      },
      publishPriority: {
        enumerable: true,
        value: signaling.priority
      },
      track: {
        enumerable: true,
        get: function get() {
          return this._track;
        }
      }
    });

    var error = null;
    var isEnabled = void 0;
    var isSwitchedOff = false;

    signaling.on('updated', function () {
      if (error !== signaling.error) {
        error = signaling.error;
        _this.emit('subscriptionFailed', signaling.error);
        return;
      }
      if (isEnabled !== signaling.isEnabled) {
        isEnabled = signaling.isEnabled;
        if (_this.track) {
          _this.track._setEnabled(signaling.isEnabled);
        }
        _this.emit(signaling.isEnabled ? 'trackEnabled' : 'trackDisabled');
      }
      if (isSwitchedOff !== signaling.isSwitchedOff) {
        isSwitchedOff = signaling.isSwitchedOff;
        if (_this.track) {
          _this.track._setSwitchedOff(signaling.isSwitchedOff);
        }
      }
    });
    return _this;
  }

  _createClass(RemoteTrackPublication, [{
    key: 'toString',
    value: function toString() {
      return '[RemoteTrackPublication #' + this._instanceId + ': ' + this.trackSid + ']';
    }

    /**
     * @private
     * @param {RemoteTrack} track
     */

  }, {
    key: '_subscribed',
    value: function _subscribed(track) {
      if (!this._track && track) {
        this._track = track;
        this.emit('subscribed', track);
      }
    }

    /**
     * @private
     */

  }, {
    key: '_unsubscribe',
    value: function _unsubscribe() {
      if (this._track) {
        var track = this._track;
        this._track = null;
        this.emit('unsubscribed', track);
      }
    }
  }]);

  return RemoteTrackPublication;
}(TrackPublication);

/**
 * Your {@link LocalParticipant} subscribed to the {@link RemoteTrack}.
 * @param {RemoteTrack} track - the {@link RemoteTrack} that was subscribed to
 * @event RemoteTrackPublication#subscribed
 */

/**
 * Your {@link LocalParticipant} failed to subscribe to the {@link RemoteTrack}.
 * @param {TwilioError} error - the reason the {@link RemoteTrack} could not be
 *   subscribed to
 * @event RemoteTrackPublication#subscriptionFailed
 */

/**
 * The {@link RemoteTrack} was disabled.
 * @event RemoteTrackPublication#trackDisabled
 */

/**
 * The {@link RemoteTrack} was enabled.
 * @event RemoteTrackPublication#trackEnabled
 */

/**
* Your {@link LocalParticipant} unsubscribed from the {@link RemoteTrack}.
* @param {RemoteTrack} track - the {@link RemoteTrack} that was unsubscribed from
* @event RemoteTrackPublication#unsubscribed
*/

/**
 * {@link RemoteTrackPublication} options
 * @typedef {object} RemoteTrackPublicationOptions
 * @property {LogLevel|LogLevels} logLevel - Log level for 'media' modules
 */

module.exports = RemoteTrackPublication;
},{"./trackpublication":40}],37:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var mixinRemoteMediaTrack = require('./remotemediatrack');
var VideoTrack = require('./videotrack');

var RemoteMediaVideoTrack = mixinRemoteMediaTrack(VideoTrack);

/**
 * A {@link RemoteVideoTrack} represents a {@link VideoTrack} published to a
 * {@link Room} by a {@link RemoteParticipant}.
 * @extends VideoTrack
 * @property {Track.SID} sid - The {@link RemoteVideoTrack}'s SID
 * @emits RemoteVideoTrack#dimensionsChanged
 * @emits RemoteVideoTrack#disabled
 * @emits RemoteVideoTrack#enabled
 * @emits RemoteVideoTrack#started
 * @emits RemoteVideoTrack#switchedOff
 * @emits RemoteVideoTrack#switchedOn
 */

var RemoteVideoTrack = function (_RemoteMediaVideoTrac) {
  _inherits(RemoteVideoTrack, _RemoteMediaVideoTrac);

  /**
   * Construct a {@link RemoteVideoTrack}.
   * @param {Track.SID} sid - The {@link RemoteVideoTrack}'s SID
   * @param {MediaTrackReceiver} mediaTrackReceiver - A video MediaStreamTrack container
   * @param {boolean} isEnabled - whether the {@link RemoteAudioTrack} is enabled
   * @param {{log: Log}} options - The {@link RemoteTrack} options
   */
  function RemoteVideoTrack(sid, mediaTrackReceiver, isEnabled, options) {
    _classCallCheck(this, RemoteVideoTrack);

    return _possibleConstructorReturn(this, (RemoteVideoTrack.__proto__ || Object.getPrototypeOf(RemoteVideoTrack)).call(this, sid, mediaTrackReceiver, isEnabled, options));
  }

  _createClass(RemoteVideoTrack, [{
    key: 'toString',
    value: function toString() {
      return '[RemoteVideoTrack #' + this._instanceId + ': ' + this.sid + ']';
    }
  }]);

  return RemoteVideoTrack;
}(RemoteMediaVideoTrack);

/**
 * The {@link RemoteVideoTrack}'s dimensions changed.
 * @param {RemoteVideoTrack} track - The {@link RemoteVideoTrack} whose
 *   dimensions changed
 * @event RemoteVideoTrack#dimensionsChanged
 */

/**
 * The {@link RemoteVideoTrack} was disabled, i.e. "paused".
 * @param {RemoteVideoTrack} track - The {@link RemoteVideoTrack} that was
 *   disabled
 * @event RemoteVideoTrack#disabled
 */

/**
 * The {@link RemoteVideoTrack} was enabled, i.e. "unpaused".
 * @param {RemoteVideoTrack} track - The {@link RemoteVideoTrack} that was
 *   enabled
 * @event RemoteVideoTrack#enabled
 */

/**
 * The {@link RemoteVideoTrack} started. This means there is enough video data
 * to begin playback.
 * @param {RemoteVideoTrack} track - The {@link RemoteVideoTrack} that started
 * @event RemoteVideoTrack#started
 */

/**
 * A {@link RemoteVideoTrack} was switched off.
 * @param {RemoteVideoTrack} track - The {@link RemoteVideoTrack} that was
 *   switched off
 * @event RemoteVideoTrack#switchedOff
 */

/**
 * A {@link RemoteVideoTrack} was switched on.
 * @param {RemoteVideoTrack} track - The {@link RemoteVideoTrack} that was
 *   switched on
 * @event RemoteVideoTrack#switchedOn
 */

module.exports = RemoteVideoTrack;
},{"./remotemediatrack":35,"./videotrack":42}],38:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RemoteTrackPublication = require('./remotetrackpublication');

/**
 * A {@link RemoteVideoTrackPublication} represents a {@link RemoteVideoTrack}
 * that has been published to a {@link Room}.
 * @property {Track.Kind} kind - "video"
 * @property {?RemoteVideoTrack} track - unless you have subscribed to the
 *   {@link RemoteVideoTrack}, this property is null
 * @emits RemoteVideoTrackPublication#subscribed
 * @emits RemoteVideoTrackPublication#subscriptionFailed
 * @emits RemoteVideoTrackPublication#trackDisabled
 * @emits RemoteVideoTrackPublication#trackEnabled
 * @emits RemoteVideoTrackPublication#unsubscribed
 */

var RemoteVideoTrackPublication = function (_RemoteTrackPublicati) {
  _inherits(RemoteVideoTrackPublication, _RemoteTrackPublicati);

  /**
   * Construct a {@link RemoteVideoTrackPublication}.
   * @param {RemoteTrackPublicationSignaling} signaling - {@link RemoteTrackPublication} signaling
   * @param {RemoteTrackPublicationOptions} options - {@link RemoteTrackPublication}
   *   options
   */
  function RemoteVideoTrackPublication(signaling, options) {
    _classCallCheck(this, RemoteVideoTrackPublication);

    return _possibleConstructorReturn(this, (RemoteVideoTrackPublication.__proto__ || Object.getPrototypeOf(RemoteVideoTrackPublication)).call(this, signaling, options));
  }

  _createClass(RemoteVideoTrackPublication, [{
    key: 'toString',
    value: function toString() {
      return '[RemoteVideoTrackPublication #' + this._instanceId + ': ' + this.trackSid + ']';
    }
  }]);

  return RemoteVideoTrackPublication;
}(RemoteTrackPublication);

/**
 * Your {@link LocalParticipant} subscribed to the {@link RemoteVideoTrack}.
 * @param {RemoteVideoTrack} track - the {@link RemoteVideoTrack} that was subscribed to
 * @event RemoteVideoTrackPublication#subscribed
 */

/**
 * Your {@link LocalParticipant} failed to subscribe to the {@link RemoteVideoTrack}.
 * @param {TwilioError} error - the reason the {@link RemoteVideoTrack} could not be
 *   subscribed to
 * @event RemoteVideoTrackPublication#subscriptionFailed
 */

/**
 * The {@link RemoteVideoTrack} was disabled.
 * @event RemoteVideoTrackPublication#trackDisabled
 */

/**
 * The {@link RemoteVideoTrack} was enabled.
 * @event RemoteVideoTrackPublication#trackEnabled
 */

/**
 * Your {@link LocalParticipant} unsubscribed from the {@link RemoteVideoTrack}.
 * @param {RemoteVideoTrack} track - the {@link RemoteVideoTrack} that was unsubscribed from
 * @event RemoteVideoTrackPublication#unsubscribed
 */

module.exports = RemoteVideoTrackPublication;
},{"./remotetrackpublication":36}],39:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MediaTrackTransceiver = require('./transceiver');

/**
 * A {@link MediaTrackSender} represents one or more local RTCRtpSenders.
 * @extends MediaTrackTransceiver
 */

var MediaTrackSender = function (_MediaTrackTransceive) {
  _inherits(MediaTrackSender, _MediaTrackTransceive);

  /**
   * Construct a {@link MediaTrackSender}.
   * @param {MediaStreamTrack} mediaStreamTrack
   */
  function MediaTrackSender(mediaStreamTrack) {
    _classCallCheck(this, MediaTrackSender);

    var _this = _possibleConstructorReturn(this, (MediaTrackSender.__proto__ || Object.getPrototypeOf(MediaTrackSender)).call(this, mediaStreamTrack.id, mediaStreamTrack));

    Object.defineProperties(_this, {
      _senders: {
        value: new Set()
      }
    });
    return _this;
  }

  /**
   * Return a new {@link MediaTrackSender} containing a clone of the underlying
   * MediaStreamTrack. No RTCRtpSenders are copied.
   * @returns {MediaTrackSender}
   */


  _createClass(MediaTrackSender, [{
    key: 'clone',
    value: function clone() {
      return new MediaTrackSender(this.track.clone());
    }

    /**
     * Add an RTCRtpSender.
     * @param {RTCRtpSender} sender
     * @returns {this}
     */

  }, {
    key: 'addSender',
    value: function addSender(sender) {
      this._senders.add(sender);
      return this;
    }

    /**
     * Remove an RTCRtpSender.
     * @param {RTCRtpSender} sender
     * @returns {this}
     */

  }, {
    key: 'removeSender',
    value: function removeSender(sender) {
      this._senders.delete(sender);
      return this;
    }
  }]);

  return MediaTrackSender;
}(MediaTrackTransceiver);

module.exports = MediaTrackSender;
},{"./transceiver":41}],40:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('../../eventemitter');

var _require = require('../../util'),
    buildLogLevels = _require.buildLogLevels,
    valueToJSON = _require.valueToJSON;

var _require2 = require('../../util/constants'),
    DEFAULT_LOG_LEVEL = _require2.DEFAULT_LOG_LEVEL;

var Log = require('../../util/log');
var nInstances = 0;

/**
 * A {@link TrackPublication} represents a {@link Track} that
 * has been published to a {@link Room}.
 * @property {string} trackName - the published {@link Track}'s name
 * @property {Track.SID} trackSid - SID assigned to the published {@link Track}
 * @emits TrackPublication#trackDisabled
 * @emits TrackPublication#trackEnabled
 */

var TrackPublication = function (_EventEmitter) {
  _inherits(TrackPublication, _EventEmitter);

  /**
   * Construct a {@link TrackPublication}.
   * @param {string} trackName - the published {@link Track}'s name
   * @param {Track.SID} trackSid - SID assigned to the {@link Track}
   * @param {TrackPublicationOptions} options - {@link TrackPublication} options
   */
  function TrackPublication(trackName, trackSid, options) {
    _classCallCheck(this, TrackPublication);

    var _this = _possibleConstructorReturn(this, (TrackPublication.__proto__ || Object.getPrototypeOf(TrackPublication)).call(this));

    options = Object.assign({
      logLevel: DEFAULT_LOG_LEVEL
    }, options);

    var logLevels = buildLogLevels(options.logLevel);

    Object.defineProperties(_this, {
      _instanceId: {
        value: nInstances++
      },
      _log: {
        value: options.log || new Log('default', _this, logLevels)
      },
      trackName: {
        enumerable: true,
        value: trackName
      },
      trackSid: {
        enumerable: true,
        value: trackSid
      }
    });
    return _this;
  }

  _createClass(TrackPublication, [{
    key: 'toJSON',
    value: function toJSON() {
      return valueToJSON(this);
    }
  }, {
    key: 'toString',
    value: function toString() {
      return '[TrackPublication #' + this._instanceId + ': ' + this.trackSid + ']';
    }
  }]);

  return TrackPublication;
}(EventEmitter);

/**
 * The published {@link Track} was disabled.
 * @event TrackPublication#trackDisabled
 */

/**
 * The published {@link Track} was enabled.
 * @event TrackPublication#trackEnabled
 */

/**
 * A {@link LocalAudioTrackPublication} or a {@link RemoteAudioTrackPublication}.
 * @typedef {LocalAudioTrackPublication|RemoteAudioTrackPublication} AudioTrackPublication
 */

/**
 * A {@link LocalDataTrackPublication} or a {@link RemoteDataTrackPublication}.
 * @typedef {LocalDataTrackPublication|RemoteDataTrackPublication} DataTrackPublication
 */

/**
 * A {@link LocalVideoTrackPublication} or a {@link RemoteVideoTrackPublication}.
 * @typedef {LocalVideoTrackPublication|RemoteVideoTrackPublication} VideoTrackPublication
 */

/**
 * {@link TrackPublication} options
 * @typedef {object} TrackPublicationOptions
 * @property {LogLevel|LogLevels} logLevel - Log level for 'media' modules
 */

module.exports = TrackPublication;
},{"../../eventemitter":11,"../../util":112,"../../util/constants":110,"../../util/log":115}],41:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TrackTransceiver = require('../../transceiver');

/**
 * A {@link MediaTrackTransceiver} represents either one or more local
 * RTCRtpSenders, or a single RTCRtpReceiver.
 * @extends TrackTransceiver
 * @property {MediaStreamTrack} track
 */

var MediaTrackTransceiver = function (_TrackTransceiver) {
  _inherits(MediaTrackTransceiver, _TrackTransceiver);

  /**
   * Construct a {@link MediaTrackTransceiver}.
   * @param {Track.ID} id - The MediaStreamTrack ID signaled through RSP/SDP
   * @param {MediaStreamTrack} mediaStreamTrack
   */
  function MediaTrackTransceiver(id, mediaStreamTrack) {
    _classCallCheck(this, MediaTrackTransceiver);

    var _this = _possibleConstructorReturn(this, (MediaTrackTransceiver.__proto__ || Object.getPrototypeOf(MediaTrackTransceiver)).call(this, id, mediaStreamTrack.kind));

    Object.defineProperties(_this, {
      readyState: {
        enumerable: true,
        get: function get() {
          return mediaStreamTrack.readyState;
        }
      },
      track: {
        enumerable: true,
        value: mediaStreamTrack
      }
    });
    return _this;
  }

  _createClass(MediaTrackTransceiver, [{
    key: 'stop',
    value: function stop() {
      this.track.stop();
      _get(MediaTrackTransceiver.prototype.__proto__ || Object.getPrototypeOf(MediaTrackTransceiver.prototype), 'stop', this).call(this);
    }
  }]);

  return MediaTrackTransceiver;
}(TrackTransceiver);

module.exports = MediaTrackTransceiver;
},{"../../transceiver":106}],42:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MediaTrack = require('./mediatrack');

/**
 * A {@link VideoTrack} is a {@link Track} representing video.
 * @extends Track
 * @property {boolean} isStarted - Whether or not the {@link VideoTrack} has
 *   started; if the {@link VideoTrack} started, there is enough video data to
 *   begin playback
 * @property {boolean} isEnabled - Whether or not the {@link VideoTrack} is
 *   enabled; if the {@link VideoTrack} is not enabled, it is "paused"
 * @property {VideoTrack.Dimensions} dimensions - The {@link VideoTrack}'s
 *   {@link VideoTrack.Dimensions}
 * @property {Track.Kind} kind - "video"
 * @property {MediaStreamTrack} mediaStreamTrack - A video MediaStreamTrack
 * @emits VideoTrack#dimensionsChanged
 * @emits VideoTrack#disabled
 * @emits VideoTrack#enabled
 * @emits VideoTrack#started
 */

var VideoTrack = function (_MediaTrack) {
  _inherits(VideoTrack, _MediaTrack);

  /**
   * Construct a {@link VideoTrack}.
   * @param {MediaTrackTransceiver} mediaTrackTransceiver
   * @param {{log: Log}} options
   */
  function VideoTrack(mediaTrackTransceiver, options) {
    var _ret;

    _classCallCheck(this, VideoTrack);

    var _this = _possibleConstructorReturn(this, (VideoTrack.__proto__ || Object.getPrototypeOf(VideoTrack)).call(this, mediaTrackTransceiver, options));

    Object.defineProperties(_this, {
      dimensions: {
        enumerable: true,
        value: {
          width: null,
          height: null
        }
      }
    });
    return _ret = _this, _possibleConstructorReturn(_this, _ret);
  }

  /**
   * @private
   */


  _createClass(VideoTrack, [{
    key: '_initialize',
    value: function _initialize() {
      var _this2 = this;

      _get(VideoTrack.prototype.__proto__ || Object.getPrototypeOf(VideoTrack.prototype), '_initialize', this).call(this);
      if (this._dummyEl) {
        this._dummyEl.onloadedmetadata = function () {
          if (dimensionsChanged(_this2, _this2._dummyEl)) {
            _this2.dimensions.width = _this2._dummyEl.videoWidth;
            _this2.dimensions.height = _this2._dummyEl.videoHeight;
          }
        };
        this._dummyEl.onresize = function () {
          if (dimensionsChanged(_this2, _this2._dummyEl)) {
            _this2.dimensions.width = _this2._dummyEl.videoWidth;
            _this2.dimensions.height = _this2._dummyEl.videoHeight;
            if (_this2.isStarted) {
              _this2._log.debug('Dimensions changed:', _this2.dimensions);
              _this2.emit(VideoTrack.DIMENSIONS_CHANGED, _this2);
            }
          }
        };
      }
    }

    /**
     * @private
     */

  }, {
    key: '_start',
    value: function _start(dummyEl) {
      this.dimensions.width = dummyEl.videoWidth;
      this.dimensions.height = dummyEl.videoHeight;

      this._log.debug('Dimensions:', this.dimensions);
      return _get(VideoTrack.prototype.__proto__ || Object.getPrototypeOf(VideoTrack.prototype), '_start', this).call(this, dummyEl);
    }

    /**
     * Create an HTMLVideoElement and attach the {@link VideoTrack} to it.
     *
     * The HTMLVideoElement's <code>srcObject</code> will be set to a new
     * MediaStream containing the {@link VideoTrack}'s MediaStreamTrack.
     *
     * @returns {HTMLVideoElement} videoElement
     * @example
     * const Video = require('twilio-video');
     *
     * Video.createLocalVideoTrack().then(function(videoTrack) {
     *   const videoElement = videoTrack.attach();
     *   document.body.appendChild(videoElement);
     * });
    */ /**
       * Attach the {@link VideoTrack} to an existing HTMLMediaElement. The
       * HTMLMediaElement could be an HTMLAudioElement or an HTMLVideoElement.
       *
       * If the HTMLMediaElement's <code>srcObject</code> is not set to a MediaStream,
       * this method sets it to a new MediaStream containing the {@link VideoTrack}'s
       * MediaStreamTrack; otherwise, it adds the {@link MediaTrack}'s
       * MediaStreamTrack to the existing MediaStream. Finally, if there are any other
       * MediaStreamTracks of the same kind on the MediaStream, this method removes
       * them.
       *
       * @param {HTMLMediaElement} mediaElement - The HTMLMediaElement to attach to
       * @returns {HTMLMediaElement} mediaElement
       * @example
       * const Video = require('twilio-video');
       *
       * const videoElement = document.createElement('video');
       * document.body.appendChild(videoElement);
       *
       * Video.createLocalVideoTrack().then(function(videoTrack) {
       *   videoTrack.attach(videoElement);
       * });
       */ /**
          * Attach the {@link VideoTrack} to an HTMLMediaElement selected by
          * <code>document.querySelector</code>. The HTMLMediaElement could be an
          * HTMLAudioElement or an HTMLVideoElement.
          *
          * If the HTMLMediaElement's <code>srcObject</code> is not set to a MediaStream,
          * this method sets it to a new MediaStream containing the {@link VideoTrack}'s
          * MediaStreamTrack; otherwise, it adds the {@link VideoTrack}'s
          * MediaStreamTrack to the existing MediaStream. Finally, if there are any other
          * MediaStreamTracks of the same kind on the MediaStream, this method removes
          * them.
          *
          * @param {string} selector - A query selector for the HTMLMediaElement to
          *   attach to
          * @returns {HTMLMediaElement} mediaElement
          * @example
          * const Video = require('twilio-video');
          *
          * const videoElement = document.createElement('video');
          * videoElement.id = 'my-video-element';
          * document.body.appendChild(videoElement);
          *
          * Video.createLocalVideoTrack().then(function(track) {
          *   track.attach('#my-video-element');
          * });
          */

  }, {
    key: 'attach',
    value: function attach() {
      return _get(VideoTrack.prototype.__proto__ || Object.getPrototypeOf(VideoTrack.prototype), 'attach', this).apply(this, arguments);
    }

    /**
     * Detach the {@link VideoTrack} from all previously attached HTMLMediaElements.
     * @returns {Array<HTMLMediaElement>} mediaElements
     * @example
     * const mediaElements = videoTrack.detach();
     * mediaElements.forEach(mediaElement => mediaElement.remove());
    */ /**
       * Detach the {@link VideoTrack} from a previously attached HTMLMediaElement.
       * @param {HTMLMediaElement} mediaElement - One of the HTMLMediaElements to
       *   which the {@link VideoTrack} is attached
       * @returns {HTMLMediaElement} mediaElement
       * @example
       * const videoElement = document.getElementById('my-video-element');
       * videoTrack.detach(videoElement).remove();
       */ /**
          * Detach the {@link VideoTrack} from a previously attached HTMLMediaElement
          *   specified by <code>document.querySelector</code>.
          * @param {string} selector - The query selector of HTMLMediaElement to which
          *    the {@link VideoTrack} is attached
          * @returns {HTMLMediaElement} mediaElement
          * @example
          * videoTrack.detach('#my-video-element').remove();
          */

  }, {
    key: 'detach',
    value: function detach() {
      return _get(VideoTrack.prototype.__proto__ || Object.getPrototypeOf(VideoTrack.prototype), 'detach', this).apply(this, arguments);
    }
  }]);

  return VideoTrack;
}(MediaTrack);

VideoTrack.DIMENSIONS_CHANGED = 'dimensionsChanged';

function dimensionsChanged(track, elem) {
  return track.dimensions.width !== elem.videoWidth || track.dimensions.height !== elem.videoHeight;
}

/**
 * A {@link VideoTrack}'s width and height.
 * @typedef {object} VideoTrack.Dimensions
 * @property {?number} width - The {@link VideoTrack}'s width or null if the
 *   {@link VideoTrack} has not yet started
 * @property {?number} height - The {@link VideoTrack}'s height or null if the
 *   {@link VideoTrack} has not yet started
 */

/**
 * The {@link VideoTrack}'s dimensions changed.
 * @param {VideoTrack} track - The {@link VideoTrack} whose dimensions changed
 * @event VideoTrack#dimensionsChanged
 */

/**
 * The {@link VideoTrack} was disabled, i.e. "paused".
 * @param {VideoTrack} track - The {@link VideoTrack} that was disabled
 * @event VideoTrack#disabled
 */

/**
 * The {@link VideoTrack} was enabled, i.e. "unpaused".
 * @param {VideoTrack} track - The {@link VideoTrack} that was enabled
 * @event VideoTrack#enabled
 */

/**
 * The {@link VideoTrack} started. This means there is enough video data to
 * begin playback.
 * @param {VideoTrack} track - The {@link VideoTrack} that started
 * @event VideoTrack#started
 */

module.exports = VideoTrack;
},{"./mediatrack":29}],43:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('events'),
    EventEmitter = _require.EventEmitter;

var _require2 = require('./util/constants'),
    DEFAULT_NQ_LEVEL_LOCAL = _require2.DEFAULT_NQ_LEVEL_LOCAL,
    DEFAULT_NQ_LEVEL_REMOTE = _require2.DEFAULT_NQ_LEVEL_REMOTE,
    MAX_NQ_LEVEL = _require2.MAX_NQ_LEVEL;

var _require3 = require('./util'),
    inRange = _require3.inRange;

/**
 * {@link NetworkQualityConfigurationImpl} represents an object which notifies its
 * listeners of any changes in the values of its properties.
 * @extends EventEmitter
 * @implements NetworkQualityConfiguration
 * @property {?NetworkQualityVerbosity} local - Verbosity level for {@link LocalParticipant}
 * @property {?NetworkQualityVerbosity} remote - Verbosity level for {@link RemoteParticipant}s
 */


var NetworkQualityConfigurationImpl = function (_EventEmitter) {
  _inherits(NetworkQualityConfigurationImpl, _EventEmitter);

  /**
   * Construct an {@link NetworkQualityConfigurationImpl}.
   * @param {NetworkQualityConfiguration} networkQualityConfiguration - Initial {@link NetworkQualityConfiguration}
   */
  function NetworkQualityConfigurationImpl(networkQualityConfiguration) {
    _classCallCheck(this, NetworkQualityConfigurationImpl);

    var _this = _possibleConstructorReturn(this, (NetworkQualityConfigurationImpl.__proto__ || Object.getPrototypeOf(NetworkQualityConfigurationImpl)).call(this));

    networkQualityConfiguration = Object.assign({
      local: DEFAULT_NQ_LEVEL_LOCAL,
      remote: DEFAULT_NQ_LEVEL_REMOTE
    }, networkQualityConfiguration);

    Object.defineProperties(_this, {
      local: {
        value: inRange(networkQualityConfiguration.local, DEFAULT_NQ_LEVEL_LOCAL, MAX_NQ_LEVEL) ? networkQualityConfiguration.local : DEFAULT_NQ_LEVEL_LOCAL,
        writable: true
      },
      remote: {
        value: inRange(networkQualityConfiguration.remote, DEFAULT_NQ_LEVEL_REMOTE, MAX_NQ_LEVEL) ? networkQualityConfiguration.remote : DEFAULT_NQ_LEVEL_REMOTE,
        writable: true
      }
    });
    return _this;
  }

  /**
   * Update the verbosity levels for network quality information for
   * {@link LocalParticipant} and {@link RemoteParticipant} with those
   * in the given {@link NetworkQualityConfiguration}.
   * @param {NetworkQualityConfiguration} networkQualityConfiguration - The new {@link NetworkQualityConfiguration}
   */


  _createClass(NetworkQualityConfigurationImpl, [{
    key: 'update',
    value: function update(networkQualityConfiguration) {
      var _this2 = this;

      networkQualityConfiguration = Object.assign({
        local: this.local,
        remote: this.remote
      }, networkQualityConfiguration);

      [['local', DEFAULT_NQ_LEVEL_LOCAL, 3], ['remote', DEFAULT_NQ_LEVEL_REMOTE, 3]].forEach(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 3),
            localOrRemote = _ref2[0],
            min = _ref2[1],
            max = _ref2[2];

        _this2[localOrRemote] = typeof networkQualityConfiguration[localOrRemote] === 'number' && inRange(networkQualityConfiguration[localOrRemote], min, max) ? networkQualityConfiguration[localOrRemote] : min;
      });
    }
  }]);

  return NetworkQualityConfigurationImpl;
}(EventEmitter);

module.exports = NetworkQualityConfigurationImpl;
},{"./util":112,"./util/constants":110,"events":149}],44:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('./eventemitter');
var RemoteAudioTrack = require('./media/track/remoteaudiotrack');
var RemoteAudioTrackPublication = require('./media/track/remoteaudiotrackpublication');
var RemoteDataTrack = require('./media/track/remotedatatrack');
var RemoteDataTrackPublication = require('./media/track/remotedatatrackpublication');
var RemoteVideoTrack = require('./media/track/remotevideotrack');
var RemoteVideoTrackPublication = require('./media/track/remotevideotrackpublication');
var util = require('./util');

var nInstances = 0;

/**
 * {@link NetworkQualityLevel} is a value from 0–5, inclusive, representing the
 * quality of a network connection.
 * @typedef {number} NetworkQualityLevel
 */

/**
 * @extends EventEmitter
 * @property {Map<Track.SID, AudioTrackPublication>} audioTracks -
 *    The {@link Participant}'s {@link AudioTrackPublication}s
 * @property {Map<Track.SID, DataTrackPublication>} dataTracks -
 *    The {@link Participant}'s {@link DataTrackPublication}s.
 * @property {Participant.Identity} identity - The identity of the {@link Participant}
 * @property {?NetworkQualityLevel} networkQualityLevel - The
 *    {@link Participant}'s current {@link NetworkQualityLevel}, if any
 * @property {?NetworkQualityStats} networkQualityStats - The
 *    {@link Participant}'s current {@link NetworkQualityStats}, if any
 * @property {Participant.SID} sid - The {@link Participant}'s SID
 * @property {string} state - "connected", "disconnected" or "failed"
 * @property {Map<Track.SID, TrackPublication>} tracks -
 *    The {@link Participant}'s {@link TrackPublication}s
 * @property {Map<Track.SID, VideoTrackPublication>} videoTracks -
 *    The {@link Participant}'s {@link VideoTrackPublication}s
 * @emits Participant#disconnected
 * @emits Particiapnt#networkQualityLevelChanged
 * @emits Participant#trackDimensionsChanged
 * @emits Participant#trackStarted
 */

var Participant = function (_EventEmitter) {
  _inherits(Participant, _EventEmitter);

  /**
   * Construct a {@link Participant}.
   * @param {ParticipantSignaling} signaling
   * @param {object} [options]
   */
  function Participant(signaling, options) {
    _classCallCheck(this, Participant);

    var _this = _possibleConstructorReturn(this, (Participant.__proto__ || Object.getPrototypeOf(Participant)).call(this));

    options = Object.assign({
      RemoteAudioTrack: RemoteAudioTrack,
      RemoteAudioTrackPublication: RemoteAudioTrackPublication,
      RemoteDataTrack: RemoteDataTrack,
      RemoteDataTrackPublication: RemoteDataTrackPublication,
      RemoteVideoTrack: RemoteVideoTrack,
      RemoteVideoTrackPublication: RemoteVideoTrackPublication,
      tracks: []
    }, options);

    var indexed = indexTracksById(options.tracks);
    var log = options.log.createLog('default', _this);
    var audioTracks = new Map(indexed.audioTracks);
    var dataTracks = new Map(indexed.dataTracks);
    var tracks = new Map(indexed.tracks);
    var videoTracks = new Map(indexed.videoTracks);

    Object.defineProperties(_this, {
      _RemoteAudioTrack: {
        value: options.RemoteAudioTrack
      },
      _RemoteAudioTrackPublication: {
        value: options.RemoteAudioTrackPublication
      },
      _RemoteDataTrack: {
        value: options.RemoteDataTrack
      },
      _RemoteDataTrackPublication: {
        value: options.RemoteDataTrackPublication
      },
      _RemoteVideoTrack: {
        value: options.RemoteVideoTrack
      },
      _RemoteVideoTrackPublication: {
        value: options.RemoteVideoTrackPublication
      },
      _audioTracks: {
        value: audioTracks
      },
      _dataTracks: {
        value: dataTracks
      },
      _instanceId: {
        value: ++nInstances
      },
      _log: {
        value: log
      },
      _signaling: {
        value: signaling
      },
      _tracks: {
        value: tracks
      },
      _trackEventReemitters: {
        value: new Map()
      },
      _trackPublicationEventReemitters: {
        value: new Map()
      },
      _trackSignalingUpdatedEventCallbacks: {
        value: new Map()
      },
      _videoTracks: {
        value: videoTracks
      },
      audioTracks: {
        enumerable: true,
        value: new Map()
      },
      dataTracks: {
        enumerable: true,
        value: new Map()
      },
      identity: {
        enumerable: true,
        get: function get() {
          return signaling.identity;
        }
      },
      networkQualityLevel: {
        enumerable: true,
        get: function get() {
          return signaling.networkQualityLevel;
        }
      },
      networkQualityStats: {
        enumerable: true,
        get: function get() {
          return signaling.networkQualityStats;
        }
      },
      sid: {
        enumerable: true,
        get: function get() {
          return signaling.sid;
        }
      },
      state: {
        enumerable: true,
        get: function get() {
          return signaling.state;
        }
      },
      tracks: {
        enumerable: true,
        value: new Map()
      },
      videoTracks: {
        enumerable: true,
        value: new Map()
      }
    });

    _this._tracks.forEach(reemitTrackEvents.bind(null, _this));
    signaling.on('networkQualityLevelChanged', function () {
      return _this.emit('networkQualityLevelChanged', _this.networkQualityLevel, _this.networkQualityStats && (_this.networkQualityStats.audio || _this.networkQualityStats.video) ? _this.networkQualityStats : null);
    });
    reemitSignalingStateChangedEvents(_this, signaling);
    log.info('Created a new Participant' + (_this.identity ? ': ' + _this.identity : ''));
    return _this;
  }

  /**
   * Get the {@link RemoteTrack} events to re-emit.
   * @private
   * @returns {Array<Array<string>>} events
   */


  _createClass(Participant, [{
    key: '_getTrackEvents',
    value: function _getTrackEvents() {
      return [['dimensionsChanged', 'trackDimensionsChanged'], ['message', 'trackMessage'], ['started', 'trackStarted']];
    }

    /**
     * @private
     */

  }, {
    key: '_getTrackPublicationEvents',
    value: function _getTrackPublicationEvents() {
      return [];
    }
  }, {
    key: 'toString',
    value: function toString() {
      return '[Participant #' + this._instanceId + ': ' + this.sid + ']';
    }

    /**
     * @private
     * @param {RemoteTrack} track
     * @param {Track.ID} id
     * @returns {?RemoteTrack}
     */

  }, {
    key: '_addTrack',
    value: function _addTrack(track, id) {
      var log = this._log;
      if (this._tracks.has(id)) {
        return null;
      }
      this._tracks.set(id, track);

      var tracksByKind = {
        audio: this._audioTracks,
        video: this._videoTracks,
        data: this._dataTracks
      }[track.kind];
      tracksByKind.set(id, track);
      reemitTrackEvents(this, track, id);

      log.info('Added a new ' + util.trackClass(track) + ':', id);
      log.debug(util.trackClass(track) + ':', track);

      return track;
    }

    /**
     * @private
     * @param {RemoteTrackPublication} publication
     * @returns {?RemoteTrackPublication}
     */

  }, {
    key: '_addTrackPublication',
    value: function _addTrackPublication(publication) {
      var log = this._log;
      if (this.tracks.has(publication.trackSid)) {
        return null;
      }
      this.tracks.set(publication.trackSid, publication);

      var trackPublicationsByKind = {
        audio: this.audioTracks,
        data: this.dataTracks,
        video: this.videoTracks
      }[publication.kind];
      trackPublicationsByKind.set(publication.trackSid, publication);
      reemitTrackPublicationEvents(this, publication);

      log.info('Added a new ' + util.trackPublicationClass(publication) + ':', publication.trackSid);
      log.debug(util.trackPublicationClass(publication) + ':', publication);
      return publication;
    }

    /**
     * @private
     */

  }, {
    key: '_handleTrackSignalingEvents',
    value: function _handleTrackSignalingEvents() {
      var log = this._log;
      var self = this;

      if (this.state === 'disconnected') {
        return;
      }

      var RemoteAudioTrack = this._RemoteAudioTrack;
      var RemoteAudioTrackPublication = this._RemoteAudioTrackPublication;
      var RemoteVideoTrack = this._RemoteVideoTrack;
      var RemoteVideoTrackPublication = this._RemoteVideoTrackPublication;
      var RemoteDataTrack = this._RemoteDataTrack;
      var RemoteDataTrackPublication = this._RemoteDataTrackPublication;
      var signaling = this._signaling;

      function trackSignalingAdded(signaling) {
        var RemoteTrackPublication = {
          audio: RemoteAudioTrackPublication,
          data: RemoteDataTrackPublication,
          video: RemoteVideoTrackPublication
        }[signaling.kind];

        var publication = new RemoteTrackPublication(signaling, { log: log });
        self._addTrackPublication(publication);

        var isSubscribed = signaling.isSubscribed;
        if (isSubscribed) {
          trackSignalingSubscribed(signaling);
        }

        self._trackSignalingUpdatedEventCallbacks.set(signaling.sid, function () {
          if (isSubscribed !== signaling.isSubscribed) {
            isSubscribed = signaling.isSubscribed;
            if (isSubscribed) {
              trackSignalingSubscribed(signaling);
              return;
            }
            trackSignalingUnsubscribed(signaling);
          }
        });
        signaling.on('updated', self._trackSignalingUpdatedEventCallbacks.get(signaling.sid));
      }

      function trackSignalingRemoved(signaling) {
        if (signaling.isSubscribed) {
          signaling.setTrackTransceiver(null);
        }
        var updated = self._trackSignalingUpdatedEventCallbacks.get(signaling.sid);
        if (updated) {
          signaling.removeListener('updated', updated);
          self._trackSignalingUpdatedEventCallbacks.delete(signaling.sid);
        }
        var publication = self.tracks.get(signaling.sid);
        if (publication) {
          self._removeTrackPublication(publication);
        }
      }

      function trackSignalingSubscribed(signaling) {
        var isEnabled = signaling.isEnabled,
            name = signaling.name,
            kind = signaling.kind,
            sid = signaling.sid,
            trackTransceiver = signaling.trackTransceiver;

        var RemoteTrack = {
          audio: RemoteAudioTrack,
          video: RemoteVideoTrack,
          data: RemoteDataTrack
        }[kind];

        var publication = self.tracks.get(sid);

        // NOTE(mroberts): It should never be the case that the TrackSignaling and
        // MediaStreamTrack or DataTrackReceiver kinds disagree; however, just in
        // case, we handle it here.
        if (!RemoteTrack || kind !== trackTransceiver.kind) {
          return;
        }

        var track = kind === 'data' ? new RemoteTrack(sid, trackTransceiver, { log: log, name: name }) : new RemoteTrack(sid, trackTransceiver, isEnabled, { log: log, name: name });

        self._addTrack(track, publication, trackTransceiver.id);
      }

      function trackSignalingUnsubscribed(signaling) {
        var _Array$from$find = Array.from(self._tracks.entries()).find(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              track = _ref2[1];

          return track.sid === signaling.sid;
        }),
            _Array$from$find2 = _slicedToArray(_Array$from$find, 2),
            id = _Array$from$find2[0],
            track = _Array$from$find2[1];

        var publication = self.tracks.get(signaling.sid);
        if (track) {
          self._removeTrack(track, publication, id);
        }
      }

      signaling.on('trackAdded', trackSignalingAdded);
      signaling.on('trackRemoved', trackSignalingRemoved);

      signaling.tracks.forEach(trackSignalingAdded);

      signaling.on('stateChanged', function stateChanged(state) {
        if (state === 'disconnected') {
          log.debug('Removing event listeners');
          signaling.removeListener('stateChanged', stateChanged);
          signaling.removeListener('trackAdded', trackSignalingAdded);
          signaling.removeListener('trackRemoved', trackSignalingRemoved);
        }
      });
    }

    /**
     * @private
     * @param {RemoteTrack} track
     * @param {Track.ID} id
     * @returns {?RemoteTrack}
     */

  }, {
    key: '_removeTrack',
    value: function _removeTrack(track, id) {
      if (!this._tracks.has(id)) {
        return null;
      }
      this._tracks.delete(id);

      var tracksByKind = {
        audio: this._audioTracks,
        video: this._videoTracks,
        data: this._dataTracks
      }[track.kind];
      tracksByKind.delete(id);

      var reemitters = this._trackEventReemitters.get(id) || new Map();
      reemitters.forEach(function (reemitter, event) {
        track.removeListener(event, reemitter);
      });

      var log = this._log;
      log.info('Removed a ' + util.trackClass(track) + ':', id);
      log.debug(util.trackClass(track) + ':', track);
      return track;
    }

    /**
     * @private
     * @param {RemoteTrackPublication} publication
     * @returns {?RemoteTrackPublication}
     */

  }, {
    key: '_removeTrackPublication',
    value: function _removeTrackPublication(publication) {
      publication = this.tracks.get(publication.trackSid);
      if (!publication) {
        return null;
      }
      this.tracks.delete(publication.trackSid);

      var trackPublicationsByKind = {
        audio: this.audioTracks,
        data: this.dataTracks,
        video: this.videoTracks
      }[publication.kind];
      trackPublicationsByKind.delete(publication.trackSid);

      var reemitters = this._trackPublicationEventReemitters.get(publication.trackSid) || new Map();
      reemitters.forEach(function (reemitter, event) {
        publication.removeListener(event, reemitter);
      });

      var log = this._log;
      log.info('Removed a ' + util.trackPublicationClass(publication) + ':', publication.trackSid);
      log.debug(util.trackPublicationClass(publication) + ':', publication);
      return publication;
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return util.valueToJSON(this);
    }
  }]);

  return Participant;
}(EventEmitter);

/**
 * A {@link Participant.SID} is a 34-character string starting with "PA"
 * that uniquely identifies a {@link Participant}.
 * @type string
 * @typedef Participant.SID
 */

/**
 * A {@link Participant.Identity} is a string that identifies a
 * {@link Participant}. You can think of it like a name.
 * @typedef {string} Participant.Identity
 */

/**
 * The {@link Participant} has disconnected.
 * @param {Participant} participant - The {@link Participant} that disconnected.
 * @event Participant#disconnected
 */

/**
 * The {@link Participant}'s {@link NetworkQualityLevel} changed.
 * @param {NetworkQualityLevel} networkQualityLevel - The new
 *   {@link NetworkQualityLevel}
 * @param {?NetworkQualityStats} networkQualityStats - The {@link NetworkQualityStats}
 *   based on which {@link NetworkQualityLevel} is calculated, if any
 * @event Participant#networkQualityLevelChanged
 */

/**
 * One of the {@link Participant}'s {@link VideoTrack}'s dimensions changed.
 * @param {VideoTrack} track - The {@link VideoTrack} whose dimensions changed
 * @event Participant#trackDimensionsChanged
 */

/**
 * One of the {@link Participant}'s {@link Track}s started.
 * @param {Track} track - The {@link Track} that started
 * @event Participant#trackStarted
 */

/**
 * Indexed {@link Track}s by {@link Track.ID}.
 * @typedef {object} IndexedTracks
 * @property {Array<{0: Track.ID, 1: AudioTrack}>} audioTracks - Indexed
 *   {@link AudioTrack}s
 * @property {Array<{0: Track.ID, 1: DataTrack}>} dataTracks - Indexed
 *   {@link DataTrack}s
 * @property {Array<{0: Track.ID, 1: Track}>} tracks - Indexed {@link Track}s
 * @property {Array<{0: Track.ID, 1: VideoTrack}>} videoTracks - Indexed
 *   {@link VideoTrack}s
 * @private
 */

/**
 * Index tracks by {@link Track.ID}.
 * @param {Array<Track>} tracks
 * @returns {IndexedTracks}
 * @private
 */


function indexTracksById(tracks) {
  var indexedTracks = tracks.map(function (track) {
    return [track.id, track];
  });
  var indexedAudioTracks = indexedTracks.filter(function (keyValue) {
    return keyValue[1].kind === 'audio';
  });
  var indexedVideoTracks = indexedTracks.filter(function (keyValue) {
    return keyValue[1].kind === 'video';
  });
  var indexedDataTracks = indexedTracks.filter(function (keyValue) {
    return keyValue[1].kind === 'data';
  });

  return {
    audioTracks: indexedAudioTracks,
    dataTracks: indexedDataTracks,
    tracks: indexedTracks,
    videoTracks: indexedVideoTracks
  };
}

/**
 * Re-emit {@link ParticipantSignaling} 'stateChanged' events.
 * @param {Participant} participant
 * @param {ParticipantSignaling} signaling
 * @private
 */
function reemitSignalingStateChangedEvents(participant, signaling) {
  var log = participant._log;

  if (participant.state === 'disconnected') {
    return;
  }

  // Reemit state transition events from the ParticipantSignaling.
  signaling.on('stateChanged', function stateChanged(state) {
    log.debug('Transitioned to state:', state);
    participant.emit(state, participant);
    if (state === 'disconnected') {
      log.debug('Removing Track event reemitters');
      signaling.removeListener('stateChanged', stateChanged);

      signaling.tracks.forEach(function (trackSignaling) {
        var track = participant._tracks.get(trackSignaling.id);
        var reemitters = participant._trackEventReemitters.get(trackSignaling.id);
        if (track && reemitters) {
          reemitters.forEach(function (reemitter, event) {
            track.removeListener(event, reemitter);
          });
        }
      });
      participant._trackEventReemitters.clear();

      participant.tracks.forEach(function (publication) {
        participant._trackPublicationEventReemitters.get(publication.trackSid).forEach(function (reemitter, event) {
          publication.removeListener(event, reemitter);
        });
      });
      participant._trackPublicationEventReemitters.clear();
    }
  });
}

/**
 * Re-emit {@link Track} events.
 * @param {Participant} participant
 * @param {Track} track
 * @param {Track.ID} id
 * @private
 */
function reemitTrackEvents(participant, track, id) {
  var trackEventReemitters = new Map();

  if (participant.state === 'disconnected') {
    return;
  }

  participant._getTrackEvents().forEach(function (eventPair) {
    var trackEvent = eventPair[0];
    var participantEvent = eventPair[1];

    trackEventReemitters.set(trackEvent, function () {
      var args = [participantEvent].concat([].slice.call(arguments));
      return participant.emit.apply(participant, _toConsumableArray(args));
    });

    track.on(trackEvent, trackEventReemitters.get(trackEvent));
  });

  participant._trackEventReemitters.set(id, trackEventReemitters);
}

/**
 * Re-emit {@link TrackPublication} events.
 * @private
 * @param {Participant} participant
 * @param {TrackPublication} publication
 */
function reemitTrackPublicationEvents(participant, publication) {
  var publicationEventReemitters = new Map();

  if (participant.state === 'disconnected') {
    return;
  }

  participant._getTrackPublicationEvents().forEach(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 2),
        publicationEvent = _ref4[0],
        participantEvent = _ref4[1];

    publicationEventReemitters.set(publicationEvent, function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      participant.emit.apply(participant, [participantEvent].concat(args, [publication]));
    });
    publication.on(publicationEvent, publicationEventReemitters.get(publicationEvent));
  });

  participant._trackPublicationEventReemitters.set(publication.trackSid, publicationEventReemitters);
}

module.exports = Participant;
},{"./eventemitter":11,"./media/track/remoteaudiotrack":31,"./media/track/remoteaudiotrackpublication":32,"./media/track/remotedatatrack":33,"./media/track/remotedatatrackpublication":34,"./media/track/remotevideotrack":37,"./media/track/remotevideotrackpublication":38,"./util":112}],45:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;

/**
 * A {@link QueueingEventEmitter} can queue events until a listener has been
 * added.
 * @extends EventEmitter
 */

var QueueingEventEmitter = function (_EventEmitter) {
  _inherits(QueueingEventEmitter, _EventEmitter);

  /**
   * Construct a {@link QueueingEventEmitter}
   */
  function QueueingEventEmitter() {
    _classCallCheck(this, QueueingEventEmitter);

    var _this = _possibleConstructorReturn(this, (QueueingEventEmitter.__proto__ || Object.getPrototypeOf(QueueingEventEmitter)).call(this));

    Object.defineProperties(_this, {
      _queuedEvents: {
        value: new Map()
      }
    });
    return _this;
  }

  /**
   * Emit any queued events.
   * @returns {boolean} true if every event had listeners, false otherwise
  */ /**
     * Emit any queued events matching the event name.
     * @param {string} event
     * @returns {boolean} true if every event had listeners, false otherwise
     */


  _createClass(QueueingEventEmitter, [{
    key: 'dequeue',
    value: function dequeue(event) {
      var _this2 = this;

      var result = true;
      if (!event) {
        this._queuedEvents.forEach(function (_, queuedEvent) {
          result = this.dequeue(queuedEvent) && result;
        }, this);
        return result;
      }
      var queue = this._queuedEvents.get(event) || [];
      this._queuedEvents.delete(event);
      return queue.reduce(function (result, args) {
        return _this2.emit.apply(_this2, _toConsumableArray([event].concat(args))) && result;
      }, result);
    }

    /**
     * If the event has listeners, emit the event; otherwise, queue the event.
     * @param {string} event
     * @param {...*} args
     * @returns {boolean} true if the event had listeners, false if the event was queued
     */

  }, {
    key: 'queue',
    value: function queue() {
      var args = [].slice.call(arguments);
      if (this.emit.apply(this, _toConsumableArray(args))) {
        return true;
      }
      var event = args[0];
      if (!this._queuedEvents.has(event)) {
        this._queuedEvents.set(event, []);
      }
      this._queuedEvents.get(event).push(args.slice(1));
      return false;
    }
  }]);

  return QueueingEventEmitter;
}(EventEmitter);

module.exports = QueueingEventEmitter;
},{"events":149}],46:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Participant = require('./participant');

/**
 * A {@link RemoteParticipant} represents a remote {@link Participant} in a
 * {@link Room}.
 * @extends Participant
 * @property {Map<Track.SID, RemoteAudioTrackPublication>} audioTracks -
 *    The {@link Participant}'s {@link RemoteAudioTrackPublication}s
 * @property {Map<Track.SID, RemoteDataTrackPublication>} dataTracks -
 *    The {@link Participant}'s {@link RemoteDataTrackPublication}s
 * @property {Map<Track.SID, RemoteTrackPublication>} tracks -
 *    The {@link Participant}'s {@link RemoteTrackPublication}s
 * @property {Map<Track.SID, RemoteVideoTrackPublication>} videoTracks -
 *    The {@link Participant}'s {@link RemoteVideoTrackPublication}s
 * @emits RemoteParticipant#trackDimensionsChanged
 * @emits RemoteParticipant#trackDisabled
 * @emits RemoteParticipant#trackEnabled
 * @emits RemoteParticipant#trackMessage
 * @emits RemoteParticipant#trackPublished
 * @emits RemoteParticipant#trackStarted
 * @emits RemoteParticipant#trackSubscribed
 * @emits RemoteParticipant#trackSubscriptionFailed
 * @emits RemoteParticipant#trackUnpublished
 * @emits RemoteParticipant#trackUnsubscribed
 */

var RemoteParticipant = function (_Participant) {
  _inherits(RemoteParticipant, _Participant);

  /**
   * Construct a {@link RemoteParticipant}.
   * @param {ParticipantSignaling} signaling
   * @param {object} [options]
   */
  function RemoteParticipant(signaling, options) {
    _classCallCheck(this, RemoteParticipant);

    var _this = _possibleConstructorReturn(this, (RemoteParticipant.__proto__ || Object.getPrototypeOf(RemoteParticipant)).call(this, signaling, options));

    _this._handleTrackSignalingEvents();
    _this.once('disconnected', _this._unsubscribeTracks.bind(_this));
    return _this;
  }

  _createClass(RemoteParticipant, [{
    key: 'toString',
    value: function toString() {
      return '[RemoteParticipant #' + this._instanceId + (this.sid ? ': ' + this.sid : '') + ']';
    }

    /**
     * @private
     * @param {RemoteTrack} remoteTrack
     * @param {RemoteTrackPublication} publication
     * @param {Track.ID} id
     * @returns {?RemoteTrack}
     */

  }, {
    key: '_addTrack',
    value: function _addTrack(remoteTrack, publication, id) {
      if (!_get(RemoteParticipant.prototype.__proto__ || Object.getPrototypeOf(RemoteParticipant.prototype), '_addTrack', this).call(this, remoteTrack, id)) {
        return null;
      }
      publication._subscribed(remoteTrack);
      this.emit('trackSubscribed', remoteTrack, publication);
      return remoteTrack;
    }

    /**
     * @private
     * @param {RemoteTrackPublication} publication
     * @returns {?RemoteTrackPublication}
     */

  }, {
    key: '_addTrackPublication',
    value: function _addTrackPublication(publication) {
      var addedPublication = _get(RemoteParticipant.prototype.__proto__ || Object.getPrototypeOf(RemoteParticipant.prototype), '_addTrackPublication', this).call(this, publication);
      if (!addedPublication) {
        return null;
      }
      this.emit('trackPublished', addedPublication);
      return addedPublication;
    }
    /**
     * @private
     */

  }, {
    key: '_getTrackPublicationEvents',
    value: function _getTrackPublicationEvents() {
      return [].concat(_toConsumableArray(_get(RemoteParticipant.prototype.__proto__ || Object.getPrototypeOf(RemoteParticipant.prototype), '_getTrackPublicationEvents', this).call(this)), [['subscriptionFailed', 'trackSubscriptionFailed'], ['trackDisabled', 'trackDisabled'], ['trackEnabled', 'trackEnabled']]);
    }

    /**
     * @private
     */

  }, {
    key: '_unsubscribeTracks',
    value: function _unsubscribeTracks() {
      var _this2 = this;

      this.tracks.forEach(function (publication) {
        if (publication.isSubscribed) {
          var track = publication.track;
          publication._unsubscribe();
          _this2.emit('trackUnsubscribed', track, publication);
        }
      });
    }

    /**
     * @private
     * @param {RemoteTrack} remoteTrack
     * @param {RemoteTrackPublication} publication
     * @param {Track.ID} id
     * @returns {?RemoteTrack}
     */

  }, {
    key: '_removeTrack',
    value: function _removeTrack(remoteTrack, publication, id) {
      var unsubscribedTrack = this._tracks.get(id);
      if (!unsubscribedTrack) {
        return null;
      }

      _get(RemoteParticipant.prototype.__proto__ || Object.getPrototypeOf(RemoteParticipant.prototype), '_removeTrack', this).call(this, unsubscribedTrack, id);
      publication._unsubscribe();
      this.emit('trackUnsubscribed', unsubscribedTrack, publication);
      return unsubscribedTrack;
    }

    /**
     * @private
     * @param {RemoteTrackPublication} publication
     * @returns {?RemoteTrackPublication}
     */

  }, {
    key: '_removeTrackPublication',
    value: function _removeTrackPublication(publication) {
      var removedPublication = _get(RemoteParticipant.prototype.__proto__ || Object.getPrototypeOf(RemoteParticipant.prototype), '_removeTrackPublication', this).call(this, publication);
      if (!removedPublication) {
        return null;
      }
      this.emit('trackUnpublished', removedPublication);
      return removedPublication;
    }
  }]);

  return RemoteParticipant;
}(Participant);

/**
 * One of the {@link RemoteParticipant}'s {@link RemoteVideoTrack}'s dimensions changed.
 * @param {RemoteVideoTrack} track - The {@link RemoteVideoTrack} whose dimensions changed
 * @event RemoteParticipant#trackDimensionsChanged
 */

/**
 * A {@link RemoteTrack} was disabled by the {@link RemoteParticipant}.
 * @param {RemoteTrack} track - The {@link RemoteTrack} that was disabled
 * @event RemoteParticipant#trackDisabled
 */

/**
 * A {@link RemoteTrack} was enabled by the {@link RemoteParticipant}.
 * @param {RemoteTrack} track - The {@link RemoteTrack} that was enabled
 * @event RemoteParticipant#trackEnabled
 */

/**
 * A message was received over one of the {@link RemoteParticipant}'s
 * {@link RemoteDataTrack}s.
 * @event RemoteParticipant#trackMessage
 * @param {string|ArrayBuffer} data
 * @param {RemoteDataTrack} track - The {@link RemoteDataTrack} over which the
 *   message was received
 */

/**
 * A {@link RemoteTrack} was published by the {@link RemoteParticipant} after
 * connecting to the {@link Room}. This event is not emitted for
 * {@link RemoteTrack}s that were published while the {@link RemoteParticipant}
 * was connecting to the {@link Room}.
 * @event RemoteParticipant#trackPublished
 * @param {RemoteTrackPublication} publication - The {@link RemoteTrackPublication}
 *   which represents the published {@link RemoteTrack}
 * @example
 * function trackPublished(publication) {
 *   console.log(`Track ${publication.trackSid} was published`);
 * }
 *
 * room.on('participantConnected', participant => {
 *   // Handle RemoteTracks published while connecting to the Room.
 *   participant.trackPublications.forEach(trackPublished);
 *
 *   // Handle RemoteTracks published after connecting to the Room.
 *   participant.on('trackPublished', trackPublished);
 * });
 */

/**
 * One of the {@link RemoteParticipant}'s {@link RemoteTrack}s started.
 * @param {RemoteTrack} track - The {@link RemoteTrack} that started
 * @event RemoteParticipant#trackStarted
 */

/**
 * A {@link RemoteParticipant}'s {@link RemoteTrack} was subscribed to.
 * @param {RemoteTrack} track - The {@link RemoteTrack} that was subscribed to
 * @param {RemoteTrackPublication} publication - The {@link RemoteTrackPublication}
 *   for the {@link RemoteTrack} that was subscribed to
 * @event RemoteParticipant#trackSubscribed
 */

/**
 * A {@link RemoteParticipant}'s {@link RemoteTrack} could not be subscribed to.
 * @param {TwilioError} error - The reason the {@link RemoteTrack} could not be
 *   subscribed to
 * @param {RemoteTrackPublication} publication - The
 *   {@link RemoteTrackPublication} for the {@link RemoteTrack} that could not
 *   be subscribed to
 * @event RemoteParticipant#trackSubscriptionFailed
 */

/**
 * A {@link RemoteTrack} was unpublished by the {@link RemoteParticipant}.
 * @event RemoteParticipant#trackUnpublished
 * @param {RemoteTrackPublication} publication - The {@link RemoteTrackPublication}
 *   which represents the unpublished {@link RemoteTrack}
 */

/**
 * A {@link RemoteParticipant}'s {@link RemoteTrack} was unsubscribed from.
 * @param {RemoteTrack} track - The {@link RemoteTrack} that was unsubscribed from
 * @param {RemoteTrackPublication} publication - The {@link RemoteTrackPublication}
 *   for the {@link RemoteTrack} that was unsubscribed from
 * @event RemoteParticipant#trackUnsubscribed
 */

module.exports = RemoteParticipant;
},{"./participant":44}],47:[function(require,module,exports){
'use strict';

var XHR = require('xmlhttprequest').XMLHttpRequest;

/**
 * Make a network request.
 * @param {String} method - HTTP method to use. e.g: GET, POST.
 * @param {RequestParams} params
 * @returns {Promise<String>} responseText
*/ /**
   * @typedef {Object} RequestParams
   * @property {String} url - URL to access.
   * @property {Object} [headers] - An unformatted map of headers.
   * @property {Object} [body] - An unformatted map representing
   *   post body.
   * @property {Boolean} [withCredentials=false] - Whether to set the
   *   XHR withCredentials flag.
   */
function request(method, params) {
  return new Promise(function (resolve, reject) {
    if (typeof method !== 'string' || !params) {
      throw new Error('<String>method and <Object>params are required args.');
    }

    var xhr = new XHR();
    xhr.open(method.toUpperCase(), params.url, true);
    xhr.withCredentials = !!params.withCredentials;

    xhr.onreadystatechange = function onreadystatechange() {
      if (xhr.readyState !== 4) {
        return;
      }

      if (200 <= xhr.status && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(xhr.responseText);
      }
    };

    for (var headerName in params.headers) {
      xhr.setRequestHeader(headerName, params.headers[headerName]);
    }

    xhr.send(params.body);
  });
}

request.get = request.bind(null, 'GET');
request.post = request.bind(null, 'POST');

module.exports = request;
},{"xmlhttprequest":156}],48:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('./eventemitter');
var RemoteParticipant = require('./remoteparticipant');
var StatsReport = require('./stats/statsreport');

var _require = require('./util'),
    valueToJSON = _require.valueToJSON;

var nInstances = 0;

/**
 * A {@link Room} represents communication between you and one or more
 * {@link RemoteParticipant}s sharing {@link AudioTrack}s and
 * {@link VideoTrack}s.
 * <br><br>
 * You can connect to a {@link Room} by calling {@link connect}.
 * @extends EventEmitter
 * @property {?RemoteParticipant} dominantSpeaker - The Dominant Speaker in the
 *   {@link Room}, if any
 * @property {boolean} isRecording - Whether or not the {@link Room} is being
 *   recorded
 * @property {LocalParticipant} localParticipant - Your {@link LocalParticipant}
 *   in the {@link Room}
 * @property {string} name - The {@link Room}'s name
 * @property {Map<Participant.SID, RemoteParticipant>} participants -
 *   The {@link RemoteParticipant}s participating in this {@link Room}
 * @property {Room.SID} sid - The {@link Room}'s SID
 * @property {string} state - "connected", "reconnecting", or "disconnected"
 * @throws {SignalingConnectionDisconnectedError}
 * @emits Room#disconnected
 * @emits Room#participantConnected
 * @emits Room#participantDisconnected
 * @emits Room#reconnected
 * @emits Room#reconnecting
 * @emits Room#recordingStarted
 * @emits Room#recordingStopped
 * @emits Room#trackDimensionsChanged
 * @emits Room#trackDisabled
 * @emits Room#trackEnabled
 * @emits Room#trackMessage
 * @emits Room#trackPublished
 * @emits Room#trackStarted
 * @emits Room#trackSubscribed
 * @emits Room#trackUnpublished
 * @emits Room#trackUnsubscribed
 */

var Room = function (_EventEmitter) {
  _inherits(Room, _EventEmitter);

  /**
   * Construct a {@link Room}.
   * @param {RoomSignaling} signaling
   * @param {?object} [options={}]
   */
  function Room(localParticipant, signaling, options) {
    _classCallCheck(this, Room);

    var _this = _possibleConstructorReturn(this, (Room.__proto__ || Object.getPrototypeOf(Room)).call(this));

    var log = options.log.createLog('default', _this);
    var participants = new Map();

    /* istanbul ignore next */
    Object.defineProperties(_this, {
      _log: {
        value: log
      },
      _instanceId: {
        value: ++nInstances
      },
      _options: {
        value: options
      },
      _participants: {
        value: participants
      },
      _signaling: {
        value: signaling
      },
      dominantSpeaker: {
        enumerable: true,
        get: function get() {
          return this.participants.get(signaling.dominantSpeakerSid) || null;
        }
      },
      isRecording: {
        enumerable: true,
        get: function get() {
          return signaling.recording.isEnabled || false;
        }
      },
      localParticipant: {
        enumerable: true,
        value: localParticipant
      },
      name: {
        enumerable: true,
        value: signaling.name
      },
      participants: {
        enumerable: true,
        value: participants
      },
      sid: {
        enumerable: true,
        value: signaling.sid
      },
      state: {
        enumerable: true,
        get: function get() {
          return signaling.state;
        }
      }
    });

    handleRecordingEvents(_this, signaling.recording);
    handleSignalingEvents(_this, signaling);

    log.info('Created a new Room:', _this.name);
    log.debug('Initial RemoteParticipants:', Array.from(_this._participants.values()));
    return _this;
  }

  _createClass(Room, [{
    key: 'toString',
    value: function toString() {
      return '[Room #' + this._instanceId + ': ' + this.sid + ']';
    }

    /**
     * Disconnect from the {@link Room}.
     * @returns {this}
     */

  }, {
    key: 'disconnect',
    value: function disconnect() {
      this._log.info('Disconnecting');
      this._signaling.disconnect();
      return this;
    }

    /**
     * Get the {@link Room}'s media statistics. This is not supported in Safari 12.0 or below
     * due to this bug : https://bugs.webkit.org/show_bug.cgi?id=192601
     *
     * @returns {Promise.<Array<StatsReport>>}
     */

  }, {
    key: 'getStats',
    value: function getStats() {
      var _this2 = this;

      return this._signaling.getStats().then(function (responses) {
        return Array.from(responses).map(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              id = _ref2[0],
              response = _ref2[1];

          return new StatsReport(id, Object.assign({}, response, {
            localAudioTrackStats: rewriteLocalTrackIds(_this2, response.localAudioTrackStats),
            localVideoTrackStats: rewriteLocalTrackIds(_this2, response.localVideoTrackStats)
          }));
        });
      });
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return valueToJSON(this);
    }
  }]);

  return Room;
}(EventEmitter);

function rewriteLocalTrackIds(room, trackStats) {
  var localParticipantSignaling = room.localParticipant._signaling;
  return trackStats.reduce(function (trackStats, trackStat) {
    var publication = localParticipantSignaling.tracks.get(trackStat.trackId);
    var trackSender = localParticipantSignaling.getSender(publication);
    return trackSender ? [Object.assign({}, trackStat, { trackId: trackSender.id })].concat(trackStats) : trackStats;
  }, []);
}

/**
 * A {@link Room.SID} is a 34-character string starting with "RM"
 * that uniquely identifies a {@link Room}.
 * @type string
 * @typedef Room.SID
 */

/**
 * The Dominant Speaker in the {@link Room} changed. Either the Dominant Speaker
 * is a new {@link RemoteParticipant} or the Dominant Speaker has been reset and
 * is now null.
 * @param {?RemoteParticipant} dominantSpeaker - The Dominant Speaker in the
 *   {@link Room}, if any
 * @event Room#dominantSpeakerChanged
 */

/**
 * Your {@link LocalParticipant} was disconnected from the {@link Room} and all
 * other {@link RemoteParticipant}s.
 * @param {Room} room - The {@link Room} your
 *   {@link LocalParticipant} was disconnected from
 * @param {?TwilioError} error - Present when the {@link LocalParticipant} got
 *   disconnected from the {@link Room} unexpectedly
 * @event Room#disconnected
 * @example
 * myRoom.on('disconnected', function(room, error) {
 *   if (error) {
 *     console.log('Unexpectedly disconnected:', error);
 *   }
 *   myRoom.localParticipant.tracks.forEach(function(track) {
 *     track.stop();
 *     track.detach();
 *   });
 * });
 */

/**
 * A {@link RemoteParticipant} joined the {@link Room}.
 * @param {RemoteParticipant} participant - The {@link RemoteParticipant} who joined
 * @event Room#participantConnected
 * @example
 * myRoom.on('participantConnected', function(participant) {
 *   console.log(participant.identity + ' joined the Room');
 * });
 */

/**
 * A {@link RemoteParticipant} left the {@link Room}.
 * @param {RemoteParticipant} participant - The {@link RemoteParticipant} who left
 * @event Room#participantDisconnected
 * @example
 * myRoom.on('participantDisconnected', function(participant) {
 *   console.log(participant.identity + ' left the Room');
 *   participant.tracks.forEach(function(track) {
 *     track.detach().forEach(function(mediaElement) {
 *       mediaElement.remove();
 *     });
 *   });
 * });
 */

/**
 * Your application successfully reconnected to the {@link Room}. When this
 * event is emitted, the {@link Room} is in state "connected".
 * @event Room#reconnected
 * @example
 * myRoom.on('reconnected', () => {
 *   console.log('Reconnected!');
 * });
 */

/**
 * Your application is reconnecting to the {@link Room}. This happens when there
 * is a disruption in your signaling connection and/or your media connection. When
 * this event is emitted, the {@link Room} is in state "reconnecting". If reconnecting
 * succeeds, the {@link Room} will emit a "reconnected" event.
 * @param {MediaConnectionError|SignalingConnectionDisconnectedError} error - A
 *   {@link MediaConnectionError} if your application is reconnecting due to a
 *   disruption in your media connection, or a {@link SignalingConnectionDisconnectedError}
 *   if your application is reconnecting due to a disruption in your signaling connection
 * @event Room#reconnecting
 * @example
 * myRoom.on('reconnecting', error => {
 *   if (error.code === 53001) {
 *     console.log('Reconnecting your signaling connection!', error.message);
 *   } else if (error.code === 53405) {
 *     console.log('Reconnecting your media connection!', error.message);
 *   }
 * });
 */

/**
 * The {@link Room} is now being recorded
 * @event Room#recordingStarted
 */

/**
 * The {@link Room} is no longer being recorded
 * @event Room#recordingStopped
 */

/**
 * One of the {@link RemoteParticipant}'s {@link VideoTrack}'s dimensions changed.
 * @param {RemoteVideoTrack} track - The {@link RemoteVideoTrack} whose dimensions changed
 * @param {RemoteParticipant} participant - The {@link RemoteParticipant} whose
 *   {@link RemoteVideoTrack}'s dimensions changed
 * @event Room#trackDimensionsChanged
 */

/**
 * A {@link RemoteTrack} was disabled by a {@link RemoteParticipant} in the {@link Room}.
 * @param {RemoteTrack} track - The {@link RemoteTrack} that was disabled
 * @param {RemoteParticipant} participant - The {@link RemoteParticipant} who
 *   disabled the {@link RemoteTrack}
 * @event Room#trackDisabled
 */

/**
 * A {@link RemoteTrack} was enabled by a {@link RemoteParticipant} in the {@link Room}.
 * @param {RemoteTrack} track - The {@link RemoteTrack} that was enabled
 * @param {RemoteParticipant} participant - The {@link RemoteParticipant} who
 *   enabled the {@link RemoteTrack}
 * @event Room#trackEnabled
 */

/**
 * A message was received over one of the {@link RemoteParticipant}'s
 * {@link RemoteDataTrack}'s.
 * @param {string|ArrayBuffer} data
 * @param {RemoteVideoTrack} track - The {@link RemoteDataTrack} over which the
 *   message was received
 * @param {RemoteParticipant} participant - The {@link RemoteParticipant} whose
 *   {@link RemoteDataTrack} received the message
 * @event Room#trackMessage
 */

/**
 * A {@link RemoteTrack} was published by a {@link RemoteParticipant} after
 * connecting to the {@link Room}. This event is not emitted for
 * {@link RemoteTrack}s that were published while the {@link RemoteParticipant}
 * was connecting to the {@link Room}.
 * @event Room#trackPublished
 * @param {RemoteTrackPublication} publication - The {@link RemoteTrackPublication}
 *   which represents the published {@link RemoteTrack}
 * @param {RemoteParticipant} participant - The {@link RemoteParticipant} who
 *   published the {@link RemoteTrack}
 * @example
 * function trackPublished(publication, participant) {
 *   console.log(`RemoteParticipant ${participant.sid} published Track ${publication.trackSid}`);
 * }
 *
 * // Handle RemoteTracks published after connecting to the Room.
 * room.on('trackPublished', trackPublished);
 *
 * room.on('participantConnected', participant => {
 *   // Handle RemoteTracks published while connecting to the Room.
 *   participant.trackPublications.forEach(publication => trackPublished(publication, participant));
 * });
 */

/**
 * One of a {@link RemoteParticipant}'s {@link RemoteTrack}s in the {@link Room} started.
 * @param {RemoteTrack} track - The {@link RemoteTrack} that started
 * @param {RemoteParticipant} participant - The {@link RemoteParticipant} whose
 *   {@link RemoteTrack} started
 * @event Room#trackStarted
 */

/**
 * A {@link RemoteParticipant}'s {@link RemoteTrack} was subscribed to.
 * @param {RemoteTrack} track - The {@link RemoteTrack} that was subscribed
 * @param {RemoteParticipant} participant - The {@link RemoteParticipant} whose
 *   {@link RemoteTrack} was subscribed
 * @event Room#trackSubscribed
 * @example
 * room.on('trackSubscribed', function(track, participant) {
 *   var participantView = document.getElementById('participant-view-' + participant.identity);
 *   participantView.appendChild(track.attach());
 * });
 */

/**
 * A {@link RemoteParticipant}'s {@link RemoteTrack} could not be subscribed to.
 * @param {TwilioError} error - The reason the {@link RemoteTrack} could not be
 *   subscribed to
 * @param {RemoteTrackPublication} publication - The
 *   {@link RemoteTrackPublication} for the {@link RemoteTrack} that could not
 *   be subscribed to
 * @param {RemoteParticipant} participant - The {@link RemoteParticipant} whose
 *   {@link RemoteTrack} could not be subscribed to
 * @event Room#trackSubscriptionFailed
 */

/**
 * A {@link RemoteTrack} was unpublished by a {@link RemoteParticipant} to the {@link Room}.
 * @event Room#trackUnpublished
 * @param {RemoteTrackPublication} publication - The {@link RemoteTrackPublication}
 *   which represents the unpublished {@link RemoteTrack}
 * @param {RemoteParticipant} participant - The {@link RemoteParticipant} who
 *   unpublished the {@link RemoteTrack}
 */

/**
 * A {@link RemoteParticipant}'s {@link RemoteTrack} was unsubscribed from.
 * @param {RemoteTrack} track - The {@link RemoteTrack} that was unsubscribed
 * @param {RemoteParticipant} participant - The {@link RemoteParticipant} whose
 *   {@link RemoteTrack} was unsubscribed
 * @event Room#trackUnsubscribed
 * @example
 * room.on('trackUnsubscribed', function(track, participant) {
 *   track.detach().forEach(function(mediaElement) {
 *     mediaElement.remove();
 *   });
 * });
 */

function connectParticipant(room, participantSignaling) {
  var log = room._log;
  var participant = new RemoteParticipant(participantSignaling, { log: log });

  log.info('A new RemoteParticipant connected:', participant);
  room._participants.set(participant.sid, participant);
  room.emit('participantConnected', participant);

  // Reemit Track events from the RemoteParticipant.
  var eventListeners = ['trackDimensionsChanged', 'trackDisabled', 'trackEnabled', 'trackMessage', 'trackPublished', 'trackStarted', 'trackSubscribed', 'trackSubscriptionFailed', 'trackUnpublished', 'trackUnsubscribed'].map(function (event) {
    function reemit() {
      var args = [].slice.call(arguments);
      args.unshift(event);
      args.push(participant);
      room.emit.apply(room, _toConsumableArray(args));
    }
    participant.on(event, reemit);
    return [event, reemit];
  });

  // Reemit state transition events from the RemoteParticipant.
  participant.once('disconnected', function participantDisconnected() {
    var dominantSpeaker = room.dominantSpeaker;
    log.info('RemoteParticipant disconnected:', participant);
    room._participants.delete(participant.sid);
    eventListeners.forEach(function (args) {
      participant.removeListener(args[0], args[1]);
    });
    room.emit('participantDisconnected', participant);
    if (participant === dominantSpeaker) {
      room.emit('dominantSpeakerChanged', room.dominantSpeaker);
    }
  });
}

function handleRecordingEvents(room, recording) {
  recording.on('updated', function updated() {
    var started = recording.isEnabled;
    room._log.info('Recording ' + (started ? 'started' : 'stopped'));
    room.emit('recording' + (started ? 'Started' : 'Stopped'));
  });
}

function handleSignalingEvents(room, signaling) {
  var log = room._log;

  // Reemit RemoteParticipant events from the RoomSignaling.
  log.debug('Creating a new RemoteParticipant for each ParticipantSignaling ' + 'in the RoomSignaling');
  signaling.participants.forEach(connectParticipant.bind(null, room));
  log.debug('Setting up RemoteParticipant creation for all subsequent ' + 'ParticipantSignalings that connect to the RoomSignaling');
  signaling.on('participantConnected', connectParticipant.bind(null, room));

  signaling.on('dominantSpeakerChanged', function () {
    return room.emit('dominantSpeakerChanged', room.dominantSpeaker);
  });

  // Reemit state transition events from the RoomSignaling.
  signaling.on('stateChanged', function stateChanged(state, error) {
    log.info('Transitioned to state:', state);
    switch (state) {
      case 'disconnected':
        room.participants.forEach(function (participant) {
          participant._unsubscribeTracks();
        });
        room.emit(state, room, error);
        signaling.removeListener('stateChanged', stateChanged);
        break;
      case 'reconnecting':
        room.emit('reconnecting', error);
        break;
      default:
        room.emit('reconnected');
    }
  });
}

module.exports = Room;
},{"./eventemitter":11,"./remoteparticipant":46,"./stats/statsreport":103,"./util":112}],49:[function(require,module,exports){
/* eslint consistent-return:0 */
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ParticipantSignaling = require('./participant');
var RoomSignaling = require('./room');
var StateMachine = require('../statemachine');

/*
Signaling States
----------------

              +---------+
              |         |
              | opening |
         +--->|         |
         |    +---------+
    +--------+   |   |   +------+
    |        |<--+   +-->|      |
    | closed |<----------| open |
    |        |<--+   +-->|      |
    +--------+   |   |   +------+
              +---------+   |
              |         |<--+
              | closing |
              |         |
              +---------+

*/

var states = {
  closed: ['opening'],
  opening: ['closed', 'open'],
  open: ['closed', 'closing'],
  closing: ['closed', 'open']
};

/**
 * @extends StateMachine
 * @property {string} state - one of "closed", "opening", "open", or "closing"
 */

var Signaling = function (_StateMachine) {
  _inherits(Signaling, _StateMachine);

  /**
   * Construct {@link Signaling}.
   */
  function Signaling() {
    _classCallCheck(this, Signaling);

    return _possibleConstructorReturn(this, (Signaling.__proto__ || Object.getPrototypeOf(Signaling)).call(this, 'closed', states));
  }

  /**
   * @private
   */
  // NOTE(mroberts): This is a dummy implementation suitable for testing.


  _createClass(Signaling, [{
    key: '_close',
    value: function _close(key) {
      this.transition('closing', key);
      this.transition('closed', key);
      return Promise.resolve(this);
    }

    /**
     * @private
     */
    // NOTE(mroberts): This is a dummy implementation suitable for testing.

  }, {
    key: '_connect',
    value: function _connect(localParticipant, token, iceServerSource, encodingParameters, preferredCodecs, options) {
      localParticipant.connect('PA00000000000000000000000000000000', 'test');
      var sid = 'RM00000000000000000000000000000000';
      var promise = Promise.resolve(new RoomSignaling(localParticipant, sid, options));
      promise.cancel = function cancel() {};
      return promise;
    }

    /**
     * @private
     */
    // NOTE(mroberts): This is a dummy implementation suitable for testing.

  }, {
    key: '_open',
    value: function _open(key) {
      this.transition('opening', key);
      this.transition('open', key);
      return Promise.resolve(this);
    }

    /**
     * Close the {@link Signaling}.
     * @returns {Promise<this>}
     */

  }, {
    key: 'close',
    value: function close() {
      var _this2 = this;

      return this.bracket('close', function (key) {
        switch (_this2.state) {
          case 'closed':
            return _this2;
          case 'open':
            return _this2._close(key);
          default:
            throw new Error('Unexpected Signaling state "' + _this2.state + '"');
        }
      });
    }

    /**
     * Connect to a {@link RoomSignaling}.
     * @param {ParticipantSignaling} localParticipant
     * @param {string} token
     * @param {IceServerSource} iceServerSource
     * @param {EncodingParametersImpl} encodingParameters
     * @param {PreferredCodecs} preferredCodecs
     * @param {object} options
     * @returns {Promise<function(): CancelablePromise<RoomSignaling>>}
     */

  }, {
    key: 'connect',
    value: function connect(localParticipant, token, iceServerSource, encodingParameters, preferredCodecs, options) {
      var self = this;
      return this.bracket('connect', function transition(key) {
        switch (self.state) {
          case 'closed':
            return self._open(key).then(transition.bind(null, key));
          case 'open':
            // NOTE(mroberts): We don't need to hold the lock in _connect. Instead,
            // we just need to ensure the Signaling remains open.
            self.releaseLockCompletely(key);
            return self._connect(localParticipant, token, iceServerSource, encodingParameters, preferredCodecs, options);
          default:
            throw new Error('Unexpected Signaling state "' + self.state + '"');
        }
      });
    }

    /**
     * Create a local {@link ParticipantSignaling}.
     * @returns {ParticipantSignaling}
     */

  }, {
    key: 'createLocalParticipantSignaling',
    value: function createLocalParticipantSignaling() {
      return new ParticipantSignaling();
    }

    /**
     * Open the {@link Signaling}.
     * @returns {Promise<this>}
     */

  }, {
    key: 'open',
    value: function open() {
      var _this3 = this;

      return this.bracket('open', function (key) {
        switch (_this3.state) {
          case 'closed':
            return _this3._open(key);
          case 'open':
            return _this3;
          default:
            throw new Error('Unexpected Signaling state "' + _this3.state + '"');
        }
      });
    }
  }]);

  return Signaling;
}(StateMachine);

module.exports = Signaling;
},{"../statemachine":75,"./participant":52,"./room":56}],50:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ParticipantSignaling = require('./participant');

var LocalParticipantSignaling = function (_ParticipantSignaling) {
  _inherits(LocalParticipantSignaling, _ParticipantSignaling);

  function LocalParticipantSignaling() {
    _classCallCheck(this, LocalParticipantSignaling);

    var _this = _possibleConstructorReturn(this, (LocalParticipantSignaling.__proto__ || Object.getPrototypeOf(LocalParticipantSignaling)).call(this));

    Object.defineProperties(_this, {
      _publicationsToTrackSenders: {
        value: new Map()
      },
      _trackSendersToPublications: {
        value: new Map()
      }
    });
    return _this;
  }

  /**
   * @param {DataTrackSender|MediaTrackSender} trackSender
   * @param {string} name
   * @param {Track.Priority} priority
   * @returns {LocalTrackPublicationSignaling} publication
   */


  _createClass(LocalParticipantSignaling, [{
    key: 'addTrack',
    value: function addTrack(trackSender, name, priority) {
      var publication = this._createLocalTrackPublicationSignaling(trackSender, name, priority);
      this._trackSendersToPublications.set(trackSender, publication);
      this._publicationsToTrackSenders.set(publication, trackSender);
      _get(LocalParticipantSignaling.prototype.__proto__ || Object.getPrototypeOf(LocalParticipantSignaling.prototype), 'addTrack', this).call(this, publication);
      return this;
    }

    /**
     * @param {DataTrackSender|MediaTrackSender} trackSender
     * @returns {?LocalTrackPublicationSignaling}
     */

  }, {
    key: 'getPublication',
    value: function getPublication(trackSender) {
      return this._trackSendersToPublications.get(trackSender) || null;
    }

    /**
     * @param {LocalTrackPublicationSignaling} publication
     * @returns {?DataTrackSender|MediaTrackSender}
     */

  }, {
    key: 'getSender',
    value: function getSender(trackPublication) {
      return this._publicationsToTrackSenders.get(trackPublication) || null;
    }

    /**
     * @param {DataTrackSender|MediaTrackSender} trackSender
     * @returns {?LocalTrackPublicationSignaling}
     */

  }, {
    key: 'removeTrack',
    value: function removeTrack(trackSender) {
      var publication = this._trackSendersToPublications.get(trackSender);
      if (!publication) {
        return null;
      }
      this._trackSendersToPublications.delete(trackSender);
      this._publicationsToTrackSenders.delete(publication);
      var didDelete = _get(LocalParticipantSignaling.prototype.__proto__ || Object.getPrototypeOf(LocalParticipantSignaling.prototype), 'removeTrack', this).call(this, publication);
      if (didDelete) {
        publication.stop();
      }
      return publication;
    }
  }]);

  return LocalParticipantSignaling;
}(ParticipantSignaling);

module.exports = LocalParticipantSignaling;
},{"./participant":52}],51:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TrackSignaling = require('./track');

/**
 * A {@link LocalTrackPublication} implementation
 * @extends TrackSignaling
 * @property {Track.ID} id
 */

var LocalTrackPublicationSignaling = function (_TrackSignaling) {
  _inherits(LocalTrackPublicationSignaling, _TrackSignaling);

  /**
   * Construct a {@link LocalTrackPublicationSignaling}. {@link TrackSenders}
   * are always cloned.
   * @param {DataTrackSender|MediaTrackSender} trackSender
   * @param {string} name
   * @param {Track.Priority} priority
   */
  function LocalTrackPublicationSignaling(trackSender, name, priority) {
    _classCallCheck(this, LocalTrackPublicationSignaling);

    trackSender = trackSender.clone();
    var enabled = trackSender.kind === 'data' ? true : trackSender.track.enabled;

    var _this = _possibleConstructorReturn(this, (LocalTrackPublicationSignaling.__proto__ || Object.getPrototypeOf(LocalTrackPublicationSignaling)).call(this, name, trackSender.kind, enabled, priority));

    _this.setTrackTransceiver(trackSender);
    Object.defineProperties(_this, {
      id: {
        enumerable: true,
        value: trackSender.id
      }
    });
    return _this;
  }

  /**
   * Enable (or disable) the {@link LocalTrackPublicationSignaling} if it is not
   * already enabled (or disabled). This also updates the cloned
   * {@link MediaTrackSender}'s MediaStreamTracks `enabled` state.
   * @param {boolean} [enabled=true]
   * @return {this}
   */


  _createClass(LocalTrackPublicationSignaling, [{
    key: 'enable',
    value: function enable(enabled) {
      enabled = typeof enabled === 'boolean' ? enabled : true;
      this.trackTransceiver.track.enabled = enabled;
      return _get(LocalTrackPublicationSignaling.prototype.__proto__ || Object.getPrototypeOf(LocalTrackPublicationSignaling.prototype), 'enable', this).call(this, enabled);
    }

    /**
     * Rejects the SID's deferred promise with the given Error.
     * @param {Error} error
     * @returns {this}
     */

  }, {
    key: 'publishFailed',
    value: function publishFailed(error) {
      if (setError(this, error)) {
        this.emit('updated');
      }
      return this;
    }
  }, {
    key: 'setSid',
    value: function setSid(sid) {
      if (this._error) {
        return this;
      }
      return _get(LocalTrackPublicationSignaling.prototype.__proto__ || Object.getPrototypeOf(LocalTrackPublicationSignaling.prototype), 'setSid', this).call(this, sid);
    }

    /**
     * Stop the cloned {@link TrackSender}.
     * @returns {void}
     */

  }, {
    key: 'stop',
    value: function stop() {
      this.trackTransceiver.stop();
    }
  }]);

  return LocalTrackPublicationSignaling;
}(TrackSignaling);

/**
 * @param {LocalTrackPublication} publication
 * @param {Error} error
 * @returns {boolean} updated
 */


function setError(publication, error) {
  if (publication._sid !== null || publication._error) {
    return false;
  }
  publication._error = error;
  return true;
}

module.exports = LocalTrackPublicationSignaling;
},{"./track":57}],52:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var StateMachine = require('../statemachine');
var NetworkQualityStats = require('../stats/networkqualitystats');

/*
ParticipantSignaling States
----------------------

    +------------+     +-----------+     +--------------+
    |            |     |           |     |              |
    | connecting |---->| connected |---->| disconnected |
    |            |     |           |     |              |
    +------------+     +-----------+     +--------------+

*/

var states = {
  connecting: ['connected'],
  connected: ['disconnected'],
  disconnected: []
};

/**
 * A {@link Participant} implementation
 * @extends StateMachine
 * @property {?string} identity
 * @property {?Participant.SID} sid
 * @property {string} state - "connecting", "connected", or "disconnected"
 * @property {Map<Track.ID | Track.SID, TrackSignaling>} tracks
 * @emits ParticipantSignaling#networkQualityLevelChanged
 * @emits ParticipantSignaling#trackAdded
 * @emits ParticipantSignaling#trackRemoved
 */

var ParticipantSignaling = function (_StateMachine) {
  _inherits(ParticipantSignaling, _StateMachine);

  /**
   * Construct a {@link ParticipantSignaling}.
   */
  function ParticipantSignaling() {
    _classCallCheck(this, ParticipantSignaling);

    var _this = _possibleConstructorReturn(this, (ParticipantSignaling.__proto__ || Object.getPrototypeOf(ParticipantSignaling)).call(this, 'connecting', states));

    Object.defineProperties(_this, {
      _identity: {
        writable: true,
        value: null
      },
      _networkQualityLevel: {
        value: null,
        writable: true
      },
      _networkQualityStats: {
        value: null,
        writable: true
      },
      _sid: {
        writable: true,
        value: null
      },
      identity: {
        enumerable: true,
        get: function get() {
          return this._identity;
        }
      },
      sid: {
        enumerable: true,
        get: function get() {
          return this._sid;
        }
      },
      tracks: {
        enumerable: true,
        value: new Map()
      }
    });
    return _this;
  }

  /**
   * Get the current {@link NetworkQualityLevel}, if any.
   * @returns {?NetworkQualityLevel} networkQualityLevel - initially null
   */


  _createClass(ParticipantSignaling, [{
    key: 'addTrack',


    /**
     * Add the {@link TrackSignaling}, MediaStreamTrack, or
     * {@link DataTrackSender} to the {@link ParticipantSignaling}.
     * @param {TrackSignaling|DataTrackSender|MediaTrackSender} track
     * @returns {this}
     * @fires ParticipantSignaling#trackAdded
     */
    value: function addTrack(track) {
      this.tracks.set(track.id || track.sid, track);
      this.emit('trackAdded', track);
      return this;
    }

    /**
     * Disconnect the {@link ParticipantSignaling}.
     * @returns {boolean}
     */

  }, {
    key: 'disconnect',
    value: function disconnect() {
      if (this.state !== 'disconnected') {
        this.preempt('disconnected');
        return true;
      }
      return false;
    }

    /**
     * Remove the {@link TrackSignaling}, MediaStreamTrack, or
     * {@link DataTrackSender} from the {@link ParticipantSignaling}.
     * @param {TrackSignaling|DataTrackSender|MediaTrackSender} track
     * @returns {?TrackSignaling}
     * @fires ParticipantSignaling#trackRemoved
     */

  }, {
    key: 'removeTrack',
    value: function removeTrack(track) {
      var signaling = this.tracks.get(track.id || track.sid);
      this.tracks.delete(track.id || track.sid);
      if (signaling) {
        this.emit('trackRemoved', track);
      }
      return signaling || null;
    }

    /**
     * @param {NetworkQualityLevel} networkQualityLevel
     * @param {?NetworkQualityLevels} [networkQualityLevels=null]
     * @returns {void}
     */

  }, {
    key: 'setNetworkQualityLevel',
    value: function setNetworkQualityLevel(networkQualityLevel, networkQualityLevels) {
      if (this._networkQualityLevel !== networkQualityLevel) {
        this._networkQualityLevel = networkQualityLevel;
        this._networkQualityStats = networkQualityLevels && (networkQualityLevels.audio || networkQualityLevels.video) ? new NetworkQualityStats(networkQualityLevels) : null;
        this.emit('networkQualityLevelChanged');
      }
    }

    /**
     * Connect the {@link ParticipantSignaling}.
     * @param {Participant.SID} sid
     * @param {string} identity
     * @returns {boolean}
     */

  }, {
    key: 'connect',
    value: function connect(sid, identity) {
      if (this.state === 'connecting') {
        this._sid = sid;
        this._identity = identity;
        this.preempt('connected');
        return true;
      }
      return false;
    }
  }, {
    key: 'networkQualityLevel',
    get: function get() {
      return this._networkQualityLevel;
    }

    /**
     * Get the current {@link NetworkQualityStats}
     * @returns {?NetworkQualityStats} networkQualityStats - initially null
     */

  }, {
    key: 'networkQualityStats',
    get: function get() {
      return this._networkQualityStats;
    }
  }]);

  return ParticipantSignaling;
}(StateMachine);

/**
 * @event ParticipantSignaling#event:networkQualityLevelChanged
 */

/**
 * {@link TrackSignaling} was added to the {@link ParticipantSignaling}.
 * @event ParticipantSignaling#trackAdded
 * @param {TrackSignaling} track
 */

/**
 * {@link TrackSignaling} was removed from the {@link ParticipantSignaling}.
 * @event ParticipantSignaling#trackRemoved
 * @param {TrackSignaling} track
 */

module.exports = ParticipantSignaling;
},{"../statemachine":75,"../stats/networkqualitystats":90}],53:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;

/**
 * Represents recording state
 * @extends EventEmitter
 * @property {?boolean} isEnabled
 */

var RecordingSignaling = function (_EventEmitter) {
  _inherits(RecordingSignaling, _EventEmitter);

  /**
   * Construct a {@link RecordingSignaling}.
   */
  function RecordingSignaling() {
    _classCallCheck(this, RecordingSignaling);

    var _this = _possibleConstructorReturn(this, (RecordingSignaling.__proto__ || Object.getPrototypeOf(RecordingSignaling)).call(this));

    Object.defineProperties(_this, {
      _isEnabled: {
        value: null,
        writable: true
      },
      isEnabled: {
        enumerable: true,
        get: function get() {
          return this._isEnabled;
        }
      }
    });
    return _this;
  }

  /**
   * Disable the {@link RecordingSignaling} if it is not already disabled.
   * @return {this}
   */


  _createClass(RecordingSignaling, [{
    key: 'disable',
    value: function disable() {
      return this.enable(false);
    }

    /**
     * Enable (or disable) the {@link RecordingSignaling} if it is not already enabled
     * (or disabled).
     * @param {boolean} [enabled=true]
     * @return {this}
     */

  }, {
    key: 'enable',
    value: function enable(enabled) {
      enabled = typeof enabled === 'boolean' ? enabled : true;
      if (this.isEnabled !== enabled) {
        this._isEnabled = enabled;
        this.emit('updated');
      }
      return this;
    }
  }]);

  return RecordingSignaling;
}(EventEmitter);

/**
 * Emitted whenever the {@link RecordingSignaling} is updated
 * @event RecordingSignaling#updated
 */

module.exports = RecordingSignaling;
},{"events":149}],54:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ParticipantSignaling = require('./participant');

/**
 * A {@link Participant} implementation
 * @extends ParticipantSignaling
 * @property {string} identity
 * @property {Participant.SID} sid
 */

var RemoteParticipantSignaling = function (_ParticipantSignaling) {
  _inherits(RemoteParticipantSignaling, _ParticipantSignaling);

  /**
   * Construct a {@link RemoteParticipantSignaling}.
   * @param {Participant.SID} sid
   * @param {string} identity
   */
  function RemoteParticipantSignaling(sid, identity) {
    _classCallCheck(this, RemoteParticipantSignaling);

    var _this = _possibleConstructorReturn(this, (RemoteParticipantSignaling.__proto__ || Object.getPrototypeOf(RemoteParticipantSignaling)).call(this));

    _this.connect(sid, identity);
    return _this;
  }

  return RemoteParticipantSignaling;
}(ParticipantSignaling);

module.exports = RemoteParticipantSignaling;
},{"./participant":52}],55:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TrackSignaling = require('./track');

/**
 * A {@link RemoteTrackPublication} implementation
 * @extends TrackSignaling
 */

var RemoteTrackPublicationSignaling = function (_TrackSignaling) {
  _inherits(RemoteTrackPublicationSignaling, _TrackSignaling);

  /**
   * Construct a {@link RemoteTrackPublicationSignaling}.
   * @param {Track.SID} sid
   * @param {string} name
   * @param {Track.Kind} kind
   * @param {boolean} isEnabled
   * @param {Track.Priority} priority
   */
  function RemoteTrackPublicationSignaling(sid, name, kind, isEnabled, priority) {
    _classCallCheck(this, RemoteTrackPublicationSignaling);

    var _this = _possibleConstructorReturn(this, (RemoteTrackPublicationSignaling.__proto__ || Object.getPrototypeOf(RemoteTrackPublicationSignaling)).call(this, name, kind, isEnabled, priority));

    Object.defineProperties(_this, {
      _isSwitchedOff: {
        value: false,
        writable: true
      }
    });
    _this.setSid(sid);
    return _this;
  }

  /**
   * Whether the {@link RemoteTrackPublicationSignaling} is subscribed to.
   * @property {boolean}
   */


  _createClass(RemoteTrackPublicationSignaling, [{
    key: 'subscribeFailed',


    /**
     * @param {Error} error
     * @returns {this}
     */
    value: function subscribeFailed(error) {
      if (!this.error) {
        this._error = error;
        this.emit('updated');
      }
      return this;
    }

    /**
     * Updates track switch on/off state.
     * @param {boolean} isSwitchedOff
     * @returns {this}
     */

  }, {
    key: 'setSwitchedOff',
    value: function setSwitchedOff(isSwitchedOff) {
      if (this._isSwitchedOff !== isSwitchedOff) {
        this._isSwitchedOff = isSwitchedOff;
        this.emit('updated');
      }
      return this;
    }
  }, {
    key: 'isSubscribed',
    get: function get() {
      return !!this.trackTransceiver;
    }

    /**
     * Whether the {@link RemoteTrackPublicationSignaling} is switched off.
     * @property {boolean}
     */

  }, {
    key: 'isSwitchedOff',
    get: function get() {
      return this._isSwitchedOff;
    }
  }]);

  return RemoteTrackPublicationSignaling;
}(TrackSignaling);

module.exports = RemoteTrackPublicationSignaling;
},{"./track":57}],56:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DefaultRecordingSignaling = require('./recording');
var StateMachine = require('../statemachine');

var _require = require('../util/twilio-video-errors'),
    MediaConnectionError = _require.MediaConnectionError,
    SignalingConnectionDisconnectedError = _require.SignalingConnectionDisconnectedError;

/*
RoomSignaling States
-----------------------

    +-----------+     +--------------+
    |           |     |              |
    | connected |---->| disconnected |
    |           |     |              |
    +-----------+     +--------------+
          |  ^               ^
          |  |               |
          |  |   +--------------+
          |  +---|              |
          |      | reconnecting |
          +----->|              |
                 +--------------+

*/

var states = {
  connected: ['reconnecting', 'disconnected'],
  reconnecting: ['connected', 'disconnected'],
  disconnected: []
};

/**
 * A {@link Room} implementation
 * @extends StateMachine
 * @property {?Participant.SID} dominantSpeakerSid
 * @property {ParticipantSignaling} localParticipant
 * @property {RTCIceConnectionState} mediaConnectionState
 * @property {string} name
 * @property {Map<string, RemoteParticipantSignaling>} participants
 * @property {RecordingSignaling} recording
 * @property {Room.SID} sid
 * @property {string} state - "connected", "reconnecting", or "disconnected"
 * @property {string} signalingConnectionState - "connected",
 *   "reconnecting", or "disconnected"
 * @emits RoomSignaling#mediaConnectionStateChanged
 * @emits RoomSignaling#signalingConnectionStateChanged
 */

var RoomSignaling = function (_StateMachine) {
  _inherits(RoomSignaling, _StateMachine);

  /**
   * Construct a {@link RoomSignaling}.
   * @param {ParticipantSignaling} localParticipant
   * @param {Room.SID} sid
   * @param {string} name
   */
  function RoomSignaling(localParticipant, sid, name, options) {
    _classCallCheck(this, RoomSignaling);

    options = Object.assign({
      RecordingSignaling: DefaultRecordingSignaling
    }, options);

    var _this = _possibleConstructorReturn(this, (RoomSignaling.__proto__ || Object.getPrototypeOf(RoomSignaling)).call(this, 'connected', states));

    var RecordingSignaling = options.RecordingSignaling;

    Object.defineProperties(_this, {
      _mediaConnectionIsReconnecting: {
        writable: true,
        value: false
      },
      _options: {
        value: options
      },
      dominantSpeakerSid: {
        enumerable: true,
        value: null,
        writable: true
      },
      localParticipant: {
        enumerable: true,
        value: localParticipant
      },
      name: {
        enumerable: true,
        value: name
      },
      participants: {
        enumerable: true,
        value: new Map()
      },
      recording: {
        enumerable: true,
        value: new RecordingSignaling()
      },
      sid: {
        enumerable: true,
        value: sid
      }
    });

    _this.on('mediaConnectionStateChanged', function () {
      return maybeUpdateState(_this);
    });
    _this.on('signalingConnectionStateChanged', function () {
      return maybeUpdateState(_this);
    });
    return _this;
  }

  /**
   * Disconnect, possibly with an Error.
   * @private
   * @param {Error} [error]
   * @returns {boolean}
   */


  _createClass(RoomSignaling, [{
    key: '_disconnect',
    value: function _disconnect(error) {
      if (this.state !== 'disconnected') {
        this.preempt('disconnected', null, [error]);
        return true;
      }
      return false;
    }

    /**
     * Connect {@link RemoteParticipantSignaling} to the {@link RoomSignaling}.
     * @param {RemoteParticipantSignaling} participant
     * @returns {boolean}
     */

  }, {
    key: 'connectParticipant',
    value: function connectParticipant(participant) {
      var self = this;

      if (participant.state === 'disconnected') {
        return false;
      }

      if (this.participants.has(participant.sid)) {
        return false;
      }

      this.participants.set(participant.sid, participant);

      participant.on('stateChanged', function stateChanged(state) {
        if (state === 'disconnected') {
          participant.removeListener('stateChanged', stateChanged);
          self.participants.delete(participant.sid);
          self.emit('participantDisconnected', participant);
        }
      });

      this.emit('participantConnected', participant);

      return true;
    }

    /**
     * Disconnect.
     * @returns {boolean}
     */

  }, {
    key: 'disconnect',
    value: function disconnect() {
      return this._disconnect();
    }

    /**
     * Set (or unset) the Dominant Speaker.
     * @param {?Participant.SID} dominantSpeakerSid
     * @returns {void}
     */

  }, {
    key: 'setDominantSpeaker',
    value: function setDominantSpeaker(dominantSpeakerSid) {
      this.dominantSpeakerSid = dominantSpeakerSid;
      this.emit('dominantSpeakerChanged');
    }
  }]);

  return RoomSignaling;
}(StateMachine);

/**
 * @event RoomSignaling#event:dominantSpeakerChanged
 */

/**
 * {@link RemoteParticipantSignaling} connected to the {@link RoomSignaling}.
 * @event RoomSignaling#event:participantConnected
 * @param {RemoteParticipantSignaling} participantSignaling
 */

/**
 * {@link RemoteParticipantSignaling} disconnected from the {@link RoomSignaling}.
 * @event RoomSignaling#event:participantDisconnected
 * @param {RemoteParticipantSignaling} participantSignaling
 */

/**
 * @event RoomSignaling#event:mediaConnectionStateChanged
 */

/**
 * @event RoomSignaling#event:signalingConnectionStateChanged
 */

/**
 * Maybe update the {@link RoomSignaling} state.
 * @param {RoomSignaling} roomSignaling
 */


function maybeUpdateState(roomSignaling) {
  if (roomSignaling.state === 'disconnected' || roomSignaling.signalingConnectionState === 'disconnected') {
    return;
  }

  var newState = void 0;

  if (roomSignaling.signalingConnectionState === 'reconnecting') {
    newState = roomSignaling.signalingConnectionState;
  } else if (roomSignaling.mediaConnectionState === 'failed') {
    roomSignaling._mediaConnectionIsReconnecting = true;
    newState = 'reconnecting';
  } else if (roomSignaling.mediaConnectionState === 'new' || roomSignaling.mediaConnectionState === 'checking') {
    newState = roomSignaling._mediaConnectionIsReconnecting ? 'reconnecting' : 'connected';
  } else {
    roomSignaling._mediaConnectionIsReconnecting = false;
    newState = 'connected';
  }

  if (newState === roomSignaling.state) {
    return;
  }

  if (newState === 'reconnecting') {
    roomSignaling.preempt(newState, null, [roomSignaling.signalingConnectionState === 'reconnecting' ? new SignalingConnectionDisconnectedError() : new MediaConnectionError()]);
  } else {
    roomSignaling.preempt(newState);
  }
}

module.exports = RoomSignaling;
},{"../statemachine":75,"../util/twilio-video-errors":125,"./recording":53}],57:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('events'),
    EventEmitter = _require.EventEmitter;

/**
 * A {@link Track} implementation
 * @extends EventEmitter
 * @property {Track.Kind} kind
 * @property {string} name
 */


var TrackSignaling = function (_EventEmitter) {
  _inherits(TrackSignaling, _EventEmitter);

  /**
   * Construct a {@link TrackSignaling}.
   * @param {string} name
   * @param {Track.Kind} kind
   * @param {boolean} isEnabled
   * @param {Track.Priority} priority
   */
  function TrackSignaling(name, kind, isEnabled, priority) {
    _classCallCheck(this, TrackSignaling);

    var _this = _possibleConstructorReturn(this, (TrackSignaling.__proto__ || Object.getPrototypeOf(TrackSignaling)).call(this));

    var sid = null;
    Object.defineProperties(_this, {
      _error: {
        value: null,
        writable: true
      },
      _isEnabled: {
        value: isEnabled,
        writable: true
      },
      _priority: {
        value: priority,
        writable: true
      },
      _trackTransceiver: {
        value: null,
        writable: true
      },
      _sid: {
        get: function get() {
          return sid;
        },
        set: function set(_sid) {
          if (sid === null) {
            sid = _sid;
          }
        }
      },
      kind: {
        enumerable: true,
        value: kind
      },
      name: {
        enumerable: true,
        value: name
      }
    });
    return _this;
  }

  /**
   * Non-null if publication or subscription failed.
   * @property {?Error} error
   */


  _createClass(TrackSignaling, [{
    key: 'disable',


    /**
     * Disable the {@link TrackSignaling} if it is not already disabled.
     * @return {this}
     */
    value: function disable() {
      return this.enable(false);
    }

    /**
     * Enable (or disable) the {@link TrackSignaling} if it is not already enabled
     * (or disabled).
     * @param {boolean} [enabled=true]
     * @return {this}
     */

  }, {
    key: 'enable',
    value: function enable(enabled) {
      enabled = typeof enabled === 'boolean' ? enabled : true;
      if (this.isEnabled !== enabled) {
        this._isEnabled = enabled;
        this.emit('updated');
      }
      return this;
    }

    /**
     * Set the {@link TrackTransceiver} on the {@link TrackSignaling}.
     * @param {TrackTransceiver} trackTransceiver
     * @returns {this}
     */

  }, {
    key: 'setTrackTransceiver',
    value: function setTrackTransceiver(trackTransceiver) {
      trackTransceiver = trackTransceiver || null;
      if (this.trackTransceiver !== trackTransceiver) {
        this._trackTransceiver = trackTransceiver;
        this.emit('updated');
      }
      return this;
    }

    /**
     * Set the SID on the {@link TrackSignaling} once.
     * @param {string} sid
     * @returns {this}
     */

  }, {
    key: 'setSid',
    value: function setSid(sid) {
      if (this.sid === null) {
        this._sid = sid;
        this.emit('updated');
      }
      return this;
    }
  }, {
    key: 'error',
    get: function get() {
      return this._error;
    }

    /**
     * Whether the {@link TrackSignaling} is enabled.
     * @property {boolean}
     */

  }, {
    key: 'isEnabled',
    get: function get() {
      return this._isEnabled;
    }

    /**
     * The {@link TrackSignaling}'s priority.
     * @property {Track.Priority}
     */

  }, {
    key: 'priority',
    get: function get() {
      return this._priority;
    }

    /**
     * The {@link TrackSignaling}'s {@link Track.SID}.
     * @property {Track.SID}
     */

  }, {
    key: 'sid',
    get: function get() {
      return this._sid;
    }

    /**
     * The {@link TrackSignaling}'s {@link TrackTransceiver}.
     * @property {TrackTransceiver}
     */

  }, {
    key: 'trackTransceiver',
    get: function get() {
      return this._trackTransceiver;
    }
  }]);

  return TrackSignaling;
}(EventEmitter);

/**
 * Emitted whenever the {@link TrackSignaling} is updated
 * @event TrackSignaling#updated
 */

module.exports = TrackSignaling;
},{"events":149}],58:[function(require,module,exports){
'use strict';

var CancelablePromise = require('../../util/cancelablepromise');
var DefaultPeerConnectionManager = require('./peerconnectionmanager');
var DefaultRoomV2 = require('./room');
var DefaultTransport = require('./twilioconnectiontransport');
var SignalingConnectionDisconnectedError = require('../../util/twilio-video-errors').SignalingConnectionDisconnectedError;
var SignalingIncomingMessageInvalidError = require('../../util/twilio-video-errors').SignalingIncomingMessageInvalidError;
var flatMap = require('../../util').flatMap;

function createCancelableRoomSignalingPromise(token, wsServer, localParticipant, iceServerSource, encodingParameters, preferredCodecs, options) {
  options = Object.assign({
    PeerConnectionManager: DefaultPeerConnectionManager,
    RoomV2: DefaultRoomV2,
    Transport: DefaultTransport
  }, options);

  var transport = void 0;

  var PeerConnectionManager = options.PeerConnectionManager;
  var RoomV2 = options.RoomV2;

  var peerConnectionManager = new PeerConnectionManager(iceServerSource, encodingParameters, preferredCodecs, options);

  var trackSenders = flatMap(localParticipant.tracks, function (trackV2) {
    return [trackV2.trackTransceiver];
  });

  peerConnectionManager.setConfiguration(options);
  peerConnectionManager.setTrackSenders(trackSenders);

  var cancelationError = new Error('Canceled');

  return new CancelablePromise(function onCreate(resolve, reject, isCanceled) {
    peerConnectionManager.createAndOffer().then(function createAndOfferSucceeded() {
      // NOTE(mmalavalli): PeerConnectionManager#createAndOffer() queues the
      // initial offer in the event queue for the 'description' event. So,
      // we are dequeueing to prevent the spurious 'update' message sent by
      // the client after connecting to a room.
      peerConnectionManager.dequeue('description');

      return new Promise(function (resolve, reject) {
        if (isCanceled()) {
          reject(cancelationError);
          return;
        }

        var transportOptions = typeof options.wsServerInsights === 'string' ? { wsServerInsights: options.wsServerInsights } : {};

        if (options.InsightsPublisher) {
          transportOptions.InsightsPublisher = options.InsightsPublisher;
        }

        if (options.NullInsightsPublisher) {
          transportOptions.NullInsightsPublisher = options.NullInsightsPublisher;
        }

        if (options.bandwidthProfile) {
          transportOptions.bandwidthProfile = options.bandwidthProfile;
        }

        transportOptions = Object.assign({
          automaticSubscription: options.automaticSubscription,
          dominantSpeaker: options.dominantSpeaker,
          environment: options.environment,
          logLevel: options.logLevel,
          networkQuality: options.networkQuality,
          iceServerSourceStatus: iceServerSource.status,
          insights: options.insights,
          realm: options.realm,
          sdpSemantics: options.sdpSemantics
        }, transportOptions);

        var Transport = options.Transport;
        transport = new Transport(options.name, token, localParticipant, peerConnectionManager, wsServer, transportOptions);

        transport.once('connected', function connected(initialState) {
          if (isCanceled()) {
            reject(cancelationError);
            return;
          }

          var localParticipantState = initialState.participant;
          if (!localParticipantState) {
            reject(new SignalingIncomingMessageInvalidError());
            return;
          }

          resolve(new RoomV2(localParticipant, initialState, transport, peerConnectionManager, options));
        });

        transport.once('stateChanged', function stateChanged(state, error) {
          if (state === 'disconnected') {
            error = error || new SignalingConnectionDisconnectedError();
            transport = null;
            reject(error);
          }
        });
      });
    }).then(function createRoomSignalingSucceeded(roomSignaling) {
      if (isCanceled()) {
        peerConnectionManager.close();
        roomSignaling.disconnect();
        reject(cancelationError);
        return;
      }
      resolve(roomSignaling);
    }).catch(function onError(error) {
      if (transport) {
        transport.disconnect();
        transport = null;
      }
      peerConnectionManager.close();
      reject(error);
    });
  }, function onCancel() {
    if (transport) {
      transport.disconnect();
      transport = null;
    }
  });
}

module.exports = createCancelableRoomSignalingPromise;
},{"../../util":112,"../../util/cancelablepromise":109,"../../util/twilio-video-errors":125,"./peerconnectionmanager":68,"./room":72,"./twilioconnectiontransport":74}],59:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('events'),
    EventEmitter = _require.EventEmitter;

/**
 * @property {?Track.SID} loudestParticipantSid
 * @emits DominantSpeakerSignaling#updated
 */


var DominantSpeakerSignaling = function (_EventEmitter) {
  _inherits(DominantSpeakerSignaling, _EventEmitter);

  /**
   * Construct an {@link DominantSpeakerSignaling}.
   * @param {MediaSignalingTransport} mediaSignalingTransport
   */
  function DominantSpeakerSignaling(mediaSignalingTransport) {
    _classCallCheck(this, DominantSpeakerSignaling);

    var _this = _possibleConstructorReturn(this, (DominantSpeakerSignaling.__proto__ || Object.getPrototypeOf(DominantSpeakerSignaling)).call(this));

    Object.defineProperties(_this, {
      _loudestParticipantSid: {
        value: null,
        writable: true
      }
    });

    mediaSignalingTransport.on('message', function (message) {
      switch (message.type) {
        case 'active_speaker':
          _this._setLoudestParticipantSid(message.participant);
          break;
        default:
          break;
      }
    });
    return _this;
  }

  /**
   * Get the loudest {@link Track.SID}, if known.
   * @returns {?Track.SID}
   */


  _createClass(DominantSpeakerSignaling, [{
    key: '_setLoudestParticipantSid',


    /**
     * @private
     * @param {Track.SID} loudestParticipantSid
     * @returns {void}
     */
    value: function _setLoudestParticipantSid(loudestParticipantSid) {
      if (this.loudestParticipantSid === loudestParticipantSid) {
        return;
      }
      this._loudestParticipantSid = loudestParticipantSid;
      this.emit('updated');
    }
  }, {
    key: 'loudestParticipantSid',
    get: function get() {
      return this._loudestParticipantSid;
    }
  }]);

  return DominantSpeakerSignaling;
}(EventEmitter);

/**
 * @event DominantSpeakerSignaling#updated
 */

module.exports = DominantSpeakerSignaling;
},{"events":149}],60:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Filter = require('../../util/filter');

/**
 * An {@link IceBox} stores trickled ICE candidates. Candidates added to the
 * {@link IceBox} via {@link IceBox#update} are compared against previously
 * trickled candidates and only new candidates will be returned (assuming they
 * match the current ICE username fragment set by {@link IceBox#setUfrag}).
 * @property {?string} ufrag
 */

var IceBox = function () {
  /**
   * Construct an {@link IceBox}.
   */
  function IceBox() {
    _classCallCheck(this, IceBox);

    Object.defineProperties(this, {
      _filter: {
        value: new Filter({
          getKey: function getKey(iceState) {
            return iceState.ufrag;
          },
          isLessThanOrEqualTo: function isLessThanOrEqualTo(a, b) {
            return a.revision <= b.revision;
          }
        })
      },
      _ufrag: {
        writable: true,
        value: null
      },
      ufrag: {
        enumerable: true,
        get: function get() {
          return this._ufrag;
        }
      }
    });
  }

  /**
   * Set the ICE username fragment on the {@link IceBox}. This method returns any
   * ICE candidates associated with the username fragment.
   * @param {string} ufrag
   * @returns {Array<RTCIceCandidateInit>}
   */


  _createClass(IceBox, [{
    key: 'setUfrag',
    value: function setUfrag(ufrag) {
      this._ufrag = ufrag;
      var ice = this._filter.toMap().get(ufrag);
      return ice ? ice.candidates : [];
    }

    /**
     * Update the {@link IceBox}. This method returns any new ICE candidates
     * associated with the current username fragment.
     * @param {object} iceState
     * @returns {Array<RTCIceCandidateInit>}
     */

  }, {
    key: 'update',
    value: function update(iceState) {
      // NOTE(mroberts): The Server sometimes does not set the candidates property.
      iceState.candidates = iceState.candidates || [];
      var oldIceState = this._filter.toMap().get(iceState.ufrag);
      var oldCandidates = oldIceState ? oldIceState.candidates : [];
      return this._filter.update(iceState) && this._ufrag === iceState.ufrag ? iceState.candidates.slice(oldCandidates.length) : [];
    }
  }]);

  return IceBox;
}();

module.exports = IceBox;
},{"../../util/filter":111}],61:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('../../util/constants'),
    ICE_ACTIVITY_CHECK_PERIOD_MS = _require.ICE_ACTIVITY_CHECK_PERIOD_MS,
    ICE_INACTIVITY_THRESHOLD_MS = _require.ICE_INACTIVITY_THRESHOLD_MS;

/**
 * Monitors a {@link RTCPeerConnection}'s stats and notifies
 * caller when inactivity is detected.
 */


var IceConnectionMonitor = function () {
  /**
   * Construct an {@link IceConnectionMonitor}.
   * @param {RTCPeerConnection} peerConnection
   * @param {object} [options]
   */
  function IceConnectionMonitor(peerConnection, options) {
    _classCallCheck(this, IceConnectionMonitor);

    options = Object.assign({
      activityCheckPeriodMs: ICE_ACTIVITY_CHECK_PERIOD_MS,
      inactivityThresholdMs: ICE_INACTIVITY_THRESHOLD_MS
    }, options);

    Object.defineProperties(this, {
      _activityCheckPeriodMs: {
        value: options.activityCheckPeriodMs
      },
      _inactivityThresholdMs: {
        value: options.inactivityThresholdMs
      },
      _lastActiveStats: {
        value: null,
        writable: true
      },
      _peerConnection: {
        value: peerConnection
      },
      _timer: {
        value: null,
        writable: true
      }
    });
  }

  /**
   * Get ICE connection stats, and extract received and send bytes.
   * @returns Promise<?RTCIceCandidatePairStats>
   */


  _createClass(IceConnectionMonitor, [{
    key: '_getIceConnectionStats',
    value: function _getIceConnectionStats() {
      return this._peerConnection.getStats().then(function (stats) {
        return Array.from(stats.values()).find(function (stat) {
          return stat.type === 'candidate-pair' && stat.nominated;
        });
      }).catch(function () {
        return null;
      });
    }

    /**
     * Start monitoring the ICE connection.
     * Monitors bytes received on active ice connection pair,
     * invokes onIceConnectionInactive when inactivity is detected.
     * @param {function} onIceConnectionInactive
     */

  }, {
    key: 'start',
    value: function start(onIceConnectionInactive) {
      var _this = this;

      this.stop();
      this._timer = setInterval(function () {
        _this._getIceConnectionStats().then(function (iceStats) {
          if (!iceStats) {
            return;
          }

          if (!_this._lastActivity || _this._lastActivity.bytesReceived !== iceStats.bytesReceived) {
            _this._lastActivity = iceStats;
          }

          if (iceStats.timestamp - _this._lastActivity.timestamp >= _this._inactivityThresholdMs) {
            onIceConnectionInactive();
          }
        });
      }, this._activityCheckPeriodMs);
    }

    /**
     * Stop monitoring the ICE connection state.
     * @returns {void}
     */

  }, {
    key: 'stop',
    value: function stop() {
      if (this._timer !== null) {
        clearInterval(this._timer);
        this._timer = null;
        this._lastActivity = null;
      }
    }
  }]);

  return IceConnectionMonitor;
}();

module.exports = IceConnectionMonitor;
},{"../../util/constants":110}],62:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var defaultCreateCancelableRoomSignalingPromise = require('./cancelableroomsignalingpromise');
var LocalParticipantV2 = require('./localparticipant');
var Signaling = require('../');

/**
 * {@link SignalingV2} implements version 2 of our signaling protocol.
 * @extends Signaling
 */

var SignalingV2 = function (_Signaling) {
  _inherits(SignalingV2, _Signaling);

  /**
   * Construct {@link SignalingV2}.
   * @param {string} wsServer
   * @param {?object} [options={}]
   */
  function SignalingV2(wsServer, options) {
    _classCallCheck(this, SignalingV2);

    /* eslint new-cap:0 */
    options = Object.assign({
      createCancelableRoomSignalingPromise: defaultCreateCancelableRoomSignalingPromise
    }, options);

    var _this = _possibleConstructorReturn(this, (SignalingV2.__proto__ || Object.getPrototypeOf(SignalingV2)).call(this));

    Object.defineProperties(_this, {
      _createCancelableRoomSignalingPromise: {
        value: options.createCancelableRoomSignalingPromise
      },
      _options: {
        value: options
      },
      _wsServer: {
        value: wsServer
      }
    });
    return _this;
  }

  /**
   * @private
   */


  _createClass(SignalingV2, [{
    key: '_connect',
    value: function _connect(localParticipant, token, iceServerSource, encodingParameters, preferredCodecs, options) {
      options = Object.assign({}, this._options, options);
      return this._createCancelableRoomSignalingPromise.bind(null, token, this._wsServer, localParticipant, iceServerSource, encodingParameters, preferredCodecs, options);
    }
  }, {
    key: 'createLocalParticipantSignaling',
    value: function createLocalParticipantSignaling(encodingParameters, networkQualityConfiguration) {
      return new LocalParticipantV2(encodingParameters, networkQualityConfiguration);
    }
  }]);

  return SignalingV2;
}(Signaling);

module.exports = SignalingV2;
},{"../":49,"./cancelableroomsignalingpromise":58,"./localparticipant":63}],63:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LocalParticipantSignaling = require('../localparticipant');
var LocalTrackPublicationV2 = require('./localtrackpublication');

/**
 * @extends ParticipantSignaling
 * @property {NetworkQualityConfigurationImpl} networkQualityConfiguration
 * @property {number} revision
 * @emits LocalParticipantV2#updated
 */

var LocalParticipantV2 = function (_LocalParticipantSign) {
  _inherits(LocalParticipantV2, _LocalParticipantSign);

  /**
   * Construct a {@link LocalParticipantV2}.
   * @param {EncodingParametersImpl} encodingParameters
   * @param {NetworkQualityConfigurationImpl} networkQualityConfiguration
   * @param {object} [options]
   */
  function LocalParticipantV2(encodingParameters, networkQualityConfiguration, options) {
    _classCallCheck(this, LocalParticipantV2);

    options = Object.assign({
      LocalTrackPublicationV2: LocalTrackPublicationV2
    }, options);

    var _this = _possibleConstructorReturn(this, (LocalParticipantV2.__proto__ || Object.getPrototypeOf(LocalParticipantV2)).call(this));

    Object.defineProperties(_this, {
      _encodingParameters: {
        value: encodingParameters
      },
      _removeListeners: {
        value: new Map()
      },
      _LocalTrackPublicationV2: {
        value: options.LocalTrackPublicationV2
      },
      _publishedRevision: {
        writable: true,
        value: 0
      },
      _revision: {
        writable: true,
        value: 1
      },
      networkQualityConfiguration: {
        enumerable: true,
        value: networkQualityConfiguration
      },
      revision: {
        enumerable: true,
        get: function get() {
          return this._revision;
        }
      }
    });
    return _this;
  }

  /**
   * Set the {@link EncodingParameters}.
   * @param {?EncodingParameters} encodingParameters
   * @returns {this}
   */


  _createClass(LocalParticipantV2, [{
    key: 'setParameters',
    value: function setParameters(encodingParameters) {
      this._encodingParameters.update(encodingParameters);
      return this;
    }

    /**
     * Update the {@link LocalParticipantV2} with the new state.
     * @param {Published} published
     * @returns {this}
     */

  }, {
    key: 'update',
    value: function update(published) {
      if (this._publishedRevision >= published.revision) {
        return this;
      }

      this._publishedRevision = published.revision;

      published.tracks.forEach(function (publicationState) {
        var localTrackPublicationV2 = this.tracks.get(publicationState.id);
        if (localTrackPublicationV2) {
          localTrackPublicationV2.update(publicationState);
        }
      }, this);

      return this;
    }

    /**
     * @protected
     * @param {DataTrackSender|MediaTrackSender} trackSender
     * @param {string} name
     * @param {Track.Priority} priority
     * @returns {LocalTrackPublicationV2}
     */

  }, {
    key: '_createLocalTrackPublicationSignaling',
    value: function _createLocalTrackPublicationSignaling(trackSender, name, priority) {
      return new this._LocalTrackPublicationV2(trackSender, name, priority);
    }

    /**
     * Add a {@link LocalTrackPublicationV2} for the given {@link DataTrackSender}
     * or {@link MediaTrackSender} to the {@link LocalParticipantV2}.
     * @param {DataTrackSender|MediaTrackSender} trackSender
     * @param {string} name
     * @param {Track.Priority} priority
     * @returns {this}
     */

  }, {
    key: 'addTrack',
    value: function addTrack(trackSender, name, priority) {
      var _this2 = this;

      _get(LocalParticipantV2.prototype.__proto__ || Object.getPrototypeOf(LocalParticipantV2.prototype), 'addTrack', this).call(this, trackSender, name, priority);
      var publication = this.getPublication(trackSender);

      var sid = publication.sid;


      var updated = function updated() {
        // NOTE(mmalavalli): The LocalParticipantV2's state is only published if
        // the "updated" event is emitted due to LocalTrackPublicationV2's
        // .isEnabled being toggled. We do not publish if it is fired due to the
        // LocalTrackPublicationV2's .sid being set.
        if (sid === publication.sid) {
          _this2.didUpdate();
          return;
        }
        sid = publication.sid;
      };

      publication.on('updated', updated);

      this._removeListener(publication);
      this._removeListeners.set(publication, function () {
        return publication.removeListener('updated', updated);
      });

      this.didUpdate();

      return this;
    }

    /**
     * @private
     * @param {LocalTrackPublicationV2} publication
     * @returns {void}
     */

  }, {
    key: '_removeListener',
    value: function _removeListener(publication) {
      var removeListener = this._removeListeners.get(publication);
      if (removeListener) {
        removeListener();
      }
    }

    /**
     * Get the current state of the {@link LocalParticipantV2}.
     * @returns {object}
     */

  }, {
    key: 'getState',
    value: function getState() {
      return {
        revision: this.revision,
        tracks: Array.from(this.tracks.values()).map(function (track) {
          return track.getState();
        })
      };
    }

    /**
     * Increment the revision for the {@link LocalParticipantV2}.
     * @private
     * @returns {void}
     */

  }, {
    key: 'didUpdate',
    value: function didUpdate() {
      this._revision++;
      this.emit('updated');
    }

    /**
     * Remove the {@link LocalTrackPublicationV2} for the given {@link DataTrackSender}
     * or {@link MediaTrackSender} from the {@link LocalParticipantV2}.
     * @param {DataTrackSender|MediaTrackSender} trackSender
     * @returns {?LocalTrackPublicationV2}
     */

  }, {
    key: 'removeTrack',
    value: function removeTrack(trackSender) {
      var publication = _get(LocalParticipantV2.prototype.__proto__ || Object.getPrototypeOf(LocalParticipantV2.prototype), 'removeTrack', this).call(this, trackSender);
      if (publication) {
        this._removeListener(publication);
        this.didUpdate();
      }
      return publication;
    }

    /**
     * Updates the verbosity of network quality information.
     * @param {NetworkQualityConfiguration} networkQualityConfiguration
     * @returns {void}
     */

  }, {
    key: 'setNetworkQualityConfiguration',
    value: function setNetworkQualityConfiguration(networkQualityConfiguration) {
      this.networkQualityConfiguration.update(networkQualityConfiguration);
    }
  }]);

  return LocalParticipantV2;
}(LocalParticipantSignaling);

/**
 * @interface Published
 * @property {number} revision
 * @property {Array<PublishedTrack>} tracks
 */

/**
 * @typedef {CreatedTrack|ReadyTrack|FailedTrack} PublishedTrack
 */

/**
 * @interface CreatedTrack
 * @property {Track.ID} id
 * @property {string} state - "created"
 */

/**
 * @interface ReadyTrack
 * @property {Track.ID} id
 * @property {Track.SID} sid
 * @property {string} state - "ready"
 */

/**
 * @interface FailedTrack
 * @property {Track.ID} id
 * @property {TrackError} error
 * @property {string} state - "failed"
 */

/**
 * @interface TrackError
 * @property {number} code
 * @property {string} message
 */

/**
 * @event LocalParticipantV2#updated
 */

module.exports = LocalParticipantV2;
},{"../localparticipant":50,"./localtrackpublication":64}],64:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LocalTrackPublicationSignaling = require('../localtrackpublication');
var createTwilioError = require('../../util/twilio-video-errors').createTwilioError;

/**
 * @extends LocalTrackPublicationSignaling
 */

var LocalTrackPublicationV2 = function (_LocalTrackPublicatio) {
  _inherits(LocalTrackPublicationV2, _LocalTrackPublicatio);

  /**
   * Construct a {@link LocalTrackPublicationV2}.
   * @param {DataTrackSender|MediaTrackSender} trackSender
   * @param {string} name
   * @param {Track.Priority} priority
   */
  function LocalTrackPublicationV2(trackSender, name, priority) {
    _classCallCheck(this, LocalTrackPublicationV2);

    return _possibleConstructorReturn(this, (LocalTrackPublicationV2.__proto__ || Object.getPrototypeOf(LocalTrackPublicationV2)).call(this, trackSender, name, priority));
  }

  /**
   * Get the {@link LocalTrackPublicationV2#Representation} of a given {@link TrackSignaling}.
   * @returns {LocalTrackPublicationV2#Representation} - without the SID
   */


  _createClass(LocalTrackPublicationV2, [{
    key: 'getState',
    value: function getState() {
      return {
        enabled: this.isEnabled,
        id: this.id,
        kind: this.kind,
        name: this.name,
        priority: this.priority
      };
    }

    /**
     * Compare the {@link LocalTrackPublicationV2} to a {@link LocalTrackPublicationV2#Representation} of itself
     * and perform any updates necessary.
     * @param {PublishedTrack} track
     * @returns {this}
     * @fires TrackSignaling#updated
     */

  }, {
    key: 'update',
    value: function update(track) {
      switch (track.state) {
        case 'ready':
          this.setSid(track.sid);
          break;
        case 'failed':
          {
            var error = track.error;
            this.publishFailed(createTwilioError(error.code, error.message));
            break;
          }
        default:
          // 'created'
          break;
      }
      return this;
    }
  }]);

  return LocalTrackPublicationV2;
}(LocalTrackPublicationSignaling);

/**
 * The Room Signaling Protocol (RSP) representation of a {@link LocalTrackPublicationV2}.
 * @typedef {object} LocalTrackPublicationV2#Representation
 * @property {boolean} enabled
 * @property {Track.ID} id
 * @property {Track.Kind} kind
 * @property {string} name
 * @priority {Track.Priority} priority
 * @property {Track.SID} sid
 */

module.exports = LocalTrackPublicationV2;
},{"../../util/twilio-video-errors":125,"../localtrackpublication":51}],65:[function(require,module,exports){
/* eslint callback-return:0 */
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events');

var PeerConnectionReportFactory = require('../../stats/peerconnectionreportfactory');

/**
 * @emits NetworkQualityMonitor#updated
 */

var NetworkQualityMonitor = function (_EventEmitter) {
  _inherits(NetworkQualityMonitor, _EventEmitter);

  /**
   * Construct a {@link NetworkQualityMonitor}.
   * @param {PeerConnectionManager} manager
   * @param {NetworkQualitySignaling} signaling
   */
  function NetworkQualityMonitor(manager, signaling) {
    _classCallCheck(this, NetworkQualityMonitor);

    var _this = _possibleConstructorReturn(this, (NetworkQualityMonitor.__proto__ || Object.getPrototypeOf(NetworkQualityMonitor)).call(this));

    Object.defineProperties(_this, {
      _factories: {
        value: new WeakMap()
      },
      _manager: {
        value: manager
      },
      _signaling: {
        value: signaling
      }
    });
    signaling.on('updated', function () {
      return _this.emit('updated');
    });
    return _this;
  }

  /**
   * Get the current {@link NetworkQualityLevel}, if any.
   * @returns {?NetworkQualityLevel} level - initially null
   */


  _createClass(NetworkQualityMonitor, [{
    key: 'start',


    /**
     * Start monitoring.
     * @returns {void}
     */
    value: function start() {
      var _this2 = this;

      this.stop();
      var timeout = setTimeout(function () {
        if (_this2._timeout !== timeout) {
          return;
        }
        next(_this2).then(function (reports) {
          if (_this2._timeout !== timeout) {
            return;
          }
          if (reports.length) {
            var _reports = _slicedToArray(reports, 1),
                report = _reports[0];

            _this2._signaling.put(report);
          }
          _this2.start();
        });
      }, 200);
      this._timeout = timeout;
    }

    /**
     * Stop monitoring.
     * @returns {void}
     */

  }, {
    key: 'stop',
    value: function stop() {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }, {
    key: 'level',
    get: function get() {
      return this._signaling.level;
    }

    /**
     * Get the current {@link NetworkQualityLevels}, if any.
     * @returns {?NetworkQualityLevels} levels - initially null
     */

  }, {
    key: 'levels',
    get: function get() {
      return this._signaling.levels;
    }

    /**
     * Get the current {@link NetworkQualityLevels} of remote participants, if any.
     * @returns {Map<String, NetworkQualityLevels>} remoteLevels
     */

  }, {
    key: 'remoteLevels',
    get: function get() {
      return this._signaling.remoteLevels;
    }
  }]);

  return NetworkQualityMonitor;
}(EventEmitter);

/**
 * @param {NetworkQualityMonitor}
 * @returns {Promise<NetworkQualityInputs>}
 */


function next(monitor) {
  var pcv2s = monitor._manager._peerConnections ? Array.from(monitor._manager._peerConnections.values()) : [];

  var pcs = pcv2s.map(function (pcv2) {
    return pcv2._peerConnection;
  }).filter(function (pc) {
    return pc.signalingState !== 'closed';
  });

  var factories = pcs.map(function (pc) {
    if (monitor._factories.has(pc)) {
      return monitor._factories.get(pc);
    }
    var factory = new PeerConnectionReportFactory(pc);
    monitor._factories.set(pc, factory);
    return factory;
  });

  var reportsOrNullPromises = factories.map(function (factory) {
    return factory.next().catch(function () {
      return null;
    });
  });

  return Promise.all(reportsOrNullPromises).then(function (reportsOrNull) {
    return reportsOrNull.filter(function (reportOrNull) {
      return reportOrNull;
    }).map(function (report) {
      return report.summarize();
    });
  });
}

/**
 * The {@link NetworkQualityLevel} changed.
 * @event NetworkQualityMonitor#updated
 */

module.exports = NetworkQualityMonitor;
},{"../../stats/peerconnectionreportfactory":93,"events":149}],66:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('events'),
    EventEmitter = _require.EventEmitter;

var AsyncVar = require('../../util/asyncvar');

/**
 * @interface MediaSignalingTransport
 * @property {function(object): boolean} send
 * @emits MediaSignalingTransport#message
 */

/**
 * The {@link MediaSignalingTransport} received a message.
 * @event MediaSignalingTransport#message
 * @param {object} message
 */

/**
 * @interface LatencyStats
 * @property {number} jitter
 * @property {number} rtt
 * @property {number} level
 */

/**
 * @interface FractionLostStats
 * @property {number} fractionLost
 * @property {number} level
 */

/**
 * @interface BandwidthStats
 * @property {number} actual
 * @property {number} available
 * @property {number} level
 */

/**
 * @interface SendOrRecvStats
 * @property {BandwidthStats} bandwidth
 * @property {FractionLostStats} fractionLost
 * @property {LatencyStats} latency
 */

/**
 * @interface MediaLevels
 * @property {number} send
 * @property {SendOrRecvStats} sendStats
 * @property {number} recv
 * @property {SendOrRecvStats} recvStats
 */

/**
 * @interface NetworkQualityLevels
 * @property {number} level
 * @property {MediaLevels} audio
 * @property {MediaLevels} video
 */

/**
 * @typedef {PeerConnectionSummary} NetworkQualityInputs
 */

/**
 * @classdesc The {@link NetworkQualitySignaling} class allows submitting
 *   {@link NetworkQualityInputs} for computing {@link NetworkQualityLevel}. It
 *   does so by sending and receiving messages over a
 *   {@link MediaSignalingTransport}. The exact transport used depends on the
 *   topology of the {@link Room} that {@link NetworkQualitySignaling} is being
 *   used within: for P2P Rooms, we re-use the {@link TransportV2}; and for
 *   Group Rooms, we use a {@link DataTransport}.
 * @emits NetworkQualitySignaling#updated
 */

var NetworkQualitySignaling = function (_EventEmitter) {
  _inherits(NetworkQualitySignaling, _EventEmitter);

  /**
   * Construct a {@link NetworkQualitySignaling}.
   * @param {MediaSignalingTransport} mediaSignalingTransport
   * @param {NetworkQualityConfigurationImpl} networkQualityConfiguration
   */
  function NetworkQualitySignaling(mediaSignalingTransport, networkQualityConfiguration) {
    _classCallCheck(this, NetworkQualitySignaling);

    var _this = _possibleConstructorReturn(this, (NetworkQualitySignaling.__proto__ || Object.getPrototypeOf(NetworkQualitySignaling)).call(this));

    Object.defineProperties(_this, {
      _level: {
        value: null,
        writable: true
      },
      _levels: {
        value: null,
        writable: true
      },
      _remoteLevels: {
        value: new Map(),
        writable: true
      },
      _mediaSignalingTransport: {
        value: mediaSignalingTransport
      },
      _networkQualityInputs: {
        value: new AsyncVar()
      },
      _networkQualityReportLevels: {
        get: function get() {
          return {
            reportLevel: networkQualityConfiguration.local,
            remoteReportLevel: networkQualityConfiguration.remote
          };
        }
      }
    });

    mediaSignalingTransport.on('message', function (message) {
      switch (message.type) {
        case 'network_quality':
          _this._handleNetworkQualityMessage(message);
          break;
        default:
          break;
      }
    });

    _this._sendNetworkQualityInputs();
    return _this;
  }

  /**
   * Get the current {@link NetworkQualityLevel}, if any.
   * @returns {?NetworkQualityLevel} level - initially null
   */


  _createClass(NetworkQualitySignaling, [{
    key: '_handleNetworkQualityMessage',


    /**
     * Check to see if the {@link NetworkQualityLevel} is new, and raise an
     * event if necessary.
     * @private
     * @param {object} message
     * @returns {void}
     */
    value: function _handleNetworkQualityMessage(message) {
      var _this2 = this;

      var updated = false;
      var level = null;
      var local = message ? message.local : null;
      if (typeof local === 'number') {
        // NOTE(mroberts): In prod, we plan to only send the level.
        level = local;
        this._levels = null;
      } else if ((typeof local === 'undefined' ? 'undefined' : _typeof(local)) === 'object' && local) {
        // NOTE(mroberts): In dev, we plan to send the decomposed levels. An early
        // VMS version does not compute `level` for us, so we fallback to taking
        // the minimum ourselves.
        this._levels = local;
        level = typeof local.level === 'number' ? local.level : Math.min(local.audio.send, local.audio.recv, local.video.send, local.video.recv);
      }
      if (level !== null && this.level !== level) {
        this._level = level;
        updated = true;
      }
      this._remoteLevels = message && message.remotes ? message.remotes.reduce(function (levels, obj) {
        var oldObj = _this2._remoteLevels.get(obj.sid) || {};
        if (oldObj.level !== obj.level) {
          updated = true;
        }
        return levels.set(obj.sid, obj);
      }, new Map()) : this._remoteLevels;

      if (updated) {
        this.emit('updated');
      }
      setTimeout(function () {
        return _this2._sendNetworkQualityInputs();
      }, 1000);
    }

    /**
     * Start sending {@link NetworkQualityInputs}.
     * @private
     * @returns {Promise<void>}
     */

  }, {
    key: '_sendNetworkQualityInputs',
    value: function _sendNetworkQualityInputs() {
      var _this3 = this;

      return this._networkQualityInputs.take().then(function (networkQualityInputs) {
        _this3._mediaSignalingTransport.publish(createNetworkQualityInputsMessage(networkQualityInputs, _this3._networkQualityReportLevels));
      });
    }

    /**
     * Put {@link NetworkQualityInputs} to be used for computing
     * {@link NetworkQualityLevel}.
     * @param {NetworkQualityInputs} networkQualityInputs
     * @returns {void}
     */

  }, {
    key: 'put',
    value: function put(networkQualityInputs) {
      this._networkQualityInputs.put(networkQualityInputs);
    }
  }, {
    key: 'level',
    get: function get() {
      return this._level;
    }

    /**
     * Get the current {@link NetworkQualityLevels}, if any.
     * @returns {?NetworkQualityLevels} levels - initially null
     */

  }, {
    key: 'levels',
    get: function get() {
      return this._levels;
    }

    /**
     * Get the current {@link NetworkQualityLevels} of remote participants, if any.
     * @returns {Map<String, NetworkQualityLevels>} remoteLevels
     */

  }, {
    key: 'remoteLevels',
    get: function get() {
      return this._remoteLevels;
    }
  }]);

  return NetworkQualitySignaling;
}(EventEmitter);

/**
 * The {@link NetworkQualityLevel} changed.
 * @event NetworkQualitySignaling#updated
 */

/**
 * @typedef {object} NetworkQualityReportLevels
 * @param {number} reportLevel
 * @param {number} remoteReportLevel
 */

/**
 * @param {NetworkQualityInputs} networkQualityInputs
 * @param {NetworkQualityReportLevels} networkQualityReportLevels
 * @returns {object} message
 */


function createNetworkQualityInputsMessage(networkQualityInputs, networkQualityReportLevels) {
  return Object.assign({ type: 'network_quality' }, networkQualityInputs, networkQualityReportLevels);
}

module.exports = NetworkQualitySignaling;
},{"../../util/asyncvar":108,"events":149}],67:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('@twilio/webrtc'),
    DefaultMediaStream = _require.MediaStream,
    DefaultRTCIceCandidate = _require.RTCIceCandidate,
    DefaultRTCPeerConnection = _require.RTCPeerConnection,
    DefaultRTCSessionDescription = _require.RTCSessionDescription,
    getStatistics = _require.getStats;

var _require2 = require('@twilio/webrtc/lib/util'),
    guessBrowser = _require2.guessBrowser;

var _require3 = require('@twilio/webrtc/lib/util/sdp'),
    getSdpFormat = _require3.getSdpFormat;

var _require4 = require('../../util/constants'),
    DEFAULT_LOG_LEVEL = _require4.DEFAULT_LOG_LEVEL;

var _require5 = require('../../util/sdp'),
    createCodecMapForMediaSection = _require5.createCodecMapForMediaSection,
    getMediaSections = _require5.getMediaSections,
    revertSimulcastForNonVP8MediaSections = _require5.revertSimulcastForNonVP8MediaSections,
    setBitrateParameters = _require5.setBitrateParameters,
    setCodecPreferences = _require5.setCodecPreferences,
    setSimulcast = _require5.setSimulcast,
    unifiedPlanAddOrRewriteNewTrackIds = _require5.unifiedPlanAddOrRewriteNewTrackIds,
    unifiedPlanAddOrRewriteTrackIds = _require5.unifiedPlanAddOrRewriteTrackIds,
    unifiedPlanFilterLocalCodecs = _require5.unifiedPlanFilterLocalCodecs;

var _require6 = require('../../util/twilio-video-errors'),
    MediaClientLocalDescFailedError = _require6.MediaClientLocalDescFailedError,
    MediaClientRemoteDescFailedError = _require6.MediaClientRemoteDescFailedError;

var _require7 = require('../../util'),
    buildLogLevels = _require7.buildLogLevels,
    makeUUID = _require7.makeUUID,
    oncePerTick = _require7.oncePerTick;

var IceBox = require('./icebox');
var DefaultIceConnectionMonitor = require('./iceconnectionmonitor.js');
var DataTrackReceiver = require('../../data/receiver');
var MediaTrackReceiver = require('../../media/track/receiver');
var StateMachine = require('../../statemachine');
var Log = require('../../util/log');
var IdentityTrackMatcher = require('../../util/sdp/trackmatcher/identity');
var OrderedTrackMatcher = require('../../util/sdp/trackmatcher/ordered');
var MIDTrackMatcher = require('../../util/sdp/trackmatcher/mid');
var workaroundIssue8329 = require('../../util/sdp/issue8329');

var guess = guessBrowser();
var isChrome = guess === 'chrome';
var isFirefox = guess === 'firefox';
var isSafari = guess === 'safari';

var firefoxMajorVersion = isFirefox ? parseInt(navigator.userAgent.match(/Firefox\/(\d+)/)[1], 10) : null;

var nInstances = 0;

/*
PeerConnectionV2 States
-----------------------

    +------+    +--------+
    |      |    |        |
    | open |--->| closed |
    |      |    |        |
    +------+    +--------+
      |  ^          ^
      |  |          |
      |  |          |
      v  |          |
  +----------+      |
  |          |      |
  | updating |------+
  |          |
  +----------+

*/

var states = {
  open: ['closed', 'updating'],
  updating: ['closed', 'open'],
  closed: []
};

/**
 * @extends StateMachine
 * @property {id}
 * @emits PeerConnectionV2#iceConnectionStateChanged
 * @emits PeerConnectionV2#candidates
 * @emits PeerConnectionV2#description
 */

var PeerConnectionV2 = function (_StateMachine) {
  _inherits(PeerConnectionV2, _StateMachine);

  /**
   * Construct a {@link PeerConnectionV2}.
   * @param {string} id
   * @param {EncodingParametersImpl} encodingParameters
   * @param {PreferredCodecs} preferredCodecs
   * @param {object} [options]
   */
  function PeerConnectionV2(id, encodingParameters, preferredCodecs, options) {
    _classCallCheck(this, PeerConnectionV2);

    var _this = _possibleConstructorReturn(this, (PeerConnectionV2.__proto__ || Object.getPrototypeOf(PeerConnectionV2)).call(this, 'open', states));

    options = Object.assign({
      dummyAudioMediaStreamTrack: null,
      iceServers: [],
      logLevel: DEFAULT_LOG_LEVEL,
      offerOptions: {},
      revertSimulcastForNonVP8MediaSections: revertSimulcastForNonVP8MediaSections,
      setBitrateParameters: setBitrateParameters,
      setCodecPreferences: setCodecPreferences,
      setSimulcast: setSimulcast,
      IceConnectionMonitor: DefaultIceConnectionMonitor,
      MediaStream: DefaultMediaStream,
      RTCIceCandidate: DefaultRTCIceCandidate,
      RTCPeerConnection: DefaultRTCPeerConnection,
      RTCSessionDescription: DefaultRTCSessionDescription
    }, options);

    var configuration = getConfiguration(options);
    var sdpFormat = getSdpFormat(configuration.sdpSemantics);
    var isUnifiedPlan = sdpFormat === 'unified';

    var localMediaStream = isUnifiedPlan ? null : new options.MediaStream();
    var logLevels = buildLogLevels(options.logLevel);
    var RTCPeerConnection = options.RTCPeerConnection;
    var peerConnection = new RTCPeerConnection(configuration, options.chromeSpecificConstraints);

    if (options.dummyAudioMediaStreamTrack) {
      peerConnection.addTrack(options.dummyAudioMediaStreamTrack, localMediaStream || new options.MediaStream());
    }

    // NOTE(mroberts): We do this to workaround the following bug:
    //
    //   https://bugzilla.mozilla.org/show_bug.cgi?id=1481335
    //
    if (isFirefox && firefoxMajorVersion < 65) {
      peerConnection.createDataChannel(makeUUID());
    }

    Object.defineProperties(_this, {
      _dataChannels: {
        value: new Map()
      },
      _dataTrackReceivers: {
        value: new Set()
      },
      _descriptionRevision: {
        writable: true,
        value: 0
      },
      _encodingParameters: {
        value: encodingParameters
      },
      _instanceId: {
        value: ++nInstances
      },
      _isIceConnectionInactive: {
        writable: true,
        value: false
      },
      _isIceLite: {
        writable: true,
        value: false
      },
      _isRestartingIce: {
        writable: true,
        value: false
      },
      _isUnifiedPlan: {
        value: isUnifiedPlan
      },
      _lastIceConnectionState: {
        writable: true,
        value: null
      },
      _lastStableDescriptionRevision: {
        writable: true,
        value: 0
      },
      _localCandidates: {
        writable: true,
        value: []
      },
      _localCodecs: {
        value: new Set()
      },
      _localCandidatesRevision: {
        writable: true,
        value: 1
      },
      _localDescriptionWithoutSimulcast: {
        writable: true,
        value: null
      },
      _localDescription: {
        writable: true,
        value: null
      },
      _localMediaStream: {
        value: localMediaStream
      },
      _localUfrag: {
        writable: true,
        value: null
      },
      _log: {
        value: options.log ? options.log.createLog('signaling', _this) : new Log('webrtc', _this, logLevels)
      },
      _remoteCodecMaps: {
        value: new Map()
      },
      _rtpSenders: {
        value: new Map()
      },
      _iceConnectionMonitor: {
        value: new options.IceConnectionMonitor(peerConnection)
      },
      _mediaTrackReceivers: {
        value: new Set()
      },
      _needsAnswer: {
        writable: true,
        value: false
      },
      _negotiationRole: {
        writable: true,
        value: null
      },
      _offerOptions: {
        writable: true,
        value: options.offerOptions
      },
      _peerConnection: {
        value: peerConnection
      },
      _preferredAudioCodecs: {
        value: preferredCodecs.audio
      },
      _preferredVideoCodecs: {
        value: preferredCodecs.video
      },
      _shouldApplySimulcast: {
        value: (isChrome || isSafari) && preferredCodecs.video.some(function (codecSettings) {
          return codecSettings.codec.toLowerCase() === 'vp8' && codecSettings.simulcast;
        })
      },
      _queuedDescription: {
        writable: true,
        value: null
      },
      _recycledTransceivers: {
        value: {
          audio: [],
          video: []
        }
      },
      _replaceTrackPromises: {
        value: []
      },
      _remoteCandidates: {
        writable: true,
        value: new IceBox()
      },
      _sdpFormat: {
        value: sdpFormat
      },
      _setBitrateParameters: {
        value: options.setBitrateParameters
      },
      _setCodecPreferences: {
        value: options.setCodecPreferences
      },
      _setSimulcast: {
        value: options.setSimulcast
      },
      _revertSimulcastForNonVP8MediaSections: {
        value: options.revertSimulcastForNonVP8MediaSections
      },
      _RTCIceCandidate: {
        value: options.RTCIceCandidate
      },
      _RTCPeerConnection: {
        value: options.RTCPeerConnection
      },
      _RTCSessionDescription: {
        value: options.RTCSessionDescription
      },
      _shouldOffer: {
        writable: true,
        value: false
      },
      _shouldRestartIce: {
        writable: true,
        value: false
      },
      _trackIdsToAttributes: {
        value: new Map()
      },
      _trackMatcher: {
        writable: true,
        value: null
      },
      id: {
        enumerable: true,
        value: id
      }
    });

    encodingParameters.on('changed', oncePerTick(_this.offer.bind(_this)));
    peerConnection.addEventListener('datachannel', _this._handleDataChannelEvent.bind(_this));
    peerConnection.addEventListener('icecandidate', _this._handleIceCandidateEvent.bind(_this));
    peerConnection.addEventListener('iceconnectionstatechange', _this._handleIceConnectionStateChange.bind(_this));
    peerConnection.addEventListener('signalingstatechange', _this._handleSignalingStateChange.bind(_this));
    peerConnection.addEventListener('track', _this._handleTrackEvent.bind(_this));

    var self = _this;
    _this.on('stateChanged', function stateChanged(state) {
      if (state !== 'closed') {
        return;
      }
      self.removeListener('stateChanged', stateChanged);
      self._dataChannels.forEach(function (dataChannel, dataTrackSender) {
        self.removeDataTrackSender(dataTrackSender);
      });
    });
    return _this;
  }

  _createClass(PeerConnectionV2, [{
    key: 'toString',
    value: function toString() {
      return '[PeerConnectionV2 #' + this._instanceId + ': ' + this.id + ']';
    }

    /**
     * The {@link PeerConnectionV2}'s underlying RTCPeerConnection's
     * RTCIceConnectionState.
     * @property {RTCIceConnectionState}
     */

  }, {
    key: '_addIceCandidate',


    /**
     * Add an ICE candidate to the {@link PeerConnectionV2}.
     * @private
     * @param {object} candidate
     * @returns {Promise<void>}
     */
    value: function _addIceCandidate(candidate) {
      var _this2 = this;

      return Promise.resolve().then(function () {
        candidate = new _this2._RTCIceCandidate(candidate);
        return _this2._peerConnection.addIceCandidate(candidate);
      }).catch(function (error) {
        // NOTE(mmalavalli): Firefox 68+ now generates an RTCIceCandidate with an
        // empty candidate string to signal end-of-candidates, followed by a null
        // candidate. As of now, Chrome and Safari reject this RTCIceCandidate. Since
        // this does not affect the media connection between Firefox 68+ and Chrome/Safari
        // in Peer-to-Peer Rooms, we suppress the Error and log a warning message.
        //
        // Chrome bug: https://bugs.chromium.org/p/chromium/issues/detail?id=978582
        //
        _this2._log.warn('Failed to add RTCIceCandidate ' + (candidate ? '"' + candidate.candidate + '"' : 'null') + ': ' + error.message);
      });
    }

    /**
     * Add ICE candidates to the {@link PeerConnectionV2}.
     * @private
     * @param {Array<object>} candidates
     * @returns {Promise<void>}
     */

  }, {
    key: '_addIceCandidates',
    value: function _addIceCandidates(candidates) {
      return Promise.all(candidates.map(this._addIceCandidate, this)).then(function () {});
    }

    /**
     * Add a new RTCRtpTransceiver or update an existing RTCRtpTransceiver for the
     * given MediaStreamTrack.
     * @private
     * @param {MediaStreamTrack} track
     * @returns {RTCRtpTransceiver}
     */

  }, {
    key: '_addOrUpdateTransceiver',
    value: function _addOrUpdateTransceiver(track) {
      var transceiver = takeRecycledTransceiver(this, track.kind);
      if (transceiver && transceiver.sender) {
        this._replaceTrackPromises.push(transceiver.sender.replaceTrack(track).then(function () {
          transceiver.direction = 'sendrecv';
        }, function () {
          // Do nothing.
        }));
        return transceiver;
      }
      return this._peerConnection.addTransceiver(track);
    }

    /**
     * Check the {@link IceBox}.
     * @private
     * @param {RTCSessionDescriptionInit} description
     * @returns {Promise<void>}
     */

  }, {
    key: '_checkIceBox',
    value: function _checkIceBox(description) {
      var ufrag = getUfrag(description);
      if (!ufrag) {
        return Promise.resolve();
      }
      var candidates = this._remoteCandidates.setUfrag(ufrag);
      return this._addIceCandidates(candidates);
    }

    /**
     * Create an answer and set it on the {@link PeerConnectionV2}.
     * @private
     * @param {RTCSessionDescriptionInit} offer
     * @returns {Promise<boolean>}
     */

  }, {
    key: '_answer',
    value: function _answer(offer) {
      var _this3 = this;

      return Promise.resolve().then(function () {
        if (!_this3._negotiationRole) {
          _this3._negotiationRole = 'answerer';
        }
        return _this3._setRemoteDescription(offer);
      }).catch(function () {
        throw new MediaClientRemoteDescFailedError();
      }).then(function () {
        return _this3._peerConnection.createAnswer();
      }).then(function (answer) {
        if (!isFirefox) {
          answer = workaroundIssue8329(answer);
        }

        var description = answer;
        if (_this3._shouldApplySimulcast) {
          var updatedSdp = _this3._setSimulcast(answer.sdp, _this3._sdpFormat, _this3._trackIdsToAttributes);
          // NOTE(syerrapragada): VMS does not support H264 simulcast. So,
          // unset simulcast for sections in local offer where corresponding
          // sections in answer doesn't have vp8 as preferred codec and reapply offer.
          updatedSdp = _this3._revertSimulcastForNonVP8MediaSections(updatedSdp, answer.sdp, offer.sdp);
          description = {
            type: description.type,
            sdp: updatedSdp
          };
        }
        return _this3._setLocalDescription(description);
      }).then(function () {
        return _this3._checkIceBox(offer);
      }).then(function () {
        return _this3._queuedDescription && _this3._updateDescription(_this3._queuedDescription);
      }).then(function () {
        _this3._queuedDescription = null;
        return _this3._maybeReoffer(_this3._peerConnection.localDescription);
      }).catch(function (error) {
        throw error instanceof MediaClientRemoteDescFailedError ? error : new MediaClientLocalDescFailedError();
      });
    }

    /**
     * Close the underlying RTCPeerConnection. Returns false if the
     * RTCPeerConnection was already closed.
     * @private
     * @returns {boolean}
     */

  }, {
    key: '_close',
    value: function _close() {
      if (this._peerConnection.signalingState !== 'closed') {
        this._peerConnection.close();
        return true;
      }
      return false;
    }

    /**
     * Handle a "datachannel" event.
     * @private
     * @param {RTCDataChannelEvent} event
     * @returns {void}
     */

  }, {
    key: '_handleDataChannelEvent',
    value: function _handleDataChannelEvent(event) {
      var _this4 = this;

      var dataChannel = event.channel;
      var dataTrackReceiver = new DataTrackReceiver(dataChannel);
      this._dataTrackReceivers.add(dataTrackReceiver);

      dataChannel.addEventListener('close', function () {
        _this4._dataTrackReceivers.delete(dataTrackReceiver);
      });

      this.emit('trackAdded', dataTrackReceiver);
    }

    /**
     * Handle a glare scenario on the {@link PeerConnectionV2}.
     * @private
     * @param {RTCSessionDescriptionInit} offer
     * @returns {Promise<void>}
     */

  }, {
    key: '_handleGlare',
    value: function _handleGlare(offer) {
      var _this5 = this;

      this._log.debug('Glare detected; rolling back');
      if (this._isRestartingIce) {
        this._log.debug('An ICE restart was in progress; we\'ll need to restart ICE again after rolling back');
        this._isRestartingIce = false;
        this._shouldRestartIce = true;
      }
      return Promise.resolve().then(function () {
        return _this5._setLocalDescription({ type: 'rollback' });
      }).then(function () {
        _this5._needsAnswer = false;
        return _this5._answer(offer);
      }).then(function (didReoffer) {
        return didReoffer ? Promise.resolve() : _this5._offer();
      });
    }

    /**
     * Handle an ICE candidate event.
     * @private
     * @param {Event} event
     * @returns {void}
     */

  }, {
    key: '_handleIceCandidateEvent',
    value: function _handleIceCandidateEvent(event) {
      if (event.candidate) {
        this._localCandidates.push(event.candidate);
      }
      var peerConnectionState = {
        ice: {
          candidates: this._isIceLite ? [] : this._localCandidates.slice(),
          ufrag: this._localUfrag
        },
        id: this.id
      };
      if (!event.candidate) {
        peerConnectionState.ice.complete = true;
      }
      if (!(this._isIceLite && event.candidate)) {
        peerConnectionState.ice.revision = this._localCandidatesRevision++;
        this.emit('candidates', peerConnectionState);
      }
    }

    /**
     * Handle an ICE connection state change event.
     * @private
     * @returns {void}
     */

  }, {
    key: '_handleIceConnectionStateChange',
    value: function _handleIceConnectionStateChange() {
      var _this6 = this;

      var iceConnectionState = this._peerConnection.iceConnectionState;


      this._log.debug('ICE connection state is "' + iceConnectionState + '"');

      // Case 1: Transition to "failed".
      if (this._lastIceConnectionState !== 'failed' && iceConnectionState === 'failed' && !this._shouldRestartIce && !this._isRestartingIce) {
        this._log.warn('ICE failed; attempting to restart ICE');
        this._shouldRestartIce = true;
        this.offer();
      }

      // Case 2: Transition from "failed".
      else if (this._lastIceConnectionState === 'failed' && (iceConnectionState === 'connected' || iceConnectionState === 'completed')) {
          this._log.info('ICE reconnected');
        }

      this._isIceConnectionInactive = false;
      if (iceConnectionState === 'disconnected') {
        this._iceConnectionMonitor.start(function () {
          _this6._iceConnectionMonitor.stop();
          if (!_this6._shouldRestartIce && !_this6._isRestartingIce) {
            _this6._log.warn('ICE Connection Monitor detected inactivity; attempting to restart ICE');
            _this6._shouldRestartIce = true;
            _this6._isIceConnectionInactive = true;
            _this6.offer();
            _this6.emit('iceConnectionStateChanged');
          }
        });
      } else {
        this._iceConnectionMonitor.stop();
      }

      this._lastIceConnectionState = iceConnectionState;
      this.emit('iceConnectionStateChanged');
    }

    /**
     * Handle a signaling state change event.
     * @private
     * @returns {void}
     */

  }, {
    key: '_handleSignalingStateChange',
    value: function _handleSignalingStateChange() {
      if (this._peerConnection.signalingState === 'closed' && this.state !== 'closed') {
        this.preempt('closed');
      }
    }

    /**
     * Handle a track event.
     * @private
     * @param {Event} event
     * @returns {void}
     */

  }, {
    key: '_handleTrackEvent',
    value: function _handleTrackEvent(event) {
      var _this7 = this;

      var sdp = this._peerConnection.remoteDescription ? this._peerConnection.remoteDescription.sdp : null;

      if (!this._trackMatcher) {
        this._trackMatcher = event.transceiver && event.transceiver.mid ? new MIDTrackMatcher()
        // NOTE(mroberts): Until Chrome ships RTCRtpTransceivers with MID
        // support, we have to use the same hacky solution as Safari. Revisit
        // this when RTCRtpTransceivers and MIDs land. We should be able to use
        // the same technique as Firefox.
        : isSafari || this._isUnifiedPlan ? new OrderedTrackMatcher() : new IdentityTrackMatcher();
      }
      this._trackMatcher.update(sdp);

      var mediaStreamTrack = event.track;
      var signaledTrackId = this._trackMatcher.match(event) || mediaStreamTrack.id;
      var mediaTrackReceiver = new MediaTrackReceiver(signaledTrackId, mediaStreamTrack);

      // NOTE(mmalavalli): In unified plan mode, "ended" is not fired on the remote
      // MediaStreamTrack when the remote peer removes a track. So, when this
      // MediaStreamTrack is re-used for a different track due to the remote peer
      // calling RTCRtpSender.replaceTrack(), we delete the previous MediaTrackReceiver
      // that owned this MediaStreamTrack before adding the new MediaTrackReceiver.
      this._mediaTrackReceivers.forEach(function (trackReceiver) {
        if (trackReceiver.track.id === mediaTrackReceiver.track.id) {
          _this7._mediaTrackReceivers.delete(trackReceiver);
        }
      });

      this._mediaTrackReceivers.add(mediaTrackReceiver);
      mediaStreamTrack.addEventListener('ended', function () {
        return _this7._mediaTrackReceivers.delete(mediaTrackReceiver);
      });
      this.emit('trackAdded', mediaTrackReceiver);
    }

    /**
     * Conditionally re-offer.
     * @private
     * @param {?RTCSessionDescriptionInit} localDescription
     * @returns {Promise<boolean>}
     */

  }, {
    key: '_maybeReoffer',
    value: function _maybeReoffer(localDescription) {
      var shouldReoffer = this._shouldOffer;

      if (localDescription && localDescription.sdp) {
        // NOTE(mmalavalli): For "unified-plan" sdps, if the remote RTCPeerConnection sends
        // an offer with fewer audio m= lines than the number of audio RTCRTPSenders
        // in the local RTCPeerConnection, then the local RTCPeerConnection creates
        // an answer with the same number of audio m= lines as in the offer. This
        // behavior was triggered by the removal of 'offerToReceiveAudio' from the
        // default RTCOfferOptions. Ideally, the local RTCPeerConnection should create
        // an answer with the same number of audio m= lines as the number of
        // RTCRTPSenders. In order to achieve this,the local RTCPeerConnection
        // initiates renegotiation.
        //
        // We can reduce the number of cases where renegotiation is needed by
        // re-introducing 'offerToReceiveAudio' to the default RTCOfferOptions with a
        // value > 1.
        if (this._isUnifiedPlan && localDescription.type === 'answer') {
          var senders = this._peerConnection.getSenders().filter(function (sender) {
            return sender.track;
          });
          shouldReoffer = ['audio', 'video'].reduce(function (shouldOffer, kind) {
            var mediaSections = getMediaSections(localDescription.sdp, kind, '(sendrecv|sendonly)');
            var sendersOfKind = senders.filter(isSenderOfKind.bind(null, kind));
            return shouldOffer || mediaSections.length < sendersOfKind.length;
          }, shouldReoffer);
        }

        // NOTE(mroberts): We also need to re-offer if we have a DataTrack to share
        // but no m= application section.
        var hasDataTrack = this._dataChannels.size > 0;
        var hasApplicationMediaSection = getMediaSections(localDescription.sdp, 'application').length > 0;
        var needsApplicationMediaSection = hasDataTrack && !hasApplicationMediaSection;
        shouldReoffer = shouldReoffer || needsApplicationMediaSection;
      }

      var promise = shouldReoffer ? this._offer() : Promise.resolve();
      return promise.then(function () {
        return shouldReoffer;
      });
    }

    /**
     * Create an offer and set it on the {@link PeerConnectionV2}.
     * @private
     * @returns {Promise<void>}
     */

  }, {
    key: '_offer',
    value: function _offer() {
      var _this8 = this;

      var offerOptions = Object.assign({}, this._offerOptions);
      this._needsAnswer = true;
      if (this._shouldRestartIce) {
        this._shouldRestartIce = false;
        this._isRestartingIce = true;
        offerOptions.iceRestart = true;
      }
      return Promise.all(this._replaceTrackPromises.splice(0)).then(function () {
        return _this8._peerConnection.createOffer(offerOptions);
      }).catch(function () {
        throw new MediaClientLocalDescFailedError();
      }).then(function (offer) {
        if (!isFirefox) {
          offer = workaroundIssue8329(offer);
        }

        var sdp = _this8._isUnifiedPlan && _this8._peerConnection.remoteDescription ? unifiedPlanFilterLocalCodecs(offer.sdp, _this8._peerConnection.remoteDescription.sdp) : offer.sdp;

        var updatedSdp = _this8._setCodecPreferences(sdp, _this8._preferredAudioCodecs, _this8._preferredVideoCodecs);

        _this8._shouldOffer = false;
        if (!_this8._negotiationRole) {
          _this8._negotiationRole = 'offerer';
        }

        if (_this8._shouldApplySimulcast) {
          _this8._localDescriptionWithoutSimulcast = {
            type: 'offer',
            sdp: updatedSdp
          };
          updatedSdp = _this8._setSimulcast(updatedSdp, _this8._sdpFormat, _this8._trackIdsToAttributes);
        }

        return _this8._setLocalDescription({
          type: 'offer',
          sdp: updatedSdp
        });
      });
    }

    /**
     * Add or rewrite local MediaStreamTrack IDs in the given Unified Plan RTCSessionDescription.
     * @private
     * @param {RTCSessionDescription} description
     * @return {RTCSessionDescription}
     */

  }, {
    key: '_addOrRewriteLocalTrackIds',
    value: function _addOrRewriteLocalTrackIds(description) {
      var transceivers = this._peerConnection.getTransceivers();
      var activeTransceivers = transceivers.filter(function (_ref) {
        var sender = _ref.sender,
            stopped = _ref.stopped;
        return !stopped && sender && sender.track;
      });

      // NOTE(mmalavalli): There is no guarantee that MediaStreamTrack IDs will be present in
      // SDPs, and even if they are, there is no guarantee that they will be the same as the
      // actual MediaStreamTrack IDs. So, we add or re-write the actual MediaStreamTrack IDs
      // to the assigned m= sections here.
      var assignedTransceivers = activeTransceivers.filter(function (_ref2) {
        var mid = _ref2.mid;
        return mid;
      });
      var midsToTrackIds = new Map(assignedTransceivers.map(function (_ref3) {
        var mid = _ref3.mid,
            sender = _ref3.sender;
        return [mid, sender.track.id];
      }));
      var sdp1 = unifiedPlanAddOrRewriteTrackIds(description.sdp, midsToTrackIds);

      // NOTE(mmalavalli): Chrome and Safari do not apply the offer until they get an answer.
      // So, we add or re-write the actual MediaStreamTrack IDs to the unassigned m= sections here.
      var unassignedTransceivers = activeTransceivers.filter(function (_ref4) {
        var mid = _ref4.mid;
        return !mid;
      });
      var newTrackIdsByKind = new Map(['audio', 'video'].map(function (kind) {
        return [kind, unassignedTransceivers.filter(function (_ref5) {
          var sender = _ref5.sender;
          return sender.track.kind === kind;
        }).map(function (_ref6) {
          var sender = _ref6.sender;
          return sender.track.id;
        })];
      }));
      var sdp2 = unifiedPlanAddOrRewriteNewTrackIds(sdp1, midsToTrackIds, newTrackIdsByKind);

      return new this._RTCSessionDescription({
        sdp: sdp2,
        type: description.type
      });
    }

    /**
     * Rollback and apply the given offer.
     * @private
     * @param {RTCSessionDescriptionInit} offer
     * @returns {Promise<void>}
     */

  }, {
    key: '_rollbackAndApplyOffer',
    value: function _rollbackAndApplyOffer(offer) {
      var _this9 = this;

      return this._setLocalDescription({ type: 'rollback' }).then(function () {
        return _this9._setLocalDescription(offer);
      });
    }

    /**
     * Set a local description on the {@link PeerConnectionV2}.
     * @private
     * @param {RTCSessionDescription|RTCSessionDescriptionInit} description
     * @returns {Promise<void>}
     */

  }, {
    key: '_setLocalDescription',
    value: function _setLocalDescription(description) {
      var _this10 = this;

      return this._peerConnection.setLocalDescription(description).catch(function (error) {
        _this10._log.warn('Calling setLocalDescription with an RTCSessionDescription of type "' + description.type + '" failed with the error "' + error.message + '".');
        if (description.sdp) {
          _this10._log.warn('The SDP was ' + description.sdp);
        }
        throw new MediaClientLocalDescFailedError();
      }).then(function () {
        if (description.type !== 'rollback') {
          _this10._localDescription = _this10._isUnifiedPlan ? _this10._addOrRewriteLocalTrackIds(description) : description;
          _this10._localCandidates = [];
          if (description.type === 'offer') {
            _this10._descriptionRevision++;
          } else if (description.type === 'answer') {
            _this10._lastStableDescriptionRevision = _this10._descriptionRevision;
            if (_this10._isUnifiedPlan) {
              updateRecycledTransceivers(_this10);
              updateLocalCodecs(_this10);
              updateRemoteCodecMaps(_this10);
            }
          }
          _this10._localUfrag = getUfrag(description);
          _this10.emit('description', _this10.getState());
        }
      });
    }

    /**
     * Set a remote RTCSessionDescription on the {@link PeerConnectionV2}.
     * @private
     * @param {RTCSessionDescriptionInit} description
     * @returns {Promise<void>}
     */

  }, {
    key: '_setRemoteDescription',
    value: function _setRemoteDescription(description) {
      var _this11 = this;

      if (description.sdp) {
        description.sdp = this._setBitrateParameters(description.sdp, isFirefox ? 'TIAS' : 'AS', this._encodingParameters.maxAudioBitrate, this._encodingParameters.maxVideoBitrate);
        description.sdp = this._setCodecPreferences(description.sdp, this._preferredAudioCodecs, this._preferredVideoCodecs);
        // NOTE(mroberts): Do this to reduce our MediaStream count in Firefox. By
        // mapping MediaStream IDs in the SDP to "-", we ensure the "track" event
        // doesn't include any new MediaStreams in Firefox. Its `streams` member
        // will always be the empty Array.
        if (isFirefox) {
          description.sdp = filterOutMediaStreamIds(description.sdp);
        }
        if (!this._peerConnection.remoteDescription) {
          this._isIceLite = /a=ice-lite/.test(description.sdp);
        }
      }
      description = new this._RTCSessionDescription(description);
      return Promise.resolve().then(function () {
        // NOTE(syerrapragada): VMS does not support H264 simulcast. So,
        // unset simulcast for sections in local offer where corresponding
        // sections in answer doesn't have vp8 as preferred codec and reapply offer.
        if (description.type === 'answer' && _this11._shouldApplySimulcast) {
          return _this11._rollbackAndApplyOffer({
            type: _this11._localDescription.type,
            sdp: _this11._revertSimulcastForNonVP8MediaSections(_this11._localDescription.sdp, _this11._localDescriptionWithoutSimulcast.sdp, description.sdp)
          });
        }
      }).then(function () {
        return _this11._peerConnection.setRemoteDescription(description);
      }).then(function () {
        if (description.type === 'answer' && _this11._isRestartingIce) {
          _this11._log.debug('An ICE restart was in-progress and is now completed');
          _this11._isRestartingIce = false;
        }
        if (description.type === 'answer' && _this11._isUnifiedPlan) {
          updateRecycledTransceivers(_this11);
          updateLocalCodecs(_this11);
          updateRemoteCodecMaps(_this11);
        }
      }, function (error) {
        _this11._log.warn('Calling setRemoteDescription with an RTCSessionDescription of type "' + description.type + '" failed with the error "' + error.message + '".');
        if (description.sdp) {
          _this11._log.warn('The SDP was ' + description.sdp);
        }
        throw error;
      });
    }

    /**
     * Update the {@link PeerConnectionV2}'s description.
     * @private
     * @param {RTCSessionDescriptionInit} description
     * @returns {Promise<void>}
     */

  }, {
    key: '_updateDescription',
    value: function _updateDescription(description) {
      var _this12 = this;

      switch (description.type) {
        case 'answer':
        case 'pranswer':
          if (description.revision !== this._descriptionRevision || this._peerConnection.signalingState !== 'have-local-offer') {
            return Promise.resolve();
          }
          this._descriptionRevision = description.revision;
          break;
        case 'close':
          return this._close();
        case 'create-offer':
          if (description.revision <= this._lastStableDescriptionRevision) {
            return Promise.resolve();
          } else if (this._needsAnswer) {
            this._queuedDescription = description;
            return Promise.resolve();
          }
          this._descriptionRevision = description.revision;
          return this._offer();
        case 'offer':
          if (description.revision <= this._lastStableDescriptionRevision || this._peerConnection.signalingState === 'closed') {
            return Promise.resolve();
          }
          if (this._peerConnection.signalingState === 'have-local-offer') {
            if (this._needsAnswer && this._descriptionRevision === 1) {
              this._queuedDescription = description;
              return Promise.resolve();
            }
            this._descriptionRevision = description.revision;
            return this._handleGlare(description);
          }
          this._descriptionRevision = description.revision;
          return this._answer(description).then(function () {});
        default:
        // Do nothing.
      }

      // Handle answer or pranswer.
      var revision = description.revision;
      return Promise.resolve().then(function () {
        return _this12._setRemoteDescription(description);
      }).catch(function () {
        throw new MediaClientRemoteDescFailedError();
      }).then(function () {
        _this12._lastStableDescriptionRevision = revision;
        _this12._needsAnswer = false;
        return _this12._checkIceBox(description);
      }).then(function () {
        return _this12._queuedDescription && _this12._updateDescription(_this12._queuedDescription);
      }).then(function () {
        _this12._queuedDescription = null;
        return _this12._maybeReoffer(_this12._peerConnection.localDescription).then(function () {});
      });
    }

    /**
     * Update the {@link PeerConnectionV2}'s ICE candidates.
     * @private
     * @param {object} iceState
     * @returns {Promise<void>}
     */

  }, {
    key: '_updateIce',
    value: function _updateIce(iceState) {
      var candidates = this._remoteCandidates.update(iceState);
      return this._addIceCandidates(candidates);
    }

    /**
     * Add a {@link DataTrackSender} to the {@link PeerConnectionV2}.
     * @param {DataTrackSender} dataTrackSender
     * @returns {void}
     */

  }, {
    key: 'addDataTrackSender',
    value: function addDataTrackSender(dataTrackSender) {
      if (this._dataChannels.has(dataTrackSender)) {
        return;
      }
      try {
        var dataChannelDict = {
          ordered: dataTrackSender.ordered
        };
        if (dataTrackSender.maxPacketLifeTime !== null) {
          dataChannelDict.maxPacketLifeTime = dataTrackSender.maxPacketLifeTime;
        }
        if (dataTrackSender.maxRetransmits !== null) {
          dataChannelDict.maxRetransmits = dataTrackSender.maxRetransmits;
        }
        var dataChannel = this._peerConnection.createDataChannel(dataTrackSender.id, dataChannelDict);
        dataTrackSender.addDataChannel(dataChannel);
        this._dataChannels.set(dataTrackSender, dataChannel);
      } catch (error) {
        // Do nothing.
      }
    }

    /**
     * Add the {@link MediaTrackSender} to the {@link PeerConnectionV2}.
     * @param {MediaTrackSender} mediaTrackSender
     * @returns {void}
     */

  }, {
    key: 'addMediaTrackSender',
    value: function addMediaTrackSender(mediaTrackSender) {
      if (this._peerConnection.signalingState === 'closed' || this._rtpSenders.has(mediaTrackSender)) {
        return;
      }
      var sender = void 0;
      if (this._localMediaStream) {
        this._localMediaStream.addTrack(mediaTrackSender.track);
        sender = this._peerConnection.addTrack(mediaTrackSender.track, this._localMediaStream);
      } else {
        var transceiver = this._addOrUpdateTransceiver(mediaTrackSender.track);
        sender = transceiver.sender;
      }
      mediaTrackSender.addSender(sender);
      this._rtpSenders.set(mediaTrackSender, sender);
    }

    /**
     * Close the {@link PeerConnectionV2}.
     * @returns {void}
     */

  }, {
    key: 'close',
    value: function close() {
      if (this._close()) {
        this._descriptionRevision++;
        this._localDescription = { type: 'close' };
        this.emit('description', this.getState());
      }
    }

    /**
     * Get the {@link DataTrackReceiver}s and the {@link MediaTrackReceivers} on the
     * {@link PeerConnectionV2}.
     * @returns {Array<DataTrackReceiver|MediaTrackReceiver>} trackReceivers
     */

  }, {
    key: 'getTrackReceivers',
    value: function getTrackReceivers() {
      return Array.from(this._dataTrackReceivers).concat(Array.from(this._mediaTrackReceivers));
    }

    /**
     * Get the {@link PeerConnectionV2}'s state (specifically, its description).
     * @returns {?object}
     */

  }, {
    key: 'getState',
    value: function getState() {
      if (!this._localDescription) {
        return null;
      }
      var localDescription = {
        type: this._localDescription.type,
        revision: this._descriptionRevision
      };
      if (this._localDescription.sdp) {
        localDescription.sdp = this._localDescription.sdp;
      }
      return {
        description: localDescription,
        id: this.id
      };
    }

    /**
     * Create an offer and set it on the {@link PeerConnectionV2}.
     * @returns {Promise<void>}
     */

  }, {
    key: 'offer',
    value: function offer() {
      var _this13 = this;

      if (this._needsAnswer || this._isRestartingIce) {
        this._shouldOffer = true;
        return Promise.resolve();
      }

      return this.bracket('offering', function (key) {
        _this13.transition('updating', key);
        var promise = _this13._needsAnswer || _this13._isRestartingIce ? Promise.resolve() : _this13._offer();
        return promise.then(function () {
          _this13.tryTransition('open', key);
        }, function (error) {
          _this13.tryTransition('open', key);
          throw error;
        });
      });
    }

    /**
     * Remove a {@link DataTrackSender} from the {@link PeerConnectionV2}.
     * @param {DataTrackSender} dataTrackSender
     * @returns {void}
     */

  }, {
    key: 'removeDataTrackSender',
    value: function removeDataTrackSender(dataTrackSender) {
      var dataChannel = this._dataChannels.get(dataTrackSender);
      if (dataChannel) {
        dataTrackSender.removeDataChannel(dataChannel);
        this._dataChannels.delete(dataTrackSender);
        dataChannel.close();
      }
    }

    /**
     * Remove the {@link MediaTrackSender} from the {@link PeerConnectionV2}.
     * @param {MediaTrackSender} mediaTrackSender
     * @returns {void}
     */

  }, {
    key: 'removeMediaTrackSender',
    value: function removeMediaTrackSender(mediaTrackSender) {
      if (this._peerConnection.signalingState === 'closed' || !this._rtpSenders.has(mediaTrackSender)) {
        return;
      }
      var sender = this._rtpSenders.get(mediaTrackSender);
      this._peerConnection.removeTrack(sender);
      if (this._localMediaStream) {
        this._localMediaStream.removeTrack(mediaTrackSender.track);
      }
      mediaTrackSender.removeSender(sender);
      this._rtpSenders.delete(mediaTrackSender);
    }

    /**
     * Set the RTCConfiguration on the underlying RTCPeerConnection.
     * @param {RTCConfiguration} configuration
     * @returns {void}
     */

  }, {
    key: 'setConfiguration',
    value: function setConfiguration(configuration) {
      if (typeof this._peerConnection.setConfiguration === 'function') {
        this._peerConnection.setConfiguration(getConfiguration(configuration));
      }
    }

    /**
     * Update the {@link PeerConnectionV2}.
     * @param {object} peerConnectionState
     * @returns {Promise<void>}
     */

  }, {
    key: 'update',
    value: function update(peerConnectionState) {
      var _this14 = this;

      return this.bracket('updating', function (key) {
        if (_this14.state === 'closed') {
          return Promise.resolve();
        }

        _this14.transition('updating', key);

        var updates = [];

        if (peerConnectionState.ice) {
          updates.push(_this14._updateIce(peerConnectionState.ice));
        }

        if (peerConnectionState.description) {
          updates.push(_this14._updateDescription(peerConnectionState.description));
        }

        return Promise.all(updates).then(function () {
          _this14.tryTransition('open', key);
        }, function (error) {
          _this14.tryTransition('open', key);
          throw error;
        });
      });
    }

    /**
     * Get the {@link PeerConnectionV2}'s media statistics.
     * @returns {Promise<StandardizedStatsResponse>}
     */

  }, {
    key: 'getStats',
    value: function getStats() {
      var _this15 = this;

      return getStatistics(this._peerConnection).then(function (response) {
        return rewriteTrackIds(_this15, response);
      });
    }
  }, {
    key: 'iceConnectionState',
    get: function get() {
      return this._isIceConnectionInactive && this._peerConnection.iceConnectionState === 'disconnected' ? 'failed' : this._peerConnection.iceConnectionState;
    }

    /**
     * Whether the {@link PeerConnectionV2} has negotiated or is in the process
     * of negotiating the application m= section.
     * @returns {boolean}
     */

  }, {
    key: 'isApplicationSectionNegotiated',
    get: function get() {
      return this._peerConnection.localDescription ? getMediaSections(this._peerConnection.localDescription.sdp, 'application').length > 0 : false;
    }
  }]);

  return PeerConnectionV2;
}(StateMachine);

function rewriteTrackId(pcv2, stats) {
  var receiver = [].concat(_toConsumableArray(pcv2._mediaTrackReceivers)).find(function (receiver) {
    return receiver.track.id === stats.trackId;
  });
  var trackId = receiver ? receiver.id : null;
  return Object.assign(stats, { trackId: trackId });
}

function rewriteTrackIds(pcv2, response) {
  return Object.assign(response, {
    remoteAudioTrackStats: response.remoteAudioTrackStats.map(function (stats) {
      return rewriteTrackId(pcv2, stats);
    }),
    remoteVideoTrackStats: response.remoteVideoTrackStats.map(function (stats) {
      return rewriteTrackId(pcv2, stats);
    })
  });
}

/**
 * @event PeerConnectionV2#candidates
 * @param {object} candidates
 */

/**
 * @event PeerConnectionV2#description
 * @param {object} description
 */

/**
 * @event PeerConnectionV2#iceConnectionStateChanged
 */

/**
 * @event PeerConnectionV2#trackAdded
 * @param {DataTrackReceiver|MediaTrackReceiver} trackReceiver
 */

function getUfrag(description) {
  if (description.sdp) {
    var match = description.sdp.match(/^a=ice-ufrag:([a-zA-Z0-9+/]+)/m);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function getConfiguration(configuration) {
  return Object.assign({
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  }, configuration);
}

/**
 * Whether the MediaStreamTrack of the given RTCRTPSender is a non-ended
 * MediaStreamTrack of a given kind.
 * @private
 * @param {string} kind
 * @param {RTCRtpSender} sender
 * @return {boolean}
 */
function isSenderOfKind(kind, sender) {
  var track = sender.track;
  return track && track.kind === kind && track.readyState !== 'ended';
}

/**
 * Preferred codecs.
 * @typedef {object} PreferredCodecs
 * @property {Array<AudioCodec>} audio
 * @property {Array<VideoCodec>} video
 */

function filterOutMediaStreamIds(sdp) {
  return sdp.replace(/a=msid:[^ ]+ /g, 'a=msid:- ');
}

/**
 * Whether an RTCRtpTransceiver can be recycled.
 * @param {RTCRtpTransceiver} transceiver
 * @returns {boolean}
 */
function shouldRecycleTransceiver(transceiver) {
  return !transceiver.stopped && (transceiver.currentDirection === 'inactive' || transceiver.currentDirection === 'recvonly' || transceiver.direction === 'recvonly');
}

/**
 * Take a recycled RTCRtpTransceiver if available.
 * @param {PeerConnectionV2} pcv2
 * @param {Track.Kind} kind
 * @returns {?RTCRtpTransceiver}
 */
function takeRecycledTransceiver(pcv2, kind) {
  var preferredCodecs = {
    audio: pcv2._preferredAudioCodecs.map(function (codec) {
      return codec.toLowerCase();
    }),
    video: pcv2._preferredVideoCodecs.map(function (_ref7) {
      var codec = _ref7.codec;
      return codec.toLowerCase();
    })
  }[kind];

  var recycledTransceivers = pcv2._recycledTransceivers[kind];
  var localCodec = preferredCodecs.find(function (codec) {
    return pcv2._localCodecs.has(codec);
  });
  if (!localCodec) {
    return recycledTransceivers.shift();
  }

  var transceiver = recycledTransceivers.find(function (transceiver) {
    var remoteCodecMap = pcv2._remoteCodecMaps.get(transceiver.mid);
    return remoteCodecMap && remoteCodecMap.has(localCodec);
  });

  if (transceiver) {
    recycledTransceivers.splice(recycledTransceivers.indexOf(transceiver), 1);
  }
  return transceiver;
}

/**
 * Update the set of locally supported {@link Codec}s.
 * @param pcv2
 * @returns {void}
 */
function updateLocalCodecs(pcv2) {
  var description = pcv2._peerConnection.localDescription;
  if (!description) {
    return;
  }
  getMediaSections(description.sdp).forEach(function (section) {
    var codecMap = createCodecMapForMediaSection(section);
    codecMap.forEach(function (pts, codec) {
      return pcv2._localCodecs.add(codec);
    });
  });
}

/**
 * Update the {@link Codec} maps for all m= sections in the remote {@link RTCSessionDescription}s.
 * @param {PeerConnectionV2} pcv2
 * @returns {void}
 */
function updateRemoteCodecMaps(pcv2) {
  var description = pcv2._peerConnection.remoteDescription;
  if (!description) {
    return;
  }
  getMediaSections(description.sdp).forEach(function (section) {
    var mid = section.match(/^a=mid:(.+)$/m)[1];
    var codecMap = createCodecMapForMediaSection(section);
    pcv2._remoteCodecMaps.set(mid, codecMap);
  });
}

/**
 * Update the list of recycled RTCRtpTransceivers.
 * @param {PeerConnectionV2} pcv2
 */
function updateRecycledTransceivers(pcv2) {
  pcv2._recycledTransceivers.audio = [];
  pcv2._recycledTransceivers.video = [];
  pcv2._peerConnection.getTransceivers().forEach(function (transceiver) {
    if (shouldRecycleTransceiver(transceiver)) {
      var track = transceiver.receiver.track;
      pcv2._recycledTransceivers[track.kind].push(transceiver);
    }
  });
}

module.exports = PeerConnectionV2;
},{"../../data/receiver":5,"../../media/track/receiver":30,"../../statemachine":75,"../../util":112,"../../util/constants":110,"../../util/log":115,"../../util/sdp":116,"../../util/sdp/issue8329":117,"../../util/sdp/trackmatcher/identity":119,"../../util/sdp/trackmatcher/mid":120,"../../util/sdp/trackmatcher/ordered":121,"../../util/twilio-video-errors":125,"./icebox":60,"./iceconnectionmonitor.js":61,"@twilio/webrtc":132,"@twilio/webrtc/lib/util":145,"@twilio/webrtc/lib/util/sdp":147}],68:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('@twilio/webrtc/lib/util'),
    guessBrowser = _require.guessBrowser;

var PeerConnectionV2 = require('./peerconnection');
var MediaTrackSender = require('../../media/track/sender');
var QueueingEventEmitter = require('../../queueingeventemitter');
var util = require('../../util');

var _require2 = require('../../util/twilio-video-errors'),
    MediaConnectionError = _require2.MediaConnectionError;

var isFirefox = guessBrowser() === 'firefox';

/**
 * {@link PeerConnectionManager} manages multiple {@link PeerConnectionV2}s.
 * @extends QueueingEventEmitter
 * @emits PeerConnectionManager#candidates
 * @emits PeerConnectionManager#description
 * @emits PeerConnectionManager#iceConnectionStateChanged
 * @emits PeerConnectionManager#trackAdded
 */

var PeerConnectionManager = function (_QueueingEventEmitter) {
  _inherits(PeerConnectionManager, _QueueingEventEmitter);

  /**
   * Construct {@link PeerConnectionManager}.
   * @param {IceServerSource} iceServerSource
   * @param {EncodingParametersImpl} encodingParameters
   * @param {PreferredCodecs} preferredCodecs
   * @param {object} options
   */
  function PeerConnectionManager(iceServerSource, encodingParameters, preferredCodecs, options) {
    _classCallCheck(this, PeerConnectionManager);

    var _this = _possibleConstructorReturn(this, (PeerConnectionManager.__proto__ || Object.getPrototypeOf(PeerConnectionManager)).call(this));

    options = Object.assign({
      audioContextFactory: isFirefox ? require('../../webaudio/audiocontext') : null,
      PeerConnectionV2: PeerConnectionV2
    }, options);

    var audioContext = options.audioContextFactory ? options.audioContextFactory.getOrCreate(_this) : null;

    // NOTE(mroberts): If we're using an AudioContext, we don't need to specify
    // `offerToReceiveAudio` in RTCOfferOptions.
    var offerOptions = audioContext ? { offerToReceiveVideo: true } : { offerToReceiveAudio: true, offerToReceiveVideo: true };

    Object.defineProperties(_this, {
      _audioContextFactory: {
        value: options.audioContextFactory
      },
      _closedPeerConnectionIds: {
        value: new Set()
      },
      _configuration: {
        writable: true,
        value: null
      },
      _configurationDeferred: {
        writable: true,
        value: util.defer()
      },
      _dummyAudioTrackSender: {
        value: audioContext ? new MediaTrackSender(createDummyAudioMediaStreamTrack(audioContext)) : null
      },
      _encodingParameters: {
        value: encodingParameters
      },
      _iceConnectionState: {
        writable: true,
        value: 'new'
      },
      _iceServerSource: {
        value: iceServerSource
      },
      _dataTrackSenders: {
        writable: true,
        value: new Set()
      },
      _lastIceConnectionState: {
        writable: true,
        value: 'new'
      },
      _mediaTrackSenders: {
        writable: true,
        value: new Set()
      },
      _offerOptions: {
        value: offerOptions
      },
      _peerConnections: {
        value: new Map()
      },
      _preferredCodecs: {
        value: preferredCodecs
      },
      _PeerConnectionV2: {
        value: options.PeerConnectionV2
      }
    });
    return _this;
  }

  /**
   * A summarized RTCIceConnectionState across all the
   * {@link PeerConnectionManager}'s underlying {@link PeerConnectionV2}s.
   * @property {RTCIceConnectionState}
   */


  _createClass(PeerConnectionManager, [{
    key: '_closeAbsentPeerConnections',


    /**
     * Close the {@link PeerConnectionV2}s which are no longer relevant.
     * @param {Array<object>} peerConnectionStates
     * @returns {this}
     */
    value: function _closeAbsentPeerConnections(peerConnectionStates) {
      var peerConnectionIds = new Set(peerConnectionStates.map(function (peerConnectionState) {
        return peerConnectionState.id;
      }));
      this._peerConnections.forEach(function (peerConnection) {
        if (!peerConnectionIds.has(peerConnection.id)) {
          peerConnection._close();
        }
      });
      return this;
    }

    /**
     * Get the {@link PeerConnectionManager}'s configuration.
     * @private
     * @returns {Promise<object>}
     */

  }, {
    key: '_getConfiguration',
    value: function _getConfiguration() {
      return this._configurationDeferred.promise;
    }

    /**
     * Get or create a {@link PeerConnectionV2}.
     * @private
     * @param {string} id
     * @param {object} [configuration]
     * @returns {PeerConnectionV2}
     */

  }, {
    key: '_getOrCreate',
    value: function _getOrCreate(id, configuration) {
      var _this2 = this;

      var self = this;
      var peerConnection = this._peerConnections.get(id);
      if (!peerConnection) {
        var _PeerConnectionV = this._PeerConnectionV2;

        var options = Object.assign({
          dummyAudioMediaStreamTrack: this._dummyAudioTrackSender ? this._dummyAudioTrackSender.track : null,
          offerOptions: this._offerOptions
        }, configuration);

        try {
          peerConnection = new _PeerConnectionV(id, this._encodingParameters, this._preferredCodecs, options);
        } catch (e) {
          throw new MediaConnectionError();
        }

        this._peerConnections.set(peerConnection.id, peerConnection);
        peerConnection.on('candidates', this.queue.bind(this, 'candidates'));
        peerConnection.on('description', this.queue.bind(this, 'description'));
        peerConnection.on('trackAdded', this.queue.bind(this, 'trackAdded'));
        peerConnection.on('stateChanged', function stateChanged(state) {
          if (state === 'closed') {
            peerConnection.removeListener('stateChanged', stateChanged);
            self._peerConnections.delete(peerConnection.id);
            self._closedPeerConnectionIds.add(peerConnection.id);
            updateIceConnectionState(self);
          }
        });
        peerConnection.on('iceConnectionStateChanged', function () {
          return updateIceConnectionState(_this2);
        });

        this._dataTrackSenders.forEach(peerConnection.addDataTrackSender, peerConnection);
        this._mediaTrackSenders.forEach(peerConnection.addMediaTrackSender, peerConnection);

        updateIceConnectionState(this);
      }
      return peerConnection;
    }

    /**
     * Close all the {@link PeerConnectionV2}s in this {@link PeerConnectionManager}.
     * @returns {this}
     */

  }, {
    key: 'close',
    value: function close() {
      if (this._iceServerSource.isStarted) {
        this._iceServerSource.stop();
      }
      this._peerConnections.forEach(function (peerConnection) {
        peerConnection.close();
      });
      if (this._dummyAudioTrackSender) {
        this._dummyAudioTrackSender.stop();
      }
      if (this._audioContextFactory) {
        this._audioContextFactory.release(this);
      }
      updateIceConnectionState(this);
      return this;
    }

    /**
     * Create a new {@link PeerConnectionV2} on this {@link PeerConnectionManager}.
     * Then, create a new offer with the newly-created {@link PeerConnectionV2}.
     * @return {Promise<this>}
     */

  }, {
    key: 'createAndOffer',
    value: function createAndOffer() {
      var _this3 = this;

      return this._getConfiguration().then(function (configuration) {
        var id = void 0;
        do {
          id = util.makeUUID();
        } while (_this3._peerConnections.has(id));

        return _this3._getOrCreate(id, configuration);
      }).then(function (peerConnection) {
        return peerConnection.offer();
      }).then(function () {
        return _this3;
      });
    }

    /**
     * Get the {@link DataTrackReceiver}s and {@link MediaTrackReceiver}s of all
     * the {@link PeerConnectionV2}s.
     * @returns {Array<DataTrackReceiver|MediaTrackReceiver>} trackReceivers
     */

  }, {
    key: 'getTrackReceivers',
    value: function getTrackReceivers() {
      return util.flatMap(this._peerConnections, function (peerConnection) {
        return peerConnection.getTrackReceivers();
      });
    }

    /**
     * Get the states of all {@link PeerConnectionV2}s.
     * @returns {Array<object>}
     */

  }, {
    key: 'getStates',
    value: function getStates() {
      var peerConnectionStates = [];
      this._peerConnections.forEach(function (peerConnection) {
        var peerConnectionState = peerConnection.getState();
        if (peerConnectionState) {
          peerConnectionStates.push(peerConnectionState);
        }
      });
      return peerConnectionStates;
    }

    /**
     * Set the {@link PeerConnectionManager}'s configuration.
     * @param {object} configuration
     * @returns {this}
     */

  }, {
    key: 'setConfiguration',
    value: function setConfiguration(configuration) {
      if (this._configuration) {
        this._configurationDeferred = util.defer();
        this._peerConnections.forEach(function (peerConnection) {
          peerConnection.setConfiguration(configuration);
        });
      }
      this._configuration = configuration;
      this._configurationDeferred.resolve(configuration);
      return this;
    }

    /**
     * Set the {@link DataTrackSender}s and {@link MediaTrackSenders} on the
     * {@link PeerConnectionManager}'s underlying {@link PeerConnectionV2}s.
     * @param {Array<DataTrackSender|MediaTrackSender>} trackSenders
     * @returns {this}
     */

  }, {
    key: 'setTrackSenders',
    value: function setTrackSenders(trackSenders) {
      var dataTrackSenders = new Set(trackSenders.filter(function (trackSender) {
        return trackSender.kind === 'data';
      }));

      var mediaTrackSenders = new Set(trackSenders.filter(function (trackSender) {
        return trackSender && (trackSender.kind === 'audio' || trackSender.kind === 'video');
      }));

      var changes = getTrackSenderChanges(this, dataTrackSenders, mediaTrackSenders);
      this._dataTrackSenders = dataTrackSenders;
      this._mediaTrackSenders = mediaTrackSenders;
      applyTrackSenderChanges(this, changes);

      return this;
    }

    /**
     * Update the {@link PeerConnectionManager}.
     * @param {Array<object>} peerConnectionStates
     * @param {boolean} [synced=false]
     * @returns {Promise<this>}
     */

  }, {
    key: 'update',
    value: function update(peerConnectionStates) {
      var _this4 = this;

      var synced = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      if (synced) {
        this._closeAbsentPeerConnections(peerConnectionStates);
      }
      return this._getConfiguration().then(function (configuration) {
        return Promise.all(peerConnectionStates.map(function (peerConnectionState) {
          if (_this4._closedPeerConnectionIds.has(peerConnectionState.id)) {
            return null;
          }
          var peerConnection = _this4._getOrCreate(peerConnectionState.id, configuration);
          return peerConnection.update(peerConnectionState);
        }));
      }).then(function () {
        return _this4;
      });
    }

    /**
     * Get the {@link PeerConnectionManager}'s media statistics.
     * @returns {Promise.<Map<PeerConnectionV2#id, StandardizedStatsResponse>>}
     */

  }, {
    key: 'getStats',
    value: function getStats() {
      var peerConnections = Array.from(this._peerConnections.values());
      return Promise.all(peerConnections.map(function (peerConnection) {
        return peerConnection.getStats().then(function (response) {
          return [peerConnection.id, response];
        });
      })).then(function (responses) {
        return new Map(responses);
      });
    }
  }, {
    key: 'iceConnectionState',
    get: function get() {
      return this._iceConnectionState;
    }
  }]);

  return PeerConnectionManager;
}(QueueingEventEmitter);

/**
 * Create a dummy audio MediaStreamTrack with the given AudioContext.
 * @private
 * @param {AudioContext} audioContext
 * @return {MediaStreamTrack}
 */


function createDummyAudioMediaStreamTrack(audioContext) {
  var mediaStreamDestination = audioContext.createMediaStreamDestination();
  return mediaStreamDestination.stream.getAudioTracks()[0];
}

/**
 * @event {PeerConnectionManager#candidates}
 * @param {object} candidates
 */

/**
 * @event {PeerConnectionManager#description}
 * @param {object} description
 */

/**
 * @event {PeerConnectionManager#iceConnectionStateChanged}
 */

/**
 * @event {PeerConnectionManager#trackAdded}
 * @param {MediaStreamTrack|DataTrackReceiver} mediaStreamTrackOrDataTrackReceiver
 */

/**
 * Apply {@link TrackSenderChanges}.
 * @param {PeerConnectionManager} peerConnectionManager
 * @param {TrackSenderChanges} changes
 * @returns {void}
 */
function applyTrackSenderChanges(peerConnectionManager, changes) {
  if (changes.data.add.size || changes.data.remove.size || changes.media.add.size || changes.media.remove.size) {
    peerConnectionManager._peerConnections.forEach(function (peerConnection) {
      changes.data.remove.forEach(peerConnection.removeDataTrackSender, peerConnection);
      changes.media.remove.forEach(peerConnection.removeMediaTrackSender, peerConnection);
      changes.data.add.forEach(peerConnection.addDataTrackSender, peerConnection);
      changes.media.add.forEach(peerConnection.addMediaTrackSender, peerConnection);
      if (changes.media.add.size || changes.media.remove.size || changes.data.add.size && !peerConnection.isApplicationSectionNegotiated) {
        peerConnection.offer();
      }
    });
  }
}

/**
 * @interface DataTrackSenderChanges
 * @property {Set<DataTrackSender>} add
 * @property {Set<DataTrackSender>} remove
 */

/**
 * Get the {@Link DataTrackSender} changes.
 * @param {PeerConnectionManager} peerConnectionManager
 * @param {Array<DataTrackSender>} dataTrackSenders
 * @returns {DataTrackSenderChanges} changes
 */
function getDataTrackSenderChanges(peerConnectionManager, dataTrackSenders) {
  var dataTrackSendersToAdd = util.difference(dataTrackSenders, peerConnectionManager._dataTrackSenders);
  var dataTrackSendersToRemove = util.difference(peerConnectionManager._dataTrackSenders, dataTrackSenders);
  return {
    add: dataTrackSendersToAdd,
    remove: dataTrackSendersToRemove
  };
}

/**
 * @interface TrackSenderChanges
 * @property {DataTrackSenderChanges} data
 * @property {MediaTrackSenderChanges} media
 */

/**
 * Get {@link DataTrackSender} and {@link MediaTrackSender} changes.
 * @param {PeerConnectionManager} peerConnectionManager
 * @param {Array<DataTrackSender>} dataTrackSenders
 * @param {Array<MediaTrackSender>} mediaTrackSenders
 * @returns {TrackSenderChanges} changes
 */
function getTrackSenderChanges(peerConnectionManager, dataTrackSenders, mediaTrackSenders) {
  return {
    data: getDataTrackSenderChanges(peerConnectionManager, dataTrackSenders),
    media: getMediaTrackSenderChanges(peerConnectionManager, mediaTrackSenders)
  };
}

/**
 * @interface MediaTrackSenderChanges
 * @property {Set<MediaTrackSender>} add
 * @property {Set<MediaTrackSender>} remove
 */

/**
 * Get the {@link MediaTrackSender} changes.
 * @param {PeerConnectionManager} peerConnectionManager
 * @param {Array<MediaTrackSender>} mediaTrackSenders
 * @returns {MediaTrackSenderChanges} changes
 */
function getMediaTrackSenderChanges(peerConnectionManager, mediaTrackSenders) {
  var mediaTrackSendersToAdd = util.difference(mediaTrackSenders, peerConnectionManager._mediaTrackSenders);
  var mediaTrackSendersToRemove = util.difference(peerConnectionManager._mediaTrackSenders, mediaTrackSenders);
  return {
    add: mediaTrackSendersToAdd,
    remove: mediaTrackSendersToRemove
  };
}

/**
 * This object maps RTCIceConnectionState values to a "rank".
 */
var toRank = {
  new: 0,
  checking: 1,
  connected: 2,
  completed: 3,
  disconnected: -1,
  failed: -2,
  closed: -3
};

/**
 * This object maps "rank" back to RTCIceConnectionState values.
 */
var fromRank = void 0;

/**
 * `Object.keys` is not supported in older browsers, so we can't just
 * synchronously call it in this module; we need to defer invoking it until we
 * know we're in a modern environment (i.e., anything that supports WebRTC).
 * @returns {object} fromRank
 */
function createFromRank() {
  return Object.keys(toRank).reduce(function (fromRank, state) {
    return Object.assign(fromRank, _defineProperty({}, toRank[state], state));
  }, {});
}

/**
 * Summarize ICE connection stats.
 * @param {Array<RTCIceConnectionState>} states
 * @returns {RTCIceConnectionState} summary
 */
function summarizeIceConnectionStates(states) {
  if (!states.length) {
    return 'new';
  }
  fromRank = fromRank || createFromRank();
  return states.reduce(function (state1, state2) {
    return fromRank[Math.max(toRank[state1], toRank[state2])];
  });
}

/**
 * Update the {@link PeerConnectionManager}'s `iceConnectionState`, and emit an
 * "iceConnectionStateChanged" event, if necessary.
 * @param {PeerConnectionManager} pcm
 * @returns {void}
 */
function updateIceConnectionState(pcm) {
  pcm._lastIceConnectionState = pcm.iceConnectionState;
  pcm._iceConnectionState = summarizeIceConnectionStates([].concat(_toConsumableArray(pcm._peerConnections.values())).map(function (pcv2) {
    return pcv2.iceConnectionState;
  }));
  if (pcm.iceConnectionState !== pcm._lastIceConnectionState) {
    pcm.emit('iceConnectionStateChanged');
  }
}

module.exports = PeerConnectionManager;
},{"../../media/track/sender":39,"../../queueingeventemitter":45,"../../util":112,"../../util/twilio-video-errors":125,"../../webaudio/audiocontext":127,"./peerconnection":67,"@twilio/webrtc/lib/util":145}],69:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RecordingSignaling = require('../recording');

/**
 * @extends RecordingSignaling
 */

var RecordingV2 = function (_RecordingSignaling) {
  _inherits(RecordingV2, _RecordingSignaling);

  /**
   * Construct a {@link RecordingV2}.
   */
  function RecordingV2() {
    _classCallCheck(this, RecordingV2);

    var _this = _possibleConstructorReturn(this, (RecordingV2.__proto__ || Object.getPrototypeOf(RecordingV2)).call(this));

    Object.defineProperties(_this, {
      _revision: {
        value: 1,
        writable: true
      }
    });
    return _this;
  }

  /**
   * Compare the {@link RecordingV2} to a {@link RecordingV2#Representation}
   * of itself and perform any updates necessary.
   * @param {RecordingV2#Representation} recording
   * @returns {this}
   * @fires RecordingSignaling#updated
   */


  _createClass(RecordingV2, [{
    key: 'update',
    value: function update(recording) {
      if (recording.revision < this._revision) {
        return this;
      }
      this._revision = recording.revision;
      return this.enable(recording.enabled);
    }
  }]);

  return RecordingV2;
}(RecordingSignaling);

/**
 * The Room Signaling Protocol (RSP) representation of a {@link RecordingV2}
 * @typedef {object} RecordingV2#Representation
 * @property {boolean} enabled
 * @property {number} revision
 */

module.exports = RecordingV2;
},{"../recording":53}],70:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RemoteParticipantSignaling = require('../remoteparticipant');
var RemoteTrackPublicationV2 = require('./remotetrackpublication');

/**
 * @extends RemoteParticipantSignaling
 * @property {?number} revision
 */

var RemoteParticipantV2 = function (_RemoteParticipantSig) {
  _inherits(RemoteParticipantV2, _RemoteParticipantSig);

  /**
   * Construct a {@link RemoteParticipantV2}.
   * @param {object} participantState
   * @param {function(string): Promise<DataTrackReceiver|MediaTrackReceiver>} getTrackReceiver
   * @param {object} [options]
   */
  function RemoteParticipantV2(participantState, getTrackReceiver, options) {
    var _ret;

    _classCallCheck(this, RemoteParticipantV2);

    var _this = _possibleConstructorReturn(this, (RemoteParticipantV2.__proto__ || Object.getPrototypeOf(RemoteParticipantV2)).call(this, participantState.sid, participantState.identity));

    options = Object.assign({
      RemoteTrackPublicationV2: RemoteTrackPublicationV2
    }, options);

    Object.defineProperties(_this, {
      _revision: {
        writable: true,
        value: null
      },
      _RemoteTrackPublicationV2: {
        value: options.RemoteTrackPublicationV2
      },
      _getTrackReceiver: {
        value: getTrackReceiver
      },
      revision: {
        enumerable: true,
        get: function get() {
          return this._revision;
        }
      }
    });

    return _ret = _this.update(participantState), _possibleConstructorReturn(_this, _ret);
  }

  /**
   * @private
   */


  _createClass(RemoteParticipantV2, [{
    key: '_getOrCreateTrack',
    value: function _getOrCreateTrack(trackState) {
      var RemoteTrackPublicationV2 = this._RemoteTrackPublicationV2;
      var track = this.tracks.get(trackState.sid);
      if (!track) {
        track = new RemoteTrackPublicationV2(trackState);
        this.addTrack(track);
      }
      return track;
    }

    /**
     * Update the {@link RemoteParticipantV2} with the new state.
     * @param {object} participantState
     * @returns {this}
     */

  }, {
    key: 'update',
    value: function update(participantState) {
      var _this2 = this;

      if (this.revision !== null && participantState.revision <= this.revision) {
        return this;
      }
      this._revision = participantState.revision;

      var tracksToKeep = new Set();

      participantState.tracks.forEach(function (trackState) {
        var track = _this2._getOrCreateTrack(trackState);
        track.update(trackState);
        tracksToKeep.add(track);
      });

      this.tracks.forEach(function (track) {
        if (!tracksToKeep.has(track)) {
          _this2.removeTrack(track);
        }
      });

      if (participantState.state === 'disconnected' && this.state === 'connected') {
        this.preempt('disconnected');
      }

      return this;
    }
  }]);

  return RemoteParticipantV2;
}(RemoteParticipantSignaling);

module.exports = RemoteParticipantV2;
},{"../remoteparticipant":54,"./remotetrackpublication":71}],71:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RemoteTrackPublicationSignaling = require('../remotetrackpublication');

/**
 * @extends RemoteTrackPublicationSignaling
 */

var RemoteTrackPublicationV2 = function (_RemoteTrackPublicati) {
  _inherits(RemoteTrackPublicationV2, _RemoteTrackPublicati);

  /**
   * Construct a {@link RemoteTrackPublicationV2}.
   * @param {RemoteTrackPublicationV2#Representation} track
   */
  function RemoteTrackPublicationV2(track) {
    _classCallCheck(this, RemoteTrackPublicationV2);

    return _possibleConstructorReturn(this, (RemoteTrackPublicationV2.__proto__ || Object.getPrototypeOf(RemoteTrackPublicationV2)).call(this, track.sid, track.name, track.kind, track.enabled, track.priority));
  }

  /**
   * Compare the {@link RemoteTrackPublicationV2} to a
   * {@link RemoteTrackPublicationV2#Representation} of itself and perform any
   * updates necessary.
   * @param {RemoteTrackPublicationV2#Representation} track
   * @returns {this}
   * @fires TrackSignaling#updated
   */


  _createClass(RemoteTrackPublicationV2, [{
    key: 'update',
    value: function update(track) {
      this.enable(track.enabled);
      return this;
    }
  }]);

  return RemoteTrackPublicationV2;
}(RemoteTrackPublicationSignaling);

/**
 * The Room Signaling Protocol (RSP) representation of a {@link RemoteTrackPublicationV2}.
 * @typedef {LocalTrackPublicationV2#Representation} RemoteTrackPublicationV2#Representation
 * @property {boolean} subscribed
 */

module.exports = RemoteTrackPublicationV2;
},{"../remotetrackpublication":55}],72:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DominantSpeakerSignaling = require('./dominantspeakersignaling');
var NetworkQualityMonitor = require('./networkqualitymonitor');
var NetworkQualitySignaling = require('./networkqualitysignaling');
var RecordingV2 = require('./recording');
var RoomSignaling = require('../room');
var RemoteParticipantV2 = require('./remoteparticipant');
var StatsReport = require('../../stats/statsreport');
var TrackSwitchOffSignaling = require('./trackswitchoffsignaling');
var util = require('../../util');
var createTwilioError = require('../../util/twilio-video-errors').createTwilioError;

var STATS_PUBLISH_INTERVAL_MS = 1000;

/**
 * @extends RoomSignaling
 */

var RoomV2 = function (_RoomSignaling) {
  _inherits(RoomV2, _RoomSignaling);

  function RoomV2(localParticipant, initialState, transport, peerConnectionManager, options) {
    _classCallCheck(this, RoomV2);

    options = Object.assign({
      DominantSpeakerSignaling: DominantSpeakerSignaling,
      NetworkQualityMonitor: NetworkQualityMonitor,
      NetworkQualitySignaling: NetworkQualitySignaling,
      RecordingSignaling: RecordingV2,
      RemoteParticipantV2: RemoteParticipantV2,
      TrackSwitchOffSignaling: TrackSwitchOffSignaling,
      statsPublishIntervalMs: STATS_PUBLISH_INTERVAL_MS
    }, options);

    var _this = _possibleConstructorReturn(this, (RoomV2.__proto__ || Object.getPrototypeOf(RoomV2)).call(this, localParticipant, initialState.sid, initialState.name, options));

    Object.defineProperties(_this, {
      _dominantSpeakerSignaling: {
        value: null,
        writable: true
      },
      _DominantSpeakerSignaling: {
        value: options.DominantSpeakerSignaling
      },
      _dominantSpeakerSignalingPromise: {
        value: null,
        writable: true
      },
      _disconnectedParticipantSids: {
        value: new Set()
      },
      _NetworkQualityMonitor: {
        value: options.NetworkQualityMonitor
      },
      _NetworkQualitySignaling: {
        value: options.NetworkQualitySignaling
      },
      _networkQualityMonitor: {
        value: null,
        writable: true
      },
      _networkQualityMonitorPromise: {
        value: null,
        writable: true
      },
      _networkQualityConfiguration: {
        value: localParticipant.networkQualityConfiguration
      },
      _peerConnectionManager: {
        value: peerConnectionManager
      },
      _published: {
        value: new Map()
      },
      _publishedRevision: {
        value: 0,
        writable: true
      },
      _RemoteParticipantV2: {
        value: options.RemoteParticipantV2
      },
      _subscribed: {
        value: new Map()
      },
      _subscribedRevision: {
        value: 0,
        writable: true
      },
      _subscriptionFailures: {
        value: new Map()
      },
      _trackSwitchOffPromise: {
        value: null,
        writable: true
      },
      _TrackSwitchOffSignaling: {
        value: options.TrackSwitchOffSignaling
      },
      _transport: {
        value: transport
      },
      _trackReceiverDeferreds: {
        value: new Map()
      }
    });

    handleLocalParticipantEvents(_this, localParticipant);
    handlePeerConnectionEvents(_this, peerConnectionManager);
    handleTransportEvents(_this, transport);
    periodicallyPublishStats(_this, localParticipant, transport, options.statsPublishIntervalMs);

    _this._update(initialState);
    return _this;
  }

  /**
   * The Signaling Connection State
   * @property {string} - "connected", "reconnecting", "disconnected"
   */


  _createClass(RoomV2, [{
    key: '_deleteTrackReceiverDeferred',


    /**
     * @private
     */
    value: function _deleteTrackReceiverDeferred(id) {
      return this._trackReceiverDeferreds.delete(id);
    }

    /**
     * @private
     */

  }, {
    key: '_getOrCreateTrackReceiverDeferred',
    value: function _getOrCreateTrackReceiverDeferred(id) {
      var deferred = this._trackReceiverDeferreds.get(id) || util.defer();
      var trackReceivers = this._peerConnectionManager.getTrackReceivers();

      // NOTE(mmalavalli): In Firefox, there can be instances where a MediaStreamTrack
      // for the given Track ID already exists, for example, when a Track is removed
      // and added back. If that is the case, then we should resolve 'deferred'.
      var trackReceiver = trackReceivers.find(function (trackReceiver) {
        return trackReceiver.id === id && trackReceiver.readyState !== 'ended';
      });

      if (trackReceiver) {
        deferred.resolve(trackReceiver);
      } else {
        // NOTE(mmalavalli): Only add the 'deferred' to the map if it's not
        // resolved. This will prevent old copies of the MediaStreamTrack from
        // being used when the remote peer removes and re-adds a MediaStreamTrack.
        this._trackReceiverDeferreds.set(id, deferred);
      }

      return deferred;
    }

    /**
     * @private
     */

  }, {
    key: '_addTrackReceiver',
    value: function _addTrackReceiver(trackReceiver) {
      var deferred = this._getOrCreateTrackReceiverDeferred(trackReceiver.id);
      deferred.resolve(trackReceiver);
      return this;
    }

    /**
     * @private
     */

  }, {
    key: '_disconnect',
    value: function _disconnect(error) {
      var didDisconnect = _get(RoomV2.prototype.__proto__ || Object.getPrototypeOf(RoomV2.prototype), '_disconnect', this).call(this, error);
      if (didDisconnect) {
        this._teardownDominantSpeakerSignaling();
        this._teardownNetworkQualityMonitor();
        this._transport.disconnect();
        this._peerConnectionManager.close();
      }

      this.localParticipant.tracks.forEach(function (track) {
        track.publishFailed(error || new Error('LocalParticipant disconnected'));
      });

      return didDisconnect;
    }

    /**
     * @private
     */

  }, {
    key: '_getTrackReceiver',
    value: function _getTrackReceiver(id) {
      var _this2 = this;

      return this._getOrCreateTrackReceiverDeferred(id).promise.then(function (trackReceiver) {
        _this2._deleteTrackReceiverDeferred(id);
        return trackReceiver;
      });
    }

    /**
     * @private
     */

  }, {
    key: '_getOrCreateRemoteParticipant',
    value: function _getOrCreateRemoteParticipant(participantState) {
      var RemoteParticipantV2 = this._RemoteParticipantV2;
      var participant = this.participants.get(participantState.sid);
      var self = this;
      if (!participant) {
        participant = new RemoteParticipantV2(participantState, this._getTrackReceiver.bind(this));
        participant.on('stateChanged', function stateChanged(state) {
          if (state === 'disconnected') {
            participant.removeListener('stateChanged', stateChanged);
            self.participants.delete(participant.sid);
            self._disconnectedParticipantSids.add(participant.sid);
          }
        });
        this.connectParticipant(participant);
      }
      return participant;
    }

    /**
     * @private
     */

  }, {
    key: '_getState',
    value: function _getState() {
      return {
        participant: this.localParticipant.getState()
      };
    }

    /**
     * @private
     */

  }, {
    key: '_publishNewLocalParticipantState',
    value: function _publishNewLocalParticipantState() {
      this._transport.publish(this._getState());
    }

    /**
     * @private
     */

  }, {
    key: '_publishPeerConnectionState',
    value: function _publishPeerConnectionState(peerConnectionState) {
      /* eslint camelcase:0 */
      this._transport.publish(Object.assign({
        peer_connections: [peerConnectionState]
      }, this._getState()));
    }

    /**
     * @private
     */

  }, {
    key: '_update',
    value: function _update(roomState) {
      var _this3 = this;

      if (roomState.subscribed && roomState.subscribed.revision > this._subscribedRevision) {
        this._subscribedRevision = roomState.subscribed.revision;
        roomState.subscribed.tracks.forEach(function (trackState) {
          if (trackState.id) {
            _this3._subscriptionFailures.delete(trackState.sid);
            _this3._subscribed.set(trackState.sid, trackState.id);
          } else if (trackState.error && !_this3._subscriptionFailures.has(trackState.sid)) {
            _this3._subscriptionFailures.set(trackState.sid, trackState.error);
          }
        });

        var subscribedTrackSids = new Set(roomState.subscribed.tracks.filter(function (trackState) {
          return !!trackState.id;
        }).map(function (trackState) {
          return trackState.sid;
        }));

        this._subscribed.forEach(function (trackId, trackSid) {
          if (!subscribedTrackSids.has(trackSid)) {
            _this3._subscribed.delete(trackSid);
          }
        });
      }

      var participantsToKeep = new Set();

      // TODO(mroberts): Remove me once the Server is fixed.
      (roomState.participants || []).forEach(function (participantState) {
        if (participantState.sid === _this3.localParticipant.sid || _this3._disconnectedParticipantSids.has(participantState.sid)) {
          return;
        }
        var participant = _this3._getOrCreateRemoteParticipant(participantState);
        participant.update(participantState);
        participantsToKeep.add(participant);
      });

      if (roomState.type === 'synced') {
        this.participants.forEach(function (participant) {
          if (!participantsToKeep.has(participant)) {
            participant.disconnect();
          }
        });
      }

      handleSubscriptions(this);

      // TODO(mroberts): Remove me once the Server is fixed.
      /* eslint camelcase:0 */
      if (roomState.peer_connections) {
        this._peerConnectionManager.update(roomState.peer_connections, roomState.type === 'synced');
      }

      if (roomState.recording) {
        this.recording.update(roomState.recording);
      }

      if (roomState.published && roomState.published.revision > this._publishedRevision) {
        this._publishedRevision = roomState.published.revision;
        roomState.published.tracks.forEach(function (track) {
          if (track.sid) {
            _this3._published.set(track.id, track.sid);
          }
        });
        this.localParticipant.update(roomState.published);
      }

      if (roomState.participant) {
        this.localParticipant.connect(roomState.participant.sid, roomState.participant.identity);
      }

      if (!this._dominantSpeakerSignalingPromise && roomState.media_signaling && roomState.media_signaling.active_speaker && roomState.media_signaling.active_speaker.transport && roomState.media_signaling.active_speaker.transport.type === 'data-channel') {
        this._setupDataTransportBackedDominantSpeakerSignaling(roomState.media_signaling.active_speaker.transport.label);
      }

      if (!this._networkQualityMonitorPromise && roomState.media_signaling && roomState.media_signaling.network_quality && roomState.media_signaling.network_quality.transport && roomState.media_signaling.network_quality.transport.type === 'data-channel') {
        this._setupDataTransportBackedNetworkQualityMonitor(roomState.media_signaling.network_quality.transport.label);
      }

      if (!this._trackSwitchOffPromise && roomState.media_signaling && roomState.media_signaling.track_switch_off && roomState.media_signaling.track_switch_off.transport && roomState.media_signaling.track_switch_off.transport.type === 'data-channel') {
        this._setupTrackSwitchOffMonitor(roomState.media_signaling.track_switch_off.transport.label);
      }

      return this;
    }
  }, {
    key: '_teardownTrackSwitchOff',
    value: function _teardownTrackSwitchOff() {
      this._trackSwitchOffPromise = null;
    }
  }, {
    key: '_setupTrackSwitchOff',
    value: function _setupTrackSwitchOff(trackSwitchOffSignaling) {
      var _this4 = this;

      trackSwitchOffSignaling.on('updated', function (tracksOff, tracksOn) {
        _this4.participants.forEach(function (participant) {
          participant.tracks.forEach(function (track) {
            if (tracksOff.includes(track.sid)) {
              track.setSwitchedOff(true);
            }
            if (tracksOn.includes(track.sid)) {
              track.setSwitchedOff(false);
            }
          });
        });
      });
    }
  }, {
    key: '_setupTrackSwitchOffMonitor',
    value: function _setupTrackSwitchOffMonitor(id) {
      var _this5 = this;

      this._teardownTrackSwitchOff();
      var trackSwitchOffPromise = this._getTrackReceiver(id).then(function (receiver) {
        if (receiver.kind !== 'data') {
          throw new Error('Expected a DataTrackReceiver');
        }if (_this5._trackSwitchOffPromise !== trackSwitchOffPromise) {
          return;
        }

        // NOTE(mpatwardhan): The underlying RTCDataChannel is closed whenever
        // the VMS instance fails over, and a new RTCDataChannel is created in order
        // to resume sending Dominant Speaker updates.
        receiver.once('close', function () {
          return _this5._teardownTrackSwitchOff();
        });

        var trackSwitchOffSignaling = new _this5._TrackSwitchOffSignaling(receiver.toDataTransport());
        _this5._setupTrackSwitchOff(trackSwitchOffSignaling);
      });
      this._trackSwitchOffPromise = trackSwitchOffPromise;
    }

    /**
     * Create a {@link DataTransport}-backed {@link DominantSpeakerSignaling}.
     * @private
     * @param {ID} id - ID of the {@link DataTrackReceiver} that will ultimately
     *   be converted into a {@link DataTrackTransport} for use with
     *   {@link DominantSpeakerSignaling}
     * @returns {Promise<void>}
     */

  }, {
    key: '_setupDataTransportBackedDominantSpeakerSignaling',
    value: function _setupDataTransportBackedDominantSpeakerSignaling(id) {
      var _this6 = this;

      this._teardownDominantSpeakerSignaling();
      var dominantSpeakerSignalingPromise = this._getTrackReceiver(id).then(function (receiver) {
        if (receiver.kind !== 'data') {
          throw new Error('Expected a DataTrackReceiver');
        }if (_this6._dominantSpeakerSignalingPromise !== dominantSpeakerSignalingPromise) {
          // NOTE(mroberts): _teardownDominantSpeakerSignaling was called.
          return;
        }

        // NOTE(mpatwardhan): The underlying RTCDataChannel is closed whenever
        // the VMS instance fails over, and a new RTCDataChannel is created in order
        // to resume sending Dominant Speaker updates.
        receiver.once('close', function () {
          return _this6._teardownDominantSpeakerSignaling();
        });

        var dominantSpeakerSignaling = new _this6._DominantSpeakerSignaling(receiver.toDataTransport());
        _this6._setDominantSpeakerSignaling(dominantSpeakerSignaling);
      });
      this._dominantSpeakerSignalingPromise = dominantSpeakerSignalingPromise;
    }
    /**
     * Create a {@link DataTransport}-backed {@link NetworkQualityMonitor}.
     * @private
     * @param {ID} id - ID of the {@link DataTrackReceiver} that will ultimately
     *   be converted into a {@link DataTrackTransport} for use with
     *   {@link NetworkQualitySignaling}
     * @returns {Promise<void>}
     */

  }, {
    key: '_setupDataTransportBackedNetworkQualityMonitor',
    value: function _setupDataTransportBackedNetworkQualityMonitor(id) {
      var _this7 = this;

      var self = this;
      this._teardownNetworkQualityMonitor();
      var networkQualityMonitorPromise = this._getTrackReceiver(id).then(function (receiver) {
        if (receiver.kind !== 'data') {
          throw new Error('Expected a DataTrackReceiver');
        }if (_this7._networkQualityMonitorPromise !== networkQualityMonitorPromise) {
          // NOTE(mroberts): _teardownNetworkQualityMonitor was called.
          return;
        }

        // NOTE(mpatwardhan): The underlying RTCDataChannel is closed whenever
        // the VMS instance fails over, and new a RTCDataChannel is created in order
        // to resume exchanging Network Quality messages.
        receiver.once('close', function () {
          return _this7._teardownNetworkQualityMonitor();
        });

        var networkQualitySignaling = new _this7._NetworkQualitySignaling(receiver.toDataTransport(), self._networkQualityConfiguration);
        var networkQualityMonitor = new _this7._NetworkQualityMonitor(_this7._peerConnectionManager, networkQualitySignaling);
        _this7._setNetworkQualityMonitor(networkQualityMonitor);
      });
      this._networkQualityMonitorPromise = networkQualityMonitorPromise;
    }
  }, {
    key: '_setDominantSpeakerSignaling',
    value: function _setDominantSpeakerSignaling(dominantSpeakerSignaling) {
      var _this8 = this;

      this._dominantSpeakerSignaling = dominantSpeakerSignaling;
      dominantSpeakerSignaling.on('updated', function () {
        return _this8.setDominantSpeaker(dominantSpeakerSignaling.loudestParticipantSid);
      });
    }
  }, {
    key: '_setNetworkQualityMonitor',
    value: function _setNetworkQualityMonitor(networkQualityMonitor) {
      var _this9 = this;

      this._networkQualityMonitor = networkQualityMonitor;
      networkQualityMonitor.on('updated', function () {
        if (_this9.mediaConnectionState === 'failed') {
          return;
        }
        _this9.localParticipant.setNetworkQualityLevel(networkQualityMonitor.level, networkQualityMonitor.levels);
        _this9.participants.forEach(function (participant) {
          var levels = networkQualityMonitor.remoteLevels.get(participant.sid);
          if (levels) {
            participant.setNetworkQualityLevel(levels.level, levels);
          }
        });
      });
      networkQualityMonitor.start();
    }
  }, {
    key: '_teardownDominantSpeakerSignaling',
    value: function _teardownDominantSpeakerSignaling() {
      this._dominantSpeakerSignalingPromise = null;
      this._dominantSpeakerSignaling = null;
    }
  }, {
    key: '_teardownNetworkQualityMonitor',
    value: function _teardownNetworkQualityMonitor() {
      this._networkQualityMonitorPromise = null;
      if (this._networkQualityMonitor) {
        this._networkQualityMonitor.stop();
        this._networkQualityMonitor = null;
      }
    }

    /**
     * Get the {@link RoomV2}'s media statistics.
     * @returns {Promise.<Map<PeerConnectionV2#id, StandardizedStatsResponse>>}
     */

  }, {
    key: 'getStats',
    value: function getStats() {
      var _this10 = this;

      return this._peerConnectionManager.getStats().then(function (responses) {
        return new Map(Array.from(responses).map(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              id = _ref2[0],
              response = _ref2[1];

          return [id, Object.assign({}, response, {
            localAudioTrackStats: filterAndAddLocalTrackSids(_this10, response.localAudioTrackStats),
            localVideoTrackStats: filterAndAddLocalTrackSids(_this10, response.localVideoTrackStats),
            remoteAudioTrackStats: filterAndAddRemoteTrackSids(_this10, response.remoteAudioTrackStats),
            remoteVideoTrackStats: filterAndAddRemoteTrackSids(_this10, response.remoteVideoTrackStats)
          })];
        }));
      });
    }
  }, {
    key: 'signalingConnectionState',
    get: function get() {
      return this._transport.state === 'syncing' ? 'reconnecting' : this._transport.state;
    }

    /**
     * The Media Connection State
     * @property {RTCIceConnectionState}
     */

  }, {
    key: 'mediaConnectionState',
    get: function get() {
      return this._peerConnectionManager.iceConnectionState;
    }
  }]);

  return RoomV2;
}(RoomSignaling);

/**
 * Filter out {@link TrackStats} that aren't in the collection while also
 * stamping their Track SIDs.
 * @param {Map<ID, SID>} idToSid
 * @param {Array<TrackStats>} trackStats
 * @returns {Array<TrackStats>}
 */


function filterAndAddTrackSids(idToSid, trackStats) {
  return trackStats.reduce(function (trackStats, trackStat) {
    var trackSid = idToSid.get(trackStat.trackId);
    return trackSid ? [Object.assign({}, trackStat, { trackSid: trackSid })].concat(trackStats) : trackStats;
  }, []);
}

/**
 * Filter out {@link LocalTrackStats} that aren't currently published while also
 * stamping their Track SIDs.
 * @param {RoomV2} roomV2
 * @param {Array<LocalTrackStats>} localTrackStats
 * @returns {Array<LocalTrackStats>}
 */
function filterAndAddLocalTrackSids(roomV2, localTrackStats) {
  return filterAndAddTrackSids(roomV2._published, localTrackStats);
}

/**
 * Filter out {@link RemoteTrackStats} that aren't currently subscribed while
 * also stamping their Track SIDs.
 * @param {RoomV2} roomV2
 * @param {Array<RemoteTrackStats>} remoteTrackStats
 * @returns {Array<RemoteTrackStats>}
 */
function filterAndAddRemoteTrackSids(roomV2, remoteTrackStats) {
  var idToSid = new Map(Array.from(roomV2._subscribed.entries()).map(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 2),
        sid = _ref4[0],
        id = _ref4[1];

    return [id, sid];
  }));
  return filterAndAddTrackSids(idToSid, remoteTrackStats);
}

/**
 * @typedef {object} RoomV2#Representation
 * @property {string} name
 * @property {LocalParticipantV2#Representation} participant
 * @property {?Array<RemoteParticipantV2#Representation>} participants
 * @property {?Array<PeerConnectionV2#Representation>} peer_connections
 * @property {?RecordingV2#Representation} recording
 * @property {string} sid
 */

function handleLocalParticipantEvents(roomV2, localParticipant) {
  var renegotiate = util.oncePerTick(function () {
    var trackSenders = util.flatMap(localParticipant.tracks, function (trackV2) {
      return trackV2.trackTransceiver;
    });
    roomV2._peerConnectionManager.setTrackSenders(trackSenders);
  });

  var localParticipantUpdated = util.oncePerTick(function () {
    roomV2._publishNewLocalParticipantState();
  });

  localParticipant.on('trackAdded', renegotiate);
  localParticipant.on('trackRemoved', renegotiate);
  localParticipant.on('updated', localParticipantUpdated);

  roomV2.on('stateChanged', function stateChanged(state) {
    if (state === 'disconnected') {
      localParticipant.removeListener('trackAdded', renegotiate);
      localParticipant.removeListener('trackRemoved', renegotiate);
      localParticipant.removeListener('updated', localParticipantUpdated);
      roomV2.removeListener('stateChanged', stateChanged);
      localParticipant.disconnect();
    }
  });
}

function handlePeerConnectionEvents(roomV2, peerConnectionManager) {
  peerConnectionManager.on('description', function onDescription(description) {
    roomV2._publishPeerConnectionState(description);
  });
  peerConnectionManager.dequeue('description');

  peerConnectionManager.on('candidates', function onCandidates(candidates) {
    roomV2._publishPeerConnectionState(candidates);
  });
  peerConnectionManager.dequeue('candidates');

  peerConnectionManager.on('trackAdded', roomV2._addTrackReceiver.bind(roomV2));
  peerConnectionManager.dequeue('trackAdded');
  peerConnectionManager.getTrackReceivers().forEach(roomV2._addTrackReceiver, roomV2);

  peerConnectionManager.on('iceConnectionStateChanged', function () {
    roomV2.emit('mediaConnectionStateChanged');
    if (roomV2.mediaConnectionState === 'failed') {
      if (roomV2.localParticipant.networkQualityLevel !== null) {
        roomV2.localParticipant.setNetworkQualityLevel(0);
      }
      roomV2.participants.forEach(function (participant) {
        if (participant.networkQualityLevel !== null) {
          participant.setNetworkQualityLevel(0);
        }
      });
    }
  });
}

function handleTransportEvents(roomV2, transport) {
  transport.on('message', roomV2._update.bind(roomV2));
  transport.on('stateChanged', function stateChanged(state, error) {
    if (state === 'disconnected') {
      if (roomV2.state !== 'disconnected') {
        roomV2._disconnect(error);
      }
      transport.removeListener('stateChanged', stateChanged);
    }
    roomV2.emit('signalingConnectionStateChanged');
  });
}

/**
 * Periodically publish {@link StatsReport}s.
 * @private
 * @param {RoomV2} roomV2
 * @param {LocalParticipantV2} localParticipant
 * @param {Transport} transport
 * @param {Number} intervalMs
 */
function periodicallyPublishStats(roomV2, localParticipant, transport, intervalMs) {
  var interval = setInterval(function () {
    roomV2.getStats().then(function (stats) {
      stats.forEach(function (response, id) {
        // NOTE(mmalavalli): A StatsReport is used to publish a "stats-report"
        // event instead of using StandardizedStatsResponse directly because
        // StatsReport will add nulls to properties that do not exist.
        var report = new StatsReport(id, response);

        transport.publishEvent('quality', 'stats-report', {
          audioTrackStats: report.remoteAudioTrackStats,
          localAudioTrackStats: report.localAudioTrackStats,
          localVideoTrackStats: report.localVideoTrackStats,
          participantSid: localParticipant.sid,
          peerConnectionId: report.peerConnectionId,
          roomSid: roomV2.sid,
          videoTrackStats: report.remoteVideoTrackStats
        });

        // NOTE(mmalavalli): null properties of the "active-ice-candidate-pair"
        // payload are assigned default values until the Insights gateway
        // accepts null values.
        var activeIceCandidatePair = replaceNullsWithDefaults(response.activeIceCandidatePair, report.peerConnectionId);

        transport.publishEvent('quality', 'active-ice-candidate-pair', activeIceCandidatePair);
      });
    }, function () {
      // Do nothing.
    });
  }, intervalMs);

  roomV2.on('stateChanged', function onStateChanged(state) {
    if (state === 'disconnected') {
      clearInterval(interval);
      roomV2.removeListener('stateChanged', onStateChanged);
    }
  });
}

function handleSubscriptions(room) {
  var trackSignalings = new Map(util.flatMap(room.participants, function (participant) {
    return Array.from(participant.tracks.values()).map(function (track) {
      return [track.sid, track];
    });
  }));

  room._subscriptionFailures.forEach(function (error, trackSid) {
    var trackSignaling = trackSignalings.get(trackSid);
    if (trackSignaling) {
      room._subscriptionFailures.delete(trackSid);
      trackSignaling.subscribeFailed(createTwilioError(error.code, error.message));
    }
  });

  trackSignalings.forEach(function (trackSignaling) {
    var trackId = room._subscribed.get(trackSignaling.sid);
    if (!trackId || trackSignaling.isSubscribed && trackSignaling.trackTransceiver.id !== trackId) {
      trackSignaling.setTrackTransceiver(null);
    }
    if (trackId) {
      room._getTrackReceiver(trackId).then(function (trackReceiver) {
        return trackSignaling.setTrackTransceiver(trackReceiver);
      });
    }
  });
}

function replaceNullsWithDefaults(activeIceCandidatePair, peerConnectionId) {
  activeIceCandidatePair = Object.assign({
    availableIncomingBitrate: 0,
    availableOutgoingBitrate: 0,
    bytesReceived: 0,
    bytesSent: 0,
    consentRequestsSent: 0,
    currentRoundTripTime: 0,
    lastPacketReceivedTimestamp: 0,
    lastPacketSentTimestamp: 0,
    nominated: false,
    peerConnectionId: peerConnectionId,
    priority: 0,
    readable: false,
    requestsReceived: 0,
    requestsSent: 0,
    responsesReceived: 0,
    responsesSent: 0,
    retransmissionsReceived: 0,
    retransmissionsSent: 0,
    state: 'failed',
    totalRoundTripTime: 0,
    transportId: '',
    writable: false
  }, util.filterObject(activeIceCandidatePair || {}, null));

  activeIceCandidatePair.localCandidate = Object.assign({
    candidateType: 'host',
    deleted: false,
    ip: '',
    port: 0,
    priority: 0,
    protocol: 'udp',
    relayProtocol: 'udp',
    url: ''
  }, util.filterObject(activeIceCandidatePair.localCandidate || {}, null));

  activeIceCandidatePair.remoteCandidate = Object.assign({
    candidateType: 'host',
    ip: '',
    port: 0,
    priority: 0,
    protocol: 'udp',
    url: ''
  }, util.filterObject(activeIceCandidatePair.remoteCandidate || {}, null));

  return activeIceCandidatePair;
}

module.exports = RoomV2;
},{"../../stats/statsreport":103,"../../util":112,"../../util/twilio-video-errors":125,"../room":56,"./dominantspeakersignaling":59,"./networkqualitymonitor":65,"./networkqualitysignaling":66,"./recording":69,"./remoteparticipant":70,"./trackswitchoffsignaling":73}],73:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('events'),
    EventEmitter = _require.EventEmitter;

/**
 * @emits TrackSwitchOffSignalinging#updated
 */


var TrackSwitchOffSignaling = function (_EventEmitter) {
  _inherits(TrackSwitchOffSignaling, _EventEmitter);

  /**
   * Construct a {@link TrackSwitchOffSignaling}.
   * @param {MediaSignalingTransport} mediaSignalingTransport
   */
  function TrackSwitchOffSignaling(mediaSignalingTransport) {
    _classCallCheck(this, TrackSwitchOffSignaling);

    var _this = _possibleConstructorReturn(this, (TrackSwitchOffSignaling.__proto__ || Object.getPrototypeOf(TrackSwitchOffSignaling)).call(this));

    mediaSignalingTransport.on('message', function (message) {
      switch (message.type) {
        case 'track_switch_off':
          _this._setTrackSwitchOffUpdates(message.off || [], message.on || []);
          break;
        default:
          break;
      }
    });
    return _this;
  }

  /**
   * @private
   * @param {[Track.SID]} tracksSwitchedOff
   * @param {[Track.SID]} tracksSwitchedOn
   * @returns {void}
   */


  _createClass(TrackSwitchOffSignaling, [{
    key: '_setTrackSwitchOffUpdates',
    value: function _setTrackSwitchOffUpdates(tracksSwitchedOff, tracksSwitchedOn) {
      this.emit('updated', tracksSwitchedOff, tracksSwitchedOn);
    }
  }]);

  return TrackSwitchOffSignaling;
}(EventEmitter);

/**
 * @event TrackSwitchOffSignaling#updated
 */

module.exports = TrackSwitchOffSignaling;
},{"events":149}],74:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('@twilio/webrtc/lib/util/sdp'),
    getSdpFormat = _require.getSdpFormat;

var packageInfo = require('../../../package.json');
var InsightsPublisher = require('../../util/insightspublisher');
var NullInsightsPublisher = require('../../util/insightspublisher/null');
var StateMachine = require('../../statemachine');
var TwilioConnection = require('../../twilioconnection');

var _require2 = require('../../util'),
    createBandwidthProfilePayload = _require2.createBandwidthProfilePayload,
    createMediaSignalingPayload = _require2.createMediaSignalingPayload,
    createSubscribePayload = _require2.createSubscribePayload,
    getUserAgent = _require2.getUserAgent,
    withJitter = _require2.withJitter;

var _require3 = require('../../util/twilio-video-errors'),
    createTwilioError = _require3.createTwilioError,
    RoomCompletedError = _require3.RoomCompletedError,
    SignalingConnectionError = _require3.SignalingConnectionError;

var MAX_RECONNECT_ATTEMPTS = 5;
var RECONNECT_BACKOFF_JITTER = 100;
var RECONNECT_BACKOFF_MS = 100;
var RSP_VERSION = 2;
var SDK_NAME = packageInfo.name + '.js';
var SDK_VERSION = packageInfo.version;

/*
TwilioConnectionTransport States
----------------

                      +-----------+
                      |           |
                      |  syncing  |---------+
                      |           |         |
                      +-----------+         |
                         ^     |            |
                         |     |            |
                         |     v            v
    +------------+    +-----------+    +--------------+
    |            |    |           |    |              |
    | connecting |--->| connected |--->| disconnected |
    |            |    |           |    |              |
    +------------+    +-----------+    +--------------+
             |                              ^
             |                              |
             |                              |
             +------------------------------+

*/

var states = {
  connecting: ['connected', 'disconnected'],
  connected: ['disconnected', 'syncing'],
  syncing: ['connected', 'disconnected'],
  disconnected: []
};

/**
 * A {@link TwilioConnectionTransport} supports sending and receiving Room Signaling Protocol
 * (RSP) messages. It also supports RSP requests, such as Sync and Disconnect.
 * @extends StateMachine
 * @emits TwilioConnectionTransport#connected
 * @emits TwilioConnectionTransport#message
 */

var TwilioConnectionTransport = function (_StateMachine) {
  _inherits(TwilioConnectionTransport, _StateMachine);

  /**
   * Construct a {@link TwilioConnectionTransport}.
   * @param {?string} name
   * @param {string} accessToken
   * @param {ParticipantSignaling} localParticipant
   * @param {PeerConnectionManager} peerConnectionManager
   * @param {string} wsServer
   * @param {object} [options]
   */
  function TwilioConnectionTransport(name, accessToken, localParticipant, peerConnectionManager, wsServer, options) {
    _classCallCheck(this, TwilioConnectionTransport);

    options = Object.assign({
      InsightsPublisher: InsightsPublisher,
      NullInsightsPublisher: NullInsightsPublisher,
      TwilioConnection: TwilioConnection,
      maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectBackOffJitter: RECONNECT_BACKOFF_JITTER,
      reconnectBackOffMs: RECONNECT_BACKOFF_MS,
      sdpFormat: getSdpFormat(options.sdpSemantics),
      trackSwitchOff: true,
      userAgent: getUserAgent()
    }, options);

    var _this = _possibleConstructorReturn(this, (TwilioConnectionTransport.__proto__ || Object.getPrototypeOf(TwilioConnectionTransport)).call(this, 'connecting', states));

    var eventPublisherOptions = {};
    if (options.wsServerInsights) {
      eventPublisherOptions.gateway = options.wsServerInsights;
    }

    var EventPublisher = options.insights ? options.InsightsPublisher : options.NullInsightsPublisher;
    Object.defineProperties(_this, {
      _accessToken: {
        value: accessToken
      },
      _automaticSubscription: {
        value: options.automaticSubscription
      },
      _bandwidthProfile: {
        value: options.bandwidthProfile
      },
      _dominantSpeaker: {
        value: options.dominantSpeaker
      },
      _eventPublisher: {
        value: new EventPublisher(accessToken, SDK_NAME, SDK_VERSION, options.environment, options.realm, eventPublisherOptions)
      },
      _iceServerSourceStatus: {
        value: options.iceServerSourceStatus
      },
      _localParticipant: {
        value: localParticipant
      },
      _name: {
        value: name
      },
      _networkQuality: {
        value: options.networkQuality
      },
      _options: {
        value: options
      },
      _peerConnectionManager: {
        value: peerConnectionManager
      },
      _reconnectAttemptsLeft: {
        value: options.maxReconnectAttempts,
        writable: true
      },
      _reconnectBackOffJitter: {
        value: options.reconnectBackOffJitter
      },
      _reconnectBackOffMs: {
        value: options.reconnectBackOffMs
      },
      _session: {
        value: null,
        writable: true
      },
      _trackSwitchOff: {
        value: options.trackSwitchOff,
        writable: true
      },
      _twilioConnection: {
        value: null,
        writable: true
      },
      _updatesReceived: {
        value: []
      },
      _updatesToSend: {
        value: []
      },
      _userAgent: {
        value: options.userAgent
      },
      _wsServer: {
        value: wsServer
      }
    });
    setupEventListeners(_this);
    return _this;
  }

  /**
   * Send a Connect, Sync or Disconnect RSP message.
   * @private
   */


  _createClass(TwilioConnectionTransport, [{
    key: '_sendConnectOrSyncOrDisconnectMessage',
    value: function _sendConnectOrSyncOrDisconnectMessage() {
      if (this.state === 'connected') {
        return;
      }

      if (this.state === 'disconnected') {
        this._twilioConnection.sendMessage({
          session: this._session,
          type: 'disconnect',
          version: RSP_VERSION
        });
        return;
      }

      var type = {
        connecting: 'connect',
        syncing: 'sync'
      }[this.state];

      var message = {
        name: this._name,
        participant: this._localParticipant.getState(),
        peer_connections: this._peerConnectionManager.getStates(),
        type: type,
        version: RSP_VERSION
      };

      if (message.type === 'connect') {
        message.ice_servers = this._iceServerSourceStatus;

        message.publisher = {
          name: SDK_NAME,
          sdk_version: SDK_VERSION,
          user_agent: this._userAgent
        };

        if (this._bandwidthProfile) {
          message.bandwidth_profile = createBandwidthProfilePayload(this._bandwidthProfile);
        }

        message.media_signaling = createMediaSignalingPayload(this._dominantSpeaker, this._networkQuality, this._trackSwitchOff);

        message.subscribe = createSubscribePayload(this._automaticSubscription);

        var sdpFormat = this._options.sdpFormat;
        if (sdpFormat) {
          message.format = sdpFormat;
        }
        message.token = this._accessToken;
      } else if (message.type === 'sync') {
        message.session = this._session;
        message.token = this._accessToken;
      } else if (message.type === 'update') {
        message.session = this._session;
      }
      this._twilioConnection.sendMessage(message);
    }

    /**
     * Disconnect the {@link TwilioConnectionTransport}. Returns true if calling the method resulted
     * in disconnection.
     * @param {TwilioError} [error]
     * @returns {boolean}
     */

  }, {
    key: 'disconnect',
    value: function disconnect(error) {
      if (this.state !== 'disconnected') {
        this.preempt('disconnected', null, [error]);
        this._sendConnectOrSyncOrDisconnectMessage();
        this._twilioConnection.close();
        this._eventPublisher.disconnect();
        return true;
      }
      return false;
    }

    /**
     * Publish an RSP Update. Returns true if calling the method resulted in
     * publishing (or eventually publishing) the update.
     * @param {object} update
     * @returns {boolean}
     */

  }, {
    key: 'publish',
    value: function publish(update) {
      switch (this.state) {
        case 'connected':
          this._twilioConnection.sendMessage(Object.assign({
            session: this._session,
            type: 'update',
            version: RSP_VERSION
          }, update));
          return true;
        case 'connecting':
        case 'syncing':
          this._updatesToSend.push(update);
          return true;
        case 'disconnected':
        default:
          return false;
      }
    }

    /**
     * Publish (or queue) an event to the Insights gateway.
     * @param {string} groupName - Event group name
     * @param {string} eventName - Event name
     * @param {object} payload - Event payload
     * @returns {boolean} true if queued or published, false if disconnected from the Insights gateway
     */

  }, {
    key: 'publishEvent',
    value: function publishEvent(groupName, eventName, payload) {
      return this._eventPublisher.publish(groupName, eventName, payload);
    }

    /**
     * Sync the {@link TwilioConnectionTransport}. Returns true if calling the method resulted in
     * syncing.
     * @returns {boolean}
     */

  }, {
    key: 'sync',
    value: function sync() {
      if (this.state === 'connected') {
        this.preempt('syncing');
        this._sendConnectOrSyncOrDisconnectMessage();
        return true;
      }
      return false;
    }
  }]);

  return TwilioConnectionTransport;
}(StateMachine);

/**
 * @event TwilioConnectionTransport#connected
 * @param {object} initialState
 */

/**
 * @event TwilioConnectionTransport#message
 * @param {object} state
 */

function reducePeerConnections(peerConnections) {
  return Array.from(peerConnections.reduce(function (peerConnectionsById, update) {
    var reduced = peerConnectionsById.get(update.id) || update;

    // First, reduce the top-level `description` property.
    if (!reduced.description && update.description) {
      reduced.description = update.description;
    } else if (reduced.description && update.description) {
      if (update.description.revision > reduced.description.revision) {
        reduced.description = update.description;
      }
    }

    // Then, reduce the top-level `ice` property.
    if (!reduced.ice && update.ice) {
      reduced.ice = update.ice;
    } else if (reduced.ice && update.ice) {
      if (update.ice.revision > reduced.ice.revision) {
        reduced.ice = update.ice;
      }
    }

    // Finally, update the map.
    peerConnectionsById.set(reduced.id, reduced);
    return peerConnectionsById;
  }, new Map()).values());
}

function reduceUpdates(updates) {
  return updates.reduce(function (reduced, update) {
    // First, reduce the top-level `participant` property.
    if (!reduced.participant && update.participant) {
      reduced.participant = update.participant;
    } else if (reduced.participant && update.participant) {
      if (update.participant.revision > reduced.participant.revision) {
        reduced.participant = update.participant;
      }
    }

    // Then, reduce the top-level `peer_connections` property.
    /* eslint camelcase:0 */
    if (!reduced.peer_connections && update.peer_connections) {
      reduced.peer_connections = reducePeerConnections(update.peer_connections);
    } else if (reduced.peer_connections && update.peer_connections) {
      reduced.peer_connections = reducePeerConnections(reduced.peer_connections.concat(update.peer_connections));
    }
    return reduced;
  }, {});
}

function setupEventListeners(transport) {
  function connect() {
    transport._sendConnectOrSyncOrDisconnectMessage();
  }

  function createOrResetTwilioConnection() {
    if (transport._twilioConnection) {
      transport._twilioConnection.removeListener('message', handleMessage);
    }
    var _options = transport._options,
        _wsServer = transport._wsServer;
    var TwilioConnection = transport._options.TwilioConnection;

    transport._twilioConnection = new TwilioConnection(_wsServer, _options);
    return transport._twilioConnection;
  }

  function disconnect(error) {
    if (transport.state === 'disconnected') {
      return;
    }
    if (!error) {
      transport.disconnect();
      return;
    }
    if (transport._reconnectAttemptsLeft <= 0) {
      transport.disconnect(new SignalingConnectionError());
      return;
    }
    reconnect();
  }

  function reconnect() {
    if (transport.state === 'connected') {
      transport.preempt('syncing');
    }
    transport._reconnectAttemptsLeft--;
    var maxReconnectAttempts = transport._options.maxReconnectAttempts;

    var reconnectAttempts = maxReconnectAttempts - transport._reconnectAttemptsLeft;
    var backOffMs = (1 << reconnectAttempts) * transport._reconnectBackOffMs;
    setTimeout(startConnect, withJitter(backOffMs, transport._reconnectBackOffJitter));
  }

  function resetReconnectAttemptsLeft() {
    var maxReconnectAttempts = transport._options.maxReconnectAttempts;

    transport._reconnectAttemptsLeft = maxReconnectAttempts;
  }

  function startConnect() {
    if (transport.state === 'disconnected') {
      return;
    }
    var twilioConnection = createOrResetTwilioConnection();
    twilioConnection.once('close', disconnect);
    twilioConnection.on('message', handleMessage);
    twilioConnection.once('open', connect);
  }

  function handleMessage(message) {
    if (transport.state === 'disconnected') {
      return;
    }
    if (message.type === 'error') {
      transport.disconnect(createTwilioError(message.code, message.message));
      return;
    }
    switch (transport.state) {
      case 'connected':
        switch (message.type) {
          case 'connected':
          case 'synced':
          case 'update':
            transport.emit('message', message);
            return;
          case 'disconnected':
            transport.disconnect(message.status === 'completed' ? new RoomCompletedError() : null);
            return;
          default:
            // Do nothing.
            return;
        }
      case 'connecting':
        switch (message.type) {
          case 'connected':
            transport._session = message.session;
            transport.emit('connected', message);
            transport.preempt('connected');
            return;
          case 'synced':
          case 'update':
            transport._updatesReceived.push(message);
            return;
          case 'disconnected':
            transport.disconnect(message.status === 'completed' ? new RoomCompletedError() : null);
            return;
          default:
            // Do nothing.
            return;
        }
      case 'syncing':
        switch (message.type) {
          case 'connected':
          case 'update':
            transport._updatesReceived.push(message);
            return;
          case 'synced':
            resetReconnectAttemptsLeft();
            transport.emit('message', message);
            transport.preempt('connected');
            return;
          case 'disconnected':
            transport.disconnect(message.status === 'completed' ? new RoomCompletedError() : null);
            return;
          default:
            // Do nothing.
            return;
        }
      default:
        // Impossible
        return;
    }
  }

  transport.on('stateChanged', function stateChanged(state) {
    switch (state) {
      case 'connected':
        {
          var updates = transport._updatesToSend.splice(0);
          if (updates.length) {
            transport.publish(reduceUpdates(updates));
          }
          transport._updatesReceived.splice(0).forEach(function (update) {
            return transport.emit('message', update);
          });
          return;
        }
      case 'disconnected':
        transport._twilioConnection.removeListener('message', handleMessage);
        transport.removeListener('stateChanged', stateChanged);
        return;
      case 'syncing':
        // Do nothing.
        return;
      default:
        // Impossible
        return;
    }
  });

  startConnect();
}

module.exports = TwilioConnectionTransport;
},{"../../../package.json":154,"../../statemachine":75,"../../twilioconnection":107,"../../util":112,"../../util/insightspublisher":113,"../../util/insightspublisher/null":114,"../../util/twilio-video-errors":125,"@twilio/webrtc/lib/util/sdp":147}],75:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;
var util = require('./util');

/**
 * {@link StateMachine} represents a state machine. The state machine supports a
 * reentrant locking mechanism to allow asynchronous state transitions to ensure
 * they have not been preempted. Calls to {@link StateMachine#takeLock} are
 * guaranteed to be resolved in FIFO order.
 * @extends EventEmitter
 * @property {boolean} isLocked - whether or not the {@link StateMachine} is
 *   locked performing asynchronous state transition
 * @property {string} state - the current state
 * @emits {@link StateMachine#stateChanged}
 */

var StateMachine = function (_EventEmitter) {
  _inherits(StateMachine, _EventEmitter);

  /**
   * Construct a {@link StateMachine}.
   * @param {string} initialState - the intiial state
   * @param {object} states
   */
  function StateMachine(initialState, states) {
    _classCallCheck(this, StateMachine);

    var _this = _possibleConstructorReturn(this, (StateMachine.__proto__ || Object.getPrototypeOf(StateMachine)).call(this));

    var lock = null;
    var state = initialState;
    states = transformStates(states);
    Object.defineProperties(_this, {
      _lock: {
        get: function get() {
          return lock;
        },
        set: function set(_lock) {
          lock = _lock;
        }
      },
      _reachableStates: {
        value: reachable(states)
      },
      _state: {
        get: function get() {
          return state;
        },
        set: function set(_state) {
          state = _state;
        }
      },
      _states: {
        value: states
      },
      _whenDeferreds: {
        value: new Set()
      },
      isLocked: {
        enumerable: true,
        get: function get() {
          return lock !== null;
        }
      },
      state: {
        enumerable: true,
        get: function get() {
          return state;
        }
      }
    });

    _this.on('stateChanged', function (state) {
      _this._whenDeferreds.forEach(function (deferred) {
        deferred.when(state, deferred.resolve, deferred.reject);
      });
    });
    return _this;
  }

  /**
   * Returns a promise whose executor function is called on each state change.
   * @param {function(state: string, resolve: function, reject: function): void} when
   * @returns {Promise.<*>}
   * @private
   */


  _createClass(StateMachine, [{
    key: '_whenPromise',
    value: function _whenPromise(when) {
      var _this2 = this;

      if (typeof when !== 'function') {
        return Promise.reject(new Error('when() executor must be a function'));
      }

      var deferred = util.defer();

      deferred.when = when;
      this._whenDeferreds.add(deferred);

      return deferred.promise.then(function (payload) {
        _this2._whenDeferreds.delete(deferred);
        return payload;
      }, function (error) {
        _this2._whenDeferreds.delete(deferred);
        throw error;
      });
    }

    /**
     * This method takes a lock and passes the {@link StateMachine#Key} to your
     * transition function. You may perform zero or more state transitions in your
     * transition function, but you should check for preemption in each tick. You
     * may also reenter the lock. Once the Promise returned by your transition
     * function resolves or rejects, this method releases the lock it acquired for
     * you.
     * @param {string} name - a name for the lock
     * @param {function(StateMachine#Key): Promise} transitionFunction
     * @returns {Promise}
     */
    // NOTE(mroberts): This method is named after a Haskell function:
    // https://hackage.haskell.org/package/base-4.8.2.0/docs/Control-Exception.html#v:bracket

  }, {
    key: 'bracket',
    value: function bracket(name, transitionFunction) {
      var key = void 0;
      var self = this;

      function releaseLock(error) {
        if (self.hasLock(key)) {
          self.releaseLockCompletely(key);
        }
        if (error) {
          throw error;
        }
      }

      return this.takeLock(name).then(function gotKey(_key) {
        key = _key;
        return transitionFunction(key);
      }).then(function success(result) {
        releaseLock();
        return result;
      }, releaseLock);
    }

    /**
     * Check whether or not a {@link StateMachine#Key} matches the lock.
     * @param {StateMachine#Key} key
     * @returns {boolean}
     */

  }, {
    key: 'hasLock',
    value: function hasLock(key) {
      return this._lock === key;
    }

    /**
     * Preempt any pending state transitions and immediately transition to the new
     * state. If a lock name is specified, take the lock and return the
     * {@link StateMachine#Key}.
     * @param {string} newState
     * @param {?string} [name=null] - a name for the lock
     * @param {Array<*>} [payload=[]]
     * @returns {?StateMachine#Key}
     */

  }, {
    key: 'preempt',
    value: function preempt(newState, name, payload) {
      // 1. Check that the new state is valid.
      if (!isValidTransition(this._states, this.state, newState)) {
        throw new Error('Cannot transition from "' + this.state + '" to "' + newState + '"');
      }

      // 2. Release the old lock, if any.
      var oldLock = void 0;
      if (this.isLocked) {
        oldLock = this._lock;
        this._lock = null;
      }

      // 3. Take the lock, if requested.
      var key = null;
      if (name) {
        key = this.takeLockSync(name);
      }

      // 4. If a lock wasn't requested, take a "preemption" lock in order to
      // maintain FIFO order of those taking locks.
      var preemptionKey = key ? null : this.takeLockSync('preemption');

      // 5. Transition.
      this.transition(newState, key || preemptionKey, payload);

      // 6. Preempt anyone blocked on the old lock.
      if (oldLock) {
        oldLock.resolve();
      }

      // 7. Release the "preemption" lock, if we took it.
      if (preemptionKey) {
        this.releaseLock(preemptionKey);
      }

      return key;
    }

    /**
     * Release a lock. This method succeeds only if the {@link StateMachine} is
     * still locked and has not been preempted.
     * @param {StateMachine#Key} key
     * @throws Error
     */

  }, {
    key: 'releaseLock',
    value: function releaseLock(key) {
      if (!this.isLocked) {
        throw new Error('Could not release the lock for ' + key.name + ' because the StateMachine is not locked');
      } else if (!this.hasLock(key)) {
        throw new Error('Could not release the lock for ' + key.name + ' because ' + this._lock.name + ' has the lock');
      }
      if (key.depth === 0) {
        this._lock = null;
        key.resolve();
      } else {
        key.depth--;
      }
    }

    /**
     * Release a lock completely, even if it has been reentered. This method
     * succeeds only if the {@link StateMachine} is still locked and has not been
     * preempted.
     * @param {StateMachine#Key} key
     * @throws Error
     */

  }, {
    key: 'releaseLockCompletely',
    value: function releaseLockCompletely(key) {
      if (!this.isLocked) {
        throw new Error('Could not release the lock for ' + key.name + ' because the StateMachine is not locked');
      } else if (!this.hasLock(key)) {
        throw new Error('Could not release the lock for ' + key.name + ' because ' + this._lock.name + ' has the lock');
      }
      key.depth = 0;
      this._lock = null;
      key.resolve();
    }

    /**
     * Take a lock, returning a Promise for the {@link StateMachine#Key}. You should
     * take a lock anytime you intend to perform asynchronous transitions. Calls to
     * this method are guaranteed to be resolved in FIFO order. You may reenter
     * a lock by passing its {@link StateMachine#Key}.
     * @param {string|StateMachine#Key} nameOrKey - a name for the lock or an
     * existing {@link StateMachine#Key}
     * @returns {Promise<object>}
     */

  }, {
    key: 'takeLock',
    value: function takeLock(nameOrKey) {
      var _this3 = this;

      // Reentrant lock
      if ((typeof nameOrKey === 'undefined' ? 'undefined' : _typeof(nameOrKey)) === 'object') {
        var key = nameOrKey;
        return new Promise(function (resolve) {
          resolve(_this3.takeLockSync(key));
        });
      }

      // New lock
      var name = nameOrKey;
      if (this.isLocked) {
        var takeLock = this.takeLock.bind(this, name);
        return this._lock.promise.then(takeLock);
      }
      return Promise.resolve(this.takeLockSync(name));
    }

    /**
     * Take a lock, returning the {@Link StateMachine#Key}. This method throws if
     * the {@link StateMachine} is locked or the wrong {@link StateMachine#Key} is
     * provided. You may reenter a lock by passing its {@link StateMachine#Key}.
     * @param {string|StateMachine#Key} nameOrKey - a name for the lock or an
     * existing {@link StateMachine#Key}
     * @returns {object}
     * @throws Error
     */

  }, {
    key: 'takeLockSync',
    value: function takeLockSync(nameOrKey) {
      var key = typeof nameOrKey === 'string' ? null : nameOrKey;
      var name = key ? key.name : nameOrKey;

      if (key && !this.hasLock(key) || !key && this.isLocked) {
        throw new Error('Could not take the lock for ' + name + ' because the lock for ' + this._lock.name + ' was not released');
      }

      // Reentrant lock
      if (key) {
        key.depth++;
        return key;
      }

      // New lock
      var lock = makeLock(name);
      this._lock = lock;
      return lock;
    }

    /**
     * Transition to a new state. If the {@link StateMachine} is locked, you must
     * provide the {@link StateMachine#Key}. An invalid state or the wrong
     * {@link StateMachine#Key} will throw an error.
     * @param {string} newState
     * @param {?StateMachine#Key} [key=null]
     * @param {Array<*>} [payload=[]]
     * @throws {Error}
     */

  }, {
    key: 'transition',
    value: function transition(newState, key, payload) {
      payload = payload || [];

      // 1. If we're locked, required the key.
      if (this.isLocked) {
        if (!key) {
          throw new Error('You must provide the key in order to ' + 'transition');
        } else if (!this.hasLock(key)) {
          throw new Error('Could not transition using the key for ' + key.name + ' because ' + this._lock.name + ' has the lock');
        }
      } else if (key) {
        throw new Error('Key provided for ' + key.name + ', but the StateMachine was not locked (possibly due to preemption)');
      }

      // 2. Check that the new state is valid.
      if (!isValidTransition(this._states, this.state, newState)) {
        throw new Error('Cannot transition from "' + this.state + '" to "' + newState + '"');
      }

      // 3. Update the state and emit an event.
      this._state = newState;
      this.emit.apply(this, _toConsumableArray(['stateChanged', newState].concat(payload)));
    }

    /**
     * Attempt to transition to a new state. Unlike {@link StateMachine#transition},
     * this method does not throw.
     * @param {string} newState
     * @param {?StateMachine#Key} [key=null]
     * @param {Array<*>} [payload=[]]
     * @returns {boolean}
     */

  }, {
    key: 'tryTransition',
    value: function tryTransition(newState, key, payload) {
      try {
        this.transition(newState, key, payload);
      } catch (error) {
        return false;
      }
      return true;
    }

    /**
     * Return a Promise that resolves when the {@link StateMachine} transitions to
     * the specified state. If the {@link StateMachine} transitions such that the
     * requested state becomes unreachable, the Promise rejects.
     * @param {string} state
     * @returns {Promise<this>}
     */

  }, {
    key: 'when',
    value: function when(state) {
      var _this4 = this;

      if (this.state === state) {
        return Promise.resolve(this);
      } else if (!isValidTransition(this._reachableStates, this.state, state)) {
        return Promise.reject(createUnreachableError(this.state, state));
      }
      return this._whenPromise(function (newState, resolve, reject) {
        if (newState === state) {
          resolve(_this4);
        } else if (!isValidTransition(_this4._reachableStates, newState, state)) {
          reject(createUnreachableError(newState, state));
        }
      });
    }
  }]);

  return StateMachine;
}(EventEmitter);

/**
 * @event StateMachine#stateChanged
 * @param {string} newState
 */

/**
 * Check if a transition is valid.
 * @private
 * @param {Map<*, Set<*>>} graph
 * @param {*} from
 * @param {*} to
 * @returns {boolean}
 */


function isValidTransition(graph, from, to) {
  return graph.get(from).has(to);
}

/**
 * @typedef {object} StateMachine#Key
 */

function makeLock(name) {
  var lock = util.defer();
  lock.name = name;
  lock.depth = 0;
  return lock;
}

/**
 * Compute the transitive closure of a graph (i.e. what nodes are reachable from
 * where).
 * @private
 * @param {Map<*, Set<*>>} graph
 * @returns {Map<*, Set<*>>}
 */
function reachable(graph) {
  return Array.from(graph.keys()).reduce(function (newGraph, from) {
    return newGraph.set(from, reachableFrom(graph, from));
  }, new Map());
}

/**
 * Compute the Set of node reachable from a particular node in the graph.
 * @private
 * @param {Map<*, Set<*>>} graph
 * @param {*} from
 * @param {Set<*>} [to]
 * @returns {Set<*>}
 */
function reachableFrom(graph, from, to) {
  to = to || new Set();
  graph.get(from).forEach(function (node) {
    if (!to.has(node)) {
      to.add(node);
      reachableFrom(graph, node, to).forEach(to.add, to);
    }
  });
  return to;
}

function transformStates(states) {
  var newStates = new Map();
  for (var key in states) {
    newStates.set(key, new Set(states[key]));
  }
  return newStates;
}

/**
 * Create an "unreachable state" Error.
 * @param {string} here
 * @param {string} there
 * @returns {Error}
 */
function createUnreachableError(here, there) {
  return new Error('"' + there + '" cannot be reached from "' + here + '"');
}

module.exports = StateMachine;
},{"./util":112,"events":149}],76:[function(require,module,exports){
/* eslint no-undefined:0 */
'use strict';

/**
 * @param {Array<number|undefined>} xs
 * @returns {number|undefined}
 */

function average(xs) {
  xs = xs.filter(function (x) {
    return typeof x === 'number';
  });
  return xs.length < 1 ? undefined : xs.reduce(function (y, x) {
    return x + y;
  }) / xs.length;
}

module.exports = average;
},{}],77:[function(require,module,exports){
'use strict';

/**
 * @property {number} [availableSend] - bps (undefined in Firefox)
 * @property {number} recv - bps
 * @property {number} [rtt] - s (undefined in Firefox)
 * @property {number} send - bps
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var IceReport = function () {
  /**
   * Construct an {@link IceReport}.
   * @param {number} send - bps
   * @param {number} recv - bps
   * @param {number} [rtt] - s
   * @param {number} [availableSend] - bps
   */
  function IceReport(send, recv, availableSend, rtt) {
    _classCallCheck(this, IceReport);

    Object.defineProperties(this, {
      availableSend: {
        enumerable: true,
        value: availableSend
      },
      recv: {
        enumerable: true,
        value: recv
      },
      rtt: {
        enumerable: true,
        value: rtt
      },
      send: {
        enumerable: true,
        value: send
      }
    });
  }

  /**
   * @param {RTCStats} olderStats
   * @param {RTCStats} newerStats
   * @returns {IceReport}
   */


  _createClass(IceReport, null, [{
    key: 'of',
    value: function of(olderStats, newerStats) {
      var secondsElapsed = (newerStats.timestamp - olderStats.timestamp) / 1000;
      var deltaBytesSent = newerStats.bytesSent - olderStats.bytesSent;
      var deltaBytesReceived = newerStats.bytesReceived - olderStats.bytesReceived;
      var send = secondsElapsed > 0 ? deltaBytesSent / secondsElapsed * 8 : 0;
      var recv = secondsElapsed > 0 ? deltaBytesReceived / secondsElapsed * 8 : 0;
      var availableSend = newerStats.availableOutgoingBitrate,
          rtt = newerStats.currentRoundTripTime;

      return new IceReport(send, recv, availableSend, rtt);
    }
  }]);

  return IceReport;
}();

module.exports = IceReport;
},{}],78:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var IceReport = require('./icereport');

/**
 * @property {IceReport} lastReport
 * @property {?RTCStats} lastStats
 */

var IceReportFactory = function () {
  /**
   * Construct an {@link IceReportFactory}.
   */
  function IceReportFactory() {
    _classCallCheck(this, IceReportFactory);

    Object.defineProperties(this, {
      lastReport: {
        enumerable: true,
        value: new IceReport(0, 0),
        writable: true
      },
      lastStats: {
        enumerable: true,
        value: null,
        writable: true
      }
    });
  }

  /**
   * Create an {@link IceReport}.
   * @param {RTCStats} newerStats;
   * @returns {IceReport}
   */


  _createClass(IceReportFactory, [{
    key: 'next',
    value: function next(newerStats) {
      var olderStats = this.lastStats;
      this.lastStats = newerStats;
      if (olderStats) {
        var report = olderStats.id === newerStats.id ? IceReport.of(olderStats, newerStats) : new IceReport(0, 0);
        this.lastReport = report;
      }
      return this.lastReport;
    }
  }]);

  return IceReportFactory;
}();

module.exports = IceReportFactory;
},{"./icereport":77}],79:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LocalTrackStats = require('./localtrackstats');

/**
 * Statistics for a {@link LocalAudioTrack}.
 * @extends LocalTrackStats
 * @property {?AudioLevel} audioLevel - Input {@link AudioLevel}
 * @property {?number} jitter - Audio jitter in milliseconds
 */

var LocalAudioTrackStats = function (_LocalTrackStats) {
  _inherits(LocalAudioTrackStats, _LocalTrackStats);

  /**
   * @param {string} trackId - {@link LocalAudioTrack} ID
   * @param {StandardizedTrackStatsReport} statsReport
   */
  function LocalAudioTrackStats(trackId, statsReport) {
    _classCallCheck(this, LocalAudioTrackStats);

    var _this = _possibleConstructorReturn(this, (LocalAudioTrackStats.__proto__ || Object.getPrototypeOf(LocalAudioTrackStats)).call(this, trackId, statsReport));

    Object.defineProperties(_this, {
      audioLevel: {
        value: typeof statsReport.audioInputLevel === 'number' ? statsReport.audioInputLevel : null,
        enumerable: true
      },
      jitter: {
        value: typeof statsReport.jitter === 'number' ? statsReport.jitter : null,
        enumerable: true
      }
    });
    return _this;
  }

  return LocalAudioTrackStats;
}(LocalTrackStats);

/**
 * The maximum absolute amplitude of a set of audio samples in the
 * range of 0 to 32767 inclusive.
 * @typedef {number} AudioLevel
 */

module.exports = LocalAudioTrackStats;
},{"./localtrackstats":80}],80:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TrackStats = require('./trackstats');

/**
 * Statistics for a {@link LocalTrack}.
 * @extends TrackStats
 * @property {?number} bytesSent - Number of bytes sent
 * @property {?number} packetsSent - Number of packets sent
 * @property {?number} roundTripTime - Round trip time in milliseconds
 */

var LocalTrackStats = function (_TrackStats) {
  _inherits(LocalTrackStats, _TrackStats);

  /**
   * @param {string} trackId - {@link LocalTrack} ID
   * @param {StandardizedTrackStatsReport} statsReport
   */
  function LocalTrackStats(trackId, statsReport) {
    _classCallCheck(this, LocalTrackStats);

    var _this = _possibleConstructorReturn(this, (LocalTrackStats.__proto__ || Object.getPrototypeOf(LocalTrackStats)).call(this, trackId, statsReport));

    Object.defineProperties(_this, {
      bytesSent: {
        value: typeof statsReport.bytesSent === 'number' ? statsReport.bytesSent : null,
        enumerable: true
      },
      packetsSent: {
        value: typeof statsReport.packetsSent === 'number' ? statsReport.packetsSent : null,
        enumerable: true
      },
      roundTripTime: {
        value: typeof statsReport.roundTripTime === 'number' ? statsReport.roundTripTime : null,
        enumerable: true
      }
    });
    return _this;
  }

  return LocalTrackStats;
}(TrackStats);

module.exports = LocalTrackStats;
},{"./trackstats":105}],81:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LocalTrackStats = require('./localtrackstats');

/**
 * Statistics for a {@link LocalVideoTrack}.
 * @extends LocalTrackStats
 * @property {?VideoTrack#Dimensions} captureDimensions - Video capture resolution
 * @property {?VideoTrack#Dimensions} dimensions - Video encoding resolution
 * @property {?number} captureFrameRate - Video capture frame rate
 * @property {?number} frameRate - Video encoding frame rate
 */

var LocalVideoTrackStats = function (_LocalTrackStats) {
  _inherits(LocalVideoTrackStats, _LocalTrackStats);

  /**
   * @param {string} trackId - {@link LocalVideoTrack} ID
   * @param {StandardizedTrackStatsReport} statsReport
   */
  function LocalVideoTrackStats(trackId, statsReport) {
    _classCallCheck(this, LocalVideoTrackStats);

    var _this = _possibleConstructorReturn(this, (LocalVideoTrackStats.__proto__ || Object.getPrototypeOf(LocalVideoTrackStats)).call(this, trackId, statsReport));

    var captureDimensions = null;
    if (typeof statsReport.frameWidthInput === 'number' && typeof statsReport.frameHeightInput === 'number') {
      captureDimensions = {};

      Object.defineProperties(captureDimensions, {
        width: {
          value: statsReport.frameWidthInput,
          enumerable: true
        },
        height: {
          value: statsReport.frameHeightInput,
          enumerable: true
        }
      });
    }

    var dimensions = null;
    if (typeof statsReport.frameWidthSent === 'number' && typeof statsReport.frameHeightSent === 'number') {
      dimensions = {};

      Object.defineProperties(dimensions, {
        width: {
          value: statsReport.frameWidthSent,
          enumerable: true
        },
        height: {
          value: statsReport.frameHeightSent,
          enumerable: true
        }
      });
    }

    Object.defineProperties(_this, {
      captureDimensions: {
        value: captureDimensions,
        enumerable: true
      },
      dimensions: {
        value: dimensions,
        enumerable: true
      },
      captureFrameRate: {
        value: typeof statsReport.frameRateInput === 'number' ? statsReport.frameRateInput : null,
        enumerable: true
      },
      frameRate: {
        value: typeof statsReport.frameRateSent === 'number' ? statsReport.frameRateSent : null,
        enumerable: true
      }
    });
    return _this;
  }

  return LocalVideoTrackStats;
}(LocalTrackStats);

module.exports = LocalVideoTrackStats;
},{"./localtrackstats":80}],82:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var NetworkQualityMediaStats = require('./networkqualitymediastats');

/**
 * {@link NetworkQualityMediaStats} for a {@link Participant}'s audio.
 */

var NetworkQualityAudioStats = function (_NetworkQualityMediaS) {
  _inherits(NetworkQualityAudioStats, _NetworkQualityMediaS);

  /**
   * Construct a {@link NetworkQualityAudioStats}.
   * @param {MediaLevels} mediaLevels
   */
  function NetworkQualityAudioStats(mediaLevels) {
    _classCallCheck(this, NetworkQualityAudioStats);

    return _possibleConstructorReturn(this, (NetworkQualityAudioStats.__proto__ || Object.getPrototypeOf(NetworkQualityAudioStats)).call(this, mediaLevels));
  }

  return NetworkQualityAudioStats;
}(NetworkQualityMediaStats);

module.exports = NetworkQualityAudioStats;
},{"./networkqualitymediastats":86}],83:[function(require,module,exports){
'use strict';

/**
 * Bandwidth network quality statistics.
 * @property {?number} actual - actual bandwidth, in bytes
 * @property {?number} available - available bandwidth, in bytes
 * @property {?NetworkQualityLevel} level - {@link NetworkQualityLevel} for bandwidth
 */

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NetworkQualityBandwidthStats =
/**
 * Construct a {@link NetworkQualityBandwidthStats}.
 * @param {BandwidthStats} bandwidthStats
 */
function NetworkQualityBandwidthStats(_ref) {
  var _ref$actual = _ref.actual,
      actual = _ref$actual === undefined ? null : _ref$actual,
      _ref$available = _ref.available,
      available = _ref$available === undefined ? null : _ref$available,
      _ref$level = _ref.level,
      level = _ref$level === undefined ? null : _ref$level;

  _classCallCheck(this, NetworkQualityBandwidthStats);

  Object.defineProperties(this, {
    actual: {
      value: actual,
      enumerable: true
    },
    available: {
      value: available,
      enumerable: true
    },
    level: {
      value: level,
      enumerable: true
    }
  });
};

module.exports = NetworkQualityBandwidthStats;
},{}],84:[function(require,module,exports){
'use strict';

/**
 * Fraction lost network quality statistics.
 * @property {?number} fractionLost - packets lost
 * @property {?NetworkQualityLevel} level - {@link NetworkQualityLevel} for fraction lost
 */

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NetworkQualityFractionLostStats =
/**
 * Construct a {@link NetworkQualityFractionLostStats}.
 * @param {FractionLostStats} fractionLostStats
 */
function NetworkQualityFractionLostStats(_ref) {
  var _ref$fractionLost = _ref.fractionLost,
      fractionLost = _ref$fractionLost === undefined ? null : _ref$fractionLost,
      _ref$level = _ref.level,
      level = _ref$level === undefined ? null : _ref$level;

  _classCallCheck(this, NetworkQualityFractionLostStats);

  Object.defineProperties(this, {
    fractionLost: {
      value: fractionLost,
      enumerable: true
    },
    level: {
      value: level,
      enumerable: true
    }
  });
};

module.exports = NetworkQualityFractionLostStats;
},{}],85:[function(require,module,exports){
'use strict';

/**
 * Latency network quality statistics.
 * @property {?number} jitter - media jitter in seconds
 * @property {?number} rtt - round trip time in seconds
 * @property {?NetworkQualityLevel} level - {@link NetworkQualityLevel} for latency
 */

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NetworkQualityLatencyStats =
/**
 * Construct a {@link NetworkQualityLatencyStats}.
 * @param {LatencyStats} latencyStats
 */
function NetworkQualityLatencyStats(_ref) {
  var _ref$jitter = _ref.jitter,
      jitter = _ref$jitter === undefined ? null : _ref$jitter,
      _ref$rtt = _ref.rtt,
      rtt = _ref$rtt === undefined ? null : _ref$rtt,
      _ref$level = _ref.level,
      level = _ref$level === undefined ? null : _ref$level;

  _classCallCheck(this, NetworkQualityLatencyStats);

  Object.defineProperties(this, {
    jitter: {
      value: jitter,
      enumerable: true
    },
    rtt: {
      value: rtt,
      enumerable: true
    },
    level: {
      value: level,
      enumerable: true
    }
  });
};

module.exports = NetworkQualityLatencyStats;
},{}],86:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NetworkQualitySendStats = require('./networkqualitysendstats');
var NetworkQualityRecvStats = require('./networkqualityrecvstats');

/**
 * Network quality statistics shared between a {@link Participant}'s audio or video.
 * @property {NetworkQualityLevel} send - {@link NetworkQualityLevel} of the
 *  {@link Participant}'s published audio or video
 * @property {number} recv - {@link NetworkQualityLevel} of the
 *  {@link Participant}'s subscribed audio or video
 * @property {?NetworkQualitySendOrRecvStats} sendStats - {@link NetworkQualitySendOrRecvStats}
 *   based on which {@link NetworkQualityMediaStats}<code style="padding:0 0">#send</code>
 *   is calculated
 * @property {?NetworkQualitySendOrRecvStats} recvStats - {@link NetworkQualitySendOrRecvStats}
 *   based on which {@link NetworkQualityMediaStats}<code style="padding:0 0">#recv</code>
 *   is calculated
 */

var NetworkQualityMediaStats =
/**
 * Construct a {@link NetworkQualityMediaStats}.
 * @param {MediaLevels} mediaLevels
 */
function NetworkQualityMediaStats(_ref) {
  var send = _ref.send,
      recv = _ref.recv,
      _ref$sendStats = _ref.sendStats,
      sendStats = _ref$sendStats === undefined ? null : _ref$sendStats,
      _ref$recvStats = _ref.recvStats,
      recvStats = _ref$recvStats === undefined ? null : _ref$recvStats;

  _classCallCheck(this, NetworkQualityMediaStats);

  Object.defineProperties(this, {
    send: {
      value: send,
      enumerable: true
    },
    recv: {
      value: recv,
      enumerable: true
    },
    sendStats: {
      value: sendStats ? new NetworkQualitySendStats(sendStats) : null,
      enumerable: true
    },
    recvStats: {
      value: recvStats ? new NetworkQualityRecvStats(recvStats) : null,
      enumerable: true
    }
  });
};

module.exports = NetworkQualityMediaStats;
},{"./networkqualityrecvstats":87,"./networkqualitysendstats":89}],87:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var NetworkQualitySendOrRecvStats = require('./networkqualitysendorrecvstats');

/**
 * {@link NetworkQualitySendOrRecvStats} based on which a {@link Participant}'s
 * {@link NetworkQualityMediaStats}<code style="padding:0 0">#recv</code> is calculated.
 */

var NetworkQualityRecvStats = function (_NetworkQualitySendOr) {
  _inherits(NetworkQualityRecvStats, _NetworkQualitySendOr);

  /**
   * Construct a {@link NetworkQualityRecvStats}.
   * @param {SendOrRecvStats} sendOrRecvStats
   */
  function NetworkQualityRecvStats(sendOrRecvStats) {
    _classCallCheck(this, NetworkQualityRecvStats);

    return _possibleConstructorReturn(this, (NetworkQualityRecvStats.__proto__ || Object.getPrototypeOf(NetworkQualityRecvStats)).call(this, sendOrRecvStats));
  }

  return NetworkQualityRecvStats;
}(NetworkQualitySendOrRecvStats);

module.exports = NetworkQualityRecvStats;
},{"./networkqualitysendorrecvstats":88}],88:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NetworkQualityBandwidthStats = require('./networkqualitybandwidthstats');
var NetworkQualityFractionLostStats = require('./networkqualityfractionloststats');
var NetworkQualityLatencyStats = require('./networkqualitylatencystats');

/**
 * Network quality statistics shared between {@link NetworkQualitySendStats} and
 * {@link NetworkQualityRecvStats} based on which a {@link Participant}'s
 * {@link NetworkQualityMediaStats}<code style="padding:0 0">#send</code> or
 * {@link NetworkQualityMediaStats}<code style="padding:0 0">#recv</code> is calculated.
 * @property {?NetworkQualityBandwidthStats} bandwidth - bandwidth statistics
 * @property {?NetworkQualityLatencyStats} latency - latency statistics
 * @property {?NetworkQualityFractionLostStats} fractionLost - fraction lost statistics
 */

var NetworkQualitySendOrRecvStats =
/**
 * Construct a {@link NetworkQualitySendOrRecvStats}.
 * @param {SendOrRecvStats} sendOrRecvStats
 */
function NetworkQualitySendOrRecvStats(_ref) {
  var _ref$bandwidth = _ref.bandwidth,
      bandwidth = _ref$bandwidth === undefined ? null : _ref$bandwidth,
      _ref$fractionLost = _ref.fractionLost,
      fractionLost = _ref$fractionLost === undefined ? null : _ref$fractionLost,
      _ref$latency = _ref.latency,
      latency = _ref$latency === undefined ? null : _ref$latency;

  _classCallCheck(this, NetworkQualitySendOrRecvStats);

  Object.defineProperties(this, {
    bandwidth: {
      value: bandwidth ? new NetworkQualityBandwidthStats(bandwidth) : null,
      enumerable: true
    },
    fractionLost: {
      value: fractionLost ? new NetworkQualityFractionLostStats(fractionLost) : null,
      enumerable: true
    },
    latency: {
      value: latency ? new NetworkQualityLatencyStats(latency) : null,
      enumerable: true
    }
  });
};

module.exports = NetworkQualitySendOrRecvStats;
},{"./networkqualitybandwidthstats":83,"./networkqualityfractionloststats":84,"./networkqualitylatencystats":85}],89:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var NetworkQualitySendOrRecvStats = require('./networkqualitysendorrecvstats');

/**
 * {@link NetworkQualitySendOrRecvStats} based on which a {@link Participant}'s
 * {@link NetworkQualityMediaStats}<code style="padding:0 0">#send</code> is calculated.
 */

var NetworkQualitySendStats = function (_NetworkQualitySendOr) {
  _inherits(NetworkQualitySendStats, _NetworkQualitySendOr);

  /**
   * Construct a {@link NetworkQualitySendStats}.
   * @param {SendOrRecvStats} sendOrRecvStats
   */
  function NetworkQualitySendStats(sendOrRecvStats) {
    _classCallCheck(this, NetworkQualitySendStats);

    return _possibleConstructorReturn(this, (NetworkQualitySendStats.__proto__ || Object.getPrototypeOf(NetworkQualitySendStats)).call(this, sendOrRecvStats));
  }

  return NetworkQualitySendStats;
}(NetworkQualitySendOrRecvStats);

module.exports = NetworkQualitySendStats;
},{"./networkqualitysendorrecvstats":88}],90:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NetworkQualityAudioStats = require('./networkqualityaudiostats');
var NetworkQualityVideoStats = require('./networkqualityvideostats');

/**
 * Network quality statistics for a {@link Participant}.
 * @property {NetworkQualityLevel} level - {@link NetworkQualityLevel} of the {@link Participant}
 * @property {?NetworkQualityAudioStats} audio - {@link NetworkQualityMediaStats}
 *   for audio; <code>null</code> if {@link NetworkQualityVerbosity} is {@link NetworkQualityVerbosity}<code style="padding:0 0">#minimal</code>
 *   or below
 * @property {?NetworkQualityVideoStats} video - {@link NetworkQualityMediaStats}
 *   for video; <code>null</code> if {@link NetworkQualityVerbosity} is {@link NetworkQualityVerbosity}<code style="padding:0 0">#minimal</code>
 *   or below
 */

var NetworkQualityStats =
/**
 * Construct a {@link NetworkQualityStats}.
 * @param {NetworkQualityLevels} networkQualityLevels
 */
function NetworkQualityStats(_ref) {
  var level = _ref.level,
      audio = _ref.audio,
      video = _ref.video;

  _classCallCheck(this, NetworkQualityStats);

  Object.defineProperties(this, {
    level: {
      value: level,
      enumerable: true
    },
    audio: {
      value: audio ? new NetworkQualityAudioStats(audio) : null,
      enumerable: true
    },
    video: {
      value: video ? new NetworkQualityVideoStats(video) : null,
      enumerable: true
    }
  });
};

module.exports = NetworkQualityStats;
},{"./networkqualityaudiostats":82,"./networkqualityvideostats":91}],91:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var NetworkQualityMediaStats = require('./networkqualitymediastats');

/**
 * {@link NetworkQualityMediaStats} for a {@link Participant}'s video.
 */

var NetworkQualityVideoStats = function (_NetworkQualityMediaS) {
  _inherits(NetworkQualityVideoStats, _NetworkQualityMediaS);

  /**
   * Construct a {@link NetworkQualityVideoStats}.
   * @param {MediaLevels} mediaLevels
   */
  function NetworkQualityVideoStats(mediaLevels) {
    _classCallCheck(this, NetworkQualityVideoStats);

    return _possibleConstructorReturn(this, (NetworkQualityVideoStats.__proto__ || Object.getPrototypeOf(NetworkQualityVideoStats)).call(this, mediaLevels));
  }

  return NetworkQualityVideoStats;
}(NetworkQualityMediaStats);

module.exports = NetworkQualityVideoStats;
},{"./networkqualitymediastats":86}],92:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ReceiverReport = require('./receiverreport');
var SenderReport = require('./senderreport');

/**
 * @interface SenderAndReceiverReports
 * @property {Array<SenderReport>} send
 * @property {Array<ReceiverReport>} recv
 */

/**
 * @interface SenderAndReceiverSummary
 * @property {SenderSummary} send
 * @property {ReceiverSummary} recv
 */

/**
 * @interface PeerConnectionSummary
 * @property {IceReport} ice
 * @property {SenderSummary} send
 * @property {ReceiverSummary} recv
 * @property {SenderAndReceiverSummary} audio
 * @property {SenderAndReceiverSummary} video
 */

/**
 * @property {IceReport} ice
 * @roperty {SenderAndReceiverReports} audio
 * @roperty {SenderAndReceiverReports} video
 */

var PeerConnectionReport = function () {
  /**
   * Construct a {@link PeerConnectionReport}.
   * @param {IceReport} ice
   * @param {SenderAndReceiverReports} audio
   * @param {SenderAndReceiverReports} video
   */
  function PeerConnectionReport(ice, audio, video) {
    _classCallCheck(this, PeerConnectionReport);

    Object.defineProperties(this, {
      ice: {
        enumerable: true,
        value: ice
      },
      audio: {
        enumerable: true,
        value: audio
      },
      video: {
        enumerable: true,
        value: video
      }
    });
  }

  /**
   * Summarize the {@link PeerConnectionReport} by summarizing its
   * {@link SenderReport}s and {@link ReceiverReport}s.
   * @returns {PeerConnectionSummary}
   */


  _createClass(PeerConnectionReport, [{
    key: 'summarize',
    value: function summarize() {
      var senderReports = this.audio.send.concat(this.video.send);
      var send = SenderReport.summarize(senderReports);

      var receiverReports = this.audio.recv.concat(this.video.recv);
      var recv = ReceiverReport.summarize(receiverReports);

      return {
        ice: this.ice,
        send: send,
        recv: recv,
        audio: {
          send: SenderReport.summarize(this.audio.send),
          recv: ReceiverReport.summarize(this.audio.recv)
        },
        video: {
          send: SenderReport.summarize(this.video.send),
          recv: ReceiverReport.summarize(this.video.recv)
        }
      };
    }
  }]);

  return PeerConnectionReport;
}();

module.exports = PeerConnectionReport;
},{"./receiverreport":94,"./senderreport":101}],93:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var IceReportFactory = require('./icereportfactory');
var PeerConnectionReport = require('./peerconnectionreport');
var ReceiverReportFactory = require('./receiverreportfactory');
var SenderReportFactory = require('./senderreportfactory');

/**
 * @typedef {string} TrackId
 */

/**
 * @typedef {string} StatsId
 */

/**
 * @interface SenderReportFactoriesByMediaType
 * @property {Map<StatsId, SenderReportFactory>} audio
 * @property {Map<StatsId, SenderReportFactory>} video
 */

/**
 * @interface ReceiverReportFactoriesByMediaType
 * @property {Map<StatsId, ReceiverReportFactory>} audio
 * @property {Map<StatsId, ReceiverReportFactory>} video
 */

/**
 * @interface SenderAndReceiverReportFactories
 * @property {Map<StatsId, SenderReportFactories>} send
 * @property {Map<StatsId, ReceiverReportFactories>} recv
 */

/**
 * @interface {StatsIdsByMediaType}
 * @property {Set<StatsId>} audio
 * @property {Set<StatsId>} video
 */

/**
 * @property {RTCPeerConnection} pc
 * @property {IceReportFactory} iceReportFactory
 * @property {SenderAndReceiverReportFactories} audio
 * @property {SenderAndReceiverReportFactories} video
 * @property {?PeerConnectionReport} lastReport
 */

var PeerConnectionReportFactory = function () {
  /**
   * Construct a {@link PeerConnectionReportFactory}.
   * @param {RTCPeerConnection} pc
   */
  function PeerConnectionReportFactory(pc) {
    _classCallCheck(this, PeerConnectionReportFactory);

    Object.defineProperties(this, {
      pc: {
        enumerable: true,
        value: pc
      },
      ice: {
        enumerable: true,
        value: new IceReportFactory()
      },
      audio: {
        enumerable: true,
        value: {
          send: new Map(),
          recv: new Map()
        }
      },
      video: {
        enumerable: true,
        value: {
          send: new Map(),
          recv: new Map()
        }
      },
      lastReport: {
        enumerable: true,
        value: null,
        writable: true
      }
    });
  }

  /**
   * Create a {@link PeerConnectionReport}.
   * @returns {Promise<PeerConnectionReport>}
   */


  _createClass(PeerConnectionReportFactory, [{
    key: 'next',
    value: function next() {
      var _this = this;

      var updatePromise = typeof mozRTCPeerConnection !== 'undefined' ? updateFirefox(this) : updateChrome(this);

      return updatePromise.then(function () {
        var audioSenderReportFactories = [].concat(_toConsumableArray(_this.audio.send.values()));
        var videoSenderReportFactories = [].concat(_toConsumableArray(_this.video.send.values()));
        var audioReceiverReportFactories = [].concat(_toConsumableArray(_this.audio.recv.values()));
        var videoReceiverReportFactories = [].concat(_toConsumableArray(_this.video.recv.values()));

        var report = new PeerConnectionReport(_this.ice.lastReport, {
          send: audioSenderReportFactories.map(function (factory) {
            return factory.lastReport;
          }).filter(function (report) {
            return report;
          }),
          recv: audioReceiverReportFactories.map(function (factory) {
            return factory.lastReport;
          }).filter(function (report) {
            return report;
          })
        }, {
          send: videoSenderReportFactories.map(function (factory) {
            return factory.lastReport;
          }).filter(function (report) {
            return report;
          }),
          recv: videoReceiverReportFactories.map(function (factory) {
            return factory.lastReport;
          }).filter(function (report) {
            return report;
          })
        });

        _this.lastReport = report;

        return report;
      });
    }
  }]);

  return PeerConnectionReportFactory;
}();

/**
 * Construct a Map from MediaStreamTrack Ids to RTCStatsReports.
 * @param {Array<RTCRtpSender>|Array<RTCRtpReceiver>} sendersOrReceivers - each
 *   RTCRtpSender should have a non-null track
 * @returns {Promise<Map<TrackId, RTCStats>>}
 */


function getSenderOrReceiverReports(sendersOrReceivers) {
  return Promise.all(sendersOrReceivers.map(function (senderOrReceiver) {
    var trackId = senderOrReceiver.track.id;
    return senderOrReceiver.getStats().then(function (report) {
      // NOTE(mroberts): We have to rewrite Ids due to this bug:
      //
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=1463430
      //
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = report.values()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var stats = _step.value;

          if (stats.type === 'inbound-rtp') {
            stats.id = trackId + '-' + stats.id;
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return [trackId, report];
    });
  })).then(function (pairs) {
    return new Map(pairs);
  });
}

/**
 * @param {SenderReportFactory.constructor} SenderReportFactory
 * @param {SenderReportFactoriesByMediaType} sendersByMediaType
 * @param {RTCStatsReport} report
 * @param {RTCStats} stats
 * @param {TrackId} [trackId]
 * @returns {?SenderReportFactory}
 */ /**
    * @param {ReceiverReportFactory.constructor} ReceiverReportFactory
    * @param {ReceiverReportFactoriesByMediaType} receiversByMediaType
    * @param {RTCStatsReport} report
    * @param {RTCStats} stats
    * @param {TrackId} [trackId]
    * @returns {?ReceiverReportFactory}
    */
function getOrCreateSenderOrReceiverReportFactory(SenderOrReceiverReportFactory, sendersOrReceiversByMediaType, report, stats, trackId) {
  var sendersOrReceivers = sendersOrReceiversByMediaType[stats.mediaType];
  if (!trackId) {
    var trackStats = report.get(stats.trackId);
    if (trackStats) {
      trackId = trackStats.trackIdentifier;
    }
  }
  if (sendersOrReceivers && trackId) {
    if (sendersOrReceivers.has(stats.id)) {
      return sendersOrReceivers.get(stats.id);
    }
    var senderOrReceiverFactory = new SenderOrReceiverReportFactory(trackId, stats);
    sendersOrReceivers.set(stats.id, senderOrReceiverFactory);
  }
  return null;
}

/**
 * @param {PeerConnectionReportFactory} factory
 * @returns {SenderReportFactoriesByMediaType}
 */
function getSenderReportFactoriesByMediaType(factory) {
  return { audio: factory.audio.send, video: factory.video.send };
}

/**
 * @param {PeerConnectionReportFactory} factory
 * @returns {ReceiverReportFactoriesByMediaType}
 */
function getReceiverReportFactoriesByMediaType(factory) {
  return { audio: factory.audio.recv, video: factory.video.recv };
}

/**
 * @param {PeerConnectionReportFactory} factory
 * @param {RTCStatsReport} report
 * @param {RTCStats} stats
 * @param {TrackId} [trackId]
 * @returns {?SenderReportFactory}
 */
function getOrCreateSenderReportFactory(factory, report, stats, trackId) {
  return getOrCreateSenderOrReceiverReportFactory(SenderReportFactory, getSenderReportFactoriesByMediaType(factory), report, stats, trackId);
}

/**
 * @param {PeerConnectionReportFactory} factory
 * @param {RTCStatsReport} report
 * @param {RTCStats} stats
 * @param {TrackId} [trackId]
 * @returns {?ReceiverReportFactory}
 */
function getOrCreateReceiverReportFactory(factory, report, stats, trackId) {
  return getOrCreateSenderOrReceiverReportFactory(ReceiverReportFactory, getReceiverReportFactoriesByMediaType(factory), report, stats, trackId);
}

/**
 * @param {PeerConnectionReportFactory} factory
 * @retuns {StatsIdsByMediaType}
 */
function getSenderReportFactoryIdsByMediaType(factory) {
  return {
    audio: new Set(factory.audio.send.keys()),
    video: new Set(factory.video.send.keys())
  };
}

/**
 * @param {PeerConnectionReportFactory} factory
 * @retuns {StatsIdsByMediaType}
 */
function getReceiverReportFactoryIdsByMediaType(factory) {
  return {
    audio: new Set(factory.audio.recv.keys()),
    video: new Set(factory.video.recv.keys())
  };
}

/**
 * @param {PeerConnectionReportFactory} factory
 * @param {RTCStatsReport} report
 * @param {StatsIdsByMediaType} senderReportFactoryIdsToDeleteByMediaType
 * @param {TrackId} [trackId]
 * @returns {void}
 */
function updateSenderReports(factory, report, senderReportFactoryIdsToDeleteByMediaType, trackId) {
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = report.values()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var stats = _step2.value;

      if (stats.type === 'outbound-rtp' && !stats.isRemote) {
        if (typeof mozRTCPeerConnection === 'undefined' && !stats.trackId) {
          continue;
        }
        var senderReportFactoryIdsToDelete = senderReportFactoryIdsToDeleteByMediaType[stats.mediaType];
        if (senderReportFactoryIdsToDelete) {
          senderReportFactoryIdsToDelete.delete(stats.id);
        }
        var senderReportFactory = getOrCreateSenderReportFactory(factory, report, stats, trackId);
        if (senderReportFactory) {
          var remoteInboundStats = report.get(stats.remoteId);
          senderReportFactory.next(trackId || senderReportFactory.trackId, stats, remoteInboundStats);
        }
      }
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }
}

/**
 * @param {PeerConnectionReportFactory} factory
 * @param {RTCStatsReport} report
 * @param {StatsIdsByMediaType} receiverReportFactoryIdsToDeleteByMediaType
 * @param {TrackId} [trackId]
 * @returns {void}
 */
function updateReceiverReports(factory, report, receiverReportFactoryIdsToDeleteByMediaType, trackId) {
  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = report.values()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var stats = _step3.value;

      if (stats.type === 'inbound-rtp' && !stats.isRemote) {
        var receiverReportFactoryIdsToDelete = receiverReportFactoryIdsToDeleteByMediaType[stats.mediaType];
        if (receiverReportFactoryIdsToDelete) {
          receiverReportFactoryIdsToDelete.delete(stats.id);
        }
        var receiverReportFactory = getOrCreateReceiverReportFactory(factory, report, stats, trackId);
        if (receiverReportFactory) {
          receiverReportFactory.next(trackId || receiverReportFactory.trackId, stats);
        }
      }
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }
}

/**
 * @param {SenderReportFactoriesByMediaType|ReceiverReportFactoriesByMediaType} senderOrReceiverReportFactoriesByMediaType
 * @param {StatsIdsByMediaType} senderOrReceiverReportFactoryIdsByMediaType
 * @returns {void}
 */
function deleteSenderOrReceiverReportFactories(senderOrReceiverReportFactoriesByMediaType, senderOrReceiverReportFactoryIdsByMediaType) {
  var _loop = function _loop(mediaType) {
    var senderOrReceiverReportFactories = senderOrReceiverReportFactoriesByMediaType[mediaType];
    var senderOrReceiverReportFactoryIds = senderOrReceiverReportFactoryIdsByMediaType[mediaType];
    senderOrReceiverReportFactoryIds.forEach(function (senderOrReceiverReportFactoryId) {
      return senderOrReceiverReportFactories.delete(senderOrReceiverReportFactoryId);
    });
  };

  for (var mediaType in senderOrReceiverReportFactoryIdsByMediaType) {
    _loop(mediaType);
  }
}

/**
 * @param {IceReportFactory} ice
 * @param {RTCStatsReport} report
 * @returns {void}
 */
function updateIceReport(ice, report) {
  var selectedCandidatePair = void 0;
  var _iteratorNormalCompletion4 = true;
  var _didIteratorError4 = false;
  var _iteratorError4 = undefined;

  try {
    for (var _iterator4 = report.values()[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
      var stats = _step4.value;

      if (stats.type === 'transport') {
        selectedCandidatePair = report.get(stats.selectedCandidatePairId);
      }
    }
  } catch (err) {
    _didIteratorError4 = true;
    _iteratorError4 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion4 && _iterator4.return) {
        _iterator4.return();
      }
    } finally {
      if (_didIteratorError4) {
        throw _iteratorError4;
      }
    }
  }

  if (selectedCandidatePair) {
    ice.next(selectedCandidatePair);
    return;
  }
  var _iteratorNormalCompletion5 = true;
  var _didIteratorError5 = false;
  var _iteratorError5 = undefined;

  try {
    for (var _iterator5 = report.values()[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
      var _stats = _step5.value;

      if (_stats.type === 'candidate-pair' && _stats.nominated && ('selected' in _stats ? _stats.selected : true)) {
        ice.next(_stats);
      }
    }
  } catch (err) {
    _didIteratorError5 = true;
    _iteratorError5 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion5 && _iterator5.return) {
        _iterator5.return();
      }
    } finally {
      if (_didIteratorError5) {
        throw _iteratorError5;
      }
    }
  }
}

/**
 * @param {PeerConnectionReportFactory} factory
 * @returns {PeerConnectionReport}
 */
function updateFirefox(factory) {
  var senders = factory.pc.getTransceivers().filter(function (transceiver) {
    return transceiver.currentDirection && transceiver.currentDirection.match(/send/) && transceiver.sender.track;
  }).map(function (transceiver) {
    return transceiver.sender;
  });

  var receivers = factory.pc.getTransceivers().filter(function (transceiver) {
    return transceiver.currentDirection && transceiver.currentDirection.match(/recv/);
  }).map(function (transceiver) {
    return transceiver.receiver;
  });

  return Promise.all([getSenderOrReceiverReports(senders), getSenderOrReceiverReports(receivers), factory.pc.getStats()]).then(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 3),
        senderReports = _ref2[0],
        receiverReports = _ref2[1],
        pcReport = _ref2[2];

    var senderReportFactoriesByMediaType = getSenderReportFactoriesByMediaType(factory);
    var senderReportFactoryIdsToDeleteByMediaType = getSenderReportFactoryIdsByMediaType(factory);
    senderReports.forEach(function (report, trackId) {
      return updateSenderReports(factory, report, senderReportFactoryIdsToDeleteByMediaType, trackId);
    });
    deleteSenderOrReceiverReportFactories(senderReportFactoriesByMediaType, senderReportFactoryIdsToDeleteByMediaType);

    var receiverReportFactoriesByMediaType = getReceiverReportFactoriesByMediaType(factory);
    var receiverReportFactoryIdsToDeleteByMediaType = getReceiverReportFactoryIdsByMediaType(factory);
    receiverReports.forEach(function (report, trackId) {
      return updateReceiverReports(factory, report, receiverReportFactoryIdsToDeleteByMediaType, trackId);
    });
    deleteSenderOrReceiverReportFactories(receiverReportFactoriesByMediaType, receiverReportFactoryIdsToDeleteByMediaType);

    updateIceReport(factory.ice, pcReport);
  });
}

/**
 * @param {PeerConnectionReportFactory} factory
 * @returns {PeerConnectionReport}
 */
function updateChrome(factory) {
  return factory.pc.getStats().then(function (report) {
    var senderReportFactoriesByMediaType = getSenderReportFactoriesByMediaType(factory);
    var senderReportFactoryIdsToDeleteByMediaType = getSenderReportFactoryIdsByMediaType(factory);
    updateSenderReports(factory, report, senderReportFactoryIdsToDeleteByMediaType);
    deleteSenderOrReceiverReportFactories(senderReportFactoriesByMediaType, senderReportFactoryIdsToDeleteByMediaType);

    var receiverReportFactoriesByMediaType = getReceiverReportFactoriesByMediaType(factory);
    var receiverReportFactoryIdsToDeleteByMediaType = getReceiverReportFactoryIdsByMediaType(factory);
    updateReceiverReports(factory, report, receiverReportFactoryIdsToDeleteByMediaType);
    deleteSenderOrReceiverReportFactories(receiverReportFactoriesByMediaType, receiverReportFactoryIdsToDeleteByMediaType);

    updateIceReport(factory.ice, report);
  });
}

module.exports = PeerConnectionReportFactory;
},{"./icereportfactory":78,"./peerconnectionreport":92,"./receiverreportfactory":95,"./senderreportfactory":102}],94:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var average = require('./average');
var SenderOrReceiverReport = require('./senderorreceiverreport');
var sum = require('./sum');

/**
 * @interface ReceiverSummary
 * @property {number} bitrate
 * @property {number} fractionLost - 0–1
 * @property {number} [jitter] - s (undefined for video tracks in Chrome)
 */

/**
 * @extends SenderOrReceiverReport
 * @property {number} deltaPacketsLost
 * @property {number} deltaPacketsReceived
 * @property {number} [fractionLost] - 0–1 (undefined in Firefox)
 * @property {number} [jitter] - s (undefined for video tracks in Chrome)
 * @property {number} phonyPacketsLost - 0–1
 */

var ReceiverReport = function (_SenderOrReceiverRepo) {
  _inherits(ReceiverReport, _SenderOrReceiverRepo);

  /**
   * @param {StatsId} id
   * @param {TrackId} trackId
   * @param {number} bitrate - bps
   * @param {number} deltaPacketsLost
   * @param {number} deltaPacketsReceived
   * @param {number} [fractionLost] - 0–1 (undefined in Firefox)
   * @param {number} [jitter] - s (undefined for video tracks in Chrome)
   */
  function ReceiverReport(id, trackId, bitrate, deltaPacketsLost, deltaPacketsReceived, fractionLost, jitter) {
    _classCallCheck(this, ReceiverReport);

    var _this = _possibleConstructorReturn(this, (ReceiverReport.__proto__ || Object.getPrototypeOf(ReceiverReport)).call(this, id, trackId, bitrate));

    var phonyFractionLost = deltaPacketsReceived > 0 ? deltaPacketsLost / deltaPacketsReceived : 0;
    Object.defineProperties(_this, {
      deltaPacketsLost: {
        enumerable: true,
        value: deltaPacketsLost
      },
      deltaPacketsReceived: {
        enumerable: true,
        value: deltaPacketsReceived
      },
      fractionLost: {
        enumerable: true,
        value: fractionLost
      },
      jitter: {
        enumerable: true,
        value: jitter
      },
      phonyFractionLost: {
        enumerable: true,
        value: phonyFractionLost
      }
    });
    return _this;
  }

  /**
   * Create a {@link ReceiverReport}.
   * @param {string} trackId
   * @param {RTCStats} olderStats
   * @param {RTCStats} newerStats
   * @returns {ReceiverReport}
   */


  _createClass(ReceiverReport, [{
    key: 'summarize',


    /**
     * Summarize the {@link ReceiveReport}.
     * @returns {ReceiverSummary}
     */
    value: function summarize() {
      return {
        bitrate: this.bitrate,
        fractionLost: typeof this.fractionLost === 'number' ? this.fractionLost : this.phonyFractionLost,
        jitter: this.jitter
      };
    }
  }], [{
    key: 'of',
    value: function of(trackId, olderStats, newerStats) {
      if (olderStats.id !== newerStats.id) {
        throw new Error('RTCStats IDs must match');
      }
      var secondsElapsed = (newerStats.timestamp - olderStats.timestamp) / 1000;
      var deltaBytesReceived = newerStats.bytesReceived - olderStats.bytesReceived;
      var bitrate = secondsElapsed > 0 ? deltaBytesReceived / secondsElapsed * 8 : 0;
      var deltaPacketsLost = Math.max(newerStats.packetsLost - olderStats.packetsLost, 0);
      var deltaPacketsReceived = newerStats.packetsReceived - olderStats.packetsReceived;
      var fractionLost = newerStats.fractionLost,
          jitter = newerStats.jitter;

      return new ReceiverReport(olderStats.id, trackId, bitrate, deltaPacketsLost, deltaPacketsReceived, fractionLost, jitter);
    }

    /**
     * Summarize {@link ReceiverReport}s by summing and averaging their values.
     * @param {Array<ReceiverReport>} reports
     * @returns {ReceiverSummary}
     */

  }, {
    key: 'summarize',
    value: function summarize(reports) {
      var summaries = reports.map(function (report) {
        return report.summarize();
      });
      var bitrate = sum(summaries.map(function (summary) {
        return summary.bitrate;
      }));
      var fractionLost = average(summaries.map(function (summary) {
        return summary.fractionLost;
      }));
      var jitter = average(summaries.map(function (summary) {
        return summary.jitter;
      }));
      return {
        bitrate: bitrate,
        fractionLost: fractionLost,
        jitter: jitter
      };
    }
  }]);

  return ReceiverReport;
}(SenderOrReceiverReport);

module.exports = ReceiverReport;
},{"./average":76,"./senderorreceiverreport":99,"./sum":104}],95:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ReceiverReport = require('./receiverreport');
var SenderOrReceiverReportFactory = require('./senderorreceiverreportfactory');

/**
 * @extends SenderOrReceiverReportFactory
 * @param {?ReceiverReport} lastReport
 */

var ReceiverReportFactory = function (_SenderOrReceiverRepo) {
  _inherits(ReceiverReportFactory, _SenderOrReceiverRepo);

  /**
   * Construct a {@link ReceiverReportFactory}.
   * @param {TrackId} trackId
   * @param {RTCStats} initialStats
   */
  function ReceiverReportFactory(trackId, initialStats) {
    _classCallCheck(this, ReceiverReportFactory);

    var _this = _possibleConstructorReturn(this, (ReceiverReportFactory.__proto__ || Object.getPrototypeOf(ReceiverReportFactory)).call(this, initialStats.id, trackId, initialStats));

    Object.defineProperties(_this, {
      lastReport: {
        enumerable: true,
        value: null,
        writable: true
      }
    });
    return _this;
  }

  /**
   * Create a {@link ReceiverReport}.
   * @param {TrackId} trackId
   * @param {RTCStats} newerStats
   * @returns {ReceiverReport}
   */


  _createClass(ReceiverReportFactory, [{
    key: 'next',
    value: function next(trackId, newerStats) {
      var olderStats = this.lastStats;
      this.lastStats = newerStats;
      this.trackId = trackId;
      var report = ReceiverReport.of(trackId, olderStats, newerStats);
      this.lastReport = report;
      return report;
    }
  }]);

  return ReceiverReportFactory;
}(SenderOrReceiverReportFactory);

module.exports = ReceiverReportFactory;
},{"./receiverreport":94,"./senderorreceiverreportfactory":100}],96:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RemoteTrackStats = require('./remotetrackstats');

/**
 * Statistics for an {@link AudioTrack}.
 * @extends RemoteTrackStats
 * @property {?AudioLevel} audioLevel - Output {@link AudioLevel}
 * @property {?number} jitter - Audio jitter in milliseconds
 */

var RemoteAudioTrackStats = function (_RemoteTrackStats) {
  _inherits(RemoteAudioTrackStats, _RemoteTrackStats);

  /**
   * @param {string} trackId - {@link AudioTrack} ID
   * @param {StandardizedTrackStatsReport} statsReport
   */
  function RemoteAudioTrackStats(trackId, statsReport) {
    _classCallCheck(this, RemoteAudioTrackStats);

    var _this = _possibleConstructorReturn(this, (RemoteAudioTrackStats.__proto__ || Object.getPrototypeOf(RemoteAudioTrackStats)).call(this, trackId, statsReport));

    Object.defineProperties(_this, {
      audioLevel: {
        value: typeof statsReport.audioOutputLevel === 'number' ? statsReport.audioOutputLevel : null,
        enumerable: true
      },
      jitter: {
        value: typeof statsReport.jitter === 'number' ? statsReport.jitter : null,
        enumerable: true
      }
    });
    return _this;
  }

  return RemoteAudioTrackStats;
}(RemoteTrackStats);

module.exports = RemoteAudioTrackStats;
},{"./remotetrackstats":97}],97:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TrackStats = require('./trackstats');

/**
 * Statistics for a remote {@link Track}.
 * @extends TrackStats
 * @property {?number} bytesReceived - Number of bytes received
 * @property {?number} packetsReceived - Number of packets received
 */

var RemoteTrackStats = function (_TrackStats) {
  _inherits(RemoteTrackStats, _TrackStats);

  /*
   * @param {string} trackId - {@link Track} ID
   * @param {StandardizedTrackStatsReport} statsReport
   */
  function RemoteTrackStats(trackId, statsReport) {
    _classCallCheck(this, RemoteTrackStats);

    var _this = _possibleConstructorReturn(this, (RemoteTrackStats.__proto__ || Object.getPrototypeOf(RemoteTrackStats)).call(this, trackId, statsReport));

    Object.defineProperties(_this, {
      bytesReceived: {
        value: typeof statsReport.bytesReceived === 'number' ? statsReport.bytesReceived : null,
        enumerable: true
      },
      packetsReceived: {
        value: typeof statsReport.packetsReceived === 'number' ? statsReport.packetsReceived : null,
        enumerable: true
      }
    });
    return _this;
  }

  return RemoteTrackStats;
}(TrackStats);

module.exports = RemoteTrackStats;
},{"./trackstats":105}],98:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RemoteTrackStats = require('./remotetrackstats');

/**
 * Statistics for a {@link VideoTrack}.
 * @extends RemoteTrackStats
 * @property {?VideoTrack#Dimensions} dimensions - Received video resolution
 * @property {?number} frameRate - Received video frame rate
 */

var RemoteVideoTrackStats = function (_RemoteTrackStats) {
  _inherits(RemoteVideoTrackStats, _RemoteTrackStats);

  /**
   * @param {string} trackId - {@link VideoTrack} ID
   * @param {StandardizedTrackStatsReport} statsReport
   */
  function RemoteVideoTrackStats(trackId, statsReport) {
    _classCallCheck(this, RemoteVideoTrackStats);

    var _this = _possibleConstructorReturn(this, (RemoteVideoTrackStats.__proto__ || Object.getPrototypeOf(RemoteVideoTrackStats)).call(this, trackId, statsReport));

    var dimensions = null;
    if (typeof statsReport.frameWidthReceived === 'number' && typeof statsReport.frameHeightReceived === 'number') {
      dimensions = {};

      Object.defineProperties(dimensions, {
        width: {
          value: statsReport.frameWidthReceived,
          enumerable: true
        },
        height: {
          value: statsReport.frameHeightReceived,
          enumerable: true
        }
      });
    }

    Object.defineProperties(_this, {
      dimensions: {
        value: dimensions,
        enumerable: true
      },
      frameRate: {
        value: typeof statsReport.frameRateReceived === 'number' ? statsReport.frameRateReceived : null,
        enumerable: true
      }
    });
    return _this;
  }

  return RemoteVideoTrackStats;
}(RemoteTrackStats);

module.exports = RemoteVideoTrackStats;
},{"./remotetrackstats":97}],99:[function(require,module,exports){
'use strict';

/**
 * @property {StatsId} id
 * @property {TrackId} trackId
 * @property {number} bitrate - bps
 */

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SenderOrReceiverReport =
/**
 * Construct a {@link SenderOrReceiverReport}.
 * @param {StatsId} id
 * @param {TrackId} trackId
 * @param {number} bitrate - bps
 */
function SenderOrReceiverReport(id, trackId, bitrate) {
  _classCallCheck(this, SenderOrReceiverReport);

  Object.defineProperties(this, {
    id: {
      enumerable: true,
      value: id
    },
    trackId: {
      enumerable: true,
      value: trackId
    },
    bitrate: {
      enumerable: true,
      value: bitrate
    }
  });
};

module.exports = SenderOrReceiverReport;
},{}],100:[function(require,module,exports){
'use strict';

/**
 * @property {StatsId} id
 * @property {TrackId} trackId
 * @property {RTCStats} lastStats
 */

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SenderOrReceiverReportFactory =
/**
 * @param {StatsId} id
 * @param {TrackId} trackId
 * @param {RTCStats} initialStats
 */
function SenderOrReceiverReportFactory(id, trackId, initialStats) {
  _classCallCheck(this, SenderOrReceiverReportFactory);

  Object.defineProperties(this, {
    id: {
      enumerable: true,
      value: id,
      writable: true
    },
    trackId: {
      enumerable: true,
      value: trackId,
      writable: true
    },
    lastStats: {
      enumerable: true,
      value: initialStats,
      writable: true
    }
  });
};

module.exports = SenderOrReceiverReportFactory;
},{}],101:[function(require,module,exports){
/* eslint no-undefined:0 */
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var average = require('./average');
var SenderOrReceiverReport = require('./senderorreceiverreport');
var sum = require('./sum');

/**
 * @interface SenderSummary
 * @property {number} bitrate
 * @property {number} [rtt] - s (undefined in Chrome)
 */

/**
 * @extends SenderOrReceiverReport
 * @property {number} [rtt] - s (undefined in Chrome)
 */

var SenderReport = function (_SenderOrReceiverRepo) {
  _inherits(SenderReport, _SenderOrReceiverRepo);

  /**
   * Construct a {@link SenderReport}.
   * @param {StatsId} id
   * @param {TrackId} trackId
   * @param {number} bitrate - bps
   * @param {number} [rtt] - s
   */
  function SenderReport(id, trackId, bitrate, rtt) {
    _classCallCheck(this, SenderReport);

    var _this = _possibleConstructorReturn(this, (SenderReport.__proto__ || Object.getPrototypeOf(SenderReport)).call(this, id, trackId, bitrate));

    Object.defineProperties(_this, {
      rtt: {
        enumerable: true,
        value: rtt
      }
    });
    return _this;
  }

  /**
   * Create a {@link SenderReport}.
   * @param {string} trackId
   * @param {RTCStats} olderStats
   * @param {RTCStats} newerStats
   * @param {RTCRemoteInboundRtpStreamStats} [newerRemoteStats]
   * @returns {SenderReport}
   */


  _createClass(SenderReport, null, [{
    key: 'of',
    value: function of(trackId, olderStats, newerStats, newerRemoteStats) {
      if (olderStats.id !== newerStats.id) {
        throw new Error('RTCStats IDs must match');
      }
      var secondsElapsed = (newerStats.timestamp - olderStats.timestamp) / 1000;
      var deltaBytesSent = newerStats.bytesSent - olderStats.bytesSent;
      var bitrate = secondsElapsed > 0 ? deltaBytesSent / secondsElapsed * 8 : 0;
      var rtt = newerRemoteStats && typeof newerRemoteStats.roundTripTime === 'number' ? newerRemoteStats.roundTripTime / 1000 : undefined;
      return new SenderReport(olderStats.id, trackId, bitrate, rtt);
    }

    /**
     * Summarize {@link SenderReport}s by summing and averaging their values.
     * @param {Array<SenderReport>} reports
     * @returns {SenderSummary}
     */

  }, {
    key: 'summarize',
    value: function summarize(reports) {
      var bitrate = sum(reports.map(function (report) {
        return report.bitrate;
      }));
      var rtt = average(reports.map(function (report) {
        return report.rtt;
      }));
      return {
        bitrate: bitrate,
        rtt: rtt
      };
    }
  }]);

  return SenderReport;
}(SenderOrReceiverReport);

module.exports = SenderReport;
},{"./average":76,"./senderorreceiverreport":99,"./sum":104}],102:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SenderOrReceiverReportFactory = require('./senderorreceiverreportfactory');
var SenderReport = require('./senderreport');

/**
 * @extends {SenderOrReceiverReportFactory}
 * @property {?SenderReport} lastReport
 */

var SenderReportFactory = function (_SenderOrReceiverRepo) {
  _inherits(SenderReportFactory, _SenderOrReceiverRepo);

  /**
   * Construct a {@link SenderReportFactory}.
   * @param {TrackId} trackId
   * @param {RTCStats} initialStats
   */
  function SenderReportFactory(trackId, initialStats) {
    _classCallCheck(this, SenderReportFactory);

    var _this = _possibleConstructorReturn(this, (SenderReportFactory.__proto__ || Object.getPrototypeOf(SenderReportFactory)).call(this, initialStats.id, trackId, initialStats));

    Object.defineProperties(_this, {
      lastReport: {
        enumerable: true,
        value: null,
        writable: true
      }
    });
    return _this;
  }

  /**
   * @param {TrackId} trackId
   * @param {RTCStats} newerStats
   * @param {RTCRemoteInboundRtpStreamStats} [newerRemoteStats]
   * @returns {SenderReport}
   */


  _createClass(SenderReportFactory, [{
    key: 'next',
    value: function next(trackId, newerStats, newerRemoteStats) {
      var olderStats = this.lastStats;
      this.lastStats = newerStats;
      this.trackId = trackId;
      var report = SenderReport.of(trackId, olderStats, newerStats, newerRemoteStats);
      this.lastReport = report;
      return report;
    }
  }]);

  return SenderReportFactory;
}(SenderOrReceiverReportFactory);

module.exports = SenderReportFactory;
},{"./senderorreceiverreportfactory":100,"./senderreport":101}],103:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var LocalAudioTrackStats = require('./localaudiotrackstats');
var LocalVideoTrackStats = require('./localvideotrackstats');
var RemoteAudioTrackStats = require('./remoteaudiotrackstats');
var RemoteVideoTrackStats = require('./remotevideotrackstats');

/**
 * Statistics report for an RTCPeerConnection.
 * @property {string} peerConnectionId - ID of the RTCPeerConnection
 * @property {Array<LocalAudioTrackStats>} localAudioTrackStats - List of {@link LocalAudioTrackStats}
 * @property {Array<LocalVideoTrackStats>} localVideoTrackStats - List of {@link LocalVideoTrackStats}
 * @property {Array<RemoteAudioTrackStats>} remoteAudioTrackStats - List of {@link RemoteAudioTrackStats}
 * @property {Array<RemoteVideoTrackStats>} remoteVideoTrackStats - List of {@link RemoteVideoTrackStats}
 */

var StatsReport =
/**
 * @param {string} peerConnectionId - RTCPeerConnection ID
 * @param {StandardizedStatsResponse} statsResponse
 */
function StatsReport(peerConnectionId, statsResponse) {
  _classCallCheck(this, StatsReport);

  if (typeof peerConnectionId !== 'string') {
    throw new Error('RTCPeerConnection id must be a string');
  }

  Object.defineProperties(this, {
    peerConnectionId: {
      value: peerConnectionId,
      enumerable: true
    },
    localAudioTrackStats: {
      value: statsResponse.localAudioTrackStats.map(function (report) {
        return new LocalAudioTrackStats(report.trackId, report);
      }),
      enumerable: true
    },
    localVideoTrackStats: {
      value: statsResponse.localVideoTrackStats.map(function (report) {
        return new LocalVideoTrackStats(report.trackId, report);
      }),
      enumerable: true
    },
    remoteAudioTrackStats: {
      value: statsResponse.remoteAudioTrackStats.map(function (report) {
        return new RemoteAudioTrackStats(report.trackId, report);
      }),
      enumerable: true
    },
    remoteVideoTrackStats: {
      value: statsResponse.remoteVideoTrackStats.map(function (report) {
        return new RemoteVideoTrackStats(report.trackId, report);
      }),
      enumerable: true
    }
  });
};

module.exports = StatsReport;
},{"./localaudiotrackstats":79,"./localvideotrackstats":81,"./remoteaudiotrackstats":96,"./remotevideotrackstats":98}],104:[function(require,module,exports){
'use strict';

/**
 * @param {Array<number|undefined>} xs
 * @returns {number}
 */

function sum(xs) {
  return xs.reduce(function (y, x) {
    return typeof x === 'number' ? x + y : y;
  }, 0);
}

module.exports = sum;
},{}],105:[function(require,module,exports){
'use strict';

/**
 * Statistics for a {@link Track}.
 * @property {Track.ID} trackId - The {@link Track} ID
 * @property {Track.SID} trackSid - The {@link Track}'s SID when published in
 *  in a {@link Room}
 * @property {number} timestamp - A Unix timestamp in milliseconds indicating
 *   when the {@link TrackStats} were gathered
 * @property {string} ssrc - The {@link Track}'s SSRC when transmitted over the
 *   RTCPeerConnection
 * @property {?number} packetsLost - The number of packets lost
 * @property {?string} codec - The name of the codec used to encode the
 *   {@link Track}'s media
 */

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TrackStats =
/**
 * @param {string} trackId - {@link Track} ID
 * @param {StandardizedTrackStatsReport} statsReport
 */
function TrackStats(trackId, statsReport) {
  _classCallCheck(this, TrackStats);

  if (typeof trackId !== 'string') {
    throw new Error('Track id must be a string');
  }

  Object.defineProperties(this, {
    trackId: {
      value: trackId,
      enumerable: true
    },
    trackSid: {
      value: statsReport.trackSid,
      enumerable: true
    },
    timestamp: {
      value: statsReport.timestamp,
      enumerable: true
    },
    ssrc: {
      value: statsReport.ssrc,
      enumerable: true
    },
    packetsLost: {
      value: typeof statsReport.packetsLost === 'number' ? statsReport.packetsLost : null,
      enumerable: true
    },
    codec: {
      value: typeof statsReport.codecName === 'string' ? statsReport.codecName : null,
      enumerable: true
    }
  });
};

module.exports = TrackStats;
},{}],106:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;

/**
 * A {@link TrackTransceiver} represents either one or more local RTCRtpSenders
 * or RTCDataChannels, or a single RTCRtpReceiver or remote RTCDataChannel.
 * @extends EventEmitter
 * @property {Track.ID} id
 * @property {Track.kind} kind
 */

var TrackTransceiver = function (_EventEmitter) {
  _inherits(TrackTransceiver, _EventEmitter);

  /**
   * Construct a {@link TrackTransceiver}.
   * @param {Track.ID} id
   * @param {Track.kind} kind
   */
  function TrackTransceiver(id, kind) {
    _classCallCheck(this, TrackTransceiver);

    var _this = _possibleConstructorReturn(this, (TrackTransceiver.__proto__ || Object.getPrototypeOf(TrackTransceiver)).call(this));

    Object.defineProperties(_this, {
      id: {
        enumerable: true,
        value: id
      },
      kind: {
        enumerable: true,
        value: kind
      }
    });
    return _this;
  }

  /**
   * Stop the {@link TrackTransceiver}.
   * #emits TrackTransceiver#stopped
   * @returns {void}
   */


  _createClass(TrackTransceiver, [{
    key: 'stop',
    value: function stop() {
      this.emit('stopped');
    }
  }]);

  return TrackTransceiver;
}(EventEmitter);

/**
 * The {@link TrackTransceiver} was stopped.
 * @event TrackTransceiver#stopped
 */

module.exports = TrackTransceiver;
},{"events":149}],107:[function(require,module,exports){
(function (global){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var StateMachine = require('./statemachine');

var _require = require('./util'),
    buildLogLevels = _require.buildLogLevels,
    makeUUID = _require.makeUUID;

var Log = require('./util/log');
var Timeout = require('./util/timeout');

var nInstances = 0;

/*
  TwilioConnection states
  -----------------------

  +--------------+       +----------+
  |  connecting  | ----> |  closed  |
  +--------------+       +----------+
         |                    ^
         v                    |
     +--------+               |
     |  open  | ---------------
     +--------+
 */

var states = {
  closed: [],
  connecting: ['closed', 'open'],
  open: ['closed']
};

var DEFAULT_MAX_CONSECUTIVE_MISSED_HEARTBEATS = 3;
var DEFAULT_MAX_REQUESTED_HEARTBEAT_TIMEOUT = 5000;
var DEFAULT_WELCOME_TIMEOUT = 5000;
var HEARTBEAT_TIMEOUT_OFFSET = 100;
var WS_CLOSE_NORMAL = 1000;
var WS_CLOSE_WELCOME_TIMEOUT = 3000;
var WS_CLOSE_HEARTBEATS_MISSED = 3001;
var WS_CLOSE_HELLO_FAILED = 3002;
var WS_CLOSE_SEND_FAILED = 3003;

var toplevel = global.window || global;
var WebSocket = toplevel.WebSocket ? toplevel.WebSocket : require('ws');

/**
 * A {@link TwilioConnection} represents a WebSocket connection
 * to a Twilio Connections Messaging Protocol (TCMP) server.
 * @fires TwilioConnection#close
 * @fires TwilioConnection#error
 * @fires TwilioConnection#message
 * @fires TwilioConnection#open
 */

var TwilioConnection = function (_StateMachine) {
  _inherits(TwilioConnection, _StateMachine);

  /**
   * Construct a {@link TwilioConnection}.
   * @param {string} serverUrl - TCMP server url
   * @param {TwilioConnectionOptions} options - {@link TwilioConnection} options
   */
  function TwilioConnection(serverUrl, options) {
    _classCallCheck(this, TwilioConnection);

    var _this = _possibleConstructorReturn(this, (TwilioConnection.__proto__ || Object.getPrototypeOf(TwilioConnection)).call(this, 'connecting', states));

    options = Object.assign({
      maxConsecutiveMissedHeartbeats: DEFAULT_MAX_CONSECUTIVE_MISSED_HEARTBEATS,
      requestedHeartbeatTimeout: DEFAULT_MAX_REQUESTED_HEARTBEAT_TIMEOUT,
      welcomeTimeout: DEFAULT_WELCOME_TIMEOUT,
      Log: Log,
      WebSocket: WebSocket
    }, options);

    var logLevels = buildLogLevels(options.logLevel);
    var log = new options.Log('default', _this, logLevels);

    Object.defineProperties(_this, {
      _consecutiveHeartbeatsMissed: {
        value: 0,
        writable: true
      },
      _heartbeatTimeout: {
        value: null,
        writable: true
      },
      _instanceId: {
        value: ++nInstances
      },
      _log: {
        value: log
      },
      _messageQueue: {
        value: []
      },
      _options: {
        value: options
      },
      _sendHeartbeatTimeout: {
        value: null,
        writable: true
      },
      _welcomeTimeout: {
        value: null,
        writable: true
      },
      _ws: {
        value: null,
        writable: true
      }
    });

    _this.on('stateChanged', function (state, error) {
      return {
        closed: function closed() {
          return _this.emit('close', error);
        },
        open: function open() {
          return _this.emit('open');
        }
      }[state]();
    });

    _this._connect(serverUrl);
    return _this;
  }

  _createClass(TwilioConnection, [{
    key: 'toString',
    value: function toString() {
      return '[TwilioConnection #' + this._instanceId + ': ' + this._ws.url + ']';
    }

    /**
     * The number of consecutive "hearbeat" messages missed.
     * @property {number}
     */

  }, {
    key: '_close',


    /**
     * Close the {@link TwilioConnection}.
     * @param {{code: number, reason: string}} event
     * @private
     */
    value: function _close(_ref) {
      var code = _ref.code,
          reason = _ref.reason;

      if (this.state === 'closed') {
        return;
      }
      if (this._welcomeTimeout) {
        this._welcomeTimeout.clear();
      }
      if (this._heartbeatTimeout) {
        this._heartbeatTimeout.clear();
      }
      if (this._sendHeartbeatTimeout) {
        this._sendHeartbeatTimeout.clear();
      }
      this._messageQueue.splice(0);

      var log = this._log;
      if (code === WS_CLOSE_NORMAL) {
        log.debug('Closed');
      } else {
        log.warn('Closed: ' + code + ' - ' + reason);
      }

      this.transition('closed', null, code !== WS_CLOSE_NORMAL ? new Error('WebSocket Error ' + code + ': ' + reason) : null);

      var readyState = this._ws.readyState;
      var WebSocket = this._options.WebSocket;

      if (readyState !== WebSocket.CLOSING && readyState !== WebSocket.CLOSED) {
        this._ws.close(code, reason);
      }
    }

    /**
     * Connect to the TCMP server.
     * @param {string} serverUrl
     * @private
     */

  }, {
    key: '_connect',
    value: function _connect(serverUrl) {
      var _this2 = this;

      this._ws = new this._options.WebSocket(serverUrl);
      var log = this._log;
      var ws = this._ws;

      log.debug('Created a new WebSocket:', ws);
      ws.addEventListener('close', function (event) {
        return _this2._close(event);
      });

      ws.addEventListener('message', function (message) {
        log.debug('Incoming: ' + message.data);
        try {
          message = JSON.parse(message.data);
        } catch (error) {
          _this2.emit('error', error);
          return;
        }
        switch (message.type) {
          case 'bad':
            _this2._handleBad(message);
            break;
          case 'bye':
            // Do nothing.
            break;
          case 'heartbeat':
            _this2._handleHeartbeat();
            break;
          case 'msg':
            _this2._handleMessage(message);
            break;
          case 'welcome':
            _this2._handleWelcome(message);
            break;
          default:
            _this2._log.debug('Unknown message type: ' + message.type);
            _this2.emit('error', new Error('Unknown message type: ' + message.type));
            break;
        }
      });

      ws.addEventListener('open', function () {
        log.debug('WebSocket opened:', ws);
        _this2._sendHello();
        var welcomeTimeout = _this2._options.welcomeTimeout;

        _this2._welcomeTimeout = new Timeout(function () {
          return _this2._handleWelcomeTimeout();
        }, welcomeTimeout);
      });
    }

    /**
     * Handle an incoming "bad" message.
     * @param {{reason: string}} message
     * @private
     */

  }, {
    key: '_handleBad',
    value: function _handleBad(_ref2) {
      var reason = _ref2.reason;

      var log = this._log;
      if (this.state === 'connecting') {
        log.warn('Closing: ' + WS_CLOSE_HELLO_FAILED + ' - ' + reason);
        this._close({ code: WS_CLOSE_HELLO_FAILED, reason: reason });
        return;
      }
      log.debug('Error: ' + reason);
      this.emit('error', new Error(reason));
    }

    /**
     * Handle an incoming "heartbeat" message.
     * @private
     */

  }, {
    key: '_handleHeartbeat',
    value: function _handleHeartbeat() {
      if (this.state !== 'open') {
        return;
      }
      this._consecutiveHeartbeatsMissed = 0;
      this._heartbeatTimeout.reset();
    }

    /**
     * Handle a missed "heartbeat" message.
     * @private
     */

  }, {
    key: '_handleHeartbeatTimeout',
    value: function _handleHeartbeatTimeout() {
      if (this.state !== 'open') {
        return;
      }
      this._consecutiveHeartbeatsMissed++;
      var log = this._log;
      var maxConsecutiveMissedHeartbeats = this._options.maxConsecutiveMissedHeartbeats;


      log.debug('Consecutive heartbeats missed: ' + this._consecutiveHeartbeatsMissed);
      if (this._consecutiveHeartbeatsMissed < maxConsecutiveMissedHeartbeats) {
        this._heartbeatTimeout.reset();
        return;
      }

      var reason = 'Missed ' + maxConsecutiveMissedHeartbeats + ' "heartbeat" messages';
      log.warn('Closing: ' + WS_CLOSE_HEARTBEATS_MISSED + ' - ' + reason);
      this._close({ code: WS_CLOSE_HEARTBEATS_MISSED, reason: reason });
    }

    /**
     * Handle an incoming "msg" message.
     * @param {{body: object}} message
     * @private
     */

  }, {
    key: '_handleMessage',
    value: function _handleMessage(_ref3) {
      var body = _ref3.body;

      if (this.state !== 'open') {
        return;
      }
      this.emit('message', body);
    }

    /**
     * Handle an incoming "welcome" message.
     * @param {{ negotiatedTimeout: number }} message
     * @private
     */

  }, {
    key: '_handleWelcome',
    value: function _handleWelcome(_ref4) {
      var _this3 = this;

      var negotiatedTimeout = _ref4.negotiatedTimeout;

      if (this.state !== 'connecting') {
        return;
      }
      var heartbeatTimeout = negotiatedTimeout + HEARTBEAT_TIMEOUT_OFFSET;
      this._welcomeTimeout.clear();
      this._heartbeatTimeout = new Timeout(function () {
        return _this3._handleHeartbeatTimeout();
      }, heartbeatTimeout);
      this._messageQueue.splice(0).forEach(function (message) {
        return _this3._send(message);
      });
      this._sendHeartbeatTimeout = new Timeout(function () {
        return _this3._sendHeartbeat();
      }, negotiatedTimeout);
      this.transition('open');
    }

    /**
     * Handle a missed "welcome" message.
     * @private
     */

  }, {
    key: '_handleWelcomeTimeout',
    value: function _handleWelcomeTimeout() {
      if (this.state !== 'connecting') {
        return;
      }
      var reason = '"welcome" message timeout expired';
      this._log.warn('Closing: ' + WS_CLOSE_WELCOME_TIMEOUT + ' - ' + reason);
      this._close({ code: WS_CLOSE_WELCOME_TIMEOUT, reason: reason });
    }

    /**
     * Send a message to the TCMP server.
     * @param {*} message
     * @private
     */

  }, {
    key: '_send',
    value: function _send(message) {
      var readyState = this._ws.readyState;
      var WebSocket = this._options.WebSocket;

      if (readyState === WebSocket.OPEN) {
        var data = JSON.stringify(message);
        this._log.debug('Outgoing: ' + data);
        try {
          this._ws.send(data);
        } catch (error) {
          var reason = 'Failed to send message';
          this._log.warn('Closing: ' + WS_CLOSE_SEND_FAILED + ' - ' + reason);
          this._close({ code: WS_CLOSE_SEND_FAILED, reason: reason });
        }
      }
    }

    /**
     * Send a "heartbeat" message.
     * @private
     */

  }, {
    key: '_sendHeartbeat',
    value: function _sendHeartbeat() {
      if (this.state === 'closed') {
        return;
      }
      this._send({ type: 'heartbeat' });
      this._sendHeartbeatTimeout.reset();
    }

    /**
     * Send a "hello" message.
     * @private
     */

  }, {
    key: '_sendHello',
    value: function _sendHello() {
      var requestedHeartbeatTimeout = this._options.requestedHeartbeatTimeout;

      this._send({
        id: makeUUID(),
        timeout: requestedHeartbeatTimeout,
        type: 'hello'
      });
    }

    /**
     * Send or enqueue a message.
     * @param {*} message
     * @private
     */

  }, {
    key: '_sendOrEnqueue',
    value: function _sendOrEnqueue(message) {
      var _this4 = this;

      if (this.state === 'closed') {
        return;
      }
      var sendOrEnqueue = this.state === 'open' ? function (message) {
        return _this4._send(message);
      } : function (message) {
        return _this4._messageQueue.push(message);
      };

      sendOrEnqueue(message);
    }

    /**
     * Close the {@link TwilioConnection}.
     * @returns {void}
     */

  }, {
    key: 'close',
    value: function close() {
      if (this.state === 'closed') {
        return;
      }
      this._sendOrEnqueue({ type: 'bye' });
      this._ws.close(WS_CLOSE_NORMAL);
    }

    /**
     * Send a "msg" message.
     * @param {*} body
     * @returns {void}
     */

  }, {
    key: 'sendMessage',
    value: function sendMessage(body) {
      this._sendOrEnqueue({ body: body, type: 'msg' });
    }
  }, {
    key: 'consecutiveHeartbeatsMissed',
    get: function get() {
      return this._consecutiveHeartbeatsMissed;
    }
  }]);

  return TwilioConnection;
}(StateMachine);

/**
 * A {@link TwilioConnection} was closed.
 * @event TwilioConnection#close
 * @param {?Error} error - If closed by the client, then this is null
 */

/**
 * A {@link TwilioConnection} received an error from the TCMP server.
 * @event TwilioConnection#error
 * @param {Error} error - The TCMP server error
 */

/**
 * A {@link TwilioConnection} received a message from the TCMP server.
 * @event TwilioConnection#message
 * @param {*} body - Message body
 */

/**
 * A {@link TwilioConnection} completed a hello/welcome handshake with the TCMP server.
 * @event TwilioConnection#open
 */

/**
 * {@link TwilioConnection} options
 * @typedef {object} TwilioConnectionOptions
 * @property {LogLevel} [logLevel=warn] - Log level of the {@link TwilioConnection}
 * @property {number} [maxConsecutiveMissedHeartbeats=5] - Max. number of consecutive "heartbeat" messages that can be missed
 * @property {number} [requestedHeartbeatTimeout=5000] - "heartbeat" timeout (ms) requested by the {@link TwilioConnection}
 * @property {number} [welcomeTimeout=5000] - Time (ms) to wait for the "welcome" message after sending the "hello" message
 */

module.exports = TwilioConnection;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./statemachine":75,"./util":112,"./util/log":115,"./util/timeout":123,"ws":155}],108:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('./'),
    defer = _require.defer;

/**
 * An {@link AsyncVar} is an "asynchronous variable" which may or may not
 * contain a value of some type T. You can put a value into the {@link AsyncVar}
 * with {@link AsyncVar#put}. Callers can take a value out of the
 * {@link AsyncVar} by queueing up with {@link AsyncVar#take}. N calls to
 * {@link AsyncVar#take} require N calls to {@link AsyncVar#put} to resolve, and
 * they resolve in order.
 */


var AsyncVar = function () {
  /**
   * Construct an {@link AsyncVar}.
   */
  function AsyncVar() {
    _classCallCheck(this, AsyncVar);

    Object.defineProperties(this, {
      _deferreds: {
        value: []
      },
      _hasValue: {
        value: false,
        writable: true
      },
      _value: {
        value: null,
        writable: true
      }
    });
  }

  /**
   * Put a value into the {@link AsyncVar}.
   * @param {T} value
   * @returns {this}
   */


  _createClass(AsyncVar, [{
    key: 'put',
    value: function put(value) {
      this._hasValue = true;
      this._value = value;
      var deferred = this._deferreds.shift();
      if (deferred) {
        deferred.resolve(value);
      }
      return this;
    }

    /**
     * Take the value out of the {@link AsyncVar}.
     * @returns {Promise<T>}
     */

  }, {
    key: 'take',
    value: function take() {
      var _this = this;

      if (this._hasValue && !this._deferreds.length) {
        this._hasValue = false;
        return Promise.resolve(this._value);
      }
      var deferred = defer();
      this._deferreds.push(deferred);
      return deferred.promise.then(function (value) {
        _this._hasValue = false;
        return value;
      });
    }
  }]);

  return AsyncVar;
}();

module.exports = AsyncVar;
},{"./":112}],109:[function(require,module,exports){
'use strict';

/**
 * A Promise that can be canceled with {@link CancelablePromise#cancel}.
 * @extends Promise
*/

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CancelablePromise = function () {
  /**
   * Construct a new {@link CancelablePromise}.
   * @param {CancelablePromise.OnCreate} onCreate
   * @param {CancelablePromise.OnCancel} onCancel
  */ /**
     * A function to be called on {@link CancelablePromise} creation
     * @typedef {function} CancelablePromise.OnCreate
     * @param {function(*)} resolve
     * @param {function(*)} reject
     * @param {function(): boolean} isCanceled
     */ /**
        * A function to be called when {@link CancelablePromise#cancel} is called
        * @typedef {function} CancelablePromise.OnCancel
        */
  function CancelablePromise(onCreate, onCancel) {
    var _this = this;

    _classCallCheck(this, CancelablePromise);

    /* istanbul ignore next */
    Object.defineProperties(this, {
      _isCancelable: {
        writable: true,
        value: true
      },
      _isCanceled: {
        writable: true,
        value: false
      },
      _onCancel: {
        value: onCancel
      }
    });

    Object.defineProperty(this, '_promise', {
      value: new Promise(function (resolve, reject) {
        onCreate(function (value) {
          _this._isCancelable = false;
          resolve(value);
        }, function (reason) {
          _this._isCancelable = false;
          reject(reason);
        }, function () {
          return _this._isCanceled;
        });
      })
    });
  }

  /**
   * Create a synchronously-rejected {@link CancelablePromise}.
   * @param {*} reason
   * @returns {Promise<*>}
   */


  _createClass(CancelablePromise, [{
    key: 'cancel',


    /**
     * Attempt to cancel the {@link CancelablePromise}.
     * @returns {this}
     */
    value: function cancel() {
      if (this._isCancelable) {
        this._isCanceled = true;
        this._onCancel();
      }
      return this;
    }

    /**
     * @param {function} onRejected
     * @returns {CancelablePromise}
     */

  }, {
    key: 'catch',
    value: function _catch() {
      var args = [].slice.call(arguments);
      var promise = this._promise;
      return new CancelablePromise(function onCreate(resolve, reject) {
        promise.catch.apply(promise, _toConsumableArray(args)).then(resolve, reject);
      }, this._onCancel);
    }

    /**
     * @param {?function} onResolved
     * @param {function} [onRejected]
     * @returns {CancelablePromise}
     */

  }, {
    key: 'then',
    value: function then() {
      var args = [].slice.call(arguments);
      var promise = this._promise;
      return new CancelablePromise(function onCreate(resolve, reject) {
        promise.then.apply(promise, _toConsumableArray(args)).then(resolve, reject);
      }, this._onCancel);
    }
  }], [{
    key: 'reject',
    value: function reject(reason) {
      return new CancelablePromise(function rejected(resolve, reject) {
        reject(reason);
      }, function onCancel() {
        // Do nothing.
      });
    }

    /**
     * Create a synchronously-resolved {@link CancelablePromise}.
     * @param {*|Promise<*>|Thenable<*>} result
     * @returns {CancelablePromise<*>}
     */

  }, {
    key: 'resolve',
    value: function resolve(result) {
      return new CancelablePromise(function resolved(resolve) {
        resolve(result);
      }, function onCancel() {
        // Do nothing.
      });
    }
  }]);

  return CancelablePromise;
}();

module.exports = CancelablePromise;
},{}],110:[function(require,module,exports){
'use strict';

module.exports.DEFAULT_ENVIRONMENT = 'prod';
module.exports.DEFAULT_REALM = 'us1';
module.exports.DEFAULT_REGION = 'gll';
module.exports.DEFAULT_LOG_LEVEL = 'warn';
module.exports.WS_SERVER = function (environment, region) {
  region = region === 'gll' ? 'global' : encodeURIComponent(region);
  return environment === 'prod' ? 'wss://' + region + '.vss.twilio.com/signaling' : 'wss://' + region + '.vss.' + environment + '.twilio.com/signaling';
};
module.exports.ECS_SERVER = function (environment, realm) {
  switch (environment) {
    case 'prod':
      return 'https://ecs.' + realm + '.twilio.com';
    default:
      return 'https://ecs.' + environment + '-' + realm + '.twilio.com';
  }
};
module.exports.ECS_TIMEOUT = 60;
module.exports.PUBLISH_MAX_ATTEMPTS = 5;
module.exports.PUBLISH_BACKOFF_JITTER = 10;
module.exports.PUBLISH_BACKOFF_MS = 20;

module.exports.ICE_SERVERS_TIMEOUT_MS = 3000;
module.exports.ICE_SERVERS_DEFAULT_TTL = 3600;
module.exports.DEFAULT_ICE_SERVERS = function (environment) {
  switch (environment) {
    case 'prod':
      return [{ urls: 'stun:global.stun.twilio.com:3478?transport=udp' }];
    default:
      return [{ urls: 'stun:global.stun.' + environment + '.twilio.com:3478?transport=udp' }];
  }
};

// Headers
/* eslint key-spacing:0 */
module.exports.headers = {
  X_TWILIO_ACCESSTOKEN: 'X-Twilio-AccessToken'
};

/**
 * Returns the appropriate indefinite article ("a" | "an").
 * @param {string} word - The word which determines whether "a" | "an" is returned
 * @returns {string} "a" if word's first letter is a vowel, "an" otherwise
 */
function article(word) {
  // NOTE(mmalavalli): This will not be accurate for words like "hour",
  // which have consonants as their first character, but are pronounced like
  // vowels. We can address this issue if the need arises.
  return ['a', 'e', 'i', 'o', 'u'].includes(word.toLowerCase()[0]) ? 'an' : 'a';
}

module.exports.typeErrors = {
  INVALID_TYPE: function INVALID_TYPE(name, type) {
    return new TypeError(name + ' must be ' + article(type) + ' ' + type);
  },
  INVALID_VALUE: function INVALID_VALUE(name, values) {
    return new RangeError(name + ' must be one of ' + values.join(', '));
  },
  REQUIRED_ARGUMENT: function REQUIRED_ARGUMENT(name) {
    return new TypeError(name + ' must be specified');
  }
};

module.exports.DEFAULT_NQ_LEVEL_LOCAL = 1;
module.exports.DEFAULT_NQ_LEVEL_REMOTE = 0;
module.exports.MAX_NQ_LEVEL = 3;

// TODO(mmalavalli): Once we decide to support Unified Plan on Chrome 72+,
// we need to remove this constant and its references.
module.exports.DEFAULT_CHROME_SDP_SEMANTICS = 'plan-b';

module.exports.ICE_ACTIVITY_CHECK_PERIOD_MS = 1000;
module.exports.ICE_INACTIVITY_THRESHOLD_MS = 3000;

module.exports.subscriptionMode = {
  MODE_COLLABORATION: 'collaboration',
  MODE_GRID: 'grid',
  MODE_PRESENTATION: 'presentation'
};

module.exports.trackPriority = {
  PRIORITY_HIGH: 'high',
  PRIORITY_LOW: 'low',
  PRIORITY_STANDARD: 'standard'
};
},{}],111:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Filter = function () {
  function Filter(options) {
    _classCallCheck(this, Filter);

    options = Object.assign({
      getKey: function defaultGetKey(a) {
        return a;
      },
      getValue: function defaultGetValue(a) {
        return a;
      },
      isLessThanOrEqualTo: function defaultIsLessThanOrEqualTo(a, b) {
        return a <= b;
      }
    }, options);
    Object.defineProperties(this, {
      _getKey: {
        value: options.getKey
      },
      _getValue: {
        value: options.getValue
      },
      _isLessThanOrEqualTo: {
        value: options.isLessThanOrEqualTo
      },
      _map: {
        value: new Map()
      }
    });
  }

  _createClass(Filter, [{
    key: 'toMap',
    value: function toMap() {
      return new Map(this._map);
    }
  }, {
    key: 'updateAndFilter',
    value: function updateAndFilter(entries) {
      return entries.filter(this.update, this);
    }
  }, {
    key: 'update',
    value: function update(entry) {
      var key = this._getKey(entry);
      var value = this._getValue(entry);
      if (this._map.has(key) && this._isLessThanOrEqualTo(value, this._map.get(key))) {
        return false;
      }
      this._map.set(key, value);
      return true;
    }
  }]);

  return Filter;
}();

module.exports = Filter;
},{}],112:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var constants = require('./constants');

/**
 * Return the given {@link LocalTrack} or a new {@link LocalTrack} for the
 * given MediaStreamTrack.
 * @param {LocalTrack|MediaStreamTrack} track
 * @param {object} options
 * @returns {LocalTrack}
 * @throws {TypeError}
 */
function asLocalTrack(track, options) {
  if (track instanceof options.LocalAudioTrack || track instanceof options.LocalVideoTrack || track instanceof options.LocalDataTrack) {
    return track;
  }
  if (track instanceof options.MediaStreamTrack) {
    return track.kind === 'audio' ? new options.LocalAudioTrack(track, options) : new options.LocalVideoTrack(track, options);
  }
  throw constants.typeErrors.INVALID_TYPE('track', 'LocalAudioTrack, LocalVideoTrack, LocalDataTrack, or MediaStreamTrack');
}

/**
 * Create a new {@link LocalTrackPublication} for the given {@link LocalTrack}.
 * @param {LocalTrack} track
 * @param {LocalTrackPublicationSignaling} signaling
 * @param {function(track: LocalTrackPublication): void} unpublish
 * @param {object} options
 */
function asLocalTrackPublication(track, signaling, unpublish, options) {
  var LocalTrackPublication = {
    audio: options.LocalAudioTrackPublication,
    video: options.LocalVideoTrackPublication,
    data: options.LocalDataTrackPublication
  }[track.kind];
  return new LocalTrackPublication(signaling, track, unpublish, options);
}

/**
 * Capitalize a word.
 * @param {string} word
 * @returns {string} capitalized
 */
function capitalize(word) {
  return word[0].toUpperCase() + word.slice(1);
}

/**
 * Log deprecation warnings for the given events of an EventEmitter.
 * @param {string} name
 * @param {EventEmitter} emitter
 * @param {Map<string, string>} events
 * @param {Log} log
 */
function deprecateEvents(name, emitter, events, log) {
  var warningsShown = new Set();
  emitter.on('newListener', function newListener(event) {
    if (events.has(event) && !warningsShown.has(event)) {
      log.deprecated(name + '#' + event + ' has been deprecated and scheduled for removal in twilio-video.js@2.0.0.' + (events.get(event) ? ' Use ' + name + '#' + events.get(event) + ' instead.' : ''));
      warningsShown.add(event);
    }
    if (warningsShown.size >= events.size) {
      emitter.removeListener('newListener', newListener);
    }
  });
}

/**
 * Finds the items in list1 that are not in list2.
 * @param {Array<*>|Map<*>|Set<*>} list1
 * @param {Array<*>|Map<*>|Set<*>} list2
 * @returns {Set}
 */
function difference(list1, list2) {
  list1 = Array.isArray(list1) ? new Set(list1) : new Set(list1.values());
  list2 = Array.isArray(list2) ? new Set(list2) : new Set(list2.values());

  var difference = new Set();

  list1.forEach(function (item) {
    if (!list2.has(item)) {
      difference.add(item);
    }
  });

  return difference;
}

/**
 * Filter out the keys in an object with a given value.
 * @param {object} object - Object to be filtered
 * @param {*} [filterValue] - Value to be filtered out; If not specified, then
 *   filters out all keys which have an explicit value of "undefined"
 * @returns {object} - Filtered object
 */
function filterObject(object, filterValue) {
  return Object.keys(object).reduce(function (filtered, key) {
    if (object[key] !== filterValue) {
      filtered[key] = object[key];
    }
    return filtered;
  }, {});
}

/**
 * Map a list to an array of arrays, and return the flattened result.
 * @param {Array<*>|Set<*>|Map<*>} list
 * @param {function(*): Array<*>} [mapFn]
 * @returns Array<*>
 */
function flatMap(list, mapFn) {
  var listArray = list instanceof Map || list instanceof Set ? Array.from(list.values()) : list;

  mapFn = mapFn || function mapFn(item) {
    return item;
  };

  return listArray.reduce(function (flattened, item) {
    var mapped = mapFn(item);
    return flattened.concat(mapped);
  }, []);
}

/**
 * Get the user agent string, or return "Unknown".
 * @returns {string}
 */
function getUserAgent() {
  return typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : 'Unknown';
}

function makeUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
}

/**
 * Ensure that the given function is called once per tick.
 * @param {function} fn - Function to be executed
 * @returns {function} - Schedules the given function to be called on the next tick
 */
function oncePerTick(fn) {
  var timeout = null;

  function nextTick() {
    timeout = null;
    fn();
  }

  return function scheduleNextTick() {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(nextTick);
  };
}

function promiseFromEvents(operation, eventEmitter, successEvent, failureEvent) {
  return new Promise(function (resolve, reject) {
    function onSuccess() {
      var args = [].slice.call(arguments);
      if (failureEvent) {
        eventEmitter.removeListener(failureEvent, onFailure);
      }
      resolve.apply(undefined, _toConsumableArray(args));
    }
    function onFailure() {
      var args = [].slice.call(arguments);
      eventEmitter.removeListener(successEvent, onSuccess);
      reject.apply(undefined, _toConsumableArray(args));
    }
    eventEmitter.once(successEvent, onSuccess);
    if (failureEvent) {
      eventEmitter.once(failureEvent, onFailure);
    }
    operation();
  });
}

/**
 * Traverse down multiple nodes on an object and return null if
 * any link in the path is unavailable.
 * @param {Object} obj - Object to traverse
 * @param {String} path - Path to traverse. Period-separated.
 * @returns {Any|null}
 */
function getOrNull(obj, path) {
  return path.split('.').reduce(function (output, step) {
    if (!output) {
      return null;
    }
    return output[step];
  }, obj);
}

/**
 * @typedef {object} Deferred
 * @property {Promise} promise
 * @property {function} reject
 * @property {function} resolve
 */

/**
 * Create a {@link Deferred}.
 * @returns {Deferred}
 */
function defer() {
  var deferred = {};
  deferred.promise = new Promise(function (resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

/**
 * Copy a method from a `source` prototype onto a `wrapper` prototype. Invoking
 * the method on the `wrapper` prototype will invoke the corresponding method
 * on an instance accessed by `target`.
 * @param {object} source
 * @param {object} wrapper
 * @param {string} target
 * @param {string} methodName
 * @returns {undefined}
 */
function delegateMethod(source, wrapper, target, methodName) {
  if (methodName in wrapper) {
    // Skip any methods already set.
    return;
  } else if (methodName.match(/^on[a-z]+$/)) {
    // Skip EventHandlers (these are handled in the constructor).
    return;
  }

  var type = void 0;
  try {
    type = _typeof(source[methodName]);
  } catch (error) {
    // NOTE(mroberts): Attempting to check the type of non-function members
    // on the prototype throws an error for some types.
  }

  if (type !== 'function') {
    // Skip non-function members.
    return;
  }

  /* eslint no-loop-func:0 */
  wrapper[methodName] = function () {
    var _target;

    return (_target = this[target])[methodName].apply(_target, arguments);
  };
}

/**
 * Copy methods from a `source` prototype onto a `wrapper` prototype. Invoking
 * the methods on the `wrapper` prototype will invoke the corresponding method
 * on an instance accessed by `target`.
 * @param {object} source
 * @param {object} wrapper
 * @param {string} target
 * @returns {undefined}
 */
function delegateMethods(source, wrapper, target) {
  for (var methodName in source) {
    delegateMethod(source, wrapper, target, methodName);
  }
}

/**
 * Whether the given argument is a non-array object.
 * @param {*} object
 * @return {boolean}
 */
function isNonArrayObject(object) {
  return (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' && !Array.isArray(object);
}

/**
 * For each property name on the `source` prototype, add getters and/or setters
 * to `wrapper` that proxy to `target`.
 * @param {object} source
 * @param {object} wrapper
 * @param {string} target
 * @returns {undefined}
 */
function proxyProperties(source, wrapper, target) {
  Object.getOwnPropertyNames(source).forEach(function (propertyName) {
    proxyProperty(source, wrapper, target, propertyName);
  });
}

/**
 * For the property name on the `source` prototype, add a getter and/or setter
 * to `wrapper` that proxies to `target`.
 * @param {object} source
 * @param {object} wrapper
 * @param {string} target
 * @param {string} propertyName
 * @returns {undefined}
 */
function proxyProperty(source, wrapper, target, propertyName) {
  if (propertyName in wrapper) {
    // Skip any properties already set.
    return;
  } else if (propertyName.match(/^on[a-z]+$/)) {
    Object.defineProperty(wrapper, propertyName, {
      value: null,
      writable: true
    });

    target.addEventListener(propertyName.slice(2), function () {
      wrapper.dispatchEvent.apply(wrapper, arguments);
    });

    return;
  }

  Object.defineProperty(wrapper, propertyName, {
    enumerable: true,
    get: function get() {
      return target[propertyName];
    }
  });
}

/**
 * This is a function for turning a Promise into the kind referenced in the
 * Legacy Interface Extensions section of the WebRTC spec.
 * @param {Promise<*>} promise
 * @param {function<*>} onSuccess
 * @param {function<Error>} onFailure
 * @returns {Promise<undefined>}
 */
function legacyPromise(promise, onSuccess, onFailure) {
  if (onSuccess) {
    return promise.then(function (result) {
      onSuccess(result);
    }, function (error) {
      onFailure(error);
    });
  }
  return promise;
}

/**
 * Build the {@link LogLevels} object.
 * @param {String|LogLevel} logLevel - Log level name or object
 * @returns {LogLevels}
 */
function buildLogLevels(logLevel) {
  if (typeof logLevel === 'string') {
    return {
      default: logLevel,
      media: logLevel,
      signaling: logLevel,
      webrtc: logLevel
    };
  }
  return logLevel;
}

/**
 * Get the {@link Track}'s derived class name
 * @param {Track} track
 * @param {?boolean} [local=undefined]
 * @returns {string}
 */
function trackClass(track, local) {
  local = local ? 'Local' : '';
  return local + (track.kind || '').replace(/\w{1}/, function (m) {
    return m.toUpperCase();
  }) + 'Track';
}

/**
 * Get the {@link TrackPublication}'s derived class name
 * @param {TrackPublication} publication
 * @param {?boolean} [local=undefined]
 * @returns {string}
 */
function trackPublicationClass(publication, local) {
  local = local ? 'Local' : '';
  return local + (publication.kind || '').replace(/\w{1}/, function (m) {
    return m.toUpperCase();
  }) + 'TrackPublication';
}

/**
 * Throw if the given track is not a {@link LocalAudioTrack}, a
 * {@link LocalVideoTrack} or a MediaStreamTrack.
 * @param {*} track
 * @param {object} options
 */
function validateLocalTrack(track, options) {
  if (!(track instanceof options.LocalAudioTrack || track instanceof options.LocalDataTrack || track instanceof options.LocalVideoTrack || track instanceof options.MediaStreamTrack)) {
    /* eslint new-cap:0 */
    throw constants.typeErrors.INVALID_TYPE('track', 'LocalAudioTrack, LocalVideoTrack, LocalDataTrack, or MediaStreamTrack');
  }
}

/**
 * Sets all underscore-prefixed properties on `object` non-enumerable.
 * @param {Object} object
 * @returns {void}
 */
function hidePrivateProperties(object) {
  Object.getOwnPropertyNames(object).forEach(function (name) {
    if (name.startsWith('_')) {
      hideProperty(object, name);
    }
  });
}

/**
 * Creates a new subclass which, in the constructor, sets all underscore-prefixed
 * properties and the given public properties non-enumerable. This is useful for
 * patching up classes like EventEmitter which may set properties like `_events`
 * and `domain`.
 * @param {Function} klass
 * @param {Array<string>} props
 * @returns {Function} subclass
 */
function hidePrivateAndCertainPublicPropertiesInClass(klass, props) {
  // NOTE(mroberts): We do this to avoid giving the class a name.
  return function (_klass) {
    _inherits(_class, _klass);

    function _class() {
      var _ref;

      _classCallCheck(this, _class);

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var _this = _possibleConstructorReturn(this, (_ref = _class.__proto__ || Object.getPrototypeOf(_class)).call.apply(_ref, [this].concat(args)));

      hidePrivateProperties(_this);
      hidePublicProperties(_this, props);
      return _this;
    }

    return _class;
  }(klass);
}

/**
 * Hide a property of an object.
 * @param {object} object
 * @param {string} name
 */
function hideProperty(object, name) {
  var descriptor = Object.getOwnPropertyDescriptor(object, name);
  descriptor.enumerable = false;
  Object.defineProperty(object, name, descriptor);
}

/**
 * Hide the given public properties of an object.
 * @param {object} object
 * @param {Array<string>} [props=[]]
 */
function hidePublicProperties(object) {
  var props = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  props.forEach(function (name) {
    if (object.hasOwnProperty(name)) {
      hideProperty(object, name);
    }
  });
}

/**
 * Convert an Array of values to an Array of JSON values by calling
 * `valueToJSON` on each value.
 * @param {Array<*>} array
 * @returns {Array<*>}
 */
function arrayToJSON(array) {
  return array.map(valueToJSON);
}

/**
 * Convert a Set of values to an Array of JSON values by calling `valueToJSON`
 * on each value.
 * @param {Set<*>} set
 * @returns {Array<*>}
 */
function setToJSON(set) {
  return arrayToJSON([].concat(_toConsumableArray(set)));
}

/**
 * Convert a Map from strings to values to an object of JSON values by calling
 * `valueToJSON` on each value.
 * @param {Map<string, *>} map
 * @returns {object}
 */
function mapToJSON(map) {
  return [].concat(_toConsumableArray(map.entries())).reduce(function (json, _ref2) {
    var _ref3 = _slicedToArray(_ref2, 2),
        key = _ref3[0],
        value = _ref3[1];

    return Object.assign(_defineProperty({}, key, valueToJSON(value)), json);
  }, {});
}

/**
 * Convert an object to a JSON value by calling `valueToJSON` on its enumerable
 * keys.
 * @param {object} object
 * @returns {object}
 */
function objectToJSON(object) {
  return Object.entries(object).reduce(function (json, _ref4) {
    var _ref5 = _slicedToArray(_ref4, 2),
        key = _ref5[0],
        value = _ref5[1];

    return Object.assign(_defineProperty({}, key, valueToJSON(value)), json);
  }, {});
}

/**
 * Convert a value into a JSON value.
 * @param {*} value
 * @returns {*}
 */
function valueToJSON(value) {
  if (Array.isArray(value)) {
    return arrayToJSON(value);
  } else if (value instanceof Set) {
    return setToJSON(value);
  } else if (value instanceof Map) {
    return mapToJSON(value);
  } else if (value && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
    return objectToJSON(value);
  }
  return value;
}

/**
 * Create the bandwidth profile payload included in an RSP connect message.
 * @param {BandwidthProfileOptions} bandwidthProfile
 * @returns {object}
 */
function createBandwidthProfilePayload(bandwidthProfile) {
  var payload = {};
  if (_typeof(bandwidthProfile.video) !== 'object') {
    return payload;
  }

  var mode = bandwidthProfile.video.mode;
  if (typeof mode === 'string') {
    payload.video = Object.assign({ mode: mode }, payload.video);
  }

  var maxSubscriptionBitrate = bandwidthProfile.video.maxSubscriptionBitrate;
  if (typeof maxSubscriptionBitrate === 'number') {
    payload.video = Object.assign({
      // eslint-disable-next-line
      max_subscription_bandwidth: Math.round(maxSubscriptionBitrate / 1024)
    }, payload.video);
  }

  var maxTracks = bandwidthProfile.video.maxTracks;
  if (typeof maxTracks === 'number') {
    payload.video = Object.assign({
      // eslint-disable-next-line
      max_tracks: maxTracks
    }, payload.video);
  }
  return payload;
}

/**
 * Create the Media Signaling payload included in an RSP connect message.
 * @param {boolean} dominantSpeaker - whether to enable the Dominant Speaker
 *   protocol or not
 * @param {boolean} networkQuality - whether to enable the Network Quality
 *   protocol or not
 * @param {boolean} trackSwitchOff - whether to enable the Track switch off
 *   protocol or not.
 * @returns {object}
 */
function createMediaSignalingPayload(dominantSpeaker, networkQuality, trackSwitchOff) {
  var transports = { transports: [{ type: 'data-channel' }] };
  return Object.assign(dominantSpeaker
  // eslint-disable-next-line
  ? { active_speaker: transports } : {}, networkQuality
  // eslint-disable-next-line
  ? { network_quality: transports } : {}, trackSwitchOff
  // eslint-disable-next-line
  ? { track_switch_off: transports } : {});
}

/**
 * Create the subscribe payload included in an RSP connect/update message.
 * @param {boolean} automaticSubscription - whether to subscribe to all RemoteTracks
 * @returns {object}
 */
function createSubscribePayload(automaticSubscription) {
  return {
    rules: [{
      type: automaticSubscription ? 'include' : 'exclude',
      all: true
    }],
    revision: 1
  };
}

/**
 * Add random jitter to a given value in the range [-jitter, jitter].
 * @private
 * @param {number} value
 * @param {number} jitter
 * @returns {number} value + random(-jitter, +jitter)
 */
function withJitter(value, jitter) {
  var rand = Math.random();
  return value - jitter + Math.floor(2 * jitter * rand + 0.5);
}

/**
 * Checks if the a number is in the range [min, max].
 * @private
 * @param {num} num
 * @param {number} min
 * @param {number} max
 * @return {boolean}
 */
function inRange(num, min, max) {
  return min <= num && num <= max;
}

exports.constants = constants;
exports.createBandwidthProfilePayload = createBandwidthProfilePayload;
exports.createMediaSignalingPayload = createMediaSignalingPayload;
exports.createSubscribePayload = createSubscribePayload;
exports.asLocalTrack = asLocalTrack;
exports.asLocalTrackPublication = asLocalTrackPublication;
exports.capitalize = capitalize;
exports.deprecateEvents = deprecateEvents;
exports.difference = difference;
exports.filterObject = filterObject;
exports.flatMap = flatMap;
exports.getUserAgent = getUserAgent;
exports.hidePrivateProperties = hidePrivateProperties;
exports.hidePrivateAndCertainPublicPropertiesInClass = hidePrivateAndCertainPublicPropertiesInClass;
exports.isNonArrayObject = isNonArrayObject;
exports.inRange = inRange;
exports.makeUUID = makeUUID;
exports.oncePerTick = oncePerTick;
exports.promiseFromEvents = promiseFromEvents;
exports.getOrNull = getOrNull;
exports.defer = defer;
exports.delegateMethods = delegateMethods;
exports.proxyProperties = proxyProperties;
exports.legacyPromise = legacyPromise;
exports.buildLogLevels = buildLogLevels;
exports.trackClass = trackClass;
exports.trackPublicationClass = trackPublicationClass;
exports.validateLocalTrack = validateLocalTrack;
exports.valueToJSON = valueToJSON;
exports.withJitter = withJitter;
},{"./constants":110}],113:[function(require,module,exports){
(function (global){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;

var _require = require('..'),
    getUserAgent = _require.getUserAgent;

var MAX_RECONNECT_ATTEMPTS = 5;
var RECONNECT_INTERVAL_MS = 50;
var WS_CLOSE_NORMAL = 1000;

var toplevel = global.window || global;
var WebSocket = toplevel.WebSocket ? toplevel.WebSocket : require('ws');

/**
 * Publish events to the Insights gateway.
 * @extends EventEmitter
 * @emits InsightsPublisher#connected
 * @emits InsightsPublisher#disconnected
 * @emits InsightsPublisher#reconnecting
 */

var InsightsPublisher = function (_EventEmitter) {
  _inherits(InsightsPublisher, _EventEmitter);

  /**
   * @param {string} token - Insights gateway token
   * @param {string} sdkName - Name of the SDK using the {@link InsightsPublisher}
   * @param {string} sdkVersion - Version of the SDK using the {@link InsightsPublisher}
   * @param {string} environment - One of 'dev', 'stage' or 'prod'
   * @param {string} realm - Region identifier
   * @param {InsightsPublisherOptions} options - Override default behavior
   */
  function InsightsPublisher(token, sdkName, sdkVersion, environment, realm, options) {
    _classCallCheck(this, InsightsPublisher);

    var _this = _possibleConstructorReturn(this, (InsightsPublisher.__proto__ || Object.getPrototypeOf(InsightsPublisher)).call(this));

    options = Object.assign({
      gateway: createGateway(environment, realm) + '/v1/VideoEvents',
      maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectIntervalMs: RECONNECT_INTERVAL_MS,
      userAgent: getUserAgent(),
      WebSocket: WebSocket
    }, options);

    Object.defineProperties(_this, {
      _connectTimestamp: {
        value: 0,
        writable: true
      },
      _eventQueue: {
        value: []
      },
      _reconnectAttemptsLeft: {
        value: options.maxReconnectAttempts,
        writable: true
      },
      _ws: {
        value: null,
        writable: true
      },
      _WebSocket: {
        value: options.WebSocket
      }
    });

    var self = _this;

    _this.on('disconnected', function maybeReconnect(error) {
      self._session = null;
      if (error && self._reconnectAttemptsLeft > 0) {
        self.emit('reconnecting');
        reconnect(self, token, sdkName, sdkVersion, options);
        return;
      }
      self.removeListener('disconnected', maybeReconnect);
    });

    connect(_this, token, sdkName, sdkVersion, options);
    return _this;
  }

  /**
   * Publish an event to the Insights gateway.
   * @private
   * @param {*} event
   */


  _createClass(InsightsPublisher, [{
    key: '_publish',
    value: function _publish(event) {
      event.session = this._session;
      this._ws.send(JSON.stringify(event));
    }

    /**
     * Disconnect from the Insights gateway.
     * @returns {boolean} true if called when connecting/open, false if not
     */

  }, {
    key: 'disconnect',
    value: function disconnect() {
      if (this._ws.readyState === this._WebSocket.CLOSING || this._ws.readyState === this._WebSocket.CLOSED) {
        return false;
      }

      try {
        this._ws.close();
      } catch (error) {
        // Do nothing.
      }
      this.emit('disconnected');

      return true;
    }

    /**
     * Publish (or queue, if not connected) an event to the Insights gateway.
     * @param {string} groupName - Event group name
     * @param {string} eventName - Event name
     * @param {object} payload - Event payload
     * @returns {boolean} true if queued or published, false if disconnect() called
     */

  }, {
    key: 'publish',
    value: function publish(groupName, eventName, payload) {
      if (this._ws.readyState === this._WebSocket.CLOSING || this._ws.readyState === this._WebSocket.CLOSED) {
        return false;
      }

      var publishOrEnqueue = typeof this._session === 'string' ? this._publish.bind(this) : this._eventQueue.push.bind(this._eventQueue);

      publishOrEnqueue({
        group: groupName,
        name: eventName,
        payload: payload,
        timestamp: Date.now(),
        type: 'event',
        version: 1
      });

      return true;
    }
  }]);

  return InsightsPublisher;
}(EventEmitter);

/**
 * Start connecting to the Insights gateway.
 * @private
 * @param {InsightsPublisher} publisher
 * @param {string} name
 * @param {string} token
 * @param {string} sdkName
 * @param {string} sdkVersion
 * @param {InsightsPublisherOptions} options
 */


function connect(publisher, token, sdkName, sdkVersion, options) {
  publisher._connectTimestamp = Date.now();
  publisher._reconnectAttemptsLeft--;
  publisher._ws = new options.WebSocket(options.gateway);
  var ws = publisher._ws;

  ws.addEventListener('close', function (event) {
    if (event.code === WS_CLOSE_NORMAL) {
      publisher.emit('disconnected');
      return;
    }
    publisher.emit('disconnected', new Error('WebSocket Error ' + event.code + ': ' + event.reason));
  });

  ws.addEventListener('message', function (message) {
    handleConnectResponse(publisher, JSON.parse(message.data), options);
  });

  ws.addEventListener('open', function () {
    var connectRequest = {
      type: 'connect',
      token: token,
      version: 1
    };

    connectRequest.publisher = {
      name: sdkName,
      sdkVersion: sdkVersion,
      userAgent: options.userAgent
    };

    ws.send(JSON.stringify(connectRequest));
  });
}

/**
 * Create the Insights Websocket gateway URL.
 * @param {string} environment
 * @param {string} realm
 * @returns {string}
 */
function createGateway(environment, realm) {
  return environment === 'prod' ? 'wss://sdkgw.' + realm + '.twilio.com' : 'wss://sdkgw.' + environment + '-' + realm + '.twilio.com';
}

/**
 * Handle connect response from the Insights gateway.
 * @param {InsightsPublisher} publisher
 * @param {*} response
 * @param {InsightsPublisherOptions} options
 */
function handleConnectResponse(publisher, response, options) {
  switch (response.type) {
    case 'connected':
      publisher._session = response.session;
      publisher._reconnectAttemptsLeft = options.maxReconnectAttempts;
      publisher._eventQueue.splice(0).forEach(publisher._publish, publisher);
      publisher.emit('connected');
      break;
    case 'error':
      publisher._ws.close();
      publisher.emit('disconnected', new Error(response.message));
      break;
  }
}

/**
 * Start re-connecting to the Insights gateway with an appropriate delay based
 * on InsightsPublisherOptions#reconnectIntervalMs.
 * @private
 * @param {InsightsPublisher} publisher
 * @param {string} token
 * @param {string} sdkName
 * @param {string} sdkVersion
 * @param {InsightsPublisherOptions} options
 */
function reconnect(publisher, token, sdkName, sdkVersion, options) {
  var connectInterval = Date.now() - publisher._connectTimestamp;
  var timeToWait = options.reconnectIntervalMs - connectInterval;

  if (timeToWait > 0) {
    setTimeout(function () {
      connect(publisher, token, sdkName, sdkVersion, options);
    }, timeToWait);
    return;
  }

  connect(publisher, token, sdkName, sdkVersion, options);
}

/**
 * The {@link InsightsPublisher} is connected to the gateway.
 * @event InsightsPublisher#connected
 */

/**
 * The {@link InsightsPublisher} is disconnected from the gateway.
 * @event InsightsPublisher#disconnected
 * @param {Error} [error] - Optional error if disconnected unintentionally
 */

/**
 * The {@link InsightsPublisher} is re-connecting to the gateway.
 * @event InsightsPublisher#reconnecting
 */

/**
 * {@link InsightsPublisher} options.
 * @typedef {object} InsightsPublisherOptions
 * @property {string} [gateway=sdkgw.{environment}-{realm}.twilio.com] - Insights WebSocket gateway url
 * @property {number} [maxReconnectAttempts=5] - Max re-connect attempts
 * @property {number} [reconnectIntervalMs=50] - Re-connect interval in ms
 */

module.exports = InsightsPublisher;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"..":112,"events":149,"ws":155}],114:[function(require,module,exports){
// TODO(mroberts): This should be described as implementing some
// InsightsPublisher interface.
'use strict';

/**
 * Null Insights publisher.
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var InsightsPublisher = function () {
  function InsightsPublisher() {
    _classCallCheck(this, InsightsPublisher);

    Object.defineProperties(this, {
      _connected: {
        writable: true,
        value: true
      }
    });
  }

  /**
   * Disconnect.
   * @returns {boolean}
   */


  _createClass(InsightsPublisher, [{
    key: 'disconnect',
    value: function disconnect() {
      if (this._connected) {
        this._connected = false;
        return true;
      }
      return false;
    }

    /**
     * Publish.
     * @returns {boolean}
     */

  }, {
    key: 'publish',
    value: function publish() {
      return this._connected;
    }
  }]);

  return InsightsPublisher;
}();

module.exports = InsightsPublisher;
},{}],115:[function(require,module,exports){
/* eslint new-cap:0, no-console:0 */
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var constants = require('./constants');
var DEFAULT_LOG_LEVEL = constants.DEFAULT_LOG_LEVEL;
var E = require('./constants').typeErrors;

var deprecationWarningsByComponentConstructor = void 0;

function getDeprecationWarnings(componentConstructor) {
  deprecationWarningsByComponentConstructor = deprecationWarningsByComponentConstructor || new Map();
  if (deprecationWarningsByComponentConstructor.has(componentConstructor)) {
    return deprecationWarningsByComponentConstructor.get(componentConstructor);
  }
  var deprecationWarnings = new Set();
  deprecationWarningsByComponentConstructor.set(componentConstructor, deprecationWarnings);
  return deprecationWarnings;
}

/**
 * Selectively outputs messages to console.log based on specified minimum module
 * specific log levels.
 *
 * NOTE: The values in the logLevels object passed to the constructor is changed
 *       by subsequent calls to {@link Log#setLevels}.
 */

var Log = function () {
  /**
   * Construct a new {@link Log} object.
   * @param {String} moduleName - Name of the logging module (webrtc/media/signaling)
   * @param {object} component - Component owning this instance of {@link Log}
   * @param {LogLevels} logLevels - Logging levels. See {@link LogLevels}
   */
  function Log(moduleName, component, logLevels) {
    _classCallCheck(this, Log);

    if (typeof moduleName !== 'string') {
      throw E.INVALID_TYPE('moduleName', 'string');
    }

    if (!component) {
      throw E.REQUIRED_ARGUMENT('component');
    }

    if ((typeof logLevels === 'undefined' ? 'undefined' : _typeof(logLevels)) !== 'object') {
      logLevels = {};
    }

    validateLogLevels(logLevels);

    /* istanbul ignore next */
    Object.defineProperties(this, {
      _component: {
        value: component
      },
      _logLevels: {
        value: logLevels
      },
      _warnings: {
        value: new Set()
      },
      logLevel: {
        get: function get() {
          return Log.getLevelByName(logLevels[moduleName] || DEFAULT_LOG_LEVEL);
        }
      },
      name: { get: component.toString.bind(component) }
    });
  }

  /**
   * Get the log level (number) by its name (string)
   * @param {String} name - Name of the log level
   * @returns {Number} Requested log level
   * @throws {TwilioError} INVALID_LOG_LEVEL (32056)
   * @public
   */


  _createClass(Log, [{
    key: 'createLog',


    /**
     * Create a child {@link Log} instance with this._logLevels
     * @param moduleName - Name of the logging module
     * @param component - Component owning this instance of {@link Log}
     * @returns {Log} this
     */
    value: function createLog(moduleName, component) {
      return new Log(moduleName, component, this._logLevels);
    }

    /**
     * Set new log levels.
     * This changes the levels for all its ancestors,
     * siblings, and children and descendants instances of {@link Log}.
     * @param {LogLevels} levels - New log levels
     * @throws {TwilioError} INVALID_ARGUMENT
     * @returns {Log} this
     */

  }, {
    key: 'setLevels',
    value: function setLevels(levels) {
      validateLogLevels(levels);
      Object.assign(this._logLevels, levels);
      return this;
    }

    /**
     * Log a message using the console method appropriate for the specified logLevel
     * @param {Number} logLevel - Log level of the message being logged
     * @param {String} message - Message(s) to log
     * @returns {Log} This instance of {@link Log}
     * @public
     */

  }, {
    key: 'log',
    value: function log(logLevel, message) {
      var logSpec = Log._levels[logLevel];
      // eslint-disable-next-line no-use-before-define
      if (!logSpec) {
        throw E.INVALID_VALUE('logLevel', LOG_LEVEL_VALUES);
      }

      if (this.logLevel <= logLevel) {
        var levelName = logSpec.name;
        var prefix = new Date().toISOString().split('T').concat(['|', levelName, 'in', this.name + ':']);
        logSpec.logFn.apply(console, prefix.concat(message));
      }

      return this;
    }

    /**
     * Log a debug message using console.log
     * @param {...String} messages - Message(s) to pass to console.log
     * @returns {Log} This instance of {@link Log}
     * @public
     */

  }, {
    key: 'debug',
    value: function debug() {
      return this.log(Log.DEBUG, [].slice.call(arguments));
    }

    /**
     * Log a deprecation warning. Deprecation warnings are logged as warnings and
     * they are only ever logged once.
     * @param {String} deprecationWarning - The deprecation warning
     * @returns {Log} This instance of {@link Log}
     * @public
     */

  }, {
    key: 'deprecated',
    value: function deprecated(deprecationWarning) {
      var deprecationWarnings = getDeprecationWarnings(this._component.constructor);
      if (deprecationWarnings.has(deprecationWarning)) {
        return this;
      }
      deprecationWarnings.add(deprecationWarning);
      return this.warn(deprecationWarning);
    }

    /**
     * Log an info message using console.info
     * @param {...String} messages - Message(s) to pass to console.info
     * @returns {Log} This instance of {@link Log}
     * @public
     */

  }, {
    key: 'info',
    value: function info() {
      return this.log(Log.INFO, [].slice.call(arguments));
    }

    /**
     * Log a warn message using console.warn
     * @param {...String} messages - Message(s) to pass to console.warn
     * @returns {Log} This instance of {@link Log}
     * @public
     */

  }, {
    key: 'warn',
    value: function warn() {
      return this.log(Log.WARN, [].slice.call(arguments));
    }

    /**
     * Log a warning once.
     * @param {String} warning
     * @returns {Log} This instance of {@link Log}
     * @public
     */

  }, {
    key: 'warnOnce',
    value: function warnOnce(warning) {
      if (this._warnings.has(warning)) {
        return this;
      }
      this._warnings.add(warning);
      return this.warn(warning);
    }

    /**
     * Log an error message using console.error
     * @param {...String} messages - Message(s) to pass to console.error
     * @returns {Log} This instance of {@link Log}
     * @public
     */

  }, {
    key: 'error',
    value: function error() {
      return this.log(Log.ERROR, [].slice.call(arguments));
    }

    /**
     * Log an error message using console.error and throw an exception
     * @param {TwilioError} error - Error to throw
     * @param {String} customMessage - Custom message for the error
     * @public
     */

  }, {
    key: 'throw',
    value: function _throw(error, customMessage) {
      if (error.clone) {
        error = error.clone(customMessage);
      }

      this.log(Log.ERROR, error);
      throw error;
    }
  }], [{
    key: 'getLevelByName',
    value: function getLevelByName(name) {
      if (!isNaN(name)) {
        return parseInt(name, 10);
      }
      name = name.toUpperCase();
      validateLogLevel(name);
      return Log[name];
    }
  }]);

  return Log;
}();

// Singleton Constants
/* eslint key-spacing:0 */
/* istanbul ignore next */


Object.defineProperties(Log, {
  DEBUG: { value: 0 },
  INFO: { value: 1 },
  WARN: { value: 2 },
  ERROR: { value: 3 },
  OFF: { value: 4 },
  _levels: {
    value: [{ name: 'DEBUG', logFn: console.log }, { name: 'INFO', logFn: console.info }, { name: 'WARN', logFn: console.warn }, { name: 'ERROR', logFn: console.error }, { name: 'OFF', logFn: function noop() {} }]
  }
});

var LOG_LEVELS_SET = {};
var LOG_LEVEL_VALUES = [];

var LOG_LEVEL_NAMES = Log._levels.map(function (level, i) {
  LOG_LEVELS_SET[level.name] = true;
  LOG_LEVEL_VALUES.push(i);
  return level.name;
});

function validateLogLevel(level) {
  if (!(level in LOG_LEVELS_SET)) {
    throw E.INVALID_VALUE('level', LOG_LEVEL_NAMES);
  }
}

function validateLogLevels(levels) {
  Object.keys(levels).forEach(function (moduleName) {
    validateLogLevel(levels[moduleName].toUpperCase());
  });
}

module.exports = Log;
},{"./constants":110}],116:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var difference = require('../').difference;
var flatMap = require('../').flatMap;
var setSimulcastInMediaSection = require('./simulcast');

var ptToFixedBitrateAudioCodecName = {
  0: 'PCMU',
  8: 'PCMA'
};

/**
 * A payload type
 * @typedef {number} PT
 */

/**
 * An {@link AudioCodec} or {@link VideoCodec}
 * @typedef {AudioCodec|VideoCodec} Codec
 */

// NOTE(mmalavalli): This value is derived from the IETF spec
// for JSEP, and it is used to convert a 'b=TIAS' value in bps
// to a 'b=AS' value in kbps.
// Spec: https://tools.ietf.org/html/draft-ietf-rtcweb-jsep-21#section-5.9
var RTCP_BITRATE = 16000;

/**
 * Construct a b= line string for the given max bitrate in bps. If the modifier
 * is 'AS', then the max bitrate will be converted to kbps using the formula
 * specified in the IETF spec for JSEP mentioned above.
 * @param {string} modifier - 'AS' | 'TIAS'
 * @param {?number} maxBitrate - Max outgoing bitrate (bps)
 * @returns {?string} - If "maxBitrate" is null, then returns null;
 *   otherwise return the constructed b= line string
 */
function createBLine(modifier, maxBitrate) {
  if (!maxBitrate) {
    return null;
  }
  return '\r\nb=' + modifier + ':' + (modifier === 'AS' ? Math.round((maxBitrate + RTCP_BITRATE) / 950) : maxBitrate);
}

/**
 * Create a Codec Map for the given m= section.
 * @param {string} section - The given m= section
 * @returns {Map<Codec, Array<PT>>}
 */
function createCodecMapForMediaSection(section) {
  return Array.from(createPtToCodecName(section)).reduce(function (codecMap, pair) {
    var pt = pair[0];
    var codecName = pair[1];
    var pts = codecMap.get(codecName) || [];
    return codecMap.set(codecName, pts.concat(pt));
  }, new Map());
}

/**
 * Create a Map of MIDs to m= sections for the given SDP.
 * @param {string} sdp
 * @returns {Map<string, string>}
 */
function createMidToMediaSectionMap(sdp) {
  return getMediaSections(sdp).reduce(function (midsToMediaSections, mediaSection) {
    var mid = getMidForMediaSection(mediaSection);
    return mid ? midsToMediaSections.set(mid, mediaSection) : midsToMediaSections;
  }, new Map());
}

/**
 * Create a Map from PTs to codec names for the given m= section.
 * @param {string} mediaSection - The given m= section.
 * @returns {Map<PT, Codec>} ptToCodecName
 */
function createPtToCodecName(mediaSection) {
  return getPayloadTypesInMediaSection(mediaSection).reduce(function (ptToCodecName, pt) {
    var rtpmapPattern = new RegExp('a=rtpmap:' + pt + ' ([^/]+)');
    var matches = mediaSection.match(rtpmapPattern);
    var codecName = matches ? matches[1].toLowerCase() : ptToFixedBitrateAudioCodecName[pt] ? ptToFixedBitrateAudioCodecName[pt].toLowerCase() : '';
    return ptToCodecName.set(pt, codecName);
  }, new Map());
}

/**
 * Get the associated fmtp attributes for the given Payload Type in an m= section.
 * @param {PT} pt
 * @param {string} mediaSection
 * @returns {?object}
 */
function getFmtpAttributesForPt(pt, mediaSection) {
  // In "a=fmtp:<pt> <name>=<value>[;<name>=<value>]*", the regex matches the codec
  // profile parameters expressed as name/value pairs separated by ";".
  var fmtpRegex = new RegExp('^a=fmtp:' + pt + ' (.+)$', 'm');
  var matches = mediaSection.match(fmtpRegex);
  return matches && matches[1].split(';').reduce(function (attrs, nvPair) {
    var _nvPair$split = nvPair.split('='),
        _nvPair$split2 = _slicedToArray(_nvPair$split, 2),
        name = _nvPair$split2[0],
        value = _nvPair$split2[1];

    attrs[name] = isNaN(value) ? value : parseInt(value, 10);
    return attrs;
  }, {});
}

/**
 * Get the MID for the given m= section.
 * @param {string} mediaSection
 * @return {?string}
 */
function getMidForMediaSection(mediaSection) {
  // In "a=mid:<mid>", the regex matches <mid>.
  var midMatches = mediaSection.match(/^a=mid:(.+)$/m);
  return midMatches && midMatches[1];
}

/**
 * Get the m= sections of a particular kind and direction from an sdp.
 * @param {string} sdp - SDP string
 * @param {string} [kind] - Pattern for matching kind
 * @param {string} [direction] - Pattern for matching direction
 * @returns {Array<string>} mediaSections
 */
function getMediaSections(sdp, kind, direction) {
  return sdp.replace(/\r\n\r\n$/, '\r\n').split('\r\nm=').slice(1).map(function (mediaSection) {
    return 'm=' + mediaSection;
  }).filter(function (mediaSection) {
    var kindPattern = new RegExp('m=' + (kind || '.*'), 'gm');
    var directionPattern = new RegExp('a=' + (direction || '.*'), 'gm');
    return kindPattern.test(mediaSection) && directionPattern.test(mediaSection);
  });
}

/**
 * Get the Codec Payload Types present in the first line of the given m= section
 * @param {string} section - The m= section
 * @returns {Array<PT>} Payload Types
 */
function getPayloadTypesInMediaSection(section) {
  var mLine = section.split('\r\n')[0];

  // In "m=<kind> <port> <proto> <payload_type_1> <payload_type_2> ... <payload_type_n>",
  // the regex matches <port> and the Payload Types.
  var matches = mLine.match(/([0-9]+)/g);

  // This should not happen, but in case there are no Payload Types in
  // the m= line, return an empty array.
  if (!matches) {
    return [];
  }

  // Since only the Payload Types are needed, we discard the <port>.
  return matches.slice(1).map(function (match) {
    return parseInt(match, 10);
  });
}

/**
 * Create the reordered Codec Payload Types based on the preferred Codec Names.
 * @param {Map<Codec, Array<PT>>} codecMap - Codec Map
 * @param {Array<Codec>} preferredCodecs - Preferred Codec Names
 * @returns {Array<PT>} Reordered Payload Types
 */
function getReorderedPayloadTypes(codecMap, preferredCodecs) {
  preferredCodecs = preferredCodecs.map(function (codecName) {
    return codecName.toLowerCase();
  });

  var preferredPayloadTypes = flatMap(preferredCodecs, function (codecName) {
    return codecMap.get(codecName) || [];
  });

  var remainingCodecs = difference(Array.from(codecMap.keys()), preferredCodecs);
  var remainingPayloadTypes = flatMap(remainingCodecs, function (codecName) {
    return codecMap.get(codecName);
  });

  return preferredPayloadTypes.concat(remainingPayloadTypes);
}

/**
 * Set the specified max bitrate in the given m= section.
 * @param {string} modifier - 'AS' | 'TIAS'
 * @param {?number} maxBitrate - Max outgoing bitrate (bps)
 * @param {string} section - m= section string
 * @returns {string} The updated m= section
 */
function setBitrateInMediaSection(modifier, maxBitrate, section) {
  var bLine = createBLine(modifier, maxBitrate) || '';
  var bLinePattern = /\r\nb=(AS|TIAS):([0-9]+)/;
  var bLineMatched = section.match(bLinePattern);

  if (!bLineMatched) {
    return section.replace(/(\r\n)?$/, bLine + '$1');
  }

  var maxBitrateMatched = parseInt(bLineMatched[2], 10);
  maxBitrate = maxBitrate || Infinity;
  bLine = createBLine(modifier, Math.min(maxBitrateMatched, maxBitrate));
  return section.replace(bLinePattern, bLine);
}

/**
 * Set maximum bitrates to the media sections in a given sdp.
 * @param {string} sdp - sdp string
 * @param {string} modifier - 'AS' | 'TIAS"
 * @param {?number} maxAudioBitrate - Max outgoing audio bitrate (bps), null
 *   if no limit is to be applied
 * @param {?number} maxVideoBitrate - Max outgoing video bitrate (bps), null
 *   if no limit is to be applied
 * @returns {string} - The updated sdp string
 */
function setBitrateParameters(sdp, modifier, maxAudioBitrate, maxVideoBitrate) {
  var mediaSections = getMediaSections(sdp);
  var session = sdp.split('\r\nm=')[0];
  return [session].concat(mediaSections.map(function (section) {
    // Bitrate parameters should not be applied to m=application sections
    // or to m=(audio|video) sections that do not receive media.
    if (!/^m=(audio|video)/.test(section) || !/a=(recvonly|sendrecv)/.test(section)) {
      return section;
    }
    var kind = section.match(/^m=(audio|video)/)[1];
    var maxBitrate = kind === 'audio' ? maxAudioBitrate : maxVideoBitrate;
    return setBitrateInMediaSection(modifier, maxBitrate, section);
  })).join('\r\n');
}

/**
 * Set the given Codec Payload Types in the first line of the given m= section.
 * @param {Array<PT>} payloadTypes - Payload Types
 * @param {string} section - Given m= section
 * @returns {string} - Updated m= section
 */
function setPayloadTypesInMediaSection(payloadTypes, section) {
  var lines = section.split('\r\n');
  var mLine = lines[0];
  var otherLines = lines.slice(1);
  mLine = mLine.replace(/([0-9]+\s?)+$/, payloadTypes.join(' '));
  return [mLine].concat(otherLines).join('\r\n');
}

/**
 * Return a new SDP string with the re-ordered codec preferences.
 * @param {string} sdp
 * @param {Array<AudioCodec>} preferredAudioCodecs - If empty, the existing order
 *   of audio codecs is preserved
 * @param {Array<VideoCodecSettings>} preferredVideoCodecs - If empty, the
 *   existing order of video codecs is preserved
 * @returns {string} Updated SDP string
 */
function setCodecPreferences(sdp, preferredAudioCodecs, preferredVideoCodecs) {
  var mediaSections = getMediaSections(sdp);
  var session = sdp.split('\r\nm=')[0];
  return [session].concat(mediaSections.map(function (section) {
    // Codec preferences should not be applied to m=application sections.
    if (!/^m=(audio|video)/.test(section)) {
      return section;
    }
    var kind = section.match(/^m=(audio|video)/)[1];
    var codecMap = createCodecMapForMediaSection(section);
    var preferredCodecs = kind === 'audio' ? preferredAudioCodecs : preferredVideoCodecs.map(function (codec) {
      return codec.codec;
    });
    var payloadTypes = getReorderedPayloadTypes(codecMap, preferredCodecs);
    var newSection = setPayloadTypesInMediaSection(payloadTypes, section);

    var pcmaPayloadTypes = codecMap.get('pcma') || [];
    var pcmuPayloadTypes = codecMap.get('pcmu') || [];
    var fixedBitratePayloadTypes = kind === 'audio' ? new Set(pcmaPayloadTypes.concat(pcmuPayloadTypes)) : new Set();

    return fixedBitratePayloadTypes.has(payloadTypes[0]) ? newSection.replace(/\r\nb=(AS|TIAS):([0-9]+)/g, '') : newSection;
  })).join('\r\n');
}

/**
 * Return a new SDP string with simulcast settings.
 * @param {string} sdp
 * @param {'planb' | 'unified'} sdpFormat
 * @param {Map<Track.ID, TrackAttributes>} trackIdsToAttributes
 * @returns {string} Updated SDP string
 */
function setSimulcast(sdp, sdpFormat, trackIdsToAttributes) {
  var mediaSections = getMediaSections(sdp);
  var session = sdp.split('\r\nm=')[0];
  return [session].concat(mediaSections.map(function (section) {
    section = section.replace(/\r\n$/, '');
    if (!/^m=video/.test(section)) {
      return section;
    }
    var codecMap = createCodecMapForMediaSection(section);
    var payloadTypes = getPayloadTypesInMediaSection(section);
    var vp8PayloadTypes = new Set(codecMap.get('vp8') || []);

    var hasVP8PayloadType = payloadTypes.some(function (payloadType) {
      return vp8PayloadTypes.has(payloadType);
    });
    return hasVP8PayloadType ? setSimulcastInMediaSection(section, sdpFormat, trackIdsToAttributes) : section;
  })).concat('').join('\r\n');
}

/**
 * Get the matching Payload Types in a unified plan local m= section for a particular remote codec.
 * @param {Codec} remoteCodec
 * @param {PT} remotePt
 * @param {Map<Codec, PT>} localCodecsToPts
 * @param {string} localSection
 * @param {string} remoteSection
 * @returns {Array<PT>}
 */
function unifiedPlanGetMatchingLocalPayloadTypes(remoteCodec, remotePt, localCodecsToPts, localSection, remoteSection) {
  // If there is at most one local Payload Type that matches the remote codec, retain it.
  var matchingLocalPts = localCodecsToPts.get(remoteCodec) || [];
  if (matchingLocalPts.length <= 1) {
    return matchingLocalPts;
  }

  // If there are no fmtp attributes for the codec in the remote m= section,
  // then we cannot get a match in the local m= section. In that case, retain
  // all matching local Payload Types.
  var remoteFmtpAttrs = getFmtpAttributesForPt(remotePt, remoteSection);
  if (!remoteFmtpAttrs) {
    return matchingLocalPts;
  }

  // Among the matched local Payload Types, find the one that matches the remote
  // fmtp attributes.
  var matchinglocalPt = matchingLocalPts.find(function (localPt) {
    var localFmtpAttrs = getFmtpAttributesForPt(localPt, localSection);
    return localFmtpAttrs && Object.keys(remoteFmtpAttrs).every(function (attr) {
      return remoteFmtpAttrs[attr] === localFmtpAttrs[attr];
    });
  });

  // If none of the matched local Payload Types also have matching fmtp attributes,
  // then retain all of them, otherwise retain only the local Payload Type that
  // matches the remote fmtp attributes.
  return typeof matchinglocalPt === 'number' ? [matchinglocalPt] : matchingLocalPts;
}

/**
 * Filter codecs in a local unified plan m= section based on its equivalent remote m= section.
 * @param {string} localSection
 * @param {Map<string, string>} remoteMidsToMediaSections
 * @returns {string}
 */
function unifiedPlanFilterCodecsInLocalMediaSection(localSection, remoteMidsToMediaSections) {
  // Do nothing if the local m= section represents neither audio nor video.
  if (!/^m=(audio|video)/.test(localSection)) {
    return localSection;
  }

  // Do nothing if the local m= section does not have an equivalent remote m= section.
  var localMid = getMidForMediaSection(localSection);
  var remoteSection = localMid && remoteMidsToMediaSections.get(localMid);
  if (!remoteSection) {
    return localSection;
  }

  // Construct a Map of the remote Payload Types to their codec names.
  var remotePtToCodecs = createPtToCodecName(remoteSection);
  // Construct a Map of the local codec names to their Payload Types.
  var localCodecsToPts = createCodecMapForMediaSection(localSection);
  // Maintain a list of local non-rtx Payload Types to retain.
  var localPts = flatMap(Array.from(remotePtToCodecs), function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        remotePt = _ref2[0],
        remoteCodec = _ref2[1];

    return remoteCodec !== 'rtx' ? unifiedPlanGetMatchingLocalPayloadTypes(remoteCodec, remotePt, localCodecsToPts, localSection, remoteSection) : [];
  });

  // For each local Payload Type that will be retained, retain their
  // corresponding rtx Payload Type if present.
  var localRtxPts = localCodecsToPts.get('rtx') || [];
  // In "a=fmtp:<rtxPt> apt=<apt>", extract the codec PT <apt> associated with rtxPt.
  localPts = localPts.concat(localRtxPts.filter(function (rtxPt) {
    var fmtpAttrs = getFmtpAttributesForPt(rtxPt, localSection);
    return fmtpAttrs && localPts.includes(fmtpAttrs.apt);
  }));

  // Filter out the below mentioned attribute lines in the local m= section that
  // do not belong to one of the local Payload Types that are to be retained.
  // 1. "a=rtpmap:<pt> <codec>"
  // 2. "a=rtcp-fb:<pt> <attr>[ <attr>]*"
  // 3. "a=fmtp:<pt> <name>=<value>[;<name>=<value>]*"
  var lines = localSection.split('\r\n').filter(function (line) {
    var ptMatches = line.match(/^a=(rtpmap|fmtp|rtcp-fb):(.+) .+$/);
    var pt = ptMatches && ptMatches[2];
    return !ptMatches || pt && localPts.includes(parseInt(pt, 10));
  });

  // Filter the list of Payload Types in the first line of the m= section.
  var orderedLocalPts = getPayloadTypesInMediaSection(localSection).filter(function (pt) {
    return localPts.includes(pt);
  });
  return setPayloadTypesInMediaSection(orderedLocalPts, lines.join('\r\n'));
}

/**
 * Filter local codecs based on the remote unified plan SDP.
 * @param {string} localSdp
 * @param {string} remoteSdp
 * @returns {string} - Updated local SDP
 */
function unifiedPlanFilterLocalCodecs(localSdp, remoteSdp) {
  var localMediaSections = getMediaSections(localSdp);
  var localSession = localSdp.split('\r\nm=')[0];
  var remoteMidsToMediaSections = createMidToMediaSectionMap(remoteSdp);
  return [localSession].concat(localMediaSections.map(function (localSection) {
    return unifiedPlanFilterCodecsInLocalMediaSection(localSection, remoteMidsToMediaSections);
  })).join('\r\n');
}

/**
 * Return a new SDP string after reverting simulcast for non vp8 sections in remote sdp.
 * @param localSdp - simulcast enabled local sdp
 * @param localSdpWithoutSimulcast - local sdp before simulcast was set
 * @param remoteSdp - remote sdp
 * @return {string} Updated SDP string
 */
function revertSimulcastForNonVP8MediaSections(localSdp, localSdpWithoutSimulcast, remoteSdp) {
  var remoteMidToMediaSections = createMidToMediaSectionMap(remoteSdp);
  var localMidToMediaSectionsWithoutSimulcast = createMidToMediaSectionMap(localSdpWithoutSimulcast);
  var mediaSections = getMediaSections(localSdp);
  var session = localSdp.split('\r\nm=')[0];
  return [session].concat(mediaSections.map(function (section) {
    section = section.replace(/\r\n$/, '');
    if (!/^m=video/.test(section)) {
      return section;
    }
    var midMatches = section.match(/^a=mid:(.+)$/m);
    var mid = midMatches && midMatches[1];
    if (!mid) {
      return section;
    }

    var remoteSection = remoteMidToMediaSections.get(mid);
    var remotePtToCodecs = createPtToCodecName(remoteSection);
    var remotePayloadTypes = getPayloadTypesInMediaSection(remoteSection);

    var isVP8ThePreferredCodec = remotePayloadTypes.length && remotePtToCodecs.get(remotePayloadTypes[0]) === 'vp8';
    return isVP8ThePreferredCodec ? section : localMidToMediaSectionsWithoutSimulcast.get(mid).replace(/\r\n$/, '');
  })).concat('').join('\r\n');
}

/**
 * Add or rewrite MSIDs for new m= sections in the given Unified Plan SDP with their
 * corresponding local MediaStreamTrack IDs. These can be different when previously
 * removed MediaStreamTracks are added back (or Track IDs may not be present in the
 * SDPs at all once browsers implement the latest WebRTC spec).
 * @param {string} sdp
 * @param {Map<string, Track.ID>} activeMidsToTrackIds
 * @param {Map<Track.Kind, Array<Track.ID>>} trackIdsByKind
 * @returns {string}
 */
function unifiedPlanAddOrRewriteNewTrackIds(sdp, activeMidsToTrackIds, trackIdsByKind) {
  // NOTE(mmalavalli): The m= sections for the new MediaStreamTracks are usually
  // present after the m= sections for the existing MediaStreamTracks, in order
  // of addition.
  var newMidsToTrackIds = Array.from(trackIdsByKind).reduce(function (midsToTrackIds, _ref3) {
    var _ref4 = _slicedToArray(_ref3, 2),
        kind = _ref4[0],
        trackIds = _ref4[1];

    var mediaSections = getMediaSections(sdp, kind);
    var newMids = mediaSections.map(getMidForMediaSection).filter(function (mid) {
      return !activeMidsToTrackIds.has(mid);
    });
    newMids.forEach(function (mid, i) {
      return midsToTrackIds.set(mid, trackIds[i]);
    });
    return midsToTrackIds;
  }, new Map());
  return unifiedPlanAddOrRewriteTrackIds(sdp, newMidsToTrackIds);
}

/**
 * Add or rewrite MSIDs in the given Unified Plan SDP with their corresponding local
 * MediaStreamTrack IDs. These IDs need not be the same (or Track IDs may not be
 * present in the SDPs at all once browsers implement the latest WebRTC spec).
 * @param {string} sdp
 * @param {Map<string, Track.ID>} midsToTrackIds
 * @returns {string}
 */
function unifiedPlanAddOrRewriteTrackIds(sdp, midsToTrackIds) {
  var mediaSections = getMediaSections(sdp);
  var session = sdp.split('\r\nm=')[0];
  return [session].concat(mediaSections.map(function (mediaSection) {
    // Do nothing if the m= section represents neither audio nor video.
    if (!/^m=(audio|video)/.test(mediaSection)) {
      return mediaSection;
    }
    // This shouldn't happen, but in case there is no MID for the m= section, do nothing.
    var mid = getMidForMediaSection(mediaSection);
    if (!mid) {
      return mediaSection;
    }
    // In case there is no Track ID for the given MID in the map, do nothing.
    var trackId = midsToTrackIds.get(mid);
    if (!trackId) {
      return mediaSection;
    }
    // This shouldn't happen, but in case there is no a=msid: line, do nothing.
    var attributes = (mediaSection.match(/^a=msid:(.+)$/m) || [])[1];
    if (!attributes) {
      return mediaSection;
    }
    // If the a=msid: line contains the "appdata" field, then replace it with the Track ID,
    // otherwise append the Track ID.

    var _attributes$split = attributes.split(' '),
        _attributes$split2 = _slicedToArray(_attributes$split, 2),
        msid = _attributes$split2[0],
        trackIdToRewrite = _attributes$split2[1];

    var msidRegex = new RegExp('msid:' + msid + (trackIdToRewrite ? ' ' + trackIdToRewrite : '') + '$', 'gm');
    return mediaSection.replace(msidRegex, 'msid:' + msid + ' ' + trackId);
  })).join('\r\n');
}

exports.createCodecMapForMediaSection = createCodecMapForMediaSection;
exports.createPtToCodecName = createPtToCodecName;
exports.getMediaSections = getMediaSections;
exports.revertSimulcastForNonVP8MediaSections = revertSimulcastForNonVP8MediaSections;
exports.setBitrateParameters = setBitrateParameters;
exports.setCodecPreferences = setCodecPreferences;
exports.setSimulcast = setSimulcast;
exports.unifiedPlanFilterLocalCodecs = unifiedPlanFilterLocalCodecs;
exports.unifiedPlanAddOrRewriteNewTrackIds = unifiedPlanAddOrRewriteNewTrackIds;
exports.unifiedPlanAddOrRewriteTrackIds = unifiedPlanAddOrRewriteTrackIds;
},{"../":112,"./simulcast":118}],117:[function(require,module,exports){
'use strict';

var RTCSessionDescription = require('@twilio/webrtc').RTCSessionDescription;

var createPtToCodecName = require('./').createPtToCodecName;
var getMediaSections = require('./').getMediaSections;

/**
 * An RTX payload type
 * @typedef {PT} RtxPT
 */

/**
 * A non-RTX payload type
 * @typedef {PT} NonRtxPT
 */

/**
 * A Set with at least one element
 * @typedef {Set} NonEmptySet
 */

/**
 * Apply the workaround for Issue 8329 to an RTCSessionDescriptionInit.
 * @param {RTCSessionDescriptionInit} description
 * @returns {RTCSessionDescription} newDescription
 */
function workaround(description) {
  var descriptionInit = { type: description.type };
  if (description.type !== 'rollback') {
    descriptionInit.sdp = sdpWorkaround(description.sdp);
  }
  return new RTCSessionDescription(descriptionInit);
}

/**
 * @param {string} sdp
 * @returns {string} newSdp
 */
function sdpWorkaround(sdp) {
  var mediaSections = getMediaSections(sdp);
  var session = sdp.split('\r\nm=')[0];
  return [session].concat(mediaSections.map(mediaSectionWorkaround)).join('\r\n');
}

/**
 * @param {string} mediaSection
 * @returns {string} newMediaSection
 */
function mediaSectionWorkaround(mediaSection) {
  var ptToCodecName = createPtToCodecName(mediaSection);
  mediaSection = deleteDuplicateRtxPts(mediaSection, ptToCodecName);
  var codecNameToPts = createCodecNameToPts(ptToCodecName);
  var rtxPts = codecNameToPts.get('rtx') || new Set();

  var invalidRtxPts = new Set();
  var rtxPtToAssociatedPt = createRtxPtToAssociatedPt(mediaSection, ptToCodecName, rtxPts, invalidRtxPts);
  var associatedPtToRtxPt = createAssociatedPtToRtxPt(rtxPtToAssociatedPt, invalidRtxPts);

  var unassociatedRtxPts = Array.from(invalidRtxPts);

  // NOTE(mroberts): We normalize to lowercase.
  var knownCodecNames = ['h264', 'vp8', 'vp9'];
  var unassociatedPts = knownCodecNames.reduce(function (unassociatedPts, codecName) {
    var pts = codecNameToPts.get(codecName) || new Set();
    return Array.from(pts).reduce(function (unassociatedPts, pt) {
      return associatedPtToRtxPt.has(pt) ? unassociatedPts : unassociatedPts.add(pt);
    }, unassociatedPts);
  }, new Set());

  unassociatedPts.forEach(function (pt) {
    if (unassociatedRtxPts.length) {
      var rtxPt = unassociatedRtxPts.shift();
      mediaSection = deleteFmtpAttributesForRtxPt(mediaSection, rtxPt);
      mediaSection = addFmtpAttributeForRtxPt(mediaSection, rtxPt, pt);
    }
  });

  unassociatedRtxPts.forEach(function (rtxPt) {
    mediaSection = deleteFmtpAttributesForRtxPt(mediaSection, rtxPt);
    mediaSection = deleteRtpmapAttributesForRtxPt(mediaSection, rtxPt);
  });

  return mediaSection;
}

/**
 * @param {string} mediaSection
 * @param {Map<PT, Codec>} ptToCodecName
 * @returns {string} newMediaSection
 */
function deleteDuplicateRtxPts(mediaSection, ptToCodecName) {
  // NOTE(syerrapragada): In some cases Chrome produces an offer/answer
  // with duplicate "rtx" payload mapping in media section. When applied,
  // Chrome rejects the SDP. We workaround this by deleting duplicate
  // "rtx" mappings found in SDP.
  return Array.from(ptToCodecName.keys()).reduce(function (section, pt) {
    var rtpmapRegex = new RegExp('^a=rtpmap:' + pt + ' rtx.+$', 'gm');
    return (section.match(rtpmapRegex) || []).slice(ptToCodecName.get(pt) === 'rtx' ? 1 : 0).reduce(function (section, rtpmap) {
      var rtpmapRegex = new RegExp('\r\n' + rtpmap);
      var fmtpmapRegex = new RegExp('\r\na=fmtp:' + pt + ' apt=[0-9]+');
      return section.replace(rtpmapRegex, '').replace(fmtpmapRegex, '');
    }, section);
  }, mediaSection);
}

/**
 * @param {Map<PT, Codec>} ptToCodecName
 * @returns {Map<string, NonEmptySet<PT>>} codecNameToPts
 */
function createCodecNameToPts(ptToCodecName) {
  var codecNameToPts = new Map();
  ptToCodecName.forEach(function (codecName, pt) {
    var pts = codecNameToPts.get(codecName) || new Set();
    return codecNameToPts.set(codecName, pts.add(pt));
  });
  return codecNameToPts;
}

/**
 * @param {string} mediaSection
 * @param {Map<PT, Codec>} ptToCodecName
 * @param {Set<RtxPT>} rtxPts
 * @param {Set<RtxPT>} invalidRtxPts
 * @returns {Map<RtxPT, NonRtxPT>} rtxPtToAssociatedPt
 */
function createRtxPtToAssociatedPt(mediaSection, ptToCodecName, rtxPts, invalidRtxPts) {
  return Array.from(rtxPts).reduce(function (rtxPtToAssociatedPt, rtxPt) {
    var fmtpPattern = new RegExp('a=fmtp:' + rtxPt + ' apt=(\\d+)');
    var matches = mediaSection.match(fmtpPattern);
    if (!matches) {
      invalidRtxPts.add(rtxPt);
      return rtxPtToAssociatedPt;
    }

    var pt = Number.parseInt(matches[1]);
    if (!ptToCodecName.has(pt)) {
      // This is Issue 8329.
      invalidRtxPts.add(rtxPt);
      return rtxPtToAssociatedPt;
    }

    var codecName = ptToCodecName.get(pt);
    if (codecName === 'rtx') {
      // Strange
      invalidRtxPts.add(rtxPt);
      return rtxPtToAssociatedPt;
    }

    return rtxPtToAssociatedPt.set(rtxPt, pt);
  }, new Map());
}

/**
 * @param {string} mediaSection
 * @param {Map<RtxPT, NonRtxPT>} rtxPtToAssociatedPt
 * @param {Set<RtxPT>} invalidRtxPts
 * @returns {Map<NonRtxPT, RtxPT>} associatedPtToRtxPt
 */
function createAssociatedPtToRtxPt(rtxPtToAssociatedPt, invalidRtxPts) {
  // First, we construct a Map<NonRtxPT, NonEmptySet<RtxPT>>.
  var associatedPtToRtxPts = Array.from(rtxPtToAssociatedPt).reduce(function (associatedPtToRtxPts, pair) {
    var rtxPt = pair[0];
    var pt = pair[1];
    var rtxPts = associatedPtToRtxPts.get(pt) || new Set();
    return associatedPtToRtxPts.set(pt, rtxPts.add(rtxPt));
  }, new Map());

  // Then, we filter down to a Map<NonRtxPT, RtxPt>. Any RtxPTs that map to the
  // same NonRtxPT are removed and added to invalidRtxPts.
  return Array.from(associatedPtToRtxPts).reduce(function (associatedPtToRtxPt, pair) {
    var pt = pair[0];
    var rtxPts = Array.from(pair[1]);
    if (rtxPts.length > 1) {
      rtxPts.forEach(function (rtxPt) {
        invalidRtxPts.add(rtxPt);
      });
      return associatedPtToRtxPt;
    }
    return associatedPtToRtxPt.set(pt, rtxPts[0]);
  }, new Map());
}

/**
 * @param {string} mediaSection
 * @param {RtxPT} rtxPt
 * @returns {string} newMediaSection
 */
function deleteFmtpAttributesForRtxPt(mediaSection, rtxPt) {
  var pattern = new RegExp('a=fmtp:' + rtxPt + '.*\r\n', 'gm');
  return mediaSection.replace(pattern, '');
}

/**
 * @param {string} mediaSection
 * @param {RtxPT} rtxPt
 * @returns {string} newMediaSection
 */
function deleteRtpmapAttributesForRtxPt(mediaSection, rtxPt) {
  var pattern = new RegExp('a=rtpmap:' + rtxPt + '.*\r\n', 'gm');
  return mediaSection.replace(pattern, '');
}

/**
 * @param {string} mediaSection
 * @param {RtxPT} rtxPt
 * @param {NonRtxPT} pt
 * @returns {string} newMediaSection
 */
function addFmtpAttributeForRtxPt(mediaSection, rtxPt, pt) {
  return mediaSection.endsWith('\r\n') ? mediaSection + 'a=fmtp:' + rtxPt + ' apt=' + pt + '\r\n' : mediaSection + '\r\na=fmtp:' + rtxPt + ' apt=' + pt;
}

module.exports = workaround;
},{"./":116,"@twilio/webrtc":132}],118:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var difference = require('../').difference;
var flatMap = require('../').flatMap;

/**
 * Create a random {@link SSRC}.
 * @returns {SSRC}
 */
function createSSRC() {
  var ssrcMax = 0xffffffff;
  return String(Math.floor(Math.random() * ssrcMax));
}

/**
 * @property {string} cName
 * @property {boolean} isSimulcastEnabled
 * @property {Map<RtxSSRC, PrimarySSRC>} rtxPairs
 * @property {Set<PrimarySSRC>} primarySSRCs
 * @property {string} streamId
 * @property {Track.ID} trackId
 */

var TrackAttributes = function () {
  /**
   * Construct a {@link MediaStreamTrack} attribute store.
   * @param {Track.ID} trackId - The MediaStreamTrack ID
   * @param {MediaStreamID} streamId - The MediaStream ID
   * @param {string} cName - The MediaStream cname
   */
  function TrackAttributes(trackId, streamId, cName) {
    _classCallCheck(this, TrackAttributes);

    Object.defineProperties(this, {
      cName: {
        enumerable: true,
        value: cName
      },
      isSimulcastEnabled: {
        enumerable: true,
        value: false,
        writable: true
      },
      primarySSRCs: {
        enumerable: true,
        value: new Set()
      },
      rtxPairs: {
        enumerable: true,
        value: new Map()
      },
      streamId: {
        enumerable: true,
        value: streamId
      },
      trackId: {
        enumerable: true,
        value: trackId
      }
    });
  }

  /**
   * Add {@link SimSSRC}s to the {@link TrackAttributes}.
   * @returns {void}
   */


  _createClass(TrackAttributes, [{
    key: 'addSimulcastSSRCs',
    value: function addSimulcastSSRCs() {
      if (this.isSimulcastEnabled) {
        return;
      }
      var simulcastSSRCs = [createSSRC(), createSSRC()];
      simulcastSSRCs.forEach(function (ssrc) {
        this.primarySSRCs.add(ssrc);
      }, this);

      if (this.rtxPairs.size) {
        simulcastSSRCs.forEach(function (ssrc) {
          this.rtxPairs.set(createSSRC(), ssrc);
        }, this);
      }
    }

    /**
     * Add the given {@link PrimarySSRC} or {@link RtxSSRC} to the {@link TrackAttributes}
     * and update the "isSimulcastEnabled" flag if it is also a {@link SimSSRC}.
     * @param {SSRC} ssrc - The {@link SSRC} to be added
     * @param {?PrimarySSRC} primarySSRC - The {@link PrimarySSRC}; if the given
     *   {@link SSRC} itself is the {@link PrimarySSRC}, then this is set to null
     * @param {boolean} isSimSSRC - true if the given {@link SSRC} is a
     *   {@link SimSSRC}; false otherwise
     * @returns {void}
     */

  }, {
    key: 'addSSRC',
    value: function addSSRC(ssrc, primarySSRC, isSimSSRC) {
      if (primarySSRC) {
        this.rtxPairs.set(ssrc, primarySSRC);
      } else {
        this.primarySSRCs.add(ssrc);
      }
      this.isSimulcastEnabled = this.isSimulcastEnabled || isSimSSRC;
    }

    /**
     * Construct the SDP lines for the {@link TrackAttributes}.
     * @param {boolean} [excludeRtx=false]
     * @returns {Array<string>} Array of SDP lines
     */

  }, {
    key: 'toSdpLines',
    value: function toSdpLines(excludeRtx) {
      var _this = this;

      var rtxPairs = excludeRtx ? [] : Array.from(this.rtxPairs.entries()).map(function (rtxPair) {
        return rtxPair.reverse();
      });

      var simSSRCs = Array.from(this.primarySSRCs.values());
      var ssrcs = rtxPairs.length ? flatMap(rtxPairs) : simSSRCs;

      var attrLines = flatMap(ssrcs, function (ssrc) {
        return ['a=ssrc:' + ssrc + ' cname:' + _this.cName, 'a=ssrc:' + ssrc + ' msid:' + _this.streamId + ' ' + _this.trackId];
      });
      var rtxPairLines = rtxPairs.map(function (rtxPair) {
        return 'a=ssrc-group:FID ' + rtxPair.join(' ');
      });
      var simGroupLines = ['a=ssrc-group:SIM ' + simSSRCs.join(' ')];

      return rtxPairLines.concat(attrLines).concat(simGroupLines);
    }
  }]);

  return TrackAttributes;
}();

/**
 * Get the matches for a given RegEx pattern.
 * @param {string} section - SDP media section
 * @param {string} pattern - RegEx pattern
 * @returns {Array<Array<string>>} - Array of pattern matches
 */


function getMatches(section, pattern) {
  var matches = section.match(new RegExp(pattern, 'gm')) || [];
  return matches.map(function (match) {
    var matches = match.match(new RegExp(pattern)) || [];
    return matches.slice(1);
  });
}

/**
 * Get the {@link SimSSRC}s that belong to a simulcast group.
 * @param {string} section - SDP media section
 * @returns {Set<SimSSRC>} Set of simulcast {@link SSRC}s
 */
function getSimulcastSSRCs(section) {
  var simGroupPattern = '^a=ssrc-group:SIM ([0-9]+) ([0-9]+) ([0-9]+)$';
  return new Set(flatMap(getMatches(section, simGroupPattern)));
}

/**
 * Get the value of the given attribute for an SSRC.
 * @param {string} section - SDP media section
 * @param {SSRC} ssrc - {@link SSRC} whose attribute's value is to be determinded
 * @param {string} attribute - {@link SSRC} attribute name
 * @param {string} - {@link SSRC} attribute value
 */
function getSSRCAttribute(section, ssrc, attribute) {
  var pattern = 'a=ssrc:' + ssrc + ' ' + attribute + ':(.+)';
  return section.match(new RegExp(pattern))[1];
}

/**
 * Create a Map of {@link PrimarySSRC}s and their {@link RtxSSRC}s.
 * @param {string} section - SDP media section
 * @returns {Map<RtxSSRC, PrimarySSRC>} - Map of {@link RtxSSRC}s and their
 *   corresponding {@link PrimarySSRC}s
 */
function getSSRCRtxPairs(section) {
  var rtxPairPattern = '^a=ssrc-group:FID ([0-9]+) ([0-9]+)$';
  return new Map(getMatches(section, rtxPairPattern).map(function (pair) {
    return pair.reverse();
  }));
}

/**
 * Create SSRC attribute tuples.
 * @param {string} section
 * @param {'planb' | 'unified'} sdpFormat
 * @returns {Array<[SSRC, MediaStreamID, Track.ID]>}
 */
function createSSRCAttributeTuples(section, sdpFormat) {
  return {
    planb: createPlanBSSRCAttributeTuples,
    unified: createUnifiedPlanSSRCAttributeTuples
  }[sdpFormat](section);
}

/**
 * Create "plan-b" SSRC attribute tuples.
 * @param {string} section
 * @returns {Array<[SSRC, MediaStreamID, Track.ID]>}
 */
function createPlanBSSRCAttributeTuples(section) {
  return getMatches(section, '^a=ssrc:([0-9]+) msid:([^\\s]+) ([^\\s]+)$');
}

/**
 * Create "unified-plan" SSRC attribute tuples.
 * @param {string} section
 * @returns {Array<[SSRC, MediaStreamID, Track.ID]>}
 */
function createUnifiedPlanSSRCAttributeTuples(section) {
  var _flatMap = flatMap(getMatches(section, '^a=msid:(.+) (.+)$')),
      _flatMap2 = _slicedToArray(_flatMap, 2),
      streamId = _flatMap2[0],
      trackId = _flatMap2[1];

  var ssrcs = flatMap(getMatches(section, '^a=ssrc:(.+) cname:.+$'));
  return ssrcs.map(function (ssrc) {
    return [ssrc, streamId, trackId];
  });
}

/**
 * Create a Map of MediaStreamTrack IDs and their {@link TrackAttributes}.
 * @param {string} section - SDP media section
 * @param {'planb' | 'unified'} sdpFormat
 * @returns {Map<Track.ID, TrackAttributes>}
 */
function createTrackIdsToAttributes(section, sdpFormat) {
  var simSSRCs = getSimulcastSSRCs(section);
  var rtxPairs = getSSRCRtxPairs(section);
  var ssrcAttrTuples = createSSRCAttributeTuples(section, sdpFormat);

  return ssrcAttrTuples.reduce(function (trackIdsToSSRCs, tuple) {
    var ssrc = tuple[0];
    var streamId = tuple[1];
    var trackId = tuple[2];

    var trackAttributes = trackIdsToSSRCs.get(trackId) || new TrackAttributes(trackId, streamId, getSSRCAttribute(section, ssrc, 'cname'));

    var primarySSRC = rtxPairs.get(ssrc) || null;
    trackAttributes.addSSRC(ssrc, primarySSRC, simSSRCs.has(ssrc));
    return trackIdsToSSRCs.set(trackId, trackAttributes);
  }, new Map());
}

/**
 * Apply simulcast settings to the given SDP media section.
 * @param {string} section - SDP media section
 * @param {'planb' | 'unified'} sdpFormat
 * @param {Map<Track.ID, TrackAttributes>} trackIdsToAttributes - Existing
 *   map which will be updated for new MediaStreamTrack IDs
 * @returns {string} - The transformed SDP media section
 */
function setSimulcastInMediaSection(section, sdpFormat, trackIdsToAttributes) {
  var newTrackIdsToAttributes = createTrackIdsToAttributes(section, sdpFormat);
  var newTrackIds = Array.from(newTrackIdsToAttributes.keys());
  var trackIds = Array.from(trackIdsToAttributes.keys());
  var trackIdsToAdd = difference(newTrackIds, trackIds);
  var trackIdsToIgnore = difference(trackIds, newTrackIds);

  // Update "trackIdsToAttributes" with TrackAttributes for new
  // MediaStreamTrack IDs.
  var trackAttributesToAdd = flatMap(trackIdsToAdd, function (trackId) {
    return newTrackIdsToAttributes.get(trackId);
  });
  trackAttributesToAdd.forEach(function (trackAttributes) {
    trackAttributes.addSimulcastSSRCs();
    trackIdsToAttributes.set(trackAttributes.trackId, trackAttributes);
  });

  // Get the SDP lines of the relevant MediaStreamTrack IDs from
  // "trackIdsToAttributes".
  trackIds = Array.from(trackIdsToAttributes.keys());
  var relevantTrackIds = difference(trackIds, trackIdsToIgnore);
  var relevantTrackAttributes = flatMap(relevantTrackIds, function (trackId) {
    return trackIdsToAttributes.get(trackId);
  });
  var excludeRtx = !section.match(/a=rtpmap:[0-9]+ rtx/);
  var relevantSdpLines = flatMap(relevantTrackAttributes, function (trackAttributes) {
    return trackAttributes.toSdpLines(excludeRtx);
  });

  // Add the simulcast SSRC SDP lines to the media section. The Set ensures
  // that the duplicates of the SSRC SDP lines that are in both "section" and
  // "relevantSdpLines" are removed.
  var sectionLines = flatMap(new Set(section.split('\r\n').concat(relevantSdpLines)));

  var xGoogleFlagConference = 'a=x-google-flag:conference';
  if (!section.match(xGoogleFlagConference)) {
    sectionLines.push(xGoogleFlagConference);
  }

  return sectionLines.join('\r\n');
}

/**
 * String representing a MediaStream ID.
 * @typedef {string} MediaStreamID
 */

/**
 * String representing the SSRC of a MediaStreamTrack.
 * @typedef {string} SSRC
 */

/**
 * Primary SSRC.
 * @typedef {SSRC} PrimarySSRC
 */

/**
 * Retransmission SSRC.
 * @typedef {SSRC} RtxSSRC
 */

/**
 * Simulcast SSRC.
 * @typedef {SSRC} SimSSRC
 */

module.exports = setSimulcastInMediaSection;
},{"../":112}],119:[function(require,module,exports){
'use strict';

/**
 * An {@link IdentityTrackMatcher} matches RTCTrackEvents with their respective
 * MediaStreamTrack IDs.
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var IdentityTrackMatcher = function () {
  function IdentityTrackMatcher() {
    _classCallCheck(this, IdentityTrackMatcher);
  }

  _createClass(IdentityTrackMatcher, [{
    key: 'match',

    /**
     * Match a given MediaStreamTrack with its ID.
     * @param {RTCTrackEvent} event
     * @returns {Track.ID}
     */
    value: function match(event) {
      return event.track.id;
    }

    /**
     * Update the {@link IdentityTrackMatcher} with a new SDP.
     * @param {string} sdp
     */

  }, {
    key: 'update',
    value: function update() {}
  }]);

  return IdentityTrackMatcher;
}();

module.exports = IdentityTrackMatcher;
},{}],120:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var getMediaSections = require('../').getMediaSections;

/**
 * An {@link MIDTrackMatcher} matches an RTCTrackEvent with a MediaStreamTrack
 * ID based on the MID of the underlying RTCRtpTransceiver.
 */

var MIDTrackMatcher = function () {
  /**
   * Construct an {@link MIDTrackMatcher}.
   */
  function MIDTrackMatcher() {
    _classCallCheck(this, MIDTrackMatcher);

    Object.defineProperties(this, {
      _midsToTrackIds: {
        value: new Map(),
        writable: true
      }
    });
  }

  /**
   * Match a given MediaStreamTrack with its ID.
   * @param {RTCTrackEvent} event
   * @returns {?Track.ID}
   */


  _createClass(MIDTrackMatcher, [{
    key: 'match',
    value: function match(event) {
      return this._midsToTrackIds.get(event.transceiver.mid) || null;
    }

    /**
     * Update the {@link MIDTrackMatcher} with a new SDP.
     * @param {string} sdp
     */

  }, {
    key: 'update',
    value: function update(sdp) {
      var sections = getMediaSections(sdp, '(audio|video)');
      this._midsToTrackIds = sections.reduce(function (midsToTrackIds, section) {
        var midMatches = section.match(/^a=mid:(.+)$/m) || [];
        var trackIdMatches = section.match(/^a=msid:.+ (.+)$/m) || [];
        var mid = midMatches[1];
        var trackId = trackIdMatches[1];
        return mid && trackId ? midsToTrackIds.set(mid, trackId) : midsToTrackIds;
      }, this._midsToTrackIds);
    }
  }]);

  return MIDTrackMatcher;
}();

module.exports = MIDTrackMatcher;
},{"../":116}],121:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var util = require('../../');
var getMediaSections = require('../').getMediaSections;

// NOTE(mroberts): OrderedTrackMatcher is meant to solve the problem identified in
//
//   https://bugs.webkit.org/show_bug.cgi?id=174519
//
// Namely that, without MIDs, we cannot "correctly" identify MediaStreamTracks
// in Safari's current WebRTC implementation. So, this module tries to hack
// around this by making a possibly dangerous assumption: "track" events will
// be raised for MediaStreamTracks of a particular kind in the same order that
// those kinds' MSIDs appear in the SDP. By calling `update` with an
// RTCPeerConnection's `remoteDescription` and then invoking `match`, we ought
// to be able to dequeue MediaStreamTrack IDs in the correct order to be
// assigned to "track" events.

/**
 * @interface MatchedAndUnmatched
 * @property {Set<Track.ID>} matched
 * @property {Set<Track.ID>} unmatched
 */

/**
 * Create a new instance of {@link MatchedAndUnmatched}.
 * @returns {MatchedAndUnmatched}
 */
function create() {
  return {
    matched: new Set(),
    unmatched: new Set()
  };
}

/**
 * Attempt to match a MediaStreamTrack ID.
 * @param {MatchedAndUnmatched} mAndM
 * @returns {?Track.ID} id
 */
function _match(mAndM) {
  var unmatched = Array.from(mAndM.unmatched);
  if (!unmatched.length) {
    return null;
  }
  var id = unmatched[0];
  mAndM.matched.add(id);
  mAndM.unmatched.delete(id);
  return id;
}

/**
 * Update a {@link MatchedAndUnmatched}'s MediaStreamTrack IDs.
 * @param {MatchedAndUnmatched} mAndM
 * @param {Set<Track.ID>} ids
 * @returns {void}
 */
function _update(mAndM, ids) {
  ids = new Set(ids);
  var removedMatchedIds = util.difference(mAndM.matched, ids);
  removedMatchedIds.forEach(mAndM.matched.delete, mAndM.matched);
  mAndM.unmatched = util.difference(ids, mAndM.matched);
}

/**
 * Parse MediaStreamTrack IDs of a particular kind from an SDP.
 * @param {string} kind
 * @param {string} sdp
 * @returns {Set<Track.ID>} ids
 */
function parse(kind, sdp) {
  var mediaSections = getMediaSections(sdp, kind);
  var pattern = 'msid: ?(.+) +(.+) ?$';
  return new Set(util.flatMap(mediaSections, function (mediaSection) {
    return mediaSection.match(new RegExp(pattern, 'mg')) || [];
  }).map(function (msid) {
    return msid.match(new RegExp(pattern))[2];
  }));
}

/**
 * A {@link OrderedTrackMatcher} is used to match RTCTrackEvents.
 * @property {MatchedAndUnmatched} audio
 * @property {MatchedAndUnmatched} video
 */

var OrderedTrackMatcher = function () {
  function OrderedTrackMatcher() {
    _classCallCheck(this, OrderedTrackMatcher);

    if (!(this instanceof OrderedTrackMatcher)) {
      return new OrderedTrackMatcher();
    }
    Object.defineProperties(this, {
      audio: {
        enumerable: true,
        value: create()
      },
      video: {
        enumerable: true,
        value: create()
      }
    });
  }

  /**
   * Attempt to match a new MediaStreamTrack ID.
   * @param {RTCTrackEvent} event
   * @returns {?Track.ID} id
   */


  _createClass(OrderedTrackMatcher, [{
    key: 'match',
    value: function match(event) {
      return _match(this[event.track.kind]);
    }

    /**
     * Update the {@link OrderedTrackMatcher} with a new SDP.
     * @param {string} sdp
     * @returns {void}
     */

  }, {
    key: 'update',
    value: function update(sdp) {
      ['audio', 'video'].forEach(function (kind) {
        _update(this[kind], parse(kind, sdp));
      }, this);
    }
  }]);

  return OrderedTrackMatcher;
}();

module.exports = OrderedTrackMatcher;
},{"../":116,"../../":112}],122:[function(require,module,exports){
/* globals RTCPeerConnection, webkitRTCPeerConnection, mozRTCPeerConnection, navigator */
'use strict';

var _require = require('@twilio/webrtc/lib/util'),
    guessBrowser = _require.guessBrowser;

/**
 * Check whether PeerConnection API is supported.
 * @returns {boolean}
 */


function isRTCPeerConnectionSupported() {
  return typeof RTCPeerConnection !== 'undefined' || typeof webkitRTCPeerConnection !== 'undefined' || typeof mozRTCPeerConnection !== 'undefined';
}

/**
 * Check whether GetUserMedia API is supported.
 * @returns {boolean}
 */
function isGetUserMediaSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || !!navigator.getUserMedia || !!navigator.webkitGetUserMedia || !!navigator.mozGetUserMedia;
}

/**
 * Check if the current environment is supported by the SDK.
 * @returns {boolean}
 */
function isSupported() {
  return !!guessBrowser() && isGetUserMediaSupported() && isRTCPeerConnectionSupported();
}

module.exports = isSupported;
},{"@twilio/webrtc/lib/util":145}],123:[function(require,module,exports){
'use strict';

/**
 * A {@link Timeout} represents a resettable and clearable timeout.
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Timeout = function () {
  /**
   * Construct a {@link Timeout}.
   * @param {function} fn - Function to call
   * @param {number} delay - Delay in milliseconds
   */
  function Timeout(fn, delay) {
    _classCallCheck(this, Timeout);

    Object.defineProperties(this, {
      _delay: {
        value: delay
      },
      _fn: {
        value: fn
      },
      _timeout: {
        value: null,
        writable: true
      }
    });

    this._start();
  }

  /**
   * Start the {@link Timeout}.
   * @private
   */


  _createClass(Timeout, [{
    key: '_start',
    value: function _start() {
      this._timeout = setTimeout(this._fn, this._delay);
    }

    /**
     * Whether the {@link Timeout} is set.
     * @property {boolean}
     */

  }, {
    key: 'clear',


    /**
     * Clear the {@link Timeout}.
     * @returns {void}
     */
    value: function clear() {
      clearTimeout(this._timeout);
      this._timeout = null;
    }

    /**
     * Reset the {@link Timeout}.
     * @returns {void}
     */

  }, {
    key: 'reset',
    value: function reset() {
      clearTimeout(this._timeout);
      this._start();
    }
  }, {
    key: 'isSet',
    get: function get() {
      return !!this._timeout;
    }
  }]);

  return Timeout;
}();

module.exports = Timeout;
},{}],124:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;
var util = require('./');

/**
 * A Promise that can time out.
 * @extends EventEmitter
 * @implements Promise
 * @property {?number} timeout - the timeout, in milliseconds
 * @property {boolean} isTimedOut - whether or not the
 *   {@link TimeoutPromise} timed out
 * @emits TimeoutPromise#timedOut
 */

var TimeoutPromise = function (_EventEmitter) {
  _inherits(TimeoutPromise, _EventEmitter);

  /**
   * Construct a new {@link TimeoutPromise}.
   * @param {Promise} original - a Promise
   * @param {?number} [timeout] - the timeout, in milliseconds; providing this in
   *   the constructor invokes {@link TimeoutPromise#start} (otherwise, you must
   *   call {@link TimeoutPromise#start} yourself)
   */
  function TimeoutPromise(original, initialTimeout) {
    _classCallCheck(this, TimeoutPromise);

    var _this = _possibleConstructorReturn(this, (TimeoutPromise.__proto__ || Object.getPrototypeOf(TimeoutPromise)).call(this));

    var deferred = util.defer();
    var isTimedOut = false;
    var timedOut = new Error('Timed out');
    var timeout = null;
    var timer = null;

    /* istanbul ignore next */
    Object.defineProperties(_this, {
      _deferred: {
        value: deferred
      },
      _isTimedOut: {
        get: function get() {
          return isTimedOut;
        },
        set: function set(_isTimedOut) {
          isTimedOut = _isTimedOut;
        }
      },
      _timedOut: {
        value: timedOut
      },
      _timeout: {
        get: function get() {
          return timeout;
        },
        set: function set(_timeout) {
          timeout = _timeout;
        }
      },
      _timer: {
        get: function get() {
          return timer;
        },
        set: function set(_timer) {
          timer = _timer;
        }
      },
      _promise: {
        value: deferred.promise
      },
      isTimedOut: {
        enumerable: true,
        get: function get() {
          return isTimedOut;
        }
      },
      timeout: {
        enumerable: true,
        get: function get() {
          return timeout;
        }
      }
    });

    original.then(function (result) {
      clearTimeout(_this._timer);
      deferred.resolve(result);
    }, function (reason) {
      clearTimeout(_this._timer);
      deferred.reject(reason);
    });

    if (initialTimeout) {
      _this.start(initialTimeout);
    }
    return _this;
  }

  _createClass(TimeoutPromise, [{
    key: 'catch',
    value: function _catch() {
      var _promise;

      return (_promise = this._promise).catch.apply(_promise, arguments);
    }

    /**
     * Start the timer that will time out the {@link TimeoutPromise} if the
     * original Promise has neither resolved nor rejected. Subsequent calls have no
     * effect once the {@link TimeoutPromise} is started.
     * @param {number} timeout - the timeout, in milliseconds
     * @returns {this}
     */

  }, {
    key: 'start',
    value: function start(timeout) {
      var _this2 = this;

      if (this._timer) {
        return this;
      }
      this._timeout = timeout;
      this._timer = setTimeout(function () {
        if (_this2._timer) {
          _this2._isTimedOut = true;
          _this2.emit('timedOut', _this2);
          _this2._deferred.reject(_this2._timedOut);
        }
      }, this.timeout);
      return this;
    }
  }, {
    key: 'then',
    value: function then() {
      var _promise2;

      return (_promise2 = this._promise).then.apply(_promise2, arguments);
    }
  }]);

  return TimeoutPromise;
}(EventEmitter);

/**
 * The {@link TimeoutPromise} timed out.
 * @param {TimeoutPromise} promise - The {@link TimeoutPromise}
 * @event TimeoutPromise#timedOut
 */

module.exports = TimeoutPromise;
},{"./":112,"events":149}],125:[function(require,module,exports){
'use strict';

// NOTE: Do not edit this file. This code is auto-generated. Contact the
// Twilio SDK Team for more information.

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TwilioError = require('./twilioerror');
var TwilioErrorByCode = {};

/**
 * Create a {@link TwilioError} for a given code and message.
 * @private
 * @param {number} [code] - Error code
 * @param {string} [message] - Error message
 * @returns {TwilioError}
 */
exports.createTwilioError = function createTwilioError(code, message) {
  code = typeof code === 'number' ? code : 0;
  message = typeof message === 'string' && message ? message : 'Unknown error';
  return TwilioErrorByCode[code] ? new TwilioErrorByCode[code]() : new TwilioError(code, message);
};

/**
 * @class AccessTokenInvalidError
 * @classdesc Raised whenever the AccessToken used for connecting to Room is invalid.
 * @extends TwilioError
 * @property {number} code - 20101
 * @property {string} message - 'Invalid Access Token'
 */

var AccessTokenInvalidError = function (_TwilioError) {
  _inherits(AccessTokenInvalidError, _TwilioError);

  function AccessTokenInvalidError() {
    _classCallCheck(this, AccessTokenInvalidError);

    return _possibleConstructorReturn(this, (AccessTokenInvalidError.__proto__ || Object.getPrototypeOf(AccessTokenInvalidError)).call(this, 20101, 'Invalid Access Token'));
  }

  return AccessTokenInvalidError;
}(TwilioError);

exports.AccessTokenInvalidError = AccessTokenInvalidError;
Object.defineProperty(TwilioErrorByCode, 20101, { value: AccessTokenInvalidError });

/**
 * @class AccessTokenHeaderInvalidError
 * @classdesc Raised whenever the AccessToken used for connecting to Room has an invalid header.
 * @extends TwilioError
 * @property {number} code - 20102
 * @property {string} message - 'Invalid Access Token header'
 */

var AccessTokenHeaderInvalidError = function (_TwilioError2) {
  _inherits(AccessTokenHeaderInvalidError, _TwilioError2);

  function AccessTokenHeaderInvalidError() {
    _classCallCheck(this, AccessTokenHeaderInvalidError);

    return _possibleConstructorReturn(this, (AccessTokenHeaderInvalidError.__proto__ || Object.getPrototypeOf(AccessTokenHeaderInvalidError)).call(this, 20102, 'Invalid Access Token header'));
  }

  return AccessTokenHeaderInvalidError;
}(TwilioError);

exports.AccessTokenHeaderInvalidError = AccessTokenHeaderInvalidError;
Object.defineProperty(TwilioErrorByCode, 20102, { value: AccessTokenHeaderInvalidError });

/**
 * @class AccessTokenIssuerInvalidError
 * @classdesc Raised whenever the AccessToken used for connecting to Room contains an invalid issuer or subject.
 * @extends TwilioError
 * @property {number} code - 20103
 * @property {string} message - 'Invalid Access Token issuer/subject'
 */

var AccessTokenIssuerInvalidError = function (_TwilioError3) {
  _inherits(AccessTokenIssuerInvalidError, _TwilioError3);

  function AccessTokenIssuerInvalidError() {
    _classCallCheck(this, AccessTokenIssuerInvalidError);

    return _possibleConstructorReturn(this, (AccessTokenIssuerInvalidError.__proto__ || Object.getPrototypeOf(AccessTokenIssuerInvalidError)).call(this, 20103, 'Invalid Access Token issuer/subject'));
  }

  return AccessTokenIssuerInvalidError;
}(TwilioError);

exports.AccessTokenIssuerInvalidError = AccessTokenIssuerInvalidError;
Object.defineProperty(TwilioErrorByCode, 20103, { value: AccessTokenIssuerInvalidError });

/**
 * @class AccessTokenExpiredError
 * @classdesc Raised whenever the AccessToken used for connecting to Room has expired.
 * @extends TwilioError
 * @property {number} code - 20104
 * @property {string} message - 'Access Token expired or expiration date invalid'
 */

var AccessTokenExpiredError = function (_TwilioError4) {
  _inherits(AccessTokenExpiredError, _TwilioError4);

  function AccessTokenExpiredError() {
    _classCallCheck(this, AccessTokenExpiredError);

    return _possibleConstructorReturn(this, (AccessTokenExpiredError.__proto__ || Object.getPrototypeOf(AccessTokenExpiredError)).call(this, 20104, 'Access Token expired or expiration date invalid'));
  }

  return AccessTokenExpiredError;
}(TwilioError);

exports.AccessTokenExpiredError = AccessTokenExpiredError;
Object.defineProperty(TwilioErrorByCode, 20104, { value: AccessTokenExpiredError });

/**
 * @class AccessTokenNotYetValidError
 * @classdesc Raised whenever the AccessToken used for connecting to Room is not yet valid.
 * @extends TwilioError
 * @property {number} code - 20105
 * @property {string} message - 'Access Token not yet valid'
 */

var AccessTokenNotYetValidError = function (_TwilioError5) {
  _inherits(AccessTokenNotYetValidError, _TwilioError5);

  function AccessTokenNotYetValidError() {
    _classCallCheck(this, AccessTokenNotYetValidError);

    return _possibleConstructorReturn(this, (AccessTokenNotYetValidError.__proto__ || Object.getPrototypeOf(AccessTokenNotYetValidError)).call(this, 20105, 'Access Token not yet valid'));
  }

  return AccessTokenNotYetValidError;
}(TwilioError);

exports.AccessTokenNotYetValidError = AccessTokenNotYetValidError;
Object.defineProperty(TwilioErrorByCode, 20105, { value: AccessTokenNotYetValidError });

/**
 * @class AccessTokenGrantsInvalidError
 * @classdesc Raised whenever the AccessToken used for connecting to Room has invalid grants.
 * @extends TwilioError
 * @property {number} code - 20106
 * @property {string} message - 'Invalid Access Token grants'
 */

var AccessTokenGrantsInvalidError = function (_TwilioError6) {
  _inherits(AccessTokenGrantsInvalidError, _TwilioError6);

  function AccessTokenGrantsInvalidError() {
    _classCallCheck(this, AccessTokenGrantsInvalidError);

    return _possibleConstructorReturn(this, (AccessTokenGrantsInvalidError.__proto__ || Object.getPrototypeOf(AccessTokenGrantsInvalidError)).call(this, 20106, 'Invalid Access Token grants'));
  }

  return AccessTokenGrantsInvalidError;
}(TwilioError);

exports.AccessTokenGrantsInvalidError = AccessTokenGrantsInvalidError;
Object.defineProperty(TwilioErrorByCode, 20106, { value: AccessTokenGrantsInvalidError });

/**
 * @class AccessTokenSignatureInvalidError
 * @classdesc Raised whenever the AccessToken used for connecting to Room has an invalid signature.
 * @extends TwilioError
 * @property {number} code - 20107
 * @property {string} message - 'Invalid Access Token signature'
 */

var AccessTokenSignatureInvalidError = function (_TwilioError7) {
  _inherits(AccessTokenSignatureInvalidError, _TwilioError7);

  function AccessTokenSignatureInvalidError() {
    _classCallCheck(this, AccessTokenSignatureInvalidError);

    return _possibleConstructorReturn(this, (AccessTokenSignatureInvalidError.__proto__ || Object.getPrototypeOf(AccessTokenSignatureInvalidError)).call(this, 20107, 'Invalid Access Token signature'));
  }

  return AccessTokenSignatureInvalidError;
}(TwilioError);

exports.AccessTokenSignatureInvalidError = AccessTokenSignatureInvalidError;
Object.defineProperty(TwilioErrorByCode, 20107, { value: AccessTokenSignatureInvalidError });

/**
 * @class SignalingConnectionError
 * @classdesc Raised whenever a signaling connection error occurs that is not covered by a more specific error code.
 * @extends TwilioError
 * @property {number} code - 53000
 * @property {string} message - 'Signaling connection error'
 */

var SignalingConnectionError = function (_TwilioError8) {
  _inherits(SignalingConnectionError, _TwilioError8);

  function SignalingConnectionError() {
    _classCallCheck(this, SignalingConnectionError);

    return _possibleConstructorReturn(this, (SignalingConnectionError.__proto__ || Object.getPrototypeOf(SignalingConnectionError)).call(this, 53000, 'Signaling connection error'));
  }

  return SignalingConnectionError;
}(TwilioError);

exports.SignalingConnectionError = SignalingConnectionError;
Object.defineProperty(TwilioErrorByCode, 53000, { value: SignalingConnectionError });

/**
 * @class SignalingConnectionDisconnectedError
 * @classdesc Raised whenever the signaling connection is unexpectedly disconnected.
 * @extends TwilioError
 * @property {number} code - 53001
 * @property {string} message - 'Signaling connection disconnected'
 */

var SignalingConnectionDisconnectedError = function (_TwilioError9) {
  _inherits(SignalingConnectionDisconnectedError, _TwilioError9);

  function SignalingConnectionDisconnectedError() {
    _classCallCheck(this, SignalingConnectionDisconnectedError);

    return _possibleConstructorReturn(this, (SignalingConnectionDisconnectedError.__proto__ || Object.getPrototypeOf(SignalingConnectionDisconnectedError)).call(this, 53001, 'Signaling connection disconnected'));
  }

  return SignalingConnectionDisconnectedError;
}(TwilioError);

exports.SignalingConnectionDisconnectedError = SignalingConnectionDisconnectedError;
Object.defineProperty(TwilioErrorByCode, 53001, { value: SignalingConnectionDisconnectedError });

/**
 * @class SignalingConnectionTimeoutError
 * @classdesc Raised whenever the signaling connection times out.
 * @extends TwilioError
 * @property {number} code - 53002
 * @property {string} message - 'Signaling connection timed out'
 */

var SignalingConnectionTimeoutError = function (_TwilioError10) {
  _inherits(SignalingConnectionTimeoutError, _TwilioError10);

  function SignalingConnectionTimeoutError() {
    _classCallCheck(this, SignalingConnectionTimeoutError);

    return _possibleConstructorReturn(this, (SignalingConnectionTimeoutError.__proto__ || Object.getPrototypeOf(SignalingConnectionTimeoutError)).call(this, 53002, 'Signaling connection timed out'));
  }

  return SignalingConnectionTimeoutError;
}(TwilioError);

exports.SignalingConnectionTimeoutError = SignalingConnectionTimeoutError;
Object.defineProperty(TwilioErrorByCode, 53002, { value: SignalingConnectionTimeoutError });

/**
 * @class SignalingIncomingMessageInvalidError
 * @classdesc Raised whenever the Client receives a message from the Server that the Client cannot handle.
 * @extends TwilioError
 * @property {number} code - 53003
 * @property {string} message - 'Client received an invalid signaling message'
 */

var SignalingIncomingMessageInvalidError = function (_TwilioError11) {
  _inherits(SignalingIncomingMessageInvalidError, _TwilioError11);

  function SignalingIncomingMessageInvalidError() {
    _classCallCheck(this, SignalingIncomingMessageInvalidError);

    return _possibleConstructorReturn(this, (SignalingIncomingMessageInvalidError.__proto__ || Object.getPrototypeOf(SignalingIncomingMessageInvalidError)).call(this, 53003, 'Client received an invalid signaling message'));
  }

  return SignalingIncomingMessageInvalidError;
}(TwilioError);

exports.SignalingIncomingMessageInvalidError = SignalingIncomingMessageInvalidError;
Object.defineProperty(TwilioErrorByCode, 53003, { value: SignalingIncomingMessageInvalidError });

/**
 * @class SignalingOutgoingMessageInvalidError
 * @classdesc Raised whenever the Client sends a message to the Server that the Server cannot handle.
 * @extends TwilioError
 * @property {number} code - 53004
 * @property {string} message - 'Client sent an invalid signaling message'
 */

var SignalingOutgoingMessageInvalidError = function (_TwilioError12) {
  _inherits(SignalingOutgoingMessageInvalidError, _TwilioError12);

  function SignalingOutgoingMessageInvalidError() {
    _classCallCheck(this, SignalingOutgoingMessageInvalidError);

    return _possibleConstructorReturn(this, (SignalingOutgoingMessageInvalidError.__proto__ || Object.getPrototypeOf(SignalingOutgoingMessageInvalidError)).call(this, 53004, 'Client sent an invalid signaling message'));
  }

  return SignalingOutgoingMessageInvalidError;
}(TwilioError);

exports.SignalingOutgoingMessageInvalidError = SignalingOutgoingMessageInvalidError;
Object.defineProperty(TwilioErrorByCode, 53004, { value: SignalingOutgoingMessageInvalidError });

/**
 * @class RoomNameInvalidError
 * @classdesc Raised whenever a Room name is invalid, and the scenario is not covered by a more specific error code.
 * @extends TwilioError
 * @property {number} code - 53100
 * @property {string} message - 'Room name is invalid'
 */

var RoomNameInvalidError = function (_TwilioError13) {
  _inherits(RoomNameInvalidError, _TwilioError13);

  function RoomNameInvalidError() {
    _classCallCheck(this, RoomNameInvalidError);

    return _possibleConstructorReturn(this, (RoomNameInvalidError.__proto__ || Object.getPrototypeOf(RoomNameInvalidError)).call(this, 53100, 'Room name is invalid'));
  }

  return RoomNameInvalidError;
}(TwilioError);

exports.RoomNameInvalidError = RoomNameInvalidError;
Object.defineProperty(TwilioErrorByCode, 53100, { value: RoomNameInvalidError });

/**
 * @class RoomNameTooLongError
 * @classdesc Raised whenever a Room name is too long.
 * @extends TwilioError
 * @property {number} code - 53101
 * @property {string} message - 'Room name is too long'
 */

var RoomNameTooLongError = function (_TwilioError14) {
  _inherits(RoomNameTooLongError, _TwilioError14);

  function RoomNameTooLongError() {
    _classCallCheck(this, RoomNameTooLongError);

    return _possibleConstructorReturn(this, (RoomNameTooLongError.__proto__ || Object.getPrototypeOf(RoomNameTooLongError)).call(this, 53101, 'Room name is too long'));
  }

  return RoomNameTooLongError;
}(TwilioError);

exports.RoomNameTooLongError = RoomNameTooLongError;
Object.defineProperty(TwilioErrorByCode, 53101, { value: RoomNameTooLongError });

/**
 * @class RoomNameCharsInvalidError
 * @classdesc Raised whenever a Room name contains invalid characters.
 * @extends TwilioError
 * @property {number} code - 53102
 * @property {string} message - 'Room name contains invalid characters'
 */

var RoomNameCharsInvalidError = function (_TwilioError15) {
  _inherits(RoomNameCharsInvalidError, _TwilioError15);

  function RoomNameCharsInvalidError() {
    _classCallCheck(this, RoomNameCharsInvalidError);

    return _possibleConstructorReturn(this, (RoomNameCharsInvalidError.__proto__ || Object.getPrototypeOf(RoomNameCharsInvalidError)).call(this, 53102, 'Room name contains invalid characters'));
  }

  return RoomNameCharsInvalidError;
}(TwilioError);

exports.RoomNameCharsInvalidError = RoomNameCharsInvalidError;
Object.defineProperty(TwilioErrorByCode, 53102, { value: RoomNameCharsInvalidError });

/**
 * @class RoomCreateFailedError
 * @classdesc Raised whenever the Server is unable to create a Room.
 * @extends TwilioError
 * @property {number} code - 53103
 * @property {string} message - 'Unable to create Room'
 */

var RoomCreateFailedError = function (_TwilioError16) {
  _inherits(RoomCreateFailedError, _TwilioError16);

  function RoomCreateFailedError() {
    _classCallCheck(this, RoomCreateFailedError);

    return _possibleConstructorReturn(this, (RoomCreateFailedError.__proto__ || Object.getPrototypeOf(RoomCreateFailedError)).call(this, 53103, 'Unable to create Room'));
  }

  return RoomCreateFailedError;
}(TwilioError);

exports.RoomCreateFailedError = RoomCreateFailedError;
Object.defineProperty(TwilioErrorByCode, 53103, { value: RoomCreateFailedError });

/**
 * @class RoomConnectFailedError
 * @classdesc Raised whenever a Client is unable to connect to a Room, and the scenario is not covered by a more specific error code.
 * @extends TwilioError
 * @property {number} code - 53104
 * @property {string} message - 'Unable to connect to Room'
 */

var RoomConnectFailedError = function (_TwilioError17) {
  _inherits(RoomConnectFailedError, _TwilioError17);

  function RoomConnectFailedError() {
    _classCallCheck(this, RoomConnectFailedError);

    return _possibleConstructorReturn(this, (RoomConnectFailedError.__proto__ || Object.getPrototypeOf(RoomConnectFailedError)).call(this, 53104, 'Unable to connect to Room'));
  }

  return RoomConnectFailedError;
}(TwilioError);

exports.RoomConnectFailedError = RoomConnectFailedError;
Object.defineProperty(TwilioErrorByCode, 53104, { value: RoomConnectFailedError });

/**
 * @class RoomMaxParticipantsExceededError
 * @classdesc Raised whenever a Client is unable to connect to a Room because the Room contains too many Participants.
 * @extends TwilioError
 * @property {number} code - 53105
 * @property {string} message - 'Room contains too many Participants'
 */

var RoomMaxParticipantsExceededError = function (_TwilioError18) {
  _inherits(RoomMaxParticipantsExceededError, _TwilioError18);

  function RoomMaxParticipantsExceededError() {
    _classCallCheck(this, RoomMaxParticipantsExceededError);

    return _possibleConstructorReturn(this, (RoomMaxParticipantsExceededError.__proto__ || Object.getPrototypeOf(RoomMaxParticipantsExceededError)).call(this, 53105, 'Room contains too many Participants'));
  }

  return RoomMaxParticipantsExceededError;
}(TwilioError);

exports.RoomMaxParticipantsExceededError = RoomMaxParticipantsExceededError;
Object.defineProperty(TwilioErrorByCode, 53105, { value: RoomMaxParticipantsExceededError });

/**
 * @class RoomNotFoundError
 * @classdesc Raised whenever attempting operation on a non-existent Room.
 * @extends TwilioError
 * @property {number} code - 53106
 * @property {string} message - 'Room not found'
 */

var RoomNotFoundError = function (_TwilioError19) {
  _inherits(RoomNotFoundError, _TwilioError19);

  function RoomNotFoundError() {
    _classCallCheck(this, RoomNotFoundError);

    return _possibleConstructorReturn(this, (RoomNotFoundError.__proto__ || Object.getPrototypeOf(RoomNotFoundError)).call(this, 53106, 'Room not found'));
  }

  return RoomNotFoundError;
}(TwilioError);

exports.RoomNotFoundError = RoomNotFoundError;
Object.defineProperty(TwilioErrorByCode, 53106, { value: RoomNotFoundError });

/**
 * @class RoomMaxParticipantsOutOfRangeError
 * @classdesc Raised in the REST API when MaxParticipants is set out of range.
 * @extends TwilioError
 * @property {number} code - 53107
 * @property {string} message - 'MaxParticipants is out of range'
 */

var RoomMaxParticipantsOutOfRangeError = function (_TwilioError20) {
  _inherits(RoomMaxParticipantsOutOfRangeError, _TwilioError20);

  function RoomMaxParticipantsOutOfRangeError() {
    _classCallCheck(this, RoomMaxParticipantsOutOfRangeError);

    return _possibleConstructorReturn(this, (RoomMaxParticipantsOutOfRangeError.__proto__ || Object.getPrototypeOf(RoomMaxParticipantsOutOfRangeError)).call(this, 53107, 'MaxParticipants is out of range'));
  }

  return RoomMaxParticipantsOutOfRangeError;
}(TwilioError);

exports.RoomMaxParticipantsOutOfRangeError = RoomMaxParticipantsOutOfRangeError;
Object.defineProperty(TwilioErrorByCode, 53107, { value: RoomMaxParticipantsOutOfRangeError });

/**
 * @class RoomTypeInvalidError
 * @classdesc Raised in the REST API when the user attempts to create a Room with an invalid RoomType
 * @extends TwilioError
 * @property {number} code - 53108
 * @property {string} message - 'RoomType is not valid'
 */

var RoomTypeInvalidError = function (_TwilioError21) {
  _inherits(RoomTypeInvalidError, _TwilioError21);

  function RoomTypeInvalidError() {
    _classCallCheck(this, RoomTypeInvalidError);

    return _possibleConstructorReturn(this, (RoomTypeInvalidError.__proto__ || Object.getPrototypeOf(RoomTypeInvalidError)).call(this, 53108, 'RoomType is not valid'));
  }

  return RoomTypeInvalidError;
}(TwilioError);

exports.RoomTypeInvalidError = RoomTypeInvalidError;
Object.defineProperty(TwilioErrorByCode, 53108, { value: RoomTypeInvalidError });

/**
 * @class RoomTimeoutOutOfRangeError
 * @classdesc Raised in the REST API when Timeout is set out of range.
 * @extends TwilioError
 * @property {number} code - 53109
 * @property {string} message - 'Timeout is out of range'
 */

var RoomTimeoutOutOfRangeError = function (_TwilioError22) {
  _inherits(RoomTimeoutOutOfRangeError, _TwilioError22);

  function RoomTimeoutOutOfRangeError() {
    _classCallCheck(this, RoomTimeoutOutOfRangeError);

    return _possibleConstructorReturn(this, (RoomTimeoutOutOfRangeError.__proto__ || Object.getPrototypeOf(RoomTimeoutOutOfRangeError)).call(this, 53109, 'Timeout is out of range'));
  }

  return RoomTimeoutOutOfRangeError;
}(TwilioError);

exports.RoomTimeoutOutOfRangeError = RoomTimeoutOutOfRangeError;
Object.defineProperty(TwilioErrorByCode, 53109, { value: RoomTimeoutOutOfRangeError });

/**
 * @class RoomStatusCallbackMethodInvalidError
 * @classdesc Raised in the REST API when StatusCallbackMethod is set to an invalid value.
 * @extends TwilioError
 * @property {number} code - 53110
 * @property {string} message - 'StatusCallbackMethod is invalid'
 */

var RoomStatusCallbackMethodInvalidError = function (_TwilioError23) {
  _inherits(RoomStatusCallbackMethodInvalidError, _TwilioError23);

  function RoomStatusCallbackMethodInvalidError() {
    _classCallCheck(this, RoomStatusCallbackMethodInvalidError);

    return _possibleConstructorReturn(this, (RoomStatusCallbackMethodInvalidError.__proto__ || Object.getPrototypeOf(RoomStatusCallbackMethodInvalidError)).call(this, 53110, 'StatusCallbackMethod is invalid'));
  }

  return RoomStatusCallbackMethodInvalidError;
}(TwilioError);

exports.RoomStatusCallbackMethodInvalidError = RoomStatusCallbackMethodInvalidError;
Object.defineProperty(TwilioErrorByCode, 53110, { value: RoomStatusCallbackMethodInvalidError });

/**
 * @class RoomStatusCallbackInvalidError
 * @classdesc Raised in the REST API when StatusCallback is not a valid URL or the url is too long.
 * @extends TwilioError
 * @property {number} code - 53111
 * @property {string} message - 'StatusCallback is invalid'
 */

var RoomStatusCallbackInvalidError = function (_TwilioError24) {
  _inherits(RoomStatusCallbackInvalidError, _TwilioError24);

  function RoomStatusCallbackInvalidError() {
    _classCallCheck(this, RoomStatusCallbackInvalidError);

    return _possibleConstructorReturn(this, (RoomStatusCallbackInvalidError.__proto__ || Object.getPrototypeOf(RoomStatusCallbackInvalidError)).call(this, 53111, 'StatusCallback is invalid'));
  }

  return RoomStatusCallbackInvalidError;
}(TwilioError);

exports.RoomStatusCallbackInvalidError = RoomStatusCallbackInvalidError;
Object.defineProperty(TwilioErrorByCode, 53111, { value: RoomStatusCallbackInvalidError });

/**
 * @class RoomStatusInvalidError
 * @classdesc Raised in the REST API when Status is not valid or the Room is not in-progress.
 * @extends TwilioError
 * @property {number} code - 53112
 * @property {string} message - 'Status is invalid'
 */

var RoomStatusInvalidError = function (_TwilioError25) {
  _inherits(RoomStatusInvalidError, _TwilioError25);

  function RoomStatusInvalidError() {
    _classCallCheck(this, RoomStatusInvalidError);

    return _possibleConstructorReturn(this, (RoomStatusInvalidError.__proto__ || Object.getPrototypeOf(RoomStatusInvalidError)).call(this, 53112, 'Status is invalid'));
  }

  return RoomStatusInvalidError;
}(TwilioError);

exports.RoomStatusInvalidError = RoomStatusInvalidError;
Object.defineProperty(TwilioErrorByCode, 53112, { value: RoomStatusInvalidError });

/**
 * @class RoomRoomExistsError
 * @classdesc Raised in the REST API when the Room creation fails because a Room exists with the same name.
 * @extends TwilioError
 * @property {number} code - 53113
 * @property {string} message - 'Room exists'
 */

var RoomRoomExistsError = function (_TwilioError26) {
  _inherits(RoomRoomExistsError, _TwilioError26);

  function RoomRoomExistsError() {
    _classCallCheck(this, RoomRoomExistsError);

    return _possibleConstructorReturn(this, (RoomRoomExistsError.__proto__ || Object.getPrototypeOf(RoomRoomExistsError)).call(this, 53113, 'Room exists'));
  }

  return RoomRoomExistsError;
}(TwilioError);

exports.RoomRoomExistsError = RoomRoomExistsError;
Object.defineProperty(TwilioErrorByCode, 53113, { value: RoomRoomExistsError });

/**
 * @class RoomInvalidParametersError
 * @classdesc Raised in the REST API when one or more Room creation parameter is incompatible with the Room type.
 * @extends TwilioError
 * @property {number} code - 53114
 * @property {string} message - 'Room creation parameter(s) incompatible with the Room type'
 */

var RoomInvalidParametersError = function (_TwilioError27) {
  _inherits(RoomInvalidParametersError, _TwilioError27);

  function RoomInvalidParametersError() {
    _classCallCheck(this, RoomInvalidParametersError);

    return _possibleConstructorReturn(this, (RoomInvalidParametersError.__proto__ || Object.getPrototypeOf(RoomInvalidParametersError)).call(this, 53114, 'Room creation parameter(s) incompatible with the Room type'));
  }

  return RoomInvalidParametersError;
}(TwilioError);

exports.RoomInvalidParametersError = RoomInvalidParametersError;
Object.defineProperty(TwilioErrorByCode, 53114, { value: RoomInvalidParametersError });

/**
 * @class RoomMediaRegionInvalidError
 * @classdesc Raised in the REST API when MediaRegion is set to an invalid value.
 * @extends TwilioError
 * @property {number} code - 53115
 * @property {string} message - 'MediaRegion is invalid'
 */

var RoomMediaRegionInvalidError = function (_TwilioError28) {
  _inherits(RoomMediaRegionInvalidError, _TwilioError28);

  function RoomMediaRegionInvalidError() {
    _classCallCheck(this, RoomMediaRegionInvalidError);

    return _possibleConstructorReturn(this, (RoomMediaRegionInvalidError.__proto__ || Object.getPrototypeOf(RoomMediaRegionInvalidError)).call(this, 53115, 'MediaRegion is invalid'));
  }

  return RoomMediaRegionInvalidError;
}(TwilioError);

exports.RoomMediaRegionInvalidError = RoomMediaRegionInvalidError;
Object.defineProperty(TwilioErrorByCode, 53115, { value: RoomMediaRegionInvalidError });

/**
 * @class RoomMediaRegionUnavailableError
 * @classdesc Raised in the REST API when MediaRegion is set to a valid value but no media servers are available.
 * @extends TwilioError
 * @property {number} code - 53116
 * @property {string} message - 'There are no media servers available in the MediaRegion'
 */

var RoomMediaRegionUnavailableError = function (_TwilioError29) {
  _inherits(RoomMediaRegionUnavailableError, _TwilioError29);

  function RoomMediaRegionUnavailableError() {
    _classCallCheck(this, RoomMediaRegionUnavailableError);

    return _possibleConstructorReturn(this, (RoomMediaRegionUnavailableError.__proto__ || Object.getPrototypeOf(RoomMediaRegionUnavailableError)).call(this, 53116, 'There are no media servers available in the MediaRegion'));
  }

  return RoomMediaRegionUnavailableError;
}(TwilioError);

exports.RoomMediaRegionUnavailableError = RoomMediaRegionUnavailableError;
Object.defineProperty(TwilioErrorByCode, 53116, { value: RoomMediaRegionUnavailableError });

/**
 * @class RoomSubscriptionOperationNotSupportedError
 * @classdesc Raised whenever the subscription operation requested is not supported for the Room type.
 * @extends TwilioError
 * @property {number} code - 53117
 * @property {string} message - 'The subscription operation requested is not supported for the Room type'
 */

var RoomSubscriptionOperationNotSupportedError = function (_TwilioError30) {
  _inherits(RoomSubscriptionOperationNotSupportedError, _TwilioError30);

  function RoomSubscriptionOperationNotSupportedError() {
    _classCallCheck(this, RoomSubscriptionOperationNotSupportedError);

    return _possibleConstructorReturn(this, (RoomSubscriptionOperationNotSupportedError.__proto__ || Object.getPrototypeOf(RoomSubscriptionOperationNotSupportedError)).call(this, 53117, 'The subscription operation requested is not supported for the Room type'));
  }

  return RoomSubscriptionOperationNotSupportedError;
}(TwilioError);

exports.RoomSubscriptionOperationNotSupportedError = RoomSubscriptionOperationNotSupportedError;
Object.defineProperty(TwilioErrorByCode, 53117, { value: RoomSubscriptionOperationNotSupportedError });

/**
 * @class RoomCompletedError
 * @classdesc Raised whenever a Room is completed via the REST API.
 * @extends TwilioError
 * @property {number} code - 53118
 * @property {string} message - 'Room completed'
 */

var RoomCompletedError = function (_TwilioError31) {
  _inherits(RoomCompletedError, _TwilioError31);

  function RoomCompletedError() {
    _classCallCheck(this, RoomCompletedError);

    return _possibleConstructorReturn(this, (RoomCompletedError.__proto__ || Object.getPrototypeOf(RoomCompletedError)).call(this, 53118, 'Room completed'));
  }

  return RoomCompletedError;
}(TwilioError);

exports.RoomCompletedError = RoomCompletedError;
Object.defineProperty(TwilioErrorByCode, 53118, { value: RoomCompletedError });

/**
 * @class ParticipantIdentityInvalidError
 * @classdesc Raised whenever a Participant identity is invalid, and the scenario is not covered by a more specific error code.
 * @extends TwilioError
 * @property {number} code - 53200
 * @property {string} message - 'Participant identity is invalid'
 */

var ParticipantIdentityInvalidError = function (_TwilioError32) {
  _inherits(ParticipantIdentityInvalidError, _TwilioError32);

  function ParticipantIdentityInvalidError() {
    _classCallCheck(this, ParticipantIdentityInvalidError);

    return _possibleConstructorReturn(this, (ParticipantIdentityInvalidError.__proto__ || Object.getPrototypeOf(ParticipantIdentityInvalidError)).call(this, 53200, 'Participant identity is invalid'));
  }

  return ParticipantIdentityInvalidError;
}(TwilioError);

exports.ParticipantIdentityInvalidError = ParticipantIdentityInvalidError;
Object.defineProperty(TwilioErrorByCode, 53200, { value: ParticipantIdentityInvalidError });

/**
 * @class ParticipantIdentityTooLongError
 * @classdesc Raised whenever a Participant identity is too long.
 * @extends TwilioError
 * @property {number} code - 53201
 * @property {string} message - 'Participant identity is too long'
 */

var ParticipantIdentityTooLongError = function (_TwilioError33) {
  _inherits(ParticipantIdentityTooLongError, _TwilioError33);

  function ParticipantIdentityTooLongError() {
    _classCallCheck(this, ParticipantIdentityTooLongError);

    return _possibleConstructorReturn(this, (ParticipantIdentityTooLongError.__proto__ || Object.getPrototypeOf(ParticipantIdentityTooLongError)).call(this, 53201, 'Participant identity is too long'));
  }

  return ParticipantIdentityTooLongError;
}(TwilioError);

exports.ParticipantIdentityTooLongError = ParticipantIdentityTooLongError;
Object.defineProperty(TwilioErrorByCode, 53201, { value: ParticipantIdentityTooLongError });

/**
 * @class ParticipantIdentityCharsInvalidError
 * @classdesc Raised whenever a Participant identity contains invalid characters.
 * @extends TwilioError
 * @property {number} code - 53202
 * @property {string} message - 'Participant identity contains invalid characters'
 */

var ParticipantIdentityCharsInvalidError = function (_TwilioError34) {
  _inherits(ParticipantIdentityCharsInvalidError, _TwilioError34);

  function ParticipantIdentityCharsInvalidError() {
    _classCallCheck(this, ParticipantIdentityCharsInvalidError);

    return _possibleConstructorReturn(this, (ParticipantIdentityCharsInvalidError.__proto__ || Object.getPrototypeOf(ParticipantIdentityCharsInvalidError)).call(this, 53202, 'Participant identity contains invalid characters'));
  }

  return ParticipantIdentityCharsInvalidError;
}(TwilioError);

exports.ParticipantIdentityCharsInvalidError = ParticipantIdentityCharsInvalidError;
Object.defineProperty(TwilioErrorByCode, 53202, { value: ParticipantIdentityCharsInvalidError });

/**
 * @class ParticipantMaxTracksExceededError
 * @classdesc Raised whenever a Participant has too many Tracks.
 * @extends TwilioError
 * @property {number} code - 53203
 * @property {string} message - 'Participant has too many Tracks'
 */

var ParticipantMaxTracksExceededError = function (_TwilioError35) {
  _inherits(ParticipantMaxTracksExceededError, _TwilioError35);

  function ParticipantMaxTracksExceededError() {
    _classCallCheck(this, ParticipantMaxTracksExceededError);

    return _possibleConstructorReturn(this, (ParticipantMaxTracksExceededError.__proto__ || Object.getPrototypeOf(ParticipantMaxTracksExceededError)).call(this, 53203, 'Participant has too many Tracks'));
  }

  return ParticipantMaxTracksExceededError;
}(TwilioError);

exports.ParticipantMaxTracksExceededError = ParticipantMaxTracksExceededError;
Object.defineProperty(TwilioErrorByCode, 53203, { value: ParticipantMaxTracksExceededError });

/**
 * @class ParticipantNotFoundError
 * @classdesc Raised whenever attempting operation on a non-existent Participant.
 * @extends TwilioError
 * @property {number} code - 53204
 * @property {string} message - 'Participant not found'
 */

var ParticipantNotFoundError = function (_TwilioError36) {
  _inherits(ParticipantNotFoundError, _TwilioError36);

  function ParticipantNotFoundError() {
    _classCallCheck(this, ParticipantNotFoundError);

    return _possibleConstructorReturn(this, (ParticipantNotFoundError.__proto__ || Object.getPrototypeOf(ParticipantNotFoundError)).call(this, 53204, 'Participant not found'));
  }

  return ParticipantNotFoundError;
}(TwilioError);

exports.ParticipantNotFoundError = ParticipantNotFoundError;
Object.defineProperty(TwilioErrorByCode, 53204, { value: ParticipantNotFoundError });

/**
 * @class ParticipantDuplicateIdentityError
 * @classdesc Raised by the server to the existing Participant when a new Participant joins a Room with the same identity as the existing Participant.
 * @extends TwilioError
 * @property {number} code - 53205
 * @property {string} message - 'Participant disconnected because of duplicate identity'
 */

var ParticipantDuplicateIdentityError = function (_TwilioError37) {
  _inherits(ParticipantDuplicateIdentityError, _TwilioError37);

  function ParticipantDuplicateIdentityError() {
    _classCallCheck(this, ParticipantDuplicateIdentityError);

    return _possibleConstructorReturn(this, (ParticipantDuplicateIdentityError.__proto__ || Object.getPrototypeOf(ParticipantDuplicateIdentityError)).call(this, 53205, 'Participant disconnected because of duplicate identity'));
  }

  return ParticipantDuplicateIdentityError;
}(TwilioError);

exports.ParticipantDuplicateIdentityError = ParticipantDuplicateIdentityError;
Object.defineProperty(TwilioErrorByCode, 53205, { value: ParticipantDuplicateIdentityError });

/**
 * @class TrackInvalidError
 * @classdesc Raised whenever a Track is invalid, and the scenario is not covered by a more specific error code.
 * @extends TwilioError
 * @property {number} code - 53300
 * @property {string} message - 'Track is invalid'
 */

var TrackInvalidError = function (_TwilioError38) {
  _inherits(TrackInvalidError, _TwilioError38);

  function TrackInvalidError() {
    _classCallCheck(this, TrackInvalidError);

    return _possibleConstructorReturn(this, (TrackInvalidError.__proto__ || Object.getPrototypeOf(TrackInvalidError)).call(this, 53300, 'Track is invalid'));
  }

  return TrackInvalidError;
}(TwilioError);

exports.TrackInvalidError = TrackInvalidError;
Object.defineProperty(TwilioErrorByCode, 53300, { value: TrackInvalidError });

/**
 * @class TrackNameInvalidError
 * @classdesc Raised whenever a Track name is invalid, and the scenario is not covered by a more specific error code.
 * @extends TwilioError
 * @property {number} code - 53301
 * @property {string} message - 'Track name is invalid'
 */

var TrackNameInvalidError = function (_TwilioError39) {
  _inherits(TrackNameInvalidError, _TwilioError39);

  function TrackNameInvalidError() {
    _classCallCheck(this, TrackNameInvalidError);

    return _possibleConstructorReturn(this, (TrackNameInvalidError.__proto__ || Object.getPrototypeOf(TrackNameInvalidError)).call(this, 53301, 'Track name is invalid'));
  }

  return TrackNameInvalidError;
}(TwilioError);

exports.TrackNameInvalidError = TrackNameInvalidError;
Object.defineProperty(TwilioErrorByCode, 53301, { value: TrackNameInvalidError });

/**
 * @class TrackNameTooLongError
 * @classdesc Raised whenever a Track name is too long.
 * @extends TwilioError
 * @property {number} code - 53302
 * @property {string} message - 'Track name is too long'
 */

var TrackNameTooLongError = function (_TwilioError40) {
  _inherits(TrackNameTooLongError, _TwilioError40);

  function TrackNameTooLongError() {
    _classCallCheck(this, TrackNameTooLongError);

    return _possibleConstructorReturn(this, (TrackNameTooLongError.__proto__ || Object.getPrototypeOf(TrackNameTooLongError)).call(this, 53302, 'Track name is too long'));
  }

  return TrackNameTooLongError;
}(TwilioError);

exports.TrackNameTooLongError = TrackNameTooLongError;
Object.defineProperty(TwilioErrorByCode, 53302, { value: TrackNameTooLongError });

/**
 * @class TrackNameCharsInvalidError
 * @classdesc Raised whenever a Track name contains invalid characters.
 * @extends TwilioError
 * @property {number} code - 53303
 * @property {string} message - 'Track name contains invalid characters'
 */

var TrackNameCharsInvalidError = function (_TwilioError41) {
  _inherits(TrackNameCharsInvalidError, _TwilioError41);

  function TrackNameCharsInvalidError() {
    _classCallCheck(this, TrackNameCharsInvalidError);

    return _possibleConstructorReturn(this, (TrackNameCharsInvalidError.__proto__ || Object.getPrototypeOf(TrackNameCharsInvalidError)).call(this, 53303, 'Track name contains invalid characters'));
  }

  return TrackNameCharsInvalidError;
}(TwilioError);

exports.TrackNameCharsInvalidError = TrackNameCharsInvalidError;
Object.defineProperty(TwilioErrorByCode, 53303, { value: TrackNameCharsInvalidError });

/**
 * @class TrackNameIsDuplicatedError
 * @classdesc Raised whenever a Participant is currently publishing a Track with the same name.
 * @extends TwilioError
 * @property {number} code - 53304
 * @property {string} message - 'Track name is duplicated'
 */

var TrackNameIsDuplicatedError = function (_TwilioError42) {
  _inherits(TrackNameIsDuplicatedError, _TwilioError42);

  function TrackNameIsDuplicatedError() {
    _classCallCheck(this, TrackNameIsDuplicatedError);

    return _possibleConstructorReturn(this, (TrackNameIsDuplicatedError.__proto__ || Object.getPrototypeOf(TrackNameIsDuplicatedError)).call(this, 53304, 'Track name is duplicated'));
  }

  return TrackNameIsDuplicatedError;
}(TwilioError);

exports.TrackNameIsDuplicatedError = TrackNameIsDuplicatedError;
Object.defineProperty(TwilioErrorByCode, 53304, { value: TrackNameIsDuplicatedError });

/**
 * @class TrackServerTrackCapacityReachedError
 * @classdesc The server does not have enough resources available to create a new Track.
 * @extends TwilioError
 * @property {number} code - 53305
 * @property {string} message - 'The server has reached capacity and cannot fulfill this request.'
 */

var TrackServerTrackCapacityReachedError = function (_TwilioError43) {
  _inherits(TrackServerTrackCapacityReachedError, _TwilioError43);

  function TrackServerTrackCapacityReachedError() {
    _classCallCheck(this, TrackServerTrackCapacityReachedError);

    return _possibleConstructorReturn(this, (TrackServerTrackCapacityReachedError.__proto__ || Object.getPrototypeOf(TrackServerTrackCapacityReachedError)).call(this, 53305, 'The server has reached capacity and cannot fulfill this request.'));
  }

  return TrackServerTrackCapacityReachedError;
}(TwilioError);

exports.TrackServerTrackCapacityReachedError = TrackServerTrackCapacityReachedError;
Object.defineProperty(TwilioErrorByCode, 53305, { value: TrackServerTrackCapacityReachedError });

/**
 * @class MediaClientLocalDescFailedError
 * @classdesc Raised whenever a Client is unable to create or apply a local media description.
 * @extends TwilioError
 * @property {number} code - 53400
 * @property {string} message - 'Client is unable to create or apply a local media description'
 */

var MediaClientLocalDescFailedError = function (_TwilioError44) {
  _inherits(MediaClientLocalDescFailedError, _TwilioError44);

  function MediaClientLocalDescFailedError() {
    _classCallCheck(this, MediaClientLocalDescFailedError);

    return _possibleConstructorReturn(this, (MediaClientLocalDescFailedError.__proto__ || Object.getPrototypeOf(MediaClientLocalDescFailedError)).call(this, 53400, 'Client is unable to create or apply a local media description'));
  }

  return MediaClientLocalDescFailedError;
}(TwilioError);

exports.MediaClientLocalDescFailedError = MediaClientLocalDescFailedError;
Object.defineProperty(TwilioErrorByCode, 53400, { value: MediaClientLocalDescFailedError });

/**
 * @class MediaServerLocalDescFailedError
 * @classdesc Raised whenever the Server is unable to create or apply a local media description.
 * @extends TwilioError
 * @property {number} code - 53401
 * @property {string} message - 'Server is unable to create or apply a local media description'
 */

var MediaServerLocalDescFailedError = function (_TwilioError45) {
  _inherits(MediaServerLocalDescFailedError, _TwilioError45);

  function MediaServerLocalDescFailedError() {
    _classCallCheck(this, MediaServerLocalDescFailedError);

    return _possibleConstructorReturn(this, (MediaServerLocalDescFailedError.__proto__ || Object.getPrototypeOf(MediaServerLocalDescFailedError)).call(this, 53401, 'Server is unable to create or apply a local media description'));
  }

  return MediaServerLocalDescFailedError;
}(TwilioError);

exports.MediaServerLocalDescFailedError = MediaServerLocalDescFailedError;
Object.defineProperty(TwilioErrorByCode, 53401, { value: MediaServerLocalDescFailedError });

/**
 * @class MediaClientRemoteDescFailedError
 * @classdesc Raised whenever the Client receives a remote media description but is unable to apply it.
 * @extends TwilioError
 * @property {number} code - 53402
 * @property {string} message - 'Client is unable to apply a remote media description'
 */

var MediaClientRemoteDescFailedError = function (_TwilioError46) {
  _inherits(MediaClientRemoteDescFailedError, _TwilioError46);

  function MediaClientRemoteDescFailedError() {
    _classCallCheck(this, MediaClientRemoteDescFailedError);

    return _possibleConstructorReturn(this, (MediaClientRemoteDescFailedError.__proto__ || Object.getPrototypeOf(MediaClientRemoteDescFailedError)).call(this, 53402, 'Client is unable to apply a remote media description'));
  }

  return MediaClientRemoteDescFailedError;
}(TwilioError);

exports.MediaClientRemoteDescFailedError = MediaClientRemoteDescFailedError;
Object.defineProperty(TwilioErrorByCode, 53402, { value: MediaClientRemoteDescFailedError });

/**
 * @class MediaServerRemoteDescFailedError
 * @classdesc Raised whenever the Server receives a remote media description but is unable to apply it.
 * @extends TwilioError
 * @property {number} code - 53403
 * @property {string} message - 'Server is unable to apply a remote media description'
 */

var MediaServerRemoteDescFailedError = function (_TwilioError47) {
  _inherits(MediaServerRemoteDescFailedError, _TwilioError47);

  function MediaServerRemoteDescFailedError() {
    _classCallCheck(this, MediaServerRemoteDescFailedError);

    return _possibleConstructorReturn(this, (MediaServerRemoteDescFailedError.__proto__ || Object.getPrototypeOf(MediaServerRemoteDescFailedError)).call(this, 53403, 'Server is unable to apply a remote media description'));
  }

  return MediaServerRemoteDescFailedError;
}(TwilioError);

exports.MediaServerRemoteDescFailedError = MediaServerRemoteDescFailedError;
Object.defineProperty(TwilioErrorByCode, 53403, { value: MediaServerRemoteDescFailedError });

/**
 * @class MediaNoSupportedCodecError
 * @classdesc Raised whenever the intersection of codecs supported by the Client and the Server (or, in peer-to-peer, the Client and another Participant) is empty.
 * @extends TwilioError
 * @property {number} code - 53404
 * @property {string} message - 'No supported codec'
 */

var MediaNoSupportedCodecError = function (_TwilioError48) {
  _inherits(MediaNoSupportedCodecError, _TwilioError48);

  function MediaNoSupportedCodecError() {
    _classCallCheck(this, MediaNoSupportedCodecError);

    return _possibleConstructorReturn(this, (MediaNoSupportedCodecError.__proto__ || Object.getPrototypeOf(MediaNoSupportedCodecError)).call(this, 53404, 'No supported codec'));
  }

  return MediaNoSupportedCodecError;
}(TwilioError);

exports.MediaNoSupportedCodecError = MediaNoSupportedCodecError;
Object.defineProperty(TwilioErrorByCode, 53404, { value: MediaNoSupportedCodecError });

/**
 * @class MediaConnectionError
 * @classdesc Raised by the Client or Server whenever a media connection fails.
 * @extends TwilioError
 * @property {number} code - 53405
 * @property {string} message - 'Media connection failed'
 */

var MediaConnectionError = function (_TwilioError49) {
  _inherits(MediaConnectionError, _TwilioError49);

  function MediaConnectionError() {
    _classCallCheck(this, MediaConnectionError);

    return _possibleConstructorReturn(this, (MediaConnectionError.__proto__ || Object.getPrototypeOf(MediaConnectionError)).call(this, 53405, 'Media connection failed'));
  }

  return MediaConnectionError;
}(TwilioError);

exports.MediaConnectionError = MediaConnectionError;
Object.defineProperty(TwilioErrorByCode, 53405, { value: MediaConnectionError });

/**
 * @class ConfigurationAcquireFailedError
 * @classdesc Raised whenever the Client is unable to acquire configuration information from the Server.
 * @extends TwilioError
 * @property {number} code - 53500
 * @property {string} message - 'Unable to acquire configuration'
 */

var ConfigurationAcquireFailedError = function (_TwilioError50) {
  _inherits(ConfigurationAcquireFailedError, _TwilioError50);

  function ConfigurationAcquireFailedError() {
    _classCallCheck(this, ConfigurationAcquireFailedError);

    return _possibleConstructorReturn(this, (ConfigurationAcquireFailedError.__proto__ || Object.getPrototypeOf(ConfigurationAcquireFailedError)).call(this, 53500, 'Unable to acquire configuration'));
  }

  return ConfigurationAcquireFailedError;
}(TwilioError);

exports.ConfigurationAcquireFailedError = ConfigurationAcquireFailedError;
Object.defineProperty(TwilioErrorByCode, 53500, { value: ConfigurationAcquireFailedError });

/**
 * @class ConfigurationAcquireTurnFailedError
 * @classdesc Raised whenever the Server is unable to return TURN credentials to the Client
 * @extends TwilioError
 * @property {number} code - 53501
 * @property {string} message - 'Unable to acquire TURN credentials'
 */

var ConfigurationAcquireTurnFailedError = function (_TwilioError51) {
  _inherits(ConfigurationAcquireTurnFailedError, _TwilioError51);

  function ConfigurationAcquireTurnFailedError() {
    _classCallCheck(this, ConfigurationAcquireTurnFailedError);

    return _possibleConstructorReturn(this, (ConfigurationAcquireTurnFailedError.__proto__ || Object.getPrototypeOf(ConfigurationAcquireTurnFailedError)).call(this, 53501, 'Unable to acquire TURN credentials'));
  }

  return ConfigurationAcquireTurnFailedError;
}(TwilioError);

exports.ConfigurationAcquireTurnFailedError = ConfigurationAcquireTurnFailedError;
Object.defineProperty(TwilioErrorByCode, 53501, { value: ConfigurationAcquireTurnFailedError });
},{"./twilioerror":126}],126:[function(require,module,exports){
'use strict';

/**
 * @extends Error
 * @property {number} code - Error code
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TwilioError = function (_Error) {
  _inherits(TwilioError, _Error);

  /**
   * Creates a new {@link TwilioError}
   * @param {number} code - Error code
   * @param {string} [message] - Error message
   * @param {string} [fileName] - Name of the script file where error was generated
   * @param {number} [lineNumber] - Line number of the script file where error was generated
   */
  function TwilioError(code) {
    var _ref;

    _classCallCheck(this, TwilioError);

    var args = [].slice.call(arguments, 1);

    var _this = _possibleConstructorReturn(this, (_ref = TwilioError.__proto__ || Object.getPrototypeOf(TwilioError)).call.apply(_ref, [this].concat(_toConsumableArray(args))));

    var error = Error.apply(_this, args);
    error.name = 'TwilioError';

    Object.defineProperty(_this, 'code', {
      value: code,
      enumerable: true
    });

    Object.getOwnPropertyNames(error).forEach(function (prop) {
      Object.defineProperty(this, prop, {
        value: error[prop],
        enumerable: true
      });
    }, _this);
    return _this;
  }

  /**
   * Returns human readable string describing the error.
   * @returns {string}
   */


  _createClass(TwilioError, [{
    key: 'toString',
    value: function toString() {
      var message = this.message ? ': ' + this.message : '';
      return this.name + ' ' + this.code + message;
    }
  }]);

  return TwilioError;
}(Error);

module.exports = TwilioError;
},{}],127:[function(require,module,exports){
/* globals webkitAudioContext, AudioContext */
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NativeAudioContext = typeof AudioContext !== 'undefined' ? AudioContext : typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null;

/**
 * @interface AudioContextFactoryOptions
 * @property {AudioContext} [AudioContext] - The AudioContext constructor
 */

/**
 * {@link AudioContextFactory} ensures we construct at most one AudioContext
 * at a time, and that it is eventually closed when we no longer need it.
 * @property {AudioContextFactory} AudioContextFactory - The
 *   {@link AudioContextFactory} constructor
 */

var AudioContextFactory = function () {
  /**
   * @param {AudioContextFactoryOptions} [options]
   */
  function AudioContextFactory(options) {
    _classCallCheck(this, AudioContextFactory);

    options = Object.assign({
      AudioContext: NativeAudioContext
    }, options);
    Object.defineProperties(this, {
      _AudioContext: {
        value: options.AudioContext
      },
      _audioContext: {
        value: null,
        writable: true
      },
      _holders: {
        value: new Set()
      },
      AudioContextFactory: {
        enumerable: true,
        value: AudioContextFactory
      }
    });
  }

  /**
   * Each call to {@link AudioContextFactory#getOrCreate} should be paired with a
   * call to {@link AudioContextFactory#release}. Calling this increments an
   * internal reference count.
   * @param {*} holder - The object to hold a reference to the AudioContext
   * @returns {?AudioContext}
   */


  _createClass(AudioContextFactory, [{
    key: 'getOrCreate',
    value: function getOrCreate(holder) {
      if (!this._holders.has(holder)) {
        this._holders.add(holder);
        if (this._AudioContext && !this._audioContext) {
          try {
            this._audioContext = new this._AudioContext();
          } catch (error) {
            // Do nothing;
          }
        }
      }
      return this._audioContext;
    }

    /**
     * Decrement the internal reference count. If it reaches zero, close and destroy
     * the AudioContext.
     * @param {*} holder - The object that held a reference to the AudioContext
     * @returns {void}
     */

  }, {
    key: 'release',
    value: function release(holder) {
      if (this._holders.has(holder)) {
        this._holders.delete(holder);
        if (!this._holders.size && this._audioContext) {
          this._audioContext.close();
          this._audioContext = null;
        }
      }
    }
  }]);

  return AudioContextFactory;
}();

module.exports = new AudioContextFactory();
},{}],128:[function(require,module,exports){
'use strict';

/**
 * Return a Promise that resolves after `timeout` milliseconds.
 * @param {?number} [timeout=0]
 * @returns {Promise<void>}
 */

function delay(timeout) {
  timeout = typeof timeout === 'number' ? timeout : 0;
  return new Promise(function (resolve) {
    return setTimeout(resolve, timeout);
  });
}

/**
 * Attempt to detect silence. The Promise returned by this function returns
 * false as soon as audio is detected or true after `timeout` milliseconds.
 * @param {AudioContext} audioContext
 * @param {MediaStream} stream
 * @param {?number} [timeout=250]
 * @returns {Promise<boolean>}
 */
function detectSilence(audioContext, stream, timeout) {
  timeout = typeof timeout === 'number' ? timeout : 250;

  var source = audioContext.createMediaStreamSource(stream);
  var analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  var samples = new Uint8Array(analyser.fftSize);

  var timeoutDidFire = false;
  setTimeout(function () {
    timeoutDidFire = true;
  }, timeout);

  /**
   * We can't use async/await yet, so I need to factor this out.
   * @returns {Promise<boolean>}
   */
  function doDetectSilence() {
    if (timeoutDidFire) {
      return Promise.resolve(true);
    }
    analyser.getByteTimeDomainData(samples);
    return samples.some(function (sample) {
      return sample;
    }) ? Promise.resolve(false) : delay().then(doDetectSilence);
  }

  return doDetectSilence().then(function (isSilent) {
    source.disconnect();
    return isSilent;
  }, function (error) {
    source.disconnect();
    throw error;
  });
}

module.exports = detectSilence;
},{}],129:[function(require,module,exports){
'use strict';

var detectSilence = require('./detectsilence');

/**
 * This function attempts to workaround WebKit Bug 180748. It does so by
 *
 *   1. Calling `getUserMedia`, and
 *   2. Checking to see if the resulting MediaStream is silent.
 *   3. If so, repeat Step 1; otherwise, return the MediaStream.
 *
 * The function only repeats up to `n` times, and it only waits `timeout`
 * milliseconds when detecting silence. Assuming `getUserMedia` is
 * instantaneous, in the best case, this function returns a Promise that
 * resolves immediately; in the worst case, this function returns a Promise that
 * resolves in `n` * `timeout` milliseconds.
 *
 * @param {Log} log
 * @param {function(MediaStreamConstraints): Promise<MediaStream>} getUserMedia
 * @param {MediaStreamConstraints} constraints
 * @param {number} [n=3]
 * @param {number} [timeout=250]
 * @returns Promise<MediaStream>
 */
function workaround(log, getUserMedia, constraints, n, timeout) {
  n = typeof n === 'number' ? n : 3;
  var retry = 0;

  // NOTE(mroberts): We have to delay require-ing AudioContextFactory, because
  // it exports a default instance whose constructor calls Object.assign.
  var AudioContextFactory = require('./audiocontext');
  var holder = {};
  var audioContext = AudioContextFactory.getOrCreate(holder);

  /**
   * We can't use async/await yet, so I need to factor this out.
   * @returns {Promise<MediaStream>}
   */
  function doWorkaround() {
    return getUserMedia(constraints).then(function (stream) {
      var isSilentPromise = constraints.audio ? detectSilence(audioContext, stream, timeout).catch(function () {
        return true;
      }) : Promise.resolve(false);
      return isSilentPromise.then(function (isSilent) {
        if (!isSilent) {
          log.info('Got a non-silent audio MediaStreamTrack; returning it.');
          return stream;
        } else if (n <= 0) {
          log.warn('Got a silent audio MediaStreamTrack. Normally we would try \
to get a new one, but we\'ve run out of retries; returning it anyway.');
          return stream;
        }
        log.warn('Got a silent audio MediaStreamTrack. Stopping all MediaStreamTracks and calling getUserMedia again. This is retry #' + ++retry + '.');
        stream.getTracks().forEach(function (track) {
          return track.stop();
        });
        n--;
        return doWorkaround();
      });
    });
  }

  return doWorkaround().then(function (stream) {
    AudioContextFactory.release(holder);
    return stream;
  }, function (error) {
    AudioContextFactory.release(holder);
    throw error;
  });
}

module.exports = workaround;
},{"./audiocontext":127,"./detectsilence":128}],130:[function(require,module,exports){
'use strict';

var flatMap = require('./util').flatMap;
var guessBrowser = require('./util').guessBrowser;
var getSdpFormat = require('./util/sdp').getSdpFormat;

var guess = guessBrowser();
var isChrome = guess === 'chrome';
var isFirefox = guess === 'firefox';
var isSafari = guess === 'safari';

var chromeMajorVersion = isChrome
  ? parseInt(navigator.userAgent.match(/Chrome\/([0-9]+)/)[1], 10)
  : null;

var CHROME_LEGACY_MAX_AUDIO_LEVEL = 32767;

/**
 * Get the standardized {@link RTCPeerConnection} statistics.
 * @param {RTCPeerConnection} peerConnection
 * @param {object} [options] - Used for testing
 * @returns {Promise.<StandardizedStatsResponse>}
 */
function getStats(peerConnection, options) {
  if (!(peerConnection && typeof peerConnection.getStats === 'function')) {
    return Promise.reject(new Error('Given PeerConnection does not support getStats'));
  }
  return _getStats(peerConnection, options);
}

/**
 * getStats() implementation.
 * @param {RTCPeerConnection} peerConnection
 * @param {object} [options] - Used for testing
 * @returns {Promise.<StandardizedStatsResponse>}
 */
function _getStats(peerConnection, options) {
  var localAudioTracks = getTracks(peerConnection, 'audio', 'local');
  var localVideoTracks = getTracks(peerConnection, 'video', 'local');
  var remoteAudioTracks = getTracks(peerConnection, 'audio');
  var remoteVideoTracks = getTracks(peerConnection, 'video');

  var statsResponse = {
    activeIceCandidatePair: null,
    localAudioTrackStats: [],
    localVideoTrackStats: [],
    remoteAudioTrackStats: [],
    remoteVideoTrackStats: []
  };

  var trackStatsPromises = flatMap([
    [localAudioTracks, 'localAudioTrackStats', false],
    [localVideoTracks, 'localVideoTrackStats', false],
    [remoteAudioTracks, 'remoteAudioTrackStats', true],
    [remoteVideoTracks, 'remoteVideoTrackStats', true]
  ], function(triple) {
    var tracks = triple[0];
    var statsArrayName = triple[1];
    var isRemote = triple[2];
    return tracks.map(function(track) {
      return getTrackStats(peerConnection, track, Object.assign({
        isRemote: isRemote
      }, options)).then(function(stats) {
        stats.trackId = track.id;
        statsResponse[statsArrayName].push(stats);
      });
    });
  });

  return Promise.all(trackStatsPromises).then(function() {
    return getActiveIceCandidatePairStats(peerConnection, options);
  }).then(function(activeIceCandidatePairStatsReport) {
    statsResponse.activeIceCandidatePair = activeIceCandidatePairStatsReport;
    return statsResponse;
  });
}

/**
 * Generate the {@link StandardizedActiveIceCandidatePairStatsReport} for the
 * {@link RTCPeerConnection}.
 * @param {RTCPeerConnection} peerConnection
 * @param {object} [options]
 * @returns {Promise<StandardizedActiveIceCandidatePairStatsReport>}
 */
function getActiveIceCandidatePairStats(peerConnection, options) {
  options = options || {};

  if (typeof options.testForChrome !== 'undefined' || isChrome
    || typeof options.testForSafari  !== 'undefined' || isSafari) {
    return peerConnection.getStats().then(
      standardizeChromeOrSafariActiveIceCandidatePairStats);
  }
  if (typeof options.testForFirefox !== 'undefined' || isFirefox) {
    return peerConnection.getStats().then(standardizeFirefoxActiveIceCandidatePairStats);
  }
  return Promise.reject(new Error('RTCPeerConnection#getStats() not supported'));
}

/**
 * Standardize the active RTCIceCandidate pair's statistics in Chrome or Safari.
 * @param {RTCStatsReport} stats
 * @returns {?StandardizedActiveIceCandidatePairStatsReport}
 */
function standardizeChromeOrSafariActiveIceCandidatePairStats(stats) {
  var activeCandidatePairStats = Array.from(stats.values()).find(function(stat) {
    return stat.type === 'candidate-pair' && stat.nominated;
  });

  if (!activeCandidatePairStats) {
    return null;
  }

  var activeLocalCandidateStats = stats.get(activeCandidatePairStats.localCandidateId);
  var activeRemoteCandidateStats = stats.get(activeCandidatePairStats.remoteCandidateId);

  var standardizedCandidateStatsKeys = [
    { key: 'candidateType', type: 'string' },
    { key: 'ip', type: 'string' },
    { key: 'port', type: 'number' },
    { key: 'priority', type: 'number' },
    { key: 'protocol', type: 'string' },
    { key: 'url', type: 'string' }
  ];

  var standardizedLocalCandidateStatsKeys = standardizedCandidateStatsKeys.concat([
    { key: 'deleted', type: 'boolean' },
    { key: 'relayProtocol', type: 'string' }
  ]);

  var standatdizedLocalCandidateStatsReport = activeLocalCandidateStats
    ? standardizedLocalCandidateStatsKeys.reduce(function(report, keyInfo) {
      report[keyInfo.key] = typeof activeLocalCandidateStats[keyInfo.key] === keyInfo.type
        ? activeLocalCandidateStats[keyInfo.key]
        : keyInfo.key === 'deleted' ? false : null;
      return report;
    }, {})
    : null;

  var standardizedRemoteCandidateStatsReport = activeRemoteCandidateStats
    ? standardizedCandidateStatsKeys.reduce(function(report, keyInfo) {
      report[keyInfo.key] = typeof activeRemoteCandidateStats[keyInfo.key] === keyInfo.type
        ? activeRemoteCandidateStats[keyInfo.key]
        : null;
      return report;
    }, {})
    : null;

  return [
    { key: 'availableIncomingBitrate', type: 'number' },
    { key: 'availableOutgoingBitrate', type: 'number' },
    { key: 'bytesReceived', type: 'number' },
    { key: 'bytesSent', type: 'number' },
    { key: 'consentRequestsSent', type: 'number' },
    { key: 'currentRoundTripTime', type: 'number' },
    { key: 'lastPacketReceivedTimestamp', type: 'number' },
    { key: 'lastPacketSentTimestamp', type: 'number' },
    { key: 'nominated', type: 'boolean' },
    { key: 'priority', type: 'number' },
    { key: 'readable', type: 'boolean' },
    { key: 'requestsReceived', type: 'number' },
    { key: 'requestsSent', type: 'number' },
    { key: 'responsesReceived', type: 'number' },
    { key: 'responsesSent', type: 'number' },
    { key: 'retransmissionsReceived', type: 'number' },
    { key: 'retransmissionsSent', type: 'number' },
    { key: 'state', type: 'string' },
    { key: 'totalRoundTripTime', type: 'number' },
    { key: 'transportId', type: 'string' },
    { key: 'writable', type: 'boolean' }
  ].reduce(function(report, keyInfo) {
    report[keyInfo.key] = typeof activeCandidatePairStats[keyInfo.key] === keyInfo.type
      ? activeCandidatePairStats[keyInfo.key]
      : null;
    return report;
  }, {
    localCandidate: standatdizedLocalCandidateStatsReport,
    remoteCandidate: standardizedRemoteCandidateStatsReport
  });
}

/**
 * Standardize the active RTCIceCandidate pair's statistics in Firefox.
 * @param {RTCStatsReport} stats
 * @returns {?StandardizedActiveIceCandidatePairStatsReport}
 */
function standardizeFirefoxActiveIceCandidatePairStats(stats) {
  var activeCandidatePairStats = Array.from(stats.values()).find(function(stat) {
    return stat.type === 'candidate-pair' && stat.nominated;
  });

  if (!activeCandidatePairStats) {
    return null;
  }

  var activeLocalCandidateStats = stats.get(activeCandidatePairStats.localCandidateId);
  var activeRemoteCandidateStats = stats.get(activeCandidatePairStats.remoteCandidateId);

  var standardizedCandidateStatsKeys = [
    { key: 'candidateType', type: 'string' },
    { key: 'ip', ffKeys: ['address', 'ipAddress'], type: 'string' },
    { key: 'port', ffKeys: ['portNumber'], type: 'number' },
    { key: 'priority', type: 'number' },
    { key: 'protocol', ffKeys: ['transport'], type: 'string' },
    { key: 'url', type: 'string' }
  ];

  var standardizedLocalCandidateStatsKeys = standardizedCandidateStatsKeys.concat([
    { key: 'deleted', type: 'boolean' },
    { key: 'relayProtocol', type: 'string' }
  ]);

  var candidateTypes = {
    host: 'host',
    peerreflexive: 'prflx',
    relayed: 'relay',
    serverreflexive: 'srflx'
  };

  var standatdizedLocalCandidateStatsReport = activeLocalCandidateStats
    ? standardizedLocalCandidateStatsKeys.reduce(function(report, keyInfo) {
      var key = keyInfo.ffKeys && keyInfo.ffKeys.find(function(key) {
        return key in activeLocalCandidateStats;
      }) || keyInfo.key;
      report[keyInfo.key] = typeof activeLocalCandidateStats[key] === keyInfo.type
        ? key === 'candidateType'
          ? candidateTypes[activeLocalCandidateStats[key]] || activeLocalCandidateStats[key]
          : activeLocalCandidateStats[key]
        : key === 'deleted' ? false : null;
      return report;
    }, {})
    : null;

  var standardizedRemoteCandidateStatsReport = activeRemoteCandidateStats
    ? standardizedCandidateStatsKeys.reduce(function(report, keyInfo) {
      var key = keyInfo.ffKeys && keyInfo.ffKeys.find(function(key) {
        return key in activeRemoteCandidateStats;
      }) || keyInfo.key;
      report[keyInfo.key] = typeof activeRemoteCandidateStats[key] === keyInfo.type
        ? key === 'candidateType'
          ? candidateTypes[activeRemoteCandidateStats[key]] || activeRemoteCandidateStats[key]
          : activeRemoteCandidateStats[key]
        : null;
      return report;
    }, {})
    : null;

  return [
    { key: 'availableIncomingBitrate', type: 'number' },
    { key: 'availableOutgoingBitrate', type: 'number' },
    { key: 'bytesReceived', type: 'number' },
    { key: 'bytesSent', type: 'number' },
    { key: 'consentRequestsSent', type: 'number' },
    { key: 'currentRoundTripTime', type: 'number' },
    { key: 'lastPacketReceivedTimestamp', type: 'number' },
    { key: 'lastPacketSentTimestamp', type: 'number' },
    { key: 'nominated', type: 'boolean' },
    { key: 'priority', type: 'number' },
    { key: 'readable', type: 'boolean' },
    { key: 'requestsReceived', type: 'number' },
    { key: 'requestsSent', type: 'number' },
    { key: 'responsesReceived', type: 'number' },
    { key: 'responsesSent', type: 'number' },
    { key: 'retransmissionsReceived', type: 'number' },
    { key: 'retransmissionsSent', type: 'number' },
    { key: 'state', type: 'string' },
    { key: 'totalRoundTripTime', type: 'number' },
    { key: 'transportId', type: 'string' },
    { key: 'writable', type: 'boolean' }
  ].reduce(function(report, keyInfo) {
    report[keyInfo.key] = typeof activeCandidatePairStats[keyInfo.key] === keyInfo.type
      ? activeCandidatePairStats[keyInfo.key]
      : null;
    return report;
  }, {
    localCandidate: standatdizedLocalCandidateStatsReport,
    remoteCandidate: standardizedRemoteCandidateStatsReport
  });
}

/**
 * Get local/remote audio/video MediaStreamTracks.
 * @param {RTCPeerConnection} peerConnection - The RTCPeerConnection
 * @param {string} kind - 'audio' or 'video'
 * @param {string} [localOrRemote] - 'local' or 'remote'
 * @returns {Array<MediaStreamTrack>}
 */
function getTracks(peerConnection, kind, localOrRemote) {
  var getSendersOrReceivers = localOrRemote === 'local' ? 'getSenders' : 'getReceivers';
  if (peerConnection[getSendersOrReceivers]) {
    return peerConnection[getSendersOrReceivers]().map(function(senderOrReceiver) {
      return senderOrReceiver.track;
    }).filter(function(track) {
      return track && track.kind === kind;
    });
  }
  var getStreams = localOrRemote === 'local' ? 'getLocalStreams' : 'getRemoteStreams';
  return flatMap(peerConnection[getStreams](), function(stream) {
    var getTracks = kind === 'audio' ? 'getAudioTracks' : 'getVideoTracks';
    return stream[getTracks]();
  });
}

/**
 * Get the standardized statistics for a particular MediaStreamTrack.
 * @param {RTCPeerConnection} peerConnection
 * @param {MediaStreamTrack} track
 * @param {object} [options] - Used for testing
 * @returns {Promise.<StandardizedTrackStatsReport>}
 */
function getTrackStats(peerConnection, track, options) {
  options = options || {};

  if (typeof options.testForChrome !== 'undefined' || isChrome) {
    return chromeOrSafariGetTrackStats(peerConnection, track);
  }
  if (typeof options.testForFirefox  !== 'undefined' || isFirefox) {
    return firefoxGetTrackStats(peerConnection, track, options.isRemote);
  }
  if (typeof options.testForSafari  !== 'undefined' || isSafari) {
    if (typeof options.testForSafari  !== 'undefined' || getSdpFormat() === 'unified') {
      return chromeOrSafariGetTrackStats(peerConnection, track);
    }
    // NOTE(syerrapragada): getStats() is not supported on
    // Safari versions where plan-b is the SDP format
    // due to this bug: https://bugs.webkit.org/show_bug.cgi?id=192601
    return Promise.reject(new Error([
      'getStats() is not supported on this version of Safari',
      'due to this bug: https://bugs.webkit.org/show_bug.cgi?id=192601'
    ].join(' ')));
  }
  return Promise.reject(new Error('RTCPeerConnection#getStats() not supported'));
}

/**
 * Get the standardized statistics for a particular MediaStreamTrack in Chrome or Safari.
 * @param {RTCPeerConnection} peerConnection
 * @param {MediaStreamTrack} track
 * @returns {Promise.<StandardizedTrackStatsReport>}
 */
function chromeOrSafariGetTrackStats(peerConnection, track) {
  return new Promise(function(resolve, reject) {
    if (chromeMajorVersion && chromeMajorVersion < 67) {
      peerConnection.getStats(function(response) {
        resolve(standardizeChromeLegacyStats(response, track));
      }, null, reject);
      return;
    }
    peerConnection.getStats(track).then(function(response) {
      resolve(standardizeChromeOrSafariStats(response));
    }, reject);
  });
}

/**
 * Get the standardized statistics for a particular MediaStreamTrack in Firefox.
 * @param {RTCPeerConnection} peerConnection
 * @param {MediaStreamTrack} track
 * @param {boolean} isRemote
 * @returns {Promise.<StandardizedTrackStatsReport>}
 */
function firefoxGetTrackStats(peerConnection, track, isRemote) {
  return new Promise(function(resolve, reject) {
    peerConnection.getStats(track).then(function(response) {
      resolve(standardizeFirefoxStats(response, isRemote));
    }, reject);
  });
}

/**
 * Standardize the MediaStreamTrack's legacy statistics in Chrome.
 * @param {RTCStatsResponse} response
 * @param {MediaStreamTrack} track
 * @returns {StandardizedTrackStatsReport}
 */
function standardizeChromeLegacyStats(response, track) {
  var ssrcReport = response.result().find(function(report) {
    return report.type === 'ssrc' && report.stat('googTrackId') === track.id;
  });

  var standardizedStats = {};

  if (ssrcReport) {
    standardizedStats.timestamp = Math.round(Number(ssrcReport.timestamp));
    standardizedStats = ssrcReport.names().reduce(function(stats, name) {
      switch (name) {
        case 'googCodecName':
          stats.codecName = ssrcReport.stat(name);
          break;
        case 'googRtt':
          stats.roundTripTime = Number(ssrcReport.stat(name));
          break;
        case 'googJitterReceived':
          stats.jitter = Number(ssrcReport.stat(name));
          break;
        case 'googFrameWidthInput':
          stats.frameWidthInput = Number(ssrcReport.stat(name));
          break;
        case 'googFrameHeightInput':
          stats.frameHeightInput = Number(ssrcReport.stat(name));
          break;
        case 'googFrameWidthSent':
          stats.frameWidthSent = Number(ssrcReport.stat(name));
          break;
        case 'googFrameHeightSent':
          stats.frameHeightSent = Number(ssrcReport.stat(name));
          break;
        case 'googFrameWidthReceived':
          stats.frameWidthReceived = Number(ssrcReport.stat(name));
          break;
        case 'googFrameHeightReceived':
          stats.frameHeightReceived = Number(ssrcReport.stat(name));
          break;
        case 'googFrameRateInput':
          stats.frameRateInput = Number(ssrcReport.stat(name));
          break;
        case 'googFrameRateSent':
          stats.frameRateSent = Number(ssrcReport.stat(name));
          break;
        case 'googFrameRateReceived':
          stats.frameRateReceived = Number(ssrcReport.stat(name));
          break;
        case 'ssrc':
          stats[name] = ssrcReport.stat(name);
          break;
        case 'bytesReceived':
        case 'bytesSent':
        case 'packetsLost':
        case 'packetsReceived':
        case 'packetsSent':
        case 'audioInputLevel':
        case 'audioOutputLevel':
          stats[name] = Number(ssrcReport.stat(name));
          break;
      }

      return stats;
    }, standardizedStats);
  }

  return standardizedStats;
}

/**
 * Standardize the MediaStreamTrack's statistics in Chrome or Safari.
 * @param {RTCStatsResponse} response
 * @returns {StandardizedTrackStatsReport}
 */
function standardizeChromeOrSafariStats(response) {
  var inbound = null;
  var outbound = null;
  var track = null;
  var codec = null;

  response.forEach(function(stat) {
    switch (stat.type) {
      case 'inbound-rtp':
        inbound = stat;
        break;
      case 'outbound-rtp':
        outbound = stat;
        break;
      case 'track':
        track = stat;
        break;
      case 'codec':
        codec = stat;
        break;
    }
  });

  var isRemote = track && track.remoteSource;
  var standardizedStats = {};

  var first = isRemote ? inbound : outbound;
  var second = track;
  var third = codec;

  function getStatValue(name) {
    if (first && typeof first[name] !== 'undefined') {
      return first[name];
    }

    if (second && typeof second[name] !== 'undefined') {
      return second[name];
    }

    if (third && typeof third[name] !== 'undefined') {
      return third[name];
    }

    return null;
  }

  var ssrc = getStatValue('ssrc');
  if (typeof ssrc === 'number') {
    standardizedStats.ssrc = String(ssrc);
  }

  var timestamp = getStatValue('timestamp');
  standardizedStats.timestamp = Math.round(timestamp);

  var mimeType = getStatValue('mimeType');
  if (typeof mimeType === 'string') {
    mimeType = mimeType.split('/');
    standardizedStats.codecName = mimeType[mimeType.length - 1];
  }

  var roundTripTime = getStatValue('roundTripTime');
  if (typeof roundTripTime === 'number') {
    standardizedStats.roundTripTime = roundTripTime;
  }

  var jitter = getStatValue('jitter');
  if (typeof jitter === 'number') {
    standardizedStats.jitter = Math.round(jitter * 1000);
  }

  var frameWidth = getStatValue('frameWidth');
  if (typeof frameWidth === 'number') {
    if (isRemote) {
      standardizedStats.frameWidthReceived = frameWidth;
    } else {
      standardizedStats.frameWidthSent = frameWidth;
    }
  }

  var frameHeight = getStatValue('frameHeight');
  if (typeof frameHeight === 'number') {
    if (isRemote) {
      standardizedStats.frameHeightReceived = frameHeight;
    } else {
      standardizedStats.frameHeightSent = frameHeight;
    }
  }

  var framesPerSecond = getStatValue('framesPerSecond');
  if (typeof framesPerSecond === 'number') {
    standardizedStats.frameRateSent = framesPerSecond;
  }

  var bytesReceived = getStatValue('bytesReceived');
  if (typeof bytesReceived === 'number') {
    standardizedStats.bytesReceived = bytesReceived;
  }

  var bytesSent = getStatValue('bytesSent');
  if (typeof bytesSent === 'number') {
    standardizedStats.bytesSent = bytesSent;
  }

  var packetsLost = getStatValue('packetsLost');
  if (typeof packetsLost === 'number') {
    standardizedStats.packetsLost = packetsLost;
  }

  var packetsReceived = getStatValue('packetsReceived');
  if (typeof packetsReceived === 'number') {
    standardizedStats.packetsReceived = packetsReceived;
  }

  var packetsSent = getStatValue('packetsSent');
  if (typeof packetsSent === 'number') {
    standardizedStats.packetsSent = packetsSent;
  }

  var audioLevel = getStatValue('audioLevel');
  if (typeof audioLevel === 'number') {
    audioLevel = Math.round(audioLevel * CHROME_LEGACY_MAX_AUDIO_LEVEL);
    if (isRemote) {
      standardizedStats.audioOutputLevel = audioLevel;
    } else {
      standardizedStats.audioInputLevel = audioLevel;
    }
  }

  return standardizedStats;
}

/**
 * Standardize the MediaStreamTrack's statistics in Firefox.
 * @param {RTCStatsReport} response
 * @param {boolean} isRemote
 * @returns {StandardizedTrackStatsReport}
 */
function standardizeFirefoxStats(response, isRemote) {
  // NOTE(mroberts): If getStats is called on a closed RTCPeerConnection,
  // Firefox returns undefined instead of an RTCStatsReport. We workaround this
  // here. See the following bug for more details:
  //
  //   https://bugzilla.mozilla.org/show_bug.cgi?id=1377225
  //
  response = response || new Map();

  var inbound = null;
  var outbound = null;

  // NOTE(mmalavalli): Starting from Firefox 63, RTC{Inbound, Outbound}RTPStreamStats.isRemote
  // will be deprecated, followed by its removal in Firefox 66. Also, trying to
  // access members of the remote RTC{Inbound, Outbound}RTPStreamStats without
  // using RTCStatsReport.get(remoteId) will trigger console warnings. So, we
  // no longer depend on "isRemote", and we call RTCStatsReport.get(remoteId)
  // to access the remote RTC{Inbound, Outbound}RTPStreamStats.
  //
  // Source: https://blog.mozilla.org/webrtc/getstats-isremote-65/
  //
  response.forEach(function(stat) {
    if (stat.isRemote) {
      return;
    }
    switch (stat.type) {
      case 'inbound-rtp':
        inbound = stat;
        outbound = response.get(stat.remoteId);
        break;
      case 'outbound-rtp':
        outbound = stat;
        inbound = response.get(stat.remoteId);
        break;
    }
  });

  var first = isRemote ? inbound : outbound;
  var second = isRemote ? outbound : inbound;

  function getStatValue(name) {
    if (first && typeof first[name] !== 'undefined') {
      return first[name];
    }
    if (second && typeof second[name] !== 'undefined') {
      return second[name];
    }
    return null;
  }

  var standardizedStats = {};
  var timestamp = getStatValue('timestamp');
  standardizedStats.timestamp = Math.round(timestamp);

  var ssrc = getStatValue('ssrc');
  if (typeof ssrc === 'number') {
    standardizedStats.ssrc = String(ssrc);
  }

  var bytesSent = getStatValue('bytesSent');
  if (typeof bytesSent === 'number') {
    standardizedStats.bytesSent = bytesSent;
  }

  var packetsLost = getStatValue('packetsLost');
  if (typeof packetsLost === 'number') {
    standardizedStats.packetsLost = packetsLost;
  }

  var packetsSent = getStatValue('packetsSent');
  if (typeof packetsSent === 'number') {
    standardizedStats.packetsSent = packetsSent;
  }

  var roundTripTime = getStatValue('roundTripTime');
  if (typeof roundTripTime === 'number') {
    standardizedStats.roundTripTime = roundTripTime;
  }

  var jitter = getStatValue('jitter');
  if (typeof jitter === 'number') {
    standardizedStats.jitter = Math.round(jitter * 1000);
  }

  var frameRateSent = getStatValue('framerateMean');
  if (typeof frameRateSent === 'number') {
    standardizedStats.frameRateSent = Math.round(frameRateSent);
  }

  var bytesReceived = getStatValue('bytesReceived');
  if (typeof bytesReceived === 'number') {
    standardizedStats.bytesReceived = bytesReceived;
  }

  var packetsReceived = getStatValue('packetsReceived');
  if (typeof packetsReceived === 'number') {
    standardizedStats.packetsReceived = packetsReceived;
  }

  var frameRateReceived = getStatValue('framerateMean');
  if (typeof frameRateReceived === 'number') {
    standardizedStats.frameRateReceived = Math.round(frameRateReceived);
  }

  return standardizedStats;
}

/**
 * Standardized RTCIceCandidate statistics.
 * @typedef {object} StandardizedIceCandidateStatsReport
 * @property {'host'|'prflx'|'relay'|'srflx'} candidateType
 * @property {string} ip
 * @property {number} port
 * @property {number} priority
 * @property {'tcp'|'udp'} protocol
 * @property {string} url
 */

/**
 * Standardized local RTCIceCandidate statistics.
 * @typedef {StandardizedIceCandidateStatsReport} StandardizedLocalIceCandidateStatsReport
 * @property {boolean} [deleted=false]
 * @property {'tcp'|'tls'|'udp'} relayProtocol
 */

/**
 * Standardized active RTCIceCandidate pair statistics.
 * @typedef {object} StandardizedActiveIceCandidatePairStatsReport
 * @property {number} availableIncomingBitrate
 * @property {number} availableOutgoingBitrate
 * @property {number} bytesReceived
 * @property {number} bytesSent
 * @property {number} consentRequestsSent
 * @property {number} currentRoundTripTime
 * @property {number} lastPacketReceivedTimestamp
 * @property {number} lastPacketSentTimestamp
 * @property {StandardizedLocalIceCandidateStatsReport} localCandidate
 * @property {boolean} nominated
 * @property {number} priority
 * @property {boolean} readable
 * @property {StandardizedIceCandidateStatsReport} remoteCandidate
 * @property {number} requestsReceived
 * @property {number} requestsSent
 * @property {number} responsesReceived
 * @property {number} responsesSent
 * @property {number} retransmissionsReceived
 * @property {number} retransmissionsSent
 * @property {'frozen'|'waiting'|'in-progress'|'failed'|'succeeded'} state
 * @property {number} totalRoundTripTime
 * @property {string} transportId
 * @property {boolean} writable
 */

/**
 * Standardized {@link RTCPeerConnection} statistics.
 * @typedef {Object} StandardizedStatsResponse
 * @property {StandardizedActiveIceCandidatePairStatsReport} activeIceCandidatePair - Stats for active ICE candidate pair
 * @property Array<StandardizedTrackStatsReport> localAudioTrackStats - Stats for local audio MediaStreamTracks
 * @property Array<StandardizedTrackStatsReport> localVideoTrackStats - Stats for local video MediaStreamTracks
 * @property Array<StandardizedTrackStatsReport> remoteAudioTrackStats - Stats for remote audio MediaStreamTracks
 * @property Array<StandardizedTrackStatsReport> remoteVideoTrackStats - Stats for remote video MediaStreamTracks
 */

/**
 * Standardized MediaStreamTrack statistics.
 * @typedef {Object} StandardizedTrackStatsReport
 * @property {string} trackId - MediaStreamTrack ID
 * @property {string} ssrc - SSRC of the MediaStreamTrack
 * @property {number} timestamp - The Unix timestamp in milliseconds
 * @property {string} [codecName] - Name of the codec used to encode the MediaStreamTrack's media
 * @property {number} [roundTripTime] - Round trip time in milliseconds
 * @property {number} [jitter] - Jitter in milliseconds
 * @property {number} [frameWidthInput] - Width in pixels of the local video MediaStreamTrack's captured frame
 * @property {number} [frameHeightInput] - Height in pixels of the local video MediaStreamTrack's captured frame
 * @property {number} [frameWidthSent] - Width in pixels of the local video MediaStreamTrack's encoded frame
 * @property {number} [frameHeightSent] - Height in pixels of the local video MediaStreamTrack's encoded frame
 * @property {number} [frameWidthReceived] - Width in pixels of the remote video MediaStreamTrack's received frame
 * @property {number} [frameHeightReceived] - Height in pixels of the remote video MediaStreamTrack's received frame
 * @property {number} [frameRateInput] - Captured frames per second of the local video MediaStreamTrack
 * @property {number} [frameRateSent] - Frames per second of the local video MediaStreamTrack's encoded video
 * @property {number} [frameRateReceived] - Frames per second of the remote video MediaStreamTrack's received video
 * @property {number} [bytesReceived] - Number of bytes of the remote MediaStreamTrack's media received
 * @property {number} [bytesSent] - Number of bytes of the local MediaStreamTrack's media sent
 * @property {number} [packetsLost] - Number of packets of the MediaStreamTrack's media lost
 * @property {number} [packetsReceived] - Number of packets of the remote MediaStreamTrack's media received
 * @property {number} [packetsSent] - Number of packets of the local MediaStreamTrack's media sent
 * @property {AudioLevel} [audioInputLevel] - The {@link AudioLevel} of the local audio MediaStreamTrack
 * @property {AudioLevel} [audioOutputLevel] - The {@link AudioLevel} of the remote video MediaStreamTrack
 */

module.exports = getStats;

},{"./util":145,"./util/sdp":147}],131:[function(require,module,exports){
'use strict';

/**
 * This function is very similar to <code>navigator.getUserMedia</code> except
 * that it does not use callbacks and returns a Promise for a MediaStream
 * @function getUserMedia
 * @param {MediaStreamConstraints} [constraints={audio:true,video:true}] - the
 *   MediaStreamConstraints object specifying what kind of LocalMediaStream to
 *   request from the browser (by default both audio and video)
 * @returns Promise<MediaStream>
 */
function getUserMedia(constraints) {
  return new Promise(function getUserMediaPromise(resolve, reject) {
    _getUserMedia(constraints || { audio: true, video: true }, resolve, reject);
  });
}

function _getUserMedia(constraints, onSuccess, onFailure) {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    if (typeof navigator.mediaDevices === 'object' &&
        typeof navigator.mediaDevices.getUserMedia === 'function') {
      navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onFailure);
      return;
    } else if (typeof navigator.webkitGetUserMedia === 'function') {
      navigator.webkitGetUserMedia(constraints, onSuccess, onFailure);
      return;
    } else if (typeof navigator.mozGetUserMedia === 'function') {
      navigator.mozGetUserMedia(constraints, onSuccess, onFailure);
      return;
    }
  }
  onFailure(new Error('getUserMedia is not supported'));
}

module.exports = getUserMedia;

},{}],132:[function(require,module,exports){
'use strict';

var WebRTC = {};

Object.defineProperties(WebRTC, {
  getStats: {
    enumerable: true,
    value: require('./getstats')
  },
  getUserMedia: {
    enumerable: true,
    value: require('./getusermedia')
  },
  MediaStream: {
    enumerable: true,
    value: require('./mediastream')
  },
  MediaStreamTrack: {
    enumerable: true,
    value: require('./mediastreamtrack')
  },
  RTCIceCandidate: {
    enumerable: true,
    value: require('./rtcicecandidate')
  },
  RTCPeerConnection: {
    enumerable: true,
    value: require('./rtcpeerconnection')
  },
  RTCSessionDescription: {
    enumerable: true,
    value: require('./rtcsessiondescription')
  },
  version: {
    enumerable: true,
    value: require('../package.json').version
  }
});

module.exports = WebRTC;

},{"../package.json":148,"./getstats":130,"./getusermedia":131,"./mediastream":133,"./mediastreamtrack":134,"./rtcicecandidate":135,"./rtcpeerconnection":138,"./rtcsessiondescription":143}],133:[function(require,module,exports){
/* globals MediaStream */
'use strict';

if (typeof MediaStream !== 'undefined') {
  module.exports = MediaStream;
} else {
  module.exports = function MediaStream() {
    throw new Error('WebRTC is not supported in this browser');
  };
}

},{}],134:[function(require,module,exports){
/* global MediaStreamTrack */
'use strict';

if (typeof MediaStreamTrack !== 'undefined') {
  module.exports = MediaStreamTrack;
} else {
  module.exports = function MediaStreamTrack() {
    throw new Error('WebRTC is not supported in this browser');
  };
}

},{}],135:[function(require,module,exports){
/* global mozRTCIceCandidate, RTCIceCandidate */
'use strict';

if (typeof RTCIceCandidate !== 'undefined') {
  module.exports = RTCIceCandidate;
} else if (typeof mozRTCIceCandidate !== 'undefined') {
  module.exports = mozRTCIceCandidate;
} else {
  module.exports = function RTCIceCandidate() {
    throw new Error('WebRTC is unsupported');
  };
}

},{}],136:[function(require,module,exports){
/* globals RTCDataChannel, RTCPeerConnection, RTCSessionDescription */
'use strict';

var ChromeRTCSessionDescription = require('../rtcsessiondescription/chrome');
var EventTarget = require('../util/eventtarget');
var inherits = require('util').inherits;
var Latch = require('../util/latch');
var MediaStream = require('../mediastream');
var RTCRtpSenderShim = require('../rtcrtpsender');
var sdpUtils = require('../util/sdp');
var util = require('../util');

// NOTE(mroberts): This class wraps Chrome's RTCPeerConnection implementation.
// It provides some functionality not currently present in Chrome, namely the
// abilities to
//
//   1. Rollback, per the workaround suggested here:
//      https://bugs.chromium.org/p/webrtc/issues/detail?id=5738#c3
//
//   2. Listen for track events, per the adapter.js workaround.
//
//   3. Set iceTransportPolicy.
//
function ChromeRTCPeerConnection(configuration, constraints) {
  if (!(this instanceof ChromeRTCPeerConnection)) {
    return new ChromeRTCPeerConnection(configuration, constraints);
  }

  EventTarget.call(this);

  configuration = configuration || {};
  var newConfiguration = Object.assign(configuration.iceTransportPolicy
    ? { iceTransports: configuration.iceTransportPolicy }
    : {}, configuration);

  util.interceptEvent(this, 'datachannel');
  util.interceptEvent(this, 'signalingstatechange');

  var sdpFormat = sdpUtils.getSdpFormat(newConfiguration.sdpSemantics);
  var peerConnection = new RTCPeerConnection(newConfiguration, constraints);

  Object.defineProperties(this, {
    _localStream: {
      value: new MediaStream()
    },
    _peerConnection: {
      value: peerConnection
    },
    _pendingLocalOffer: {
      value: null,
      writable: true
    },
    _pendingRemoteOffer: {
      value: null,
      writable: true
    },
    _sdpFormat: {
      value: sdpFormat
    },
    _senders: {
      value: new Map()
    },
    _signalingStateLatch: {
      value: new Latch()
    },
    _tracksToSSRCs: {
      value: new Map()
    },
    localDescription: {
      enumerable: true,
      get: function() {
        return this._pendingLocalOffer ? this._pendingLocalOffer : peerConnection.localDescription;
      }
    },
    remoteDescription: {
      enumerable: true,
      get: function() {
        return this._pendingRemoteOffer ? this._pendingRemoteOffer : peerConnection.remoteDescription;
      }
    },
    signalingState: {
      enumerable: true,
      get: function() {
        if (this._pendingLocalOffer) {
          return 'have-local-offer';
        } else if (this._pendingRemoteOffer) {
          return 'have-remote-offer';
        }
        return peerConnection.signalingState;
      }
    }
  });

  var self = this;

  peerConnection.addEventListener('datachannel', function ondatachannel(event) {
    shimDataChannel(event.channel);
    self.dispatchEvent(event);
  });

  peerConnection.addEventListener('signalingstatechange', function onsignalingstatechange() {
    if (!self._pendingLocalOffer && !self._pendingRemoteOffer) {
      self.dispatchEvent.apply(self, arguments);
    }
  });

  peerConnection.ontrack = function ontrack() {
    // NOTE(mroberts): adapter.js's "track" event shim only kicks off if we set
    // the ontrack property of the RTCPeerConnection.
  };

  if (typeof RTCPeerConnection.prototype.addTrack !== 'function') {
    peerConnection.addStream(this._localStream);
  }
  util.proxyProperties(RTCPeerConnection.prototype, this, peerConnection);
}

inherits(ChromeRTCPeerConnection, EventTarget);

if (typeof RTCPeerConnection.prototype.addTrack !== 'function') {
  // NOTE(mmalavalli): This shim supports our limited case of adding
  // all MediaStreamTracks to one MediaStream. It has been implemented this
  // keeping in mind that this is to be maintained only until "addTrack" is
  // supported natively in Chrome.
  ChromeRTCPeerConnection.prototype.addTrack = function addTrack() {
    var args = [].slice.call(arguments);
    var track = args[0];
    if (this._peerConnection.signalingState === 'closed') {
      throw new Error('Cannot add MediaStreamTrack [' + track.id + ', '
        + track.kind + ']: RTCPeerConnection is closed');
    }

    var sender = this._senders.get(track);
    if (sender && sender.track) {
      throw new Error('Cannot add MediaStreamTrack [' + track.id + ', '
        + track.kind + ']: RTCPeerConnection already has it');
    }
    this._peerConnection.removeStream(this._localStream);
    this._localStream.addTrack(track);
    this._peerConnection.addStream(this._localStream);

    sender = new RTCRtpSenderShim(track);
    this._senders.set(track, sender);
    return sender;
  };

  // NOTE(mmalavalli): This shim supports our limited case of removing
  // MediaStreamTracks from one MediaStream. It has been implemented this
  // keeping in mind that this is to be maintained only until "removeTrack" is
  // supported natively in Chrome.
  ChromeRTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
    if (this._peerConnection.signalingState === 'closed') {
      throw new Error('Cannot remove MediaStreamTrack: RTCPeerConnection is closed');
    }

    var track = sender.track;
    if (!track) {
      return;
    }
    sender = this._senders.get(track);
    if (sender && sender.track) {
      sender.track = null;
      this._peerConnection.removeStream(this._localStream);
      this._localStream.removeTrack(track);
      this._peerConnection.addStream(this._localStream);
    }
  };

  ChromeRTCPeerConnection.prototype.getSenders = function getSenders() {
    return Array.from(this._senders.values());
  };
} else {
  ChromeRTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
    if (this._peerConnection.signalingState === 'closed') {
      throw new Error('Cannot remove MediaStreamTrack: RTCPeerConnection is closed');
    }
    try {
      this._peerConnection.removeTrack(sender);
    } catch (e) {
      // NOTE(mhuynh): Do nothing. In Chrome, will throw if a 'sender was not
      // created by this peer connection'. This behavior does not seem to be
      // spec compliant, so a temporary shim is introduced. A bug has been filed,
      // and is tracked here:
      // https://bugs.chromium.org/p/chromium/issues/detail?id=860853
    }
  };
}

ChromeRTCPeerConnection.prototype.addIceCandidate = function addIceCandidate(candidate) {
  var args = [].slice.call(arguments);
  var promise;
  var self = this;

  if (this.signalingState === 'have-remote-offer') {
    // NOTE(mroberts): Because the ChromeRTCPeerConnection simulates the
    // "have-remote-offer" signalingStates, we only want to invoke the true
    // addIceCandidates method when the remote description has been applied.
    promise = this._signalingStateLatch.when('low').then(function signalingStatesResolved() {
      return self._peerConnection.addIceCandidate(candidate);
    });
  } else {
    promise = this._peerConnection.addIceCandidate(candidate);
  }

  return args.length > 1
    ? util.legacyPromise(promise, args[1], args[2])
    : promise;
};

// NOTE(mroberts): The WebRTC spec does not specify that close should throw an
// Error; however, in Chrome it does. We workaround this by checking the
// signalingState manually.
ChromeRTCPeerConnection.prototype.close = function close() {
  if (this.signalingState !== 'closed') {
    this._pendingLocalOffer = null;
    this._pendingRemoteOffer = null;
    this._peerConnection.close();
  }
};

// NOTE(mroberts): Because we workaround Chrome's lack of rollback support by
// "faking" setRemoteDescription, we cannot create an answer until we actually
// apply the remote description. This means, once you call createAnswer, you
// can no longer rollback. This is acceptable for our use case because we will
// apply the newly-created answer almost immediately; however, this may be
// unacceptable for other use cases.
ChromeRTCPeerConnection.prototype.createAnswer = function createAnswer() {
  var args = [].slice.call(arguments);
  var promise;
  var self = this;

  if (this._pendingRemoteOffer) {
    promise = this._peerConnection.setRemoteDescription(this._pendingRemoteOffer).then(function setRemoteDescriptionSucceeded() {
      // NOTE(mroberts): The signalingStates between the ChromeRTCPeerConnection
      // and the underlying RTCPeerConnection implementation have converged. We
      // can unblock any pending calls to addIceCandidate now.
      self._signalingStateLatch.lower();
      return self._peerConnection.createAnswer();
    }).then(function createAnswerSucceeded(answer) {
      self._pendingRemoteOffer = null;
      return new ChromeRTCSessionDescription({
        type: 'answer',
        sdp: updateTrackIdsToSSRCs(self._sdpFormat, self._tracksToSSRCs, answer.sdp)
      });
    }, function setRemoteDescriptionOrCreateAnswerFailed(error) {
      self._pendingRemoteOffer = null;
      throw error;
    });
  } else {
    promise = this._peerConnection.createAnswer().then(function(answer) {
      return new ChromeRTCSessionDescription({
        type: 'answer',
        sdp: updateTrackIdsToSSRCs(self._sdpFormat, self._tracksToSSRCs, answer.sdp)
      });
    });
  }

  return args.length > 1
    ? util.legacyPromise(promise, args[0], args[1])
    : promise;
};

ChromeRTCPeerConnection.prototype.createOffer = function createOffer() {
  var args = [].slice.call(arguments);
  var options = (args.length > 1 ? args[2] : args[0]) || {};
  var self = this;

  var promise = this._peerConnection.createOffer(options).then(function(offer) {
    return new ChromeRTCSessionDescription({
      type: offer.type,
      sdp: updateTrackIdsToSSRCs(self._sdpFormat, self._tracksToSSRCs, offer.sdp)
    });
  });

  return args.length > 1
    ? util.legacyPromise(promise, args[0], args[1])
    : promise;
};

ChromeRTCPeerConnection.prototype.createDataChannel = function createDataChannel(label, dataChannelDict) {
  dataChannelDict = shimDataChannelInit(dataChannelDict);
  var dataChannel = this._peerConnection.createDataChannel(label, dataChannelDict);
  shimDataChannel(dataChannel);
  return dataChannel;
};

ChromeRTCPeerConnection.prototype.setLocalDescription = function setLocalDescription() {
  var args = [].slice.call(arguments);
  var description = args[0];
  var promise = setDescription(this, true, description);
  return args.length > 1
    ? util.legacyPromise(promise, args[1], args[2])
    : promise;
};

ChromeRTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription() {
  var args = [].slice.call(arguments);
  var description = args[0];
  var promise = setDescription(this, false, description);
  return args.length > 1
    ? util.legacyPromise(promise, args[1], args[2])
    : promise;
};

util.delegateMethods(
  RTCPeerConnection.prototype,
  ChromeRTCPeerConnection.prototype,
  '_peerConnection');

// NOTE(mroberts): We workaround Chrome's lack of rollback support, per the
// workaround suggested here: https://bugs.chromium.org/p/webrtc/issues/detail?id=5738#c3
// Namely, we "fake" setting the local or remote description and instead buffer
// it. If we receive or create an answer, then we will actually apply the
// description. Until we receive or create an answer, we will be able to
// "rollback" by simply discarding the buffer description.
function setDescription(peerConnection, local, description) {
  function setPendingLocalOffer(offer) {
    if (local) {
      peerConnection._pendingLocalOffer = offer;
    } else {
      peerConnection._pendingRemoteOffer = offer;
    }
  }

  function clearPendingLocalOffer() {
    if (local) {
      peerConnection._pendingLocalOffer = null;
    } else {
      peerConnection._pendingRemoteOffer = null;
    }
  }

  var pendingLocalOffer = local ? peerConnection._pendingLocalOffer : peerConnection._pendingRemoteOffer;
  var pendingRemoteOffer = local ? peerConnection._pendingRemoteOffer : peerConnection._pendingLocalOffer;
  var intermediateState = local ? 'have-local-offer' : 'have-remote-offer';
  var setLocalDescription = local ? 'setLocalDescription' : 'setRemoteDescription';
  var promise;

  if (!local && pendingRemoteOffer && description.type === 'answer') {
    promise = setRemoteAnswer(peerConnection, description);

  } else if (description.type === 'offer') {
    if (peerConnection.signalingState !== intermediateState && peerConnection.signalingState !== 'stable') {
      // NOTE(mroberts): Error message copied from Firefox.
      return Promise.reject(new Error('Cannot set ' + (local ? 'local' : 'remote') +
        ' offer in state ' + peerConnection.signalingState));
    }

    // We need to save this local offer in case of a rollback. We also need to
    // check to see if the signalingState between the ChromeRTCPeerConnection
    // and the underlying RTCPeerConnection implementation are about to diverge.
    // If so, we need to ensure subsequent calls to addIceCandidate will block.
    if (!pendingLocalOffer && peerConnection._signalingStateLatch.state === 'low') {
      peerConnection._signalingStateLatch.raise();
    }
    var previousSignalingState = peerConnection.signalingState;
    setPendingLocalOffer(unwrap(description));
    promise = Promise.resolve();

    // Only dispatch a signalingstatechange event if we transitioned.
    if (peerConnection.signalingState !== previousSignalingState) {
      promise.then(function dispatchSignalingStateChangeEvent() {
        peerConnection.dispatchEvent(new Event('signalingstatechange'));
      });
    }

  } else if (description.type === 'rollback') {
    if (peerConnection.signalingState !== intermediateState) {
      // NOTE(mroberts): Error message copied from Firefox.
      promise = Promise.reject(new Error('Cannot rollback ' +
        (local ? 'local' : 'remote') + ' description in ' + peerConnection.signalingState));
    } else {
      // Reset the pending offer.
      clearPendingLocalOffer();
      promise = Promise.resolve();
      promise.then(function dispatchSignalingStateChangeEvent() {
        peerConnection.dispatchEvent(new Event('signalingstatechange'));
      });
    }
  }

  return promise || peerConnection._peerConnection[setLocalDescription](unwrap(description));
}

function setRemoteAnswer(peerConnection, answer) {
  // Apply the pending local offer.
  var pendingLocalOffer = peerConnection._pendingLocalOffer;
  return peerConnection._peerConnection.setLocalDescription(pendingLocalOffer).then(function setLocalOfferSucceeded() {
    peerConnection._pendingLocalOffer = null;
    return peerConnection.setRemoteDescription(answer);
  }).then(function setRemoteAnswerSucceeded() {
    // NOTE(mroberts): The signalingStates between the ChromeRTCPeerConnection
    // and the underlying RTCPeerConnection implementation have converged. We
    // can unblock any pending calls to addIceCandidate now.
    peerConnection._signalingStateLatch.lower();
  });
}

function unwrap(description) {
  if (description instanceof ChromeRTCSessionDescription) {
    if (description._description) {
      return description._description;
    }
  }
  return new RTCSessionDescription(description);
}

/**
 * Check whether or not we need to apply our maxPacketLifeTime shim. We are
 * pretty conservative: we'll only apply it if the legacy maxRetransmitTime
 * property is available _and_ the standard maxPacketLifeTime property is _not_
 * available (the thinking being that Chrome will land the standards-compliant
 * property).
 * @returns {boolean}
 */
function needsMaxPacketLifeTimeShim() {
  return 'maxRetransmitTime' in RTCDataChannel.prototype
    && !('maxPacketLifeTime' in RTCDataChannel.prototype);
}

/**
 * Shim an RTCDataChannelInit dictionary (if necessary). This function returns
 * a copy of the original RTCDataChannelInit.
 * @param {RTCDataChannelInit} dataChannelDict
 * @returns {RTCDataChannelInit}
 */
function shimDataChannelInit(dataChannelDict) {
  dataChannelDict = Object.assign({}, dataChannelDict);
  if (needsMaxPacketLifeTimeShim() && 'maxPacketLifeTime' in dataChannelDict) {
    dataChannelDict.maxRetransmitTime = dataChannelDict.maxPacketLifeTime;
  }
  return dataChannelDict;
}

/**
 * Shim an RTCDataChannel (if necessary). This function mutates the
 * RTCDataChannel.
 * @param {RTCDataChannel} dataChannel
 * @returns {RTCDataChannel}
 */
function shimDataChannel(dataChannel) {
  Object.defineProperty(dataChannel, 'maxRetransmits', {
    value: dataChannel.maxRetransmits === 65535
      ? null
      : dataChannel.maxRetransmits
  });
  if (needsMaxPacketLifeTimeShim()) {
    // NOTE(mroberts): We can rename `maxRetransmitTime` to `maxPacketLifeTime`.
    //
    //   https://bugs.chromium.org/p/chromium/issues/detail?id=696681
    //
    Object.defineProperty(dataChannel, 'maxPacketLifeTime', {
      value: dataChannel.maxRetransmitTime === 65535
        ? null
        : dataChannel.maxRetransmitTime
    });
  }
  return dataChannel;
}

/**
 * Update the mappings from MediaStreamTrack IDs to SSRCs as indicated by both
 * the Map from MediaStreamTrack IDs to SSRCs and the SDP itself. This method
 * ensures that SSRCs never change once announced.
 * @param {'planb'|'unified'} sdpFormat
 * @param {Map<string, Set<string>>} tracksToSSRCs
 * @param {string} sdp - an SDP whose format is determined by `sdpSemantics`
 * @returns {string} updatedSdp - updated SDP
 */
function updateTrackIdsToSSRCs(sdpFormat, tracksToSSRCs, sdp) {
  return sdpFormat === 'unified'
    ? sdpUtils.updateUnifiedPlanTrackIdsToSSRCs(tracksToSSRCs, sdp)
    : sdpUtils.updatePlanBTrackIdsToSSRCs(tracksToSSRCs, sdp);
}

module.exports = ChromeRTCPeerConnection;

},{"../mediastream":133,"../rtcrtpsender":140,"../rtcsessiondescription/chrome":141,"../util":145,"../util/eventtarget":144,"../util/latch":146,"../util/sdp":147,"util":153}],137:[function(require,module,exports){
/* globals RTCPeerConnection */
'use strict';

var EventTarget = require('../util/eventtarget');
var FirefoxRTCSessionDescription = require('../rtcsessiondescription/firefox');
var inherits = require('util').inherits;
var updateTracksToSSRCs = require('../util/sdp').updateUnifiedPlanTrackIdsToSSRCs;
var util = require('../util');

// NOTE(mroberts): This is a short-lived workaround. Checking the user agent
// string might not fix every affected Firefox instance, but it should be good
// enough for this bug.
var needsWorkaroundForBug1480277 = typeof navigator === 'object'
  && navigator.userAgent
  && (navigator.userAgent.match(/Firefox\/61/) || navigator.userAgent.match(/Firefox\/62/));

// NOTE(mroberts): This class wraps Firefox's RTCPeerConnection implementation.
// It provides some functionality not currently present in Firefox, namely the
// abilities to
//
//   1. Call setLocalDescription and setRemoteDescription with new offers in
//      signalingStates "have-local-offer" and "have-remote-offer",
//      respectively.
//
//   2. The ability to call createOffer in signalingState "have-local-offer".
//
// Both of these are implemented using rollbacks to workaround the following
// bug:
//
//   https://bugzilla.mozilla.org/show_bug.cgi?id=1072388
//
// We also provide a workaround for a bug where Firefox may change the
// previously-negotiated DTLS role in an answer, which breaks Chrome:
//
//     https://bugzilla.mozilla.org/show_bug.cgi?id=1240897
//
function FirefoxRTCPeerConnection(configuration) {
  if (!(this instanceof FirefoxRTCPeerConnection)) {
    return new FirefoxRTCPeerConnection(configuration);
  }

  EventTarget.call(this);

  util.interceptEvent(this, 'signalingstatechange');

  /* eslint new-cap:0 */
  var peerConnection = new RTCPeerConnection(configuration);

  Object.defineProperties(this, {
    _initiallyNegotiatedDtlsRole: {
      value: null,
      writable: true
    },
    _isClosed: {
      value: false,
      writable: true
    },
    _peerConnection: {
      value: peerConnection
    },
    _rollingBack: {
      value: false,
      writable: true
    },
    _tracksToSSRCs: {
      value: new Map()
    },
    iceGatheringState: {
      enumerable: true,
      get: function() {
        return this._isClosed ? 'complete' : this._peerConnection.iceGatheringState;
      }
    },
    localDescription: {
      enumerable: true,
      get: function() {
        return overwriteWithInitiallyNegotiatedDtlsRole(this._peerConnection.localDescription, this._initiallyNegotiatedDtlsRole);
      }
    },
    signalingState: {
      enumerable: true,
      get: function() {
        return this._isClosed ? 'closed' : this._peerConnection.signalingState;
      }
    }
  });

  var self = this;
  var previousSignalingState;

  peerConnection.addEventListener('signalingstatechange', function onsignalingstatechange() {
    if (!self._rollingBack && self.signalingState !== previousSignalingState) {
      previousSignalingState = self.signalingState;

      // NOTE(mmalavalli): In Firefox, 'signalingstatechange' event is
      // triggered synchronously in the same tick after
      // RTCPeerConnection#close() is called. So we mimic Chrome's behavior
      // by triggering 'signalingstatechange' on the next tick.
      var dispatchEventToSelf = self.dispatchEvent.apply.bind(self.dispatchEvent, self, arguments);
      if (self._isClosed) {
        setTimeout(dispatchEventToSelf);
      } else {
        dispatchEventToSelf();
      }
    }
  });

  util.proxyProperties(RTCPeerConnection.prototype, this, peerConnection);
}

inherits(FirefoxRTCPeerConnection, EventTarget);

// NOTE(mmalavalli): Firefox throws a TypeError when the PeerConnection's
// prototype's "peerIdentity" property is accessed. In order to overcome
// this, we ignore this property while delegating methods.
// Reference: https://bugzilla.mozilla.org/show_bug.cgi?id=1363815
Object.defineProperty(FirefoxRTCPeerConnection.prototype, 'peerIdentity', {
  enumerable: true,
  value: Promise.resolve({
    idp: '',
    name: ''
  })
});

if (needsWorkaroundForBug1480277) {
  FirefoxRTCPeerConnection.prototype.addTrack = function addTrack() {
    var track = arguments[0];
    var sender = this._peerConnection.addTrack.apply(this._peerConnection, arguments);
    sender.replaceTrack(track);
    return sender;
  };
}

FirefoxRTCPeerConnection.prototype.createAnswer = function createAnswer() {
  var args = [].slice.call(arguments);
  var promise;
  var self = this;

  promise = this._peerConnection.createAnswer().then(function createAnswerSucceeded(answer) {
    saveInitiallyNegotiatedDtlsRole(self, answer);
    return overwriteWithInitiallyNegotiatedDtlsRole(answer, self._initiallyNegotiatedDtlsRole);
  });

  return typeof args[0] === 'function'
    ? util.legacyPromise(promise, args[0], args[1])
    : promise;
};

// NOTE(mroberts): The WebRTC spec allows you to call createOffer from any
// signalingState other than "closed"; however, Firefox has not yet implemented
// this (https://bugzilla.mozilla.org/show_bug.cgi?id=1072388). We workaround
// this by rolling back if we are in state "have-local-offer" or
// "have-remote-offer". This is acceptable for our use case because we will
// apply the newly-created offer almost immediately; however, this may be
// unacceptable for other use cases.
FirefoxRTCPeerConnection.prototype.createOffer = function createOffer() {
  var args = [].slice.call(arguments);
  var options = (args.length > 1 ? args[2] : args[0]) || {};
  var promise;
  var self = this;

  if (this.signalingState === 'have-local-offer' ||
      this.signalingState === 'have-remote-offer') {
    var local = this.signalingState === 'have-local-offer';
    promise = rollback(this, local, function rollbackSucceeded() {
      return self.createOffer(options);
    });
  } else {
    promise = self._peerConnection.createOffer(options);
  }

  promise = promise.then(function(offer) {
    return new FirefoxRTCSessionDescription({
      type: offer.type,
      sdp: updateTracksToSSRCs(self._tracksToSSRCs, offer.sdp)
    });
  });

  return args.length > 1
    ? util.legacyPromise(promise, args[0], args[1])
    : promise;
};

// NOTE(mroberts): While Firefox will reject the Promise returned by
// setLocalDescription when called from signalingState "have-local-offer" with
// an answer, it still updates the .localDescription property. We workaround
// this by explicitly handling this case.
FirefoxRTCPeerConnection.prototype.setLocalDescription = function setLocalDescription() {
  var args = [].slice.call(arguments);
  var description = args[0];
  var promise;

  if (description && description.type === 'answer' && this.signalingState === 'have-local-offer') {
    promise = Promise.reject(new Error('Cannot set local answer in state have-local-offer'));
  }

  if (promise) {
    return args.length > 1
      ? util.legacyPromise(promise, args[1], args[2])
      : promise;
  }

  return this._peerConnection.setLocalDescription.apply(this._peerConnection, args);
};

// NOTE(mroberts): The WebRTC spec allows you to call setRemoteDescription with
// an offer multiple times in signalingState "have-remote-offer"; however,
// Firefox has not yet implemented this (https://bugzilla.mozilla.org/show_bug.cgi?id=1072388).
// We workaround this by rolling back if we are in state "have-remote-offer".
// This is acceptable for our use case; however, this may be unacceptable for
// other use cases.
//
// While Firefox will reject the Promise returned by setRemoteDescription when
// called from signalingState "have-remote-offer" with an answer, it sill
// updates the .remoteDescription property. We workaround this by explicitly
// handling this case.
FirefoxRTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription() {
  var args = [].slice.call(arguments);
  var description = args[0];
  var promise;
  var self = this;

  if (description && this.signalingState === 'have-remote-offer') {
    if (description.type === 'answer') {
      promise = Promise.reject(new Error('Cannot set remote answer in state have-remote-offer'));
    } else if (description.type === 'offer') {
      promise = rollback(this, false, function rollbackSucceeded() {
        return self._peerConnection.setRemoteDescription(description);
      });
    }
  }

  if (!promise) {
    promise = this._peerConnection.setRemoteDescription(description);
  }

  promise = promise.then(function setRemoteDescriptionSucceeded() {
    saveInitiallyNegotiatedDtlsRole(self, description, true);
  });

  return args.length > 1
    ? util.legacyPromise(promise, args[1], args[2])
    : promise;
};

// NOTE(mroberts): The WebRTC spec specifies that the PeerConnection's internal
// isClosed slot should immediately be set to true; however, in Firefox it
// occurs in the next tick. We workaround this by tracking isClosed manually.
FirefoxRTCPeerConnection.prototype.close = function close() {
  if (this.signalingState !== 'closed') {
    this._isClosed = true;
    this._peerConnection.close();
  }
};

util.delegateMethods(
  RTCPeerConnection.prototype,
  FirefoxRTCPeerConnection.prototype,
  '_peerConnection');

function rollback(peerConnection, local, onceRolledBack) {
  var setLocalDescription = local ? 'setLocalDescription' : 'setRemoteDescription';
  peerConnection._rollingBack = true;
  return peerConnection._peerConnection[setLocalDescription](new FirefoxRTCSessionDescription({
    type: 'rollback'
  })).then(onceRolledBack).then(function onceRolledBackSucceeded(result) {
    peerConnection._rollingBack = false;
    return result;
  }, function rollbackOrOnceRolledBackFailed(error) {
    peerConnection._rollingBack = false;
    throw error;
  });
}

/**
 * Extract the initially negotiated DTLS role out of an RTCSessionDescription's
 * sdp property and save it on the FirefoxRTCPeerConnection if and only if
 *
 *   1. A DTLS role was not already saved on the FirefoxRTCPeerConnection, and
 *   2. The description is an answer.
 *
 * @private
 * @param {FirefoxRTCPeerConnection} peerConnection
 * @param {RTCSessionDescription} description
 * @param {boolean} [remote=false] - if true, save the inverse of the DTLS role,
 *   e.g. "active" instead of "passive" and vice versa
 * @returns {undefined}
 */
function saveInitiallyNegotiatedDtlsRole(peerConnection, description, remote) {
  // NOTE(mroberts): JSEP specifies that offers always offer "actpass" as the
  // DTLS role. We need to inspect answers to figure out the negotiated DTLS
  // role.
  if (peerConnection._initiallyNegotiatedDtlsRole || description.type === 'offer') {
    return;
  }

  var match = description.sdp.match(/a=setup:([a-z]+)/);
  if (!match) {
    return;
  }

  var dtlsRole = match[1];
  peerConnection._initiallyNegotiatedDtlsRole = remote ? {
    active: 'passive',
    passive: 'active'
  }[dtlsRole] : dtlsRole;
}

/**
 * Overwrite the DTLS role in the sdp property of an RTCSessionDescription if
 * and only if
 *
 *   1. The description is an answer, and
 *   2. A DTLS role is provided.
 *
 * @private
 * @param {RTCSessionDescription} [description]
 * @param {string} [dtlsRole] - one of "active" or "passive"
 * @returns {?RTCSessionDescription} description
 */
function overwriteWithInitiallyNegotiatedDtlsRole(description, dtlsRole) {
  if (description && description.type === 'answer' && dtlsRole) {
    return new FirefoxRTCSessionDescription({
      type: description.type,
      sdp: description.sdp.replace(/a=setup:[a-z]+/g, 'a=setup:' + dtlsRole)
    });
  }
  return description;
}

module.exports = FirefoxRTCPeerConnection;

},{"../rtcsessiondescription/firefox":142,"../util":145,"../util/eventtarget":144,"../util/sdp":147,"util":153}],138:[function(require,module,exports){
'use strict';

var guessBrowser = require('../util').guessBrowser;

switch (guessBrowser()) {
  case 'chrome':
    module.exports = require('./chrome');
    break;
  case 'firefox':
    module.exports = require('./firefox');
    break;
  case 'safari':
    module.exports = require('./safari');
    break;
  default:
    if (typeof RTCPeerConnection === 'undefined') {
      break;
    }
    module.exports = RTCPeerConnection;
}

},{"../util":145,"./chrome":136,"./firefox":137,"./safari":139}],139:[function(require,module,exports){
/* globals RTCPeerConnection, RTCSessionDescription */
'use strict';

var EventTarget = require('../util/eventtarget');
var inherits = require('util').inherits;
var Latch = require('../util/latch');
var sdpUtils = require('../util/sdp');
var util = require('../util');

var isUnifiedPlan = sdpUtils.getSdpFormat() === 'unified';

var updateTrackIdsToSSRCs = isUnifiedPlan
  ? sdpUtils.updateUnifiedPlanTrackIdsToSSRCs
  : sdpUtils.updatePlanBTrackIdsToSSRCs;

function SafariRTCPeerConnection(configuration) {
  if (!(this instanceof SafariRTCPeerConnection)) {
    return new SafariRTCPeerConnection(configuration);
  }

  EventTarget.call(this);

  util.interceptEvent(this, 'datachannel');
  util.interceptEvent(this, 'iceconnectionstatechange');
  util.interceptEvent(this, 'signalingstatechange');
  util.interceptEvent(this, 'track');

  var peerConnection = new RTCPeerConnection(configuration);

  Object.defineProperties(this, {
    _audioTransceiver: {
      value: null,
      writable: true
    },
    _isClosed: {
      value: false,
      writable: true
    },
    _peerConnection: {
      value: peerConnection
    },
    _pendingLocalOffer: {
      value: null,
      writable: true
    },
    _pendingRemoteOffer: {
      value: null,
      writable: true
    },
    _signalingStateLatch: {
      value: new Latch()
    },
    _tracksToSSRCs: {
      value: new Map()
    },
    _videoTransceiver: {
      value: null,
      writable: true
    },
    localDescription: {
      enumerable: true,
      get: function() {
        return this._pendingLocalOffer || this._peerConnection.localDescription;
      }
    },
    iceConnectionState: {
      enumerable: true,
      get: function() {
        return this._isClosed ? 'closed' : this._peerConnection.iceConnectionState;
      }
    },
    iceGatheringState: {
      enumerable: true,
      get: function() {
        return this._isClosed ? 'complete' : this._peerConnection.iceGatheringState;
      }
    },
    remoteDescription: {
      enumerable: true,
      get: function() {
        return this._pendingRemoteOffer || this._peerConnection.remoteDescription;
      }
    },
    signalingState: {
      enumerable: true,
      get: function() {
        if (this._isClosed) {
          return 'closed';
        } else if (this._pendingLocalOffer) {
          return 'have-local-offer';
        } else if (this._pendingRemoteOffer) {
          return 'have-remote-offer';
        }
        return this._peerConnection.signalingState;
      }
    }
  });

  var self = this;

  peerConnection.addEventListener('datachannel', function ondatachannel(event) {
    shimDataChannel(event.channel);
    self.dispatchEvent(event);
  });

  peerConnection.addEventListener('iceconnectionstatechange', function oniceconnectionstatechange() {
    if (self._isClosed) {
      return;
    }
    self.dispatchEvent.apply(self, arguments);
  });

  peerConnection.addEventListener('signalingstatechange', function onsignalingstatechange() {
    if (self._isClosed) {
      return;
    }
    if (!self._pendingLocalOffer && !self._pendingRemoteOffer) {
      self.dispatchEvent.apply(self, arguments);
    }
  });

  // NOTE(syerrapragada): This ensures that SafariRTCPeerConnection's "remoteDescription", when accessed
  // in an RTCTrackEvent listener, will point to the underlying RTCPeerConnection's
  // "remoteDescription". Before this fix, this was still pointing to "_pendingRemoteOffer"
  // even though a new remote RTCSessionDescription had already been applied.
  peerConnection.addEventListener('track', function ontrack(event) {
    self._pendingRemoteOffer = null;
    self.dispatchEvent(event);
  });

  util.proxyProperties(RTCPeerConnection.prototype, this, peerConnection);
}

inherits(SafariRTCPeerConnection, EventTarget);

SafariRTCPeerConnection.prototype.addIceCandidate = function addIceCandidate(candidate) {
  var self = this;
  if (this.signalingState === 'have-remote-offer') {
    return this._signalingStateLatch.when('low').then(function signalingStatesResolved() {
      return self._peerConnection.addIceCandidate(candidate);
    });
  }
  return this._peerConnection.addIceCandidate(candidate);
};

SafariRTCPeerConnection.prototype.createOffer = function createOffer(options) {
  options = Object.assign({}, options);
  var self = this;

  // NOTE(mroberts): In general, this is not the way to do this; however, it's
  // good enough for our application.
  if (options.offerToReceiveAudio && !this._audioTransceiver && !(isUnifiedPlan && hasReceiversForTracksOfKind(this, 'audio'))) {
    delete options.offerToReceiveAudio;
    try {
      this._audioTransceiver = isUnifiedPlan
        ? this.addTransceiver('audio', { direction: 'recvonly' })
        : this.addTransceiver('audio');
    } catch (e) {
      return Promise.reject(e);
    }
  }

  if (options.offerToReceiveVideo && !this._videoTransceiver && !(isUnifiedPlan && hasReceiversForTracksOfKind(this, 'video'))) {
    delete options.offerToReceiveVideo;
    try {
      this._videoTransceiver = isUnifiedPlan
        ? this.addTransceiver('video', { direction: 'recvonly' })
        : this.addTransceiver('video');
    } catch (e) {
      return Promise.reject(e);
    }
  }

  return this._peerConnection.createOffer(options).then(function(offer) {
    return new RTCSessionDescription({
      type: offer.type,
      sdp: updateTrackIdsToSSRCs(self._tracksToSSRCs, offer.sdp)
    });
  });
};

SafariRTCPeerConnection.prototype.createAnswer = function createAnswer(options) {
  var self = this;

  if (this._pendingRemoteOffer) {
    return this._peerConnection.setRemoteDescription(this._pendingRemoteOffer).then(function setRemoteDescriptionSucceeded() {
      self._signalingStateLatch.lower();
      return self._peerConnection.createAnswer();
    }).then(function createAnswerSucceeded(answer) {
      self._pendingRemoteOffer = null;
      return isUnifiedPlan ? new RTCSessionDescription({
        type: answer.type,
        sdp: updateTrackIdsToSSRCs(self._tracksToSSRCs, answer.sdp)
      }) : answer;
    }, function setRemoteDescriptionOrCreateAnswerFailed(error) {
      self._pendingRemoteOffer = null;
      throw error;
    });
  }

  return this._peerConnection.createAnswer(options).then(function createAnswerSucceeded(answer) {
    return isUnifiedPlan ? new RTCSessionDescription({
      type: answer.type,
      sdp: updateTrackIdsToSSRCs(self._tracksToSSRCs, answer.sdp)
    }) : answer;
  });
};

SafariRTCPeerConnection.prototype.createDataChannel = function createDataChannel(label, dataChannelDict) {
  var dataChannel = this._peerConnection.createDataChannel(label, dataChannelDict);
  shimDataChannel(dataChannel);
  return dataChannel;
};

SafariRTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
  sender.replaceTrack(null);
  this._peerConnection.removeTrack(sender);
};

SafariRTCPeerConnection.prototype.setLocalDescription = function setLocalDescription(description) {
  return setDescription(this, true, description);
};

SafariRTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription(description) {
  return setDescription(this, false, description);
};

SafariRTCPeerConnection.prototype.close = function close() {
  if (this._isClosed) {
    return;
  }
  this._isClosed = true;
  this._peerConnection.close();
  var self = this;
  setTimeout(function() {
    self.dispatchEvent(new Event('iceconnectionstatechange'));
    self.dispatchEvent(new Event('signalingstatechange'));
  });
};

util.delegateMethods(
  RTCPeerConnection.prototype,
  SafariRTCPeerConnection.prototype,
  '_peerConnection');

function setDescription(peerConnection, local, description) {
  function setPendingLocalOffer(offer) {
    if (local) {
      peerConnection._pendingLocalOffer = offer;
    } else {
      peerConnection._pendingRemoteOffer = offer;
    }
  }

  function clearPendingLocalOffer() {
    if (local) {
      peerConnection._pendingLocalOffer = null;
    } else {
      peerConnection._pendingRemoteOffer = null;
    }
  }

  var pendingLocalOffer = local ? peerConnection._pendingLocalOffer : peerConnection._pendingRemoteOffer;
  var pendingRemoteOffer = local ? peerConnection._pendingRemoteOffer : peerConnection._pendingLocalOffer;
  var intermediateState = local ? 'have-local-offer' : 'have-remote-offer';
  var setLocalDescription = local ? 'setLocalDescription' : 'setRemoteDescription';

  if (!local && pendingRemoteOffer && description.type === 'answer') {
    return setRemoteAnswer(peerConnection, description);
  } else if (description.type === 'offer') {
    if (peerConnection.signalingState !== intermediateState && peerConnection.signalingState !== 'stable') {
      return Promise.reject(new Error('Cannot set ' + (local ? 'local' : 'remote') +
        ' offer in state ' + peerConnection.signalingState));
    }

    if (!pendingLocalOffer && peerConnection._signalingStateLatch.state === 'low') {
      peerConnection._signalingStateLatch.raise();
    }
    var previousSignalingState = peerConnection.signalingState;
    setPendingLocalOffer(description);

    // Only dispatch a signalingstatechange event if we transitioned.
    if (peerConnection.signalingState !== previousSignalingState) {
      return Promise.resolve().then(function dispatchSignalingStateChangeEvent() {
        peerConnection.dispatchEvent(new Event('signalingstatechange'));
      });
    }

    return Promise.resolve();
  } else if (description.type === 'rollback') {
    if (peerConnection.signalingState !== intermediateState) {
      return Promise.reject(new Error('Cannot rollback ' +
        (local ? 'local' : 'remote') + ' description in ' + peerConnection.signalingState));
    }
    clearPendingLocalOffer();
    return Promise.resolve().then(function dispatchSignalingStateChangeEvent() {
      peerConnection.dispatchEvent(new Event('signalingstatechange'));
    });
  }

  return peerConnection._peerConnection[setLocalDescription](description);
}

function setRemoteAnswer(peerConnection, answer) {
  var pendingLocalOffer = peerConnection._pendingLocalOffer;
  return peerConnection._peerConnection.setLocalDescription(pendingLocalOffer).then(function setLocalOfferSucceeded() {
    peerConnection._pendingLocalOffer = null;
    return peerConnection.setRemoteDescription(answer);
  }).then(function setRemoteAnswerSucceeded() {
    peerConnection._signalingStateLatch.lower();
  });
}

/**
 * Whether a SafariRTCPeerConnection has any RTCRtpReceivers(s) for the given
 * MediaStreamTrack kind.
 * @param {SafariRTCPeerConnection} peerConnection
 * @param {'audio' | 'video'} kind
 * @returns {boolean}
 */
function hasReceiversForTracksOfKind(peerConnection, kind) {
  return !!peerConnection.getTransceivers().find(function(transceiver) {
    return transceiver.receiver && transceiver.receiver.track && transceiver.receiver.track.kind === kind;
  });
}

/**
 * Shim an RTCDataChannel. This function mutates the RTCDataChannel.
 * @param {RTCDataChannel} dataChannel
 * @returns {RTCDataChannel}
 */
function shimDataChannel(dataChannel) {
  return Object.defineProperties(dataChannel, {
    maxPacketLifeTime: {
      value: dataChannel.maxPacketLifeTime === 65535
        ? null
        : dataChannel.maxPacketLifeTime
    },
    maxRetransmits: {
      value: dataChannel.maxRetransmits === 65535
        ? null
        : dataChannel.maxRetransmits
    }
  });
}

module.exports = SafariRTCPeerConnection;

},{"../util":145,"../util/eventtarget":144,"../util/latch":146,"../util/sdp":147,"util":153}],140:[function(require,module,exports){
'use strict';

/**
 * RTCRtpSender shim.
 * @param {MediaStreamTrack} track
 * @property {MediaStreamTrack} track
 */
function RTCRtpSenderShim(track) {
  Object.defineProperties(this, {
    track: {
      enumerable: true,
      value: track,
      writable: true
    }
  });
}

// NOTE(mmalavalli): Because of the way we will be using this shim, there
// are a couple of use cases that will not be covered:
//
// /* Case 1 */
// const sender = pc.addTrack(track);
// assert.equal(sender.track, track);
// pc.removeTrack(sender);
// assert.equal(sender.track, null); /* Error */
//
// /* Case 2 */
// const sender = pc.addTrack(track);
// const senders1 = new Set(pc.getSenders());
// assert(senders1.has(sender));
// pc.removeTrack(track);
// const senders2 = new Set(pc.getSenders());
// assert(senders2.has(sender)); /* Error */
//
// For now, since we only use senders for passing them to RTCPeerConnection#removeTrack(),
// we will omit handling these use cases for now, and revisit them when we start
// using the RTCRtpSender APIs.

module.exports = RTCRtpSenderShim;

},{}],141:[function(require,module,exports){
/* globals RTCSessionDescription */
'use strict';

// This class wraps Chrome's RTCSessionDescription implementation. It provides
// one piece of functionality not currently present in Chrome, namely
//
//   1. Rollback support
//      https://bugs.chromium.org/p/webrtc/issues/detail?id=4676
//
function ChromeRTCSessionDescription(descriptionInitDict) {
  if (!(this instanceof ChromeRTCSessionDescription)) {
    return new ChromeRTCSessionDescription(descriptionInitDict);
  }

  // If this constructor is called with an object with a .type property set to
  // "rollback", we should not call Chrome's RTCSessionDescription constructor,
  // because this would throw an RTCSdpType error.
  var description = descriptionInitDict && descriptionInitDict.type === 'rollback'
    ? null
    : new RTCSessionDescription(descriptionInitDict);

  Object.defineProperties(this, {
    _description: {
      get: function() {
        return description;
      }
    },
    sdp: {
      enumerable: true,
      value: description ? description.sdp : descriptionInitDict.sdp
    },
    type: {
      enumerable: true,
      value: description ? description.type : descriptionInitDict.type
    }
  });
}

module.exports = ChromeRTCSessionDescription;

},{}],142:[function(require,module,exports){
/* globals mozRTCSessionDescription, RTCSessionDescription */
'use strict';

module.exports = typeof RTCSessionDescription !== 'undefined'
  ? RTCSessionDescription
  : mozRTCSessionDescription;

},{}],143:[function(require,module,exports){
'use strict';

var guessBrowser = require('../util').guessBrowser;

switch (guessBrowser()) {
  case 'chrome':
    module.exports = require('./chrome');
    break;
  case 'firefox':
    module.exports = require('./firefox');
    break;
  default:
    if (typeof RTCSessionDescription === 'undefined') {
      break;
    }
    module.exports = RTCSessionDescription;
}

},{"../util":145,"./chrome":141,"./firefox":142}],144:[function(require,module,exports){
'use strict';

var EventEmitter = require('events').EventEmitter;

/**
 * Event target.
 * @class
 */
function EventTarget() {
  Object.defineProperties(this, {
    _eventEmitter: {
      value: new EventEmitter()
    }
  });
}

/**
 * Dispatch an Event to the {@link EventTarget}.
 * @param {Event} event
 */
EventTarget.prototype.dispatchEvent = function dispatchEvent(event) {
  return this._eventEmitter.emit(event.type, event);
};

/**
 * Add an Event listener to the {@link EventTarget}.
 */
EventTarget.prototype.addEventListener = function addEventListener() {
  return this._eventEmitter.addListener.apply(this._eventEmitter, arguments);
};

/**
 * Remove an Event listener to the {@link EventTarget}.
 */
EventTarget.prototype.removeEventListener = function removeEventListener() {
  return this._eventEmitter.removeListener.apply(this._eventEmitter, arguments);
};

module.exports = EventTarget;

},{"events":149}],145:[function(require,module,exports){
'use strict';

/**
 * Create a {@link Deferred}.
 * @returns {Deferred}
 */
function defer() {
  var deferred = {};
  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

/**
 * Copy a method from a `source` prototype onto a `wrapper` prototype. Invoking
 * the method on the `wrapper` prototype will invoke the corresponding method
 * on an instance accessed by `target`.
 * @param {object} source
 * @param {object} wrapper
 * @param {string} target
 * @param {string} methodName
 * @returns {undefined}
 */
function delegateMethod(source, wrapper, target, methodName) {
  if (methodName in wrapper) {
    // Skip any methods already set.
    return;
  } else if (methodName.match(/^on[a-z]+$/)) {
    // Skip EventHandlers (these are handled in the constructor).
    return;
  }

  var type;
  try {
    type = typeof source[methodName];
  } catch (error) {
    // NOTE(mroberts): Attempting to check the type of non-function members
    // on the prototype throws an error for some types.
  }

  if (type !== 'function') {
    // Skip non-function members.
    return;
  }

  /* eslint no-loop-func:0 */
  wrapper[methodName] = function() {
    return this[target][methodName].apply(this[target], arguments);
  };
}

/**
 * Copy methods from a `source` prototype onto a `wrapper` prototype. Invoking
 * the methods on the `wrapper` prototype will invoke the corresponding method
 * on an instance accessed by `target`.
 * @param {object} source
 * @param {object} wrapper
 * @param {string} target
 * @returns {undefined}
 */
function delegateMethods(source, wrapper, target) {
  for (var methodName in source) {
    delegateMethod(source, wrapper, target, methodName);
  }
}

/**
 * Finds the items in list1 that are not in list2.
 * @param {Array<*>|Map<*>|Set<*>} list1
 * @param {Array<*>|Map<*>|Set<*>} list2
 * @returns {Set}
 */
function difference(list1, list2) {
  list1 = Array.isArray(list1) ? new Set(list1) : new Set(list1.values());
  list2 = Array.isArray(list2) ? new Set(list2) : new Set(list2.values());

  var difference = new Set();

  list1.forEach(function(item) {
    if (!list2.has(item)) {
      difference.add(item);
    }
  });

  return difference;
}

/**
 * Map a list to an array of arrays, and return the flattened result.
 * @param {Array<*>|Set<*>|Map<*>} list
 * @param {function(*): Array<*>} mapFn
 * @returns Array<*>
 */
function flatMap(list, mapFn) {
  var listArray = list instanceof Map || list instanceof Set
    ? Array.from(list.values())
    : list;

  return listArray.reduce(function(flattened, item) {
    var mapped = mapFn(item);
    return flattened.concat(mapped);
  }, []);
}

/**
 * Guess the browser.
 * @returns {?string} browser - "chrome", "firefox", "safari", or null
 */
function guessBrowser() {
  if (typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string') {
    if (/Chrome/.test(navigator.userAgent)) {
      return 'chrome';
    }
    if (/Firefox/.test(navigator.userAgent)) {
      return 'firefox';
    }
    if (/Safari/.test(navigator.userAgent)) {
      return 'safari';
    }
  }
  return null;
}

/**
 * Intercept an event that might otherwise be proxied on an EventTarget.
 * @param {EventTarget} target
 * @param {string} type
 * @returns {void}
 */
function interceptEvent(target, type) {
  var currentListener = null;
  Object.defineProperty(target, 'on' + type, {
    get: function() {
      return currentListener;
    },
    set: function(newListener) {
      if (currentListener) {
        this.removeEventListener(type, currentListener);
      }

      if (typeof newListener === 'function') {
        currentListener = newListener;
        this.addEventListener(type, currentListener);
      } else {
        currentListener = null;
      }
    }
  });
}

/**
 * This is a function for turning a Promise into the kind referenced in the
 * Legacy Interface Extensions section of the WebRTC spec.
 * @param {Promise<*>} promise
 * @param {function<*>} onSuccess
 * @param {function<Error>} onFailure
 * @returns {Promise<undefined>}
 */
function legacyPromise(promise, onSuccess, onFailure) {
  if (onSuccess) {
    return promise.then(function(result) {
      onSuccess(result);
    }, function(error) {
      onFailure(error);
    });
  }
  return promise;
}

/**
 * Make a unique ID.
 * @return {string}
 */
function makeUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * For each property name on the `source` prototype, add getters and/or setters
 * to `wrapper` that proxy to `target`.
 * @param {object} source
 * @param {object} wrapper
 * @param {string} target
 * @returns {undefined}
 */
function proxyProperties(source, wrapper, target) {
  Object.getOwnPropertyNames(source).forEach(function(propertyName) {
    proxyProperty(source, wrapper, target, propertyName);
  });
}

/**
 * For the property name on the `source` prototype, add a getter and/or setter
 * to `wrapper` that proxies to `target`.
 * @param {object} source
 * @param {object} wrapper
 * @param {string} target
 * @param {string} propertyName
 * @returns {undefined}
 */
function proxyProperty(source, wrapper, target, propertyName) {
  if (propertyName in wrapper) {
    // Skip any properties already set.
    return;
  } else if (propertyName.match(/^on[a-z]+$/)) {
    Object.defineProperty(wrapper, propertyName, {
      value: null,
      writable: true
    });

    target.addEventListener(propertyName.slice(2), function() {
      wrapper.dispatchEvent.apply(wrapper, arguments);
    });

    return;
  }

  Object.defineProperty(wrapper, propertyName, {
    enumerable: true,
    get: function() {
      return target[propertyName];
    }
  });
}

/**
 * @typedef {object} Deferred
 * @property {Promise} promise
 * @property {function} reject
 * @property {function} resolve
 */

exports.defer = defer;
exports.delegateMethods = delegateMethods;
exports.difference = difference;
exports.flatMap = flatMap;
exports.guessBrowser = guessBrowser;
exports.interceptEvent = interceptEvent;
exports.legacyPromise = legacyPromise;
exports.makeUUID = makeUUID;
exports.proxyProperties = proxyProperties;

},{}],146:[function(require,module,exports){
'use strict';

var defer = require('./').defer;

var states = {
  high: new Set(['low']),
  low: new Set(['high'])
};

/**
 * Construct a {@link Latch}.
 * @class
 * @classdesc A {@link Latch} has two states ("high" and "low") and methods for
 * transitioning between them ({@link Latch#raise} and {@link Latch#lower}).
 * @param {string} [initialState="low"] - either "high" or "low"
 */
function Latch(initialState) {
  if (!(this instanceof Latch)) {
    return new Latch(initialState);
  }
  var state = initialState || 'low';
  Object.defineProperties(this, {
    _state: {
      set: function(_state) {
        if (state !== _state) {
          state = _state;
          var whenDeferreds = this._whenDeferreds.get(state);
          whenDeferreds.forEach(function(deferred) {
            deferred.resolve(this);
          }, this);
          whenDeferreds.clear();
        }
      },
      get: function() {
        return state;
      }
    },
    _whenDeferreds: {
      value: new Map([
        ['high', new Set()],
        ['low', new Set()]
      ])
    },
    state: {
      enumerable: true,
      get: function() {
        return this._state;
      }
    }
  });
}

/**
 * Transition to "low".
 * @returns {this}
 * @throws {Error}
 */
Latch.prototype.lower = function lower() {
  return this.transition('low');
};

/**
 * Transition to "high".
 * @returns {this}
 * @throws {Error}
 */
Latch.prototype.raise = function raise() {
  return this.transition('high');
};

/**
 * Transition to a new state.
 * @param {string} newState
 * @returns {this}
 * @throws {Error}
 */
Latch.prototype.transition = function transition(newState) {
  if (!states[this.state].has(newState)) {
    throw createUnreachableStateError(this.state, newState);
  }
  this._state = newState;
  return this;
};

/**
 * Return a Promise that resolves when the {@link Latch} transitions to
 * the specified state.
 * @param {string} state
 * @returns {Promise<this>}
 */
Latch.prototype.when = function when(state) {
  if (this.state === state) {
    return Promise.resolve(this);
  }
  if (!states[this.state].has(state)) {
    return Promise.reject(createUnreachableStateError(this.state, state));
  }
  var deferred = defer();
  this._whenDeferreds.get(state).add(deferred);
  return deferred.promise;
};

/**
 * Create an unreachable state Error.
 * @param {string} from - state to be transitioned from
 * @param {string} to - state to be transitioned to
 * @return {Error}
 */
function createUnreachableStateError(from, to) {
  return new Error('Cannot transition from "' + from + '" to "' + to + '"');
}

module.exports = Latch;

},{"./":145}],147:[function(require,module,exports){
/* globals RTCPeerConnection, RTCRtpTransceiver */

'use strict';

var flatMap = require('./').flatMap;
var guessBrowser = require('./').guessBrowser;

// NOTE(mmalavalli): We cache Chrome's sdpSemantics support in order to prevent
// instantiation of more than one RTCPeerConnection.
var isSdpSemanticsSupported = null;

/**
 * Check if Chrome supports specifying sdpSemantics for an RTCPeerConnection.
 * @return {boolean}
 */
function checkIfSdpSemanticsIsSupported() {
  if (typeof isSdpSemanticsSupported === 'boolean') {
    return isSdpSemanticsSupported;
  }
  if (typeof RTCPeerConnection === 'undefined') {
    isSdpSemanticsSupported = false;
    return isSdpSemanticsSupported;
  }
  try {
    new RTCPeerConnection({ sdpSemantics: 'foo' });
    isSdpSemanticsSupported = false;
  } catch (e) {
    isSdpSemanticsSupported = true;
  }
  return isSdpSemanticsSupported;
}

// NOTE(mmalavalli): We cache Chrome's SDP format in order to prevent
// instantiation of more than one RTCPeerConnection.
var chromeSdpFormat = null;

/**
 * Get Chrome's default SDP format.
 * @returns {'planb'|'unified'}
 */
function getChromeDefaultSdpFormat() {
  if (!chromeSdpFormat) {
    if (typeof RTCPeerConnection !== 'undefined'
      && 'addTransceiver' in RTCPeerConnection.prototype) {
      try {
        new RTCPeerConnection().addTransceiver('audio');
        chromeSdpFormat = 'unified';
      } catch (e) {
        chromeSdpFormat = 'planb';
      }
    } else {
      chromeSdpFormat = 'planb';
    }
  }
  return chromeSdpFormat;
}

/**
 * Get Chrome's SDP format.
 * @param {'plan-b'|'unified-plan'} [sdpSemantics]
 * @returns {'planb'|'unified'}
 */
function getChromeSdpFormat(sdpSemantics) {
  if (!sdpSemantics || !checkIfSdpSemanticsIsSupported()) {
    return getChromeDefaultSdpFormat();
  }
  return {
    'plan-b': 'planb',
    'unified-plan': 'unified'
  }[sdpSemantics];
}

/**
 * Get Safari's default SDP format.
 * @returns {'planb'|'unified'}
 */
function getSafariSdpFormat() {
  return typeof RTCRtpTransceiver !== 'undefined'
    && 'currentDirection' in RTCRtpTransceiver.prototype
      ? 'unified'
      : 'planb';
}

/**
 * Get the browser's default SDP format.
 * @param {'plan-b'|'unified-plan'} [sdpSemantics]
 * @returns {'planb'|'unified'}
 */
function getSdpFormat(sdpSemantics) {
  return {
    chrome: getChromeSdpFormat(sdpSemantics),
    firefox: 'unified',
    safari: getSafariSdpFormat()
  }[guessBrowser()] || null;
}

/**
 * Match a pattern across lines, returning the first capture group for any
 * matches.
 * @param {string} pattern
 * @param {string} lines
 * @returns {Set<string>} matches
 */
function getMatches(pattern, lines) {
  var matches = lines.match(new RegExp(pattern, 'gm')) || [];
  return matches.reduce(function(results, line) {
    var match = line.match(new RegExp(pattern));
    return match ? results.add(match[1]) : results;
  }, new Set());
}

/**
 * Get a Set of MediaStreamTrack IDs from an SDP.
 * @param {string} pattern
 * @param {string} sdp
 * @returns {Set<string>}
 */
function getTrackIds(pattern, sdp) {
  return getMatches(pattern, sdp);
}

/**
 * Get a Set of MediaStreamTrack IDs from a Plan B SDP.
 * @param {string} sdp - Plan B SDP
 * @returns {Set<string>} trackIds
 */
function getPlanBTrackIds(sdp) {
  return getTrackIds('^a=ssrc:[0-9]+ +msid:.+ +(.+) *$', sdp);
}

/**
 * Get a Set of MediaStreamTrack IDs from a Unified Plan SDP.
 * @param {string} sdp - Unified Plan SDP
 * @returns {Set<string>} trackIds
 */
function getUnifiedPlanTrackIds(sdp) {
  return getTrackIds('^a=msid:.+ +(.+) *$', sdp);
}

/**
 * Get a Set of SSRCs for a MediaStreamTrack from a Plan B SDP.
 * @param {string} sdp - Plan B SDP
 * @param {string} trackId - MediaStreamTrack ID
 * @returns {Set<string>}
 */
function getPlanBSSRCs(sdp, trackId) {
  var pattern = '^a=ssrc:([0-9]+) +msid:[^ ]+ +' + trackId + ' *$';
  return getMatches(pattern, sdp);
}

/**
 * Get the m= sections of a particular kind and direction from an sdp.
 * @param {string} sdp -  sdp string
 * @param {string} [kind] - Pattern for matching kind
 * @param {string} [direction] - Pattern for matching direction
 * @returns {Array<string>} mediaSections
 */
function getMediaSections(sdp, kind, direction) {
  kind = kind || '.*';
  direction = direction || '.*';
  return sdp.split('\r\nm=').slice(1).map(function(mediaSection) {
    return 'm=' + mediaSection;
  }).filter(function(mediaSection) {
    var kindPattern = new RegExp('m=' + kind, 'gm');
    var directionPattern = new RegExp('a=' + direction, 'gm');
    return kindPattern.test(mediaSection) && directionPattern.test(mediaSection);
  });
}

/**
 * Get the Set of SSRCs announced in a MediaSection.
 * @param {string} mediaSection
 * @returns {Array<string>} ssrcs
 */
function getMediaSectionSSRCs(mediaSection) {
  return Array.from(getMatches('^a=ssrc:([0-9]+) +.*$', mediaSection));
}

/**
 * Get a Set of SSRCs for a MediaStreamTrack from a Unified Plan SDP.
 * @param {string} sdp - Unified Plan SDP
 * @param {string} trackId - MediaStreamTrack ID
 * @returns {Set<string>}
 */
function getUnifiedPlanSSRCs(sdp, trackId) {
  var mediaSections = getMediaSections(sdp);

  var msidAttrRegExp = new RegExp('^a=msid:[^ ]+ +' + trackId + ' *$', 'gm');
  var matchingMediaSections = mediaSections.filter(function(mediaSection) {
    return mediaSection.match(msidAttrRegExp);
  });

  return new Set(flatMap(matchingMediaSections, getMediaSectionSSRCs));
}

/**
 * Get a Map from MediaStreamTrack IDs to SSRCs from an SDP.
 * @param {function(string): Set<string>} getTrackIds
 * @param {function(string, string): Set<string>} getSSRCs
 * @param {string} sdp - SDP
 * @returns {Map<string, Set<string>>} trackIdsToSSRCs
 */
function getTrackIdsToSSRCs(getTrackIds, getSSRCs, sdp) {
  return new Map(Array.from(getTrackIds(sdp)).map(function(trackId) {
    return [trackId, getSSRCs(sdp, trackId)];
  }));
}

/**
 * Get a Map from MediaStreamTrack IDs to SSRCs from a Plan B SDP.
 * @param {string} sdp - Plan B SDP
 * @returns {Map<string, Set<string>>} trackIdsToSSRCs
 */
function getPlanBTrackIdsToSSRCs(sdp) {
  return getTrackIdsToSSRCs(getPlanBTrackIds, getPlanBSSRCs, sdp);
}

/**
 * Get a Map from MediaStreamTrack IDs to SSRCs from a Plan B SDP.
 * @param {string} sdp - Plan B SDP
 * @returns {Map<string, Set<string>>} trackIdsToSSRCs
 */
function getUnifiedPlanTrackIdsToSSRCs(sdp) {
  return getTrackIdsToSSRCs(getUnifiedPlanTrackIds, getUnifiedPlanSSRCs, sdp);
}

/**
 * Update the mappings from MediaStreamTrack IDs to SSRCs as indicated by both
 * the Map from MediaStreamTrack IDs to SSRCs and the SDP itself. This method
 * ensures that SSRCs never change once announced.
 * @param {function(string): Map<string, Set<string>>} getTrackIdsToSSRCs
 * @param {Map<string, Set<string>>} trackIdsToSSRCs
 * @param {string} sdp - SDP
 * @returns {strinng} updatedSdp - updated SDP
 */
function updateTrackIdsToSSRCs(getTrackIdsToSSRCs, trackIdsToSSRCs, sdp) {
  var newTrackIdsToSSRCs = getTrackIdsToSSRCs(sdp);
  var newSSRCsToOldSSRCs = new Map();

  // NOTE(mroberts): First, update a=ssrc attributes.
  newTrackIdsToSSRCs.forEach(function(ssrcs, trackId) {
    if (!trackIdsToSSRCs.has(trackId)) {
      trackIdsToSSRCs.set(trackId, ssrcs);
      return;
    }
    var oldSSRCs = Array.from(trackIdsToSSRCs.get(trackId));
    var newSSRCs = Array.from(ssrcs);
    oldSSRCs.forEach(function(oldSSRC, i) {
      var newSSRC = newSSRCs[i];
      newSSRCsToOldSSRCs.set(newSSRC, oldSSRC);
      var pattern = '^a=ssrc:' + newSSRC + ' (.*)$';
      var replacement = 'a=ssrc:' + oldSSRC + ' $1';
      sdp = sdp.replace(new RegExp(pattern, 'gm'), replacement);
    });
  });

  // NOTE(mroberts): Then, update a=ssrc-group attributes.
  var pattern = '^(a=ssrc-group:[^ ]+ +)(.*)$';
  var matches = sdp.match(new RegExp(pattern, 'gm')) || [];
  matches.forEach(function(line) {
    var match = line.match(new RegExp(pattern));
    if (!match) {
      return;
    }
    var prefix = match[1];
    var newSSRCs = match[2];
    var oldSSRCs = newSSRCs.split(' ').map(function(newSSRC) {
      var oldSSRC = newSSRCsToOldSSRCs.get(newSSRC);
      return oldSSRC ? oldSSRC : newSSRC;
    }).join(' ');
    sdp = sdp.replace(match[0], prefix + oldSSRCs);
  });

  return sdp;
}

/**
 * Update the mappings from MediaStreamTrack IDs to SSRCs as indicated by both
 * the Map from MediaStreamTrack IDs to SSRCs and the Plan B SDP itself. This
 * method ensures that SSRCs never change once announced.
 * @param {Map<string, Set<string>>} trackIdsToSSRCs
 * @param {string} sdp - Plan B SDP
 * @returns {string} updatedSdp - updated Plan B SDP
 */
function updatePlanBTrackIdsToSSRCs(trackIdsToSSRCs, sdp) {
  return updateTrackIdsToSSRCs(getPlanBTrackIdsToSSRCs, trackIdsToSSRCs, sdp);
}

/**
 * Update the mappings from MediaStreamTrack IDs to SSRCs as indicated by both
 * the Map from MediaStreamTrack IDs to SSRCs and the Plan B SDP itself. This
 * method ensures that SSRCs never change once announced.
 * @param {Map<string, Set<string>>} trackIdsToSSRCs
 * @param {string} sdp - Plan B SDP
 * @returns {string} updatedSdp - updated Plan B SDP
 */
function updateUnifiedPlanTrackIdsToSSRCs(trackIdsToSSRCs, sdp) {
  return updateTrackIdsToSSRCs(getUnifiedPlanTrackIdsToSSRCs, trackIdsToSSRCs, sdp);
}

exports.getSdpFormat = getSdpFormat;
exports.getMediaSections = getMediaSections;
exports.getPlanBTrackIds = getPlanBTrackIds;
exports.getUnifiedPlanTrackIds = getUnifiedPlanTrackIds;
exports.getPlanBSSRCs = getPlanBSSRCs;
exports.getUnifiedPlanSSRCs = getUnifiedPlanSSRCs;
exports.updatePlanBTrackIdsToSSRCs = updatePlanBTrackIdsToSSRCs;
exports.updateUnifiedPlanTrackIdsToSSRCs = updateUnifiedPlanTrackIdsToSSRCs;

},{"./":145}],148:[function(require,module,exports){
module.exports={
  "_from": "@twilio/webrtc@4.1.0",
  "_id": "@twilio/webrtc@4.1.0",
  "_inBundle": false,
  "_integrity": "sha512-Tk6HhTxeThmb/vsZDu5yD8gbFXyRBdKypFRA/VGgxCkDQNqEFqsX8mmYRF1YvzOF7P/mhZ+t871zdAPzJvZ3aQ==",
  "_location": "/@twilio/webrtc",
  "_phantomChildren": {},
  "_requested": {
    "type": "version",
    "registry": true,
    "raw": "@twilio/webrtc@4.1.0",
    "name": "@twilio/webrtc",
    "escapedName": "@twilio%2fwebrtc",
    "scope": "@twilio",
    "rawSpec": "4.1.0",
    "saveSpec": null,
    "fetchSpec": "4.1.0"
  },
  "_requiredBy": [
    "/"
  ],
  "_resolved": "https://registry.npmjs.org/@twilio/webrtc/-/webrtc-4.1.0.tgz",
  "_shasum": "fc7663d0957042acd911570800b0c51eaf6c5cb3",
  "_spec": "@twilio/webrtc@4.1.0",
  "_where": "/home/travis/build/twilio/twilio-video.js",
  "author": {
    "name": "Manjesh Malavalli",
    "email": "mmalavalli@twilio.com"
  },
  "bugs": {
    "url": "https://github.com/twilio/twilio-webrtc.js/issues"
  },
  "bundleDependencies": false,
  "contributors": [
    {
      "name": "Mark Roberts",
      "email": "mroberts@twilio.com"
    },
    {
      "name": "Ryan Rowland",
      "email": "rrowland@twilio.com"
    }
  ],
  "deprecated": false,
  "description": "WebRTC-related APIs and shims used by twilio-video.js",
  "devDependencies": {
    "browserify": "^14.4.0",
    "electron": "^5.0.0",
    "envify": "^4.1.0",
    "eslint": "^4.4.1",
    "istanbul": "^0.4.5",
    "karma": "^1.7.0",
    "karma-browserify": "^5.1.1",
    "karma-chrome-launcher": "^2.2.0",
    "karma-electron": "^6.1.0",
    "karma-firefox-launcher": "^1.0.1",
    "karma-mocha": "^1.3.0",
    "karma-safari-launcher": "~0.1",
    "karma-spec-reporter": "0.0.31",
    "mocha": "^3.5.0",
    "npm-run-all": "^4.0.2",
    "release-tool": "^0.2.2",
    "rimraf": "^2.6.1",
    "travis-multirunner": "^4.2.3",
    "watchify": "^3.9.0",
    "webrtc-adapter": "^6.4.8"
  },
  "homepage": "https://github.com/twilio/twilio-webrtc.js#readme",
  "keywords": [
    "shim",
    "twilio",
    "video",
    "webrtc"
  ],
  "license": "BSD-3-Clause",
  "main": "./lib/index.js",
  "name": "@twilio/webrtc",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/twilio/twilio-webrtc.js.git"
  },
  "scripts": {
    "build": "npm-run-all clean lint test",
    "clean": "rimraf coverage",
    "lint": "eslint ./lib",
    "test": "npm-run-all test:*",
    "test:integration": "npm-run-all test:integration:*",
    "test:integration:adapter": "karma start karma/integration.adapter.conf.js",
    "test:integration:native": "karma start karma/integration.conf.js",
    "test:unit": "istanbul cover node_modules/mocha/bin/_mocha -- ./test/unit/index.js"
  },
  "version": "4.1.0"
}

},{}],149:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],150:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],151:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],152:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],153:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":152,"_process":150,"inherits":151}],154:[function(require,module,exports){
module.exports={
  "name": "twilio-video",
  "title": "Twilio Video",
  "description": "Twilio Video JavaScript library",
  "version": "2.0.0-rc35",
  "homepage": "https://twilio.com",
  "author": "Mark Andrus Roberts <mroberts@twilio.com>",
  "contributors": [
    "Ryan Rowland <rrowland@twilio.com>",
    "Manjesh Malavalli <mmalavalli@twilio.com>"
  ],
  "keywords": [
    "twilio",
    "webrtc",
    "library",
    "javascript",
    "video",
    "rooms"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/twilio/twilio-video.js.git"
  },
  "devDependencies": {
    "@types/express": "^4.11.0",
    "@types/node": "^8.5.1",
    "@types/selenium-webdriver": "^3.0.8",
    "@types/ws": "^3.2.1",
    "babel-cli": "^6.26.0",
    "babel-preset-es2015": "^6.24.1",
    "browserify": "^14.3.0",
    "cheerio": "^0.22.0",
    "chromedriver": "2.28.0",
    "electron": "^5.0.1",
    "envify": "^4.0.0",
    "eslint": "^4.9.0",
    "express": "^4.16.2",
    "geckodriver": "1.4.0",
    "ink-docstrap": "^1.3.2",
    "istanbul": "^0.4.5",
    "jsdoc": "^3.5.5",
    "karma": "^1.6.0",
    "karma-browserify": "^5.1.1",
    "karma-chrome-launcher": "^2.0.0",
    "karma-electron": "^6.1.0",
    "karma-firefox-launcher": "^1.0.1",
    "karma-mocha": "^1.3.0",
    "karma-safari-launcher": "^1.0.0",
    "karma-spec-reporter": "^0.0.31",
    "mocha": "^3.2.0",
    "npm-run-all": "^4.0.2",
    "puppeteer": "^1.11.0",
    "release-tool": "^0.2.2",
    "requirejs": "^2.3.3",
    "rimraf": "^2.6.1",
    "selenium-webdriver": "3.3.0",
    "sinon": "^4.0.1",
    "travis-multirunner": "^4.0.0",
    "ts-node": "4.0.1",
    "tslint": "5.8.0",
    "twilio": "^2.11.1",
    "typescript": "2.6.2",
    "uglify-js": "^2.8.22",
    "vinyl-fs": "^2.4.4",
    "vinyl-source-stream": "^1.1.0",
    "webrtc-adapter": "^4.1.1"
  },
  "engines": {
    "node": ">=0.12"
  },
  "license": "BSD-3-Clause",
  "main": "./es5/index.js",
  "scripts": {
    "lint": "eslint ./lib ./test/*.js ./test/framework/*.js ./test/lib/*.js ./test/integration/** ./test/unit/**",
    "test:unit": "mocha ./test/unit/index.js",
    "test:integration:adapter": "node ./scripts/karma.js karma/integration.adapter.conf.js",
    "test:integration:travis": "node ./scripts/integration.js",
    "test:integration": "node ./scripts/karma.js karma/integration.conf.js",
    "test:umd": "mocha ./test/umd/index.js",
    "test:crossbrowser:build:clean": "rimraf ./test/crossbrowser/lib ./test/crossbrowser/src/browser/index.js",
    "test:crossbrowser:build:lint": "cd ./test/crossbrowser && tslint --project tsconfig.json",
    "test:crossbrowser:build:tsc": "cd ./test/crossbrowser && tsc",
    "test:crossbrowser:build:browser": "cd ./test/crossbrowser && browserify lib/crossbrowser/src/browser/index.js > src/browser/index.js",
    "test:crossbrowser:build": "npm-run-all test:crossbrowser:build:*",
    "test:crossbrowser:test": "cd ./test/crossbrowser && mocha --compilers ts:ts-node/register test/integration/spec/**/*.ts",
    "test:crossbrowser": "npm-run-all test:crossbrowser:*",
    "test:sdkdriver:build:clean": "rimraf ./test/lib/sdkdriver/lib ./test/lib/sdkdriver/test/integration/browser/index.js",
    "test:sdkdriver:build:lint": "cd ./test/lib/sdkdriver && tslint --project tsconfig.json",
    "test:sdkdriver:build:tsc": "cd ./test/lib/sdkdriver && tsc --rootDir src",
    "test:sdkdriver:build": "npm-run-all test:sdkdriver:build:*",
    "test:sdkdriver:test:unit": "cd ./test/lib/sdkdriver && mocha --compilers ts:ts-node/register test/unit/spec/**/*.ts",
    "test:sdkdriver:test:integration:browser": "cd ./test/lib/sdkdriver/test/integration && browserify browser/browser.js > browser/index.js",
    "test:sdkdriver:test:integration:run": "cd ./test/lib/sdkdriver && mocha --compilers ts:ts-node/register test/integration/spec/**/*.ts",
    "test:sdkdriver:test:integration": "npm-run-all test:sdkdriver:test:integration:*",
    "test:sdkdriver:test": "npm-run-all test:sdkdriver:test:*",
    "test:sdkdriver": "npm-run-all test:sdkdriver:*",
    "test:framework:angular:install": "cd ./test/framework/twilio-video-angular && rimraf ./node_modules && npm install",
    "test:framework:angular:run": "mocha ./test/framework/twilio-video-angular.js",
    "test:framework:angular": "npm-run-all test:framework:angular:*",
    "test:framework:no-framework:run": "mocha ./test/framework/twilio-video-no-framework.js",
    "test:framework:no-framework": "npm-run-all test:framework:no-framework:*",
    "test:framework:react:install": "cd ./test/framework/twilio-video-react && rimraf ./node_modules && npm install",
    "test:framework:react:test": "node ./scripts/framework.js twilio-video-react",
    "test:framework:react:build": "cd ./test/framework/twilio-video-react && npm run build",
    "test:framework:react:run": "mocha ./test/framework/twilio-video-react.js",
    "test:framework:react": "npm-run-all test:framework:react:*",
    "test:framework": "npm-run-all test:framework:angular test:framework:no-framework test:framework:react",
    "test": "npm-run-all test:unit test:integration",
    "build:es5": "rimraf ./es5 && babel lib -d es5",
    "build:js": "node ./scripts/build.js ./src/twilio-video.js ./LICENSE.md ./dist/twilio-video.js",
    "build:min.js": "uglifyjs ./dist/twilio-video.js -o ./dist/twilio-video.min.js --comments \"/^! twilio-video.js/\" -b beautify=false,ascii_only=true",
    "build": "npm-run-all clean lint docs cover test:integration build:es5 build:js build:min.js test:umd",
    "build:travis": "npm-run-all clean lint docs cover test:integration:travis build:es5 build:js build:min.js test:umd test:framework",
    "build:quick": "npm-run-all clean lint docs build:es5 build:js build:min.js",
    "docs": "node ./scripts/docs.js ./dist/docs",
    "clean": "rimraf ./coverage ./es5 ./dist",
    "cover": "istanbul cover node_modules/mocha/bin/_mocha -- ./test/unit/index.js"
  },
  "dependencies": {
    "@twilio/webrtc": "4.1.0",
    "ws": "^3.3.1",
    "xmlhttprequest": "^1.8.0"
  },
  "browser": {
    "ws": "./src/ws.js",
    "xmlhttprequest": "./src/xmlhttprequest.js"
  }
}

},{}],155:[function(require,module,exports){
module.exports = WebSocket;

},{}],156:[function(require,module,exports){
exports.XMLHttpRequest = XMLHttpRequest;

},{}]},{},[14]);
;
  var Video = bundle(14);
  /* globals define */
  if (typeof define === 'function' && define.amd) {
    define([], function() { return Video; });
  } else {
    var Twilio = root.Twilio = root.Twilio || {};
    Twilio.Video = Twilio.Video || Video;
  }
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
