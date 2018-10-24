import { baseEncoding } from './baseEncoding';
import { selection } from './selection'
import { action, reaction, observable, computed, trace, toJS } from 'mobx'
import { FULFILLED } from 'mobx-utils'
import { assign, deepmerge, createMarkerKey, isString, applyDefaults } from '../utils';
import { trail } from './trail';
import { getFormat, findFormat, getIntervalAndStep } from '../format';
//import { interpolate, extent } from 'd3';

const defaultConfig = {
    modelType: "frame",
    value: (new Date()).getFullYear(),
    speed: 100,
    interpolate: true,
    scale: { modelType: "frame" },
    trails: {},
    step: 1
}

const functions = {
    get value() {    
        let value = this.transaction.value == this.config.value ? 
            this.format.data.parse(this.config.value)
            :
            this.transaction.value;
        if (value != null) {
            const domain = this.scale.domain;
            value = new Date(Math.min(Math.max(value, domain[0]), domain[1]));
        }
        return value;
    },
    get speed() { return this.config.speed },
    get trail() {
        trace();
        const cfg = this.config.trail;
        return observable(trail(cfg, this));
    },
    get interpolate() { return this.config.interpolate },
    playing: false,
    timeout: null,
    togglePlaying() {
        this.playing ?
            this.stopPlaying() :
            this.startPlaying();
    },
    startPlaying: function() {
        if (this.value - this.scale.domain[1] >= 0)
            this.setValue(this.scale.domain[0]);

        this.setPlaying(true);
    },
    stopPlaying: function() {
        this.setPlaying(false);
    },
    setPlaying: action('setPlaying', function(playing) {
        this.playing = playing;
    }),
    setSpeed: action('setSpeed', function(speed) {
        speed = Math.max(0, speed);
        this.config.speed = speed;
    }),
    setValue: action('setValue', function(value, isTransaction) {
        if (value != null) {
            const domain = this.scale.domain;
            value = new Date(Math.min(Math.max(value, domain[0]), domain[1]));
        }
        this.transaction.value = value;
        if (!isTransaction) this.config.value = this.transaction.value = this.format.data(this.transaction.value);
        //this.updateTrailStart();
    }),
    setValueAndStop: action('setValueAndStop', function(value) {
        this.stopPlaying();
        this.setValue(value);
    }),
    update: action('update frame value', function() {
        if (this.playing && this.marker.dataPromise.state == FULFILLED) {
            const newValue = this.intervalAndStep.interval.offset(this.value, this.intervalAndStep.step);
            this.setValue(newValue);
            if (newValue > this.scale.domain[1])
                this.stopPlaying();
            // used for timeout instead of interval timing
            //else this.timeout = setTimeout(this.update.bind(this), this.speed);
        }
    }),
    updateTrailStart: action('update trail start', function() {
        this.trail.data.filter.markers.forEach((payload, key) => {
            const start = this.config.trail.starts[key];
            if (this.value < start)
                this.config.trail.starts[key] = this.value;
        });
    }),
    get frameMap() {
        //trace();
        // loading
        if (this.trail.show)
            return this.trailedFrameMap;
        else
            return this.frameMapCache;
    },
    get frameMapArray() {
        //trace();
        const frames = new Map();
        for (let [frameId, markers] of this.frameMap) {
            frames.set(frameId, [...markers.values()]);
        }
        return frames;
    },
    get currentFrame() { return this.currentFrameFromMap(this.frameMap, new Map()) },
    get currentFrameArray() { return this.currentFrameFromMap(this.frameMapArray, []) },
    currentFrameFromMap(map, empty) {
        //trace();

        if (map.has(this.value)) {
            return map.get(this.value);
        } else {
            console.warn("Frame value not found in frame map", this)
            return empty;
        }
    },
    get frameMapCache() {
        const flatDataMap = this.marker.dataMapCache;

        const frameMap = new Map();
        const frameSpace = this.data.space.filter(dim => dim != this.data.concept);
        const concept = this.data.concept;
        const getOrCreateDataMap = this.getOrCreateDataMap.bind(this); // no mobx lookups
        for (let [key, row] of flatDataMap) {
            const frameId = +this.format.data.parse(row[concept]);
            const dataMap = getOrCreateDataMap(frameMap, frameId);
            const key = createMarkerKey(frameSpace, row);
            row[Symbol.for('key')] = key;
            dataMap.set(key, row);
        }
        if (this.interpolate)
           this.interpolateFrames(frameMap, frameSpace);

        const orderEnc = this.marker.encoding.get("order");
        if (orderEnc)
            for (let [k, frame] of frameMap)
                frameMap.set(k, orderEnc.order(frame));

        return frameMap;
    },
    getOrCreateDataMap(frameMap, frameId) {
        let dataMap;
        if (frameMap.has(frameId)) {
            dataMap = frameMap.get(frameId);
        } else {
            dataMap = new Map();
            frameMap.set(frameId, dataMap);
        }
        return dataMap;
    },
    // basically transpose and filter framemap
    get trailedFrameMap() {
        trace();
        const frameMap = this.frameMapCache;
        const markers = this.trail.data.filter.markers;

        if (markers.length == 0)
            return frameMap;

        const [minFrameId, maxFrameId] = this.scale.domain;

        // create trails
        const trails = new Map();
        for (let key of markers.keys()) {
            const trail = new Map();
            trails.set(key, trail);
            for (let [i, frame] of frameMap) {
                if (frame.has(key))
                    trail.set(i, frame.get(key));
            }
        }

        // add trails to frames
        const newFrameMap = new Map();
        for (let [id, frame] of frameMap) {
            const newFrame = new Map();
            for (let [markerKey, markerData] of frame) {
                // insert trails before its head marker
                if (trails.has(markerKey)) {
                    const trail = trails.get(markerKey);
                    const trailStart = this.trail.starts[markerKey]; //.filter.getPayload(markerKey); //(minFrameId > this.trails.start) ? minFrameId : this.trails.start;
                    // add trail markers in ascending order
                    for (let i = trailStart; i < id; i++) {
                        const trailMarker = trail.get(i);
                        const newKey = markerKey + '-' + this.data.concept + '-' + i;
                        const newData = Object.assign({}, trailMarker, {
                            [Symbol.for('key')]: newKey,
                            [Symbol.for('trailHeadKey')]: markerKey
                        });
                        newFrame.set(newKey, newData);
                    }
                }
                // (head) marker
                newFrame.set(markerKey, markerData);
            }
            newFrameMap.set(id, newFrame);
        }
        return newFrameMap;
    },
    interpolateFrames(frameMap, frameSpace) {

        const frames = [...frameMap.keys()].sort((a,b)=>a-b);
        const previousMarkerValues = new Map();
        const frameIdOffset = this.intervalAndStep ? t => +this.intervalAndStep.interval.offset(t, this.intervalAndStep.step) : t => t + 1;
        // for each frame
        frames.forEach(frameId => {
            // for each marker in that frame
            for (let [markerKey, marker] of frameMap.get(frameId).entries()) {

                // get previous values for this marker
                let previous;
                if (!previousMarkerValues.has(markerKey)) {
                    previous = {};
                    previousMarkerValues.set(markerKey, previous);
                } else {
                    previous = previousMarkerValues.get(markerKey);
                }

                // for every property on marker
                Object.keys(marker)
                    // ignore properties without data
                    .filter(prop => marker[prop] != null)
                    .forEach(prop => {
                        // if there is a previous value and gap is > 1 step
                        if (previous[prop] && frameIdOffset(previous[prop].frameId) < frameId) {
                            // interpolate and save results in frameMap
                            this.interpolatePoint(previous[prop], { frameId, value: marker[prop] }, frameIdOffset)
                                .forEach(({ frameId, value }) => {
                                    // could maybe be optimized with batch updating all interpolations
                                    let markerObj;
                                    let markerMap;

                                    // get right frame
                                    if (frameMap.has(frameId)) {
                                        markerMap = frameMap.get(frameId);
                                    } else {
                                        markerMap = new Map();
                                        frameMap.set(frameId, markerMap);
                                    }

                                    // get right marker
                                    if (markerMap.has(markerKey)) {
                                        markerObj = markerMap.get(markerKey);
                                    } else {
                                        markerObj = {
                                            [Symbol.for('key')]: markerKey,
                                            [this.data.concept]: frameId
                                        }
                                        frameSpace.forEach(dim => markerObj[dim] = marker[dim]);
                                        markerMap.set(markerKey, markerObj);
                                    }

                                    // add value to marker
                                    markerObj[prop] = value;
                                });
                        }

                        // update previous value to current
                        previous[prop] = {
                            frameId,
                            value: marker[prop]
                        }
                    });


            }
        });
    },
    interpolatePoint(start, end, offset) {
        const int = d3.interpolate(start.value, end.value);
        const base = start.frameId;
        const delta = end.frameId - start.frameId;
        const intVals = [];
        for (let i = offset(base), j = end.frameId; i < j; i = offset(i)) {
            const value = int((i - base) / delta);
            intVals.push({ frameId: i, value })
        }
        return intVals;
    },
    setUpReactions() {
        const controlTimer = reaction(
            // mention all observables (state & computed) which you want to be tracked
            // if not tracked, they will always be recomputed, their values are not cached
            () => { return { playing: this.playing, speed: this.speed } },
            ({ playing, speed }) => {
                clearInterval(this.playInterval);
                if (playing) {
                    this.update();
                    this.playInterval = setInterval(this.update.bind(this), speed);
                }
            }, { name: "frame" }
        );
    },
    getFrame(frameId, cb) {
        if (!frameId && frameId !== 0) return cb(this.frameMap, frameId);
        if (this.frameMap.has(+frameId)) return cb(this.frameMap.get(+frameId), frameId);

        const frames = [...this.frameMap.keys()].sort((a,b)=>a-b);
        if (!frames.length) return;
        const frameIdOffset = this.intervalAndStep ? t => +this.intervalAndStep.interval.offset(t, this.intervalAndStep.step) : t => t + 1;
        const lastIndex = d3.bisectLeft(frames, +frameId);
        const firstIndex = lastIndex - 1;
        const frameLast = this.frameMap.get(frames[lastIndex]);
        const frameFirst = this.frameMap.get(frames[firstIndex]);
        const markerMap = new Map();
        for (let [markerKey, marker] of frameFirst) {
            const markerObj = {};
            markerMap.set(markerKey, markerObj);
            Object.keys(marker)
            // ignore properties without data
            .filter(prop => marker[prop] != null)
            .forEach(prop => {
                markerObj[prop] = this.interpolatePoint({ 
                    frameId: frames[firstIndex], value: marker[prop] }, 
                    { frameId: frames[lastIndex], value: frameLast.get(markerKey)[prop] },
                    (i) => ({[frames[firstIndex]]: +frameId, [frameId]: frames[lastIndex]})[i])[0].value;    
            });
        }
        return cb(markerMap, frameId);
    },    
    get unit() {
            //const size = this.marker.dataMapCache.size;
            const dataEntry = this.marker.dataMapCache.entries().next().value;
            return dataEntry ? findFormat(dataEntry[1]["frame"]).unit : null;
        }
    ,
    get format() {
        return getFormat(this.unit);

    },

    get intervalAndStep() {
        return this.unit ? getIntervalAndStep(this.unit, this.config.step) : null;
    },

}

export function frame(config) {
    applyDefaults(config, defaultConfig);
    const transaction = {};
    applyDefaults(transaction, toJS(config))
    return assign(baseEncoding(config), Object.assign(functions, { transaction: transaction }));
}